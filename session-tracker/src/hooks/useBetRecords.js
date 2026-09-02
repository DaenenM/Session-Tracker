// src/hooks/useBetRecords.js
// Scans every user's bets and coin flips to derive site-wide records for the
// leaderboard.
//
// Both are read with collectionGroup so one listener covers all users, the same
// approach BetsList already uses for the live bets table. Every record is derived
// from these two snapshots — no per-card queries.

import { useState, useEffect } from 'react';
import { collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Keeps whichever entry has the larger value, ignoring non-positive amounts
const pickLarger = (current, candidate) =>
    candidate.value > 0 && (!current || candidate.value > current.value) ? candidate : current;

const EMPTY = {
    biggestWin: null,
    biggestLoss: null,
    totalWagered: 0,
    totalBets: 0,
};

export default function useBetRecords() {
    const [records, setRecords] = useState(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Each listener owns its own slice; they're merged on every update so a
        // change in any collection recomputes every record correctly.
        let betRows = [];
        let flipRows = [];
        let gotBets = false;
        let gotFlips = false;

        const recompute = () => {
            const wagers = [...betRows, ...flipRows];

            let biggestWin = null;
            let biggestLoss = null;
            let totalWagered = 0;

            for (const row of wagers) {
                // Every stake ever placed, across bets and coin flips
                totalWagered += row.amount;

                if (row.winAmount > 0) {
                    biggestWin = pickLarger(biggestWin, {
                        value: row.winAmount, userId: row.userId, source: row.source, label: row.label,
                    });
                }

                // Largest single stake that lost outright
                if (row.settled && row.winAmount <= 0) {
                    biggestLoss = pickLarger(biggestLoss, {
                        value: row.amount, userId: row.userId, source: row.source, label: row.label,
                    });
                }
            }

            setRecords({
                biggestWin, biggestLoss,
                totalWagered, totalBets: wagers.length,
            });

            if (gotBets && gotFlips) setLoading(false);
        };

        const unsubBets = onSnapshot(
            collectionGroup(db, 'bets'),
            (snap) => {
                betRows = snap.docs.map((d) => {
                    const data = d.data();
                    const settled = data.status === 'won' || data.status === 'lost';
                    return {
                        userId: d.ref.parent.parent?.id,
                        amount: Number(data.amount) || 0,
                        // Only a settled win counts toward payout records
                        winAmount: data.status === 'won' ? Number(data.potentialPayout) || 0 : 0,
                        settled,
                        source: 'bet',
                        label: data.range || 'Bet',
                    };
                });
                gotBets = true;
                recompute();
            },
            (err) => { console.error('Bet records listener error:', err); gotBets = true; recompute(); }
        );

        const unsubFlips = onSnapshot(
            collectionGroup(db, 'coinflips'),
            (snap) => {
                flipRows = snap.docs.map((d) => {
                    const data = d.data();
                    return {
                        userId: d.ref.parent.parent?.id,
                        amount: Number(data.amount) || 0,
                        // Coin flip payout is stored as a signed delta
                        winAmount: data.won ? Number(data.payout) || 0 : 0,
                        settled: true,  // flips resolve the moment they're made
                        source: 'flip',
                        label: data.result === 'heads' ? 'Heads' : 'Tails',
                    };
                });
                gotFlips = true;
                recompute();
            },
            (err) => {
                // A missing coinflips index shouldn't blank out the bet records
                console.error('Coin flip records listener error:', err);
                gotFlips = true;
                recompute();
            }
        );

        return () => {
            unsubBets();
            unsubFlips();
        };
    }, []);

    return { records, loading };
}
