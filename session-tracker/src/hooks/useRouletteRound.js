// src/hooks/useRouletteRound.js
//
// Drives the shared roulette table without a server.
//
// Every client derives the current round and its result from the clock (see
// rouletteRounds.js), so all browsers agree without coordinating. Bets live in
// Firestore so the table is shared; the clock does the rest. With nobody on the
// page nothing runs at all.
//
// Because there is no server process, settlement happens client-side: whenever
// this hook finds a finished round with an unsettled bet belonging to the signed
// in user, it pays that bet out in a transaction. A win is therefore never lost
// if the tab is closed — it lands the next time the page is opened.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection, doc, onSnapshot, query, where,
    runTransaction, getDocs,
} from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { PAYOUTS } from '../utils/rouletteWheel';
import {
    ROUND_MS, roundStateAt, recentResults, pocketForRound,
} from '../utils/rouletteRounds';

const rtdb = getDatabase();

export default function useRouletteRound() {
    const { user } = useAuth();

    const [now, setNow] = useState(() => Date.now());
    const [clockOffset, setClockOffset] = useState(0);
    const [liveBets, setLiveBets] = useState([]);
    const [connected, setConnected] = useState(true);

    // Rounds already being settled, so an in-flight transaction isn't retried
    // on every re-render
    const settlingRef = useRef(new Set());

    // Firebase publishes its own clock offset. Using it means a player with a
    // skewed system clock still sees the same round as everyone else.
    useEffect(() => {
        const unsubOffset = onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
            setClockOffset(snap.val() || 0);
        });
        const unsubConn = onValue(ref(rtdb, '.info/connected'), (snap) => {
            setConnected(snap.val() === true);
        });
        return () => { unsubOffset(); unsubConn(); };
    }, []);

    // Countdown tick. 200ms is smooth enough for a seconds display without
    // re-rendering every frame.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, []);

    const serverNow = now + clockOffset;
    const state = roundStateAt(serverNow);
    const roundId = state.id;

    // Which round's bets the board should show.
    //
    // While the reel is spinning it is resolving the PREVIOUS round, so that
    // round's bets stay on screen until the tile lands — otherwise the lists
    // would empty the instant the spin began, before anyone saw the outcome.
    const displayRoundId = state.spinning ? roundId - 1 : roundId;

    // Live bets for the round on display, shared by everyone at the table
    useEffect(() => {
        const betsRef = collection(db, 'rouletteRounds', String(displayRoundId), 'bets');
        const unsub = onSnapshot(
            betsRef,
            (snap) => {
                setLiveBets(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
            },
            (err) => {
                console.error('Roulette bets listener error:', err);
                setLiveBets([]);
            }
        );
        return () => unsub();
    }, [displayRoundId]);

    /**
     * Pays out one of this user's finished, unsettled bets.
     *
     * The transaction re-reads the bet and aborts if it was already settled, so
     * two tabs open at once cannot double-pay.
     */
    const settleBet = useCallback(async (betRoundId) => {
        if (!user) return;
        const key = `${user.uid}:${betRoundId}`;
        if (settlingRef.current.has(key)) return;
        settlingRef.current.add(key);

        const betRef = doc(db, 'rouletteRounds', String(betRoundId), 'bets', user.uid);
        const userRef = doc(db, 'users', user.uid);
        const pocket = pocketForRound(betRoundId);

        try {
            await runTransaction(db, async (tx) => {
                const betSnap = await tx.get(betRef);
                if (!betSnap.exists()) return;

                const bet = betSnap.data();
                if (bet.settled) return;   // already paid — nothing to do

                const won = bet.color === pocket.color;
                // The stake was taken when the bet was placed, so a win credits
                // the full return rather than just the profit
                const credit = won
                    ? Math.round(bet.amount * PAYOUTS[bet.color] * 100) / 100
                    : 0;

                if (credit > 0) {
                    const userSnap = await tx.get(userRef);
                    if (userSnap.exists()) {
                        const coins = userSnap.data().coins || 0;
                        tx.update(userRef, {
                            coins: Math.round((coins + credit) * 100) / 100,
                        });
                    }
                }

                tx.update(betRef, {
                    settled: true,
                    won,
                    credit,
                    resultColor: pocket.color,
                    resultNumber: pocket.n,
                    settledAt: new Date().toISOString(),
                });
            });
        } catch (err) {
            console.error(`Failed to settle roulette bet on round ${betRoundId}:`, err);
            // Allow a retry on the next pass
            settlingRef.current.delete(key);
        }
    }, [user]);

    /**
     * Finds this user's bets on rounds that have finished but were never paid
     * out — including ones placed before the tab was closed — and settles them.
     */
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const sweep = async () => {
            try {
                // Firestore can't query across subcollections without a
                // collection-group index, so recent rounds are checked directly.
                // 20 rounds is 5 minutes — enough to catch a closed tab without
                // a large read burst on every round change.
                const ids = [];
                for (let id = roundId - 1; id >= roundId - 20 && id >= 0; id--) {
                    ids.push(id);
                }

                const pending = await Promise.all(
                    ids.map(async (id) => {
                        const q = query(
                            collection(db, 'rouletteRounds', String(id), 'bets'),
                            where('uid', '==', user.uid),
                            where('settled', '==', false)
                        );
                        const snap = await getDocs(q);
                        return snap.empty ? null : id;
                    })
                );

                if (cancelled) return;
                for (const id of pending.filter((v) => v !== null)) {
                    await settleBet(id);
                }
            } catch (err) {
                console.error('Roulette settlement sweep failed:', err);
            }
        };

        sweep();
        return () => { cancelled = true; };
    }, [user, roundId, settleBet]);

    return {
        roundId,
        secondsRemaining: state.secondsRemaining,
        msRemaining: state.msRemaining,
        bettingOpen: state.bettingOpen,
        spinning: state.spinning,
        displayRoundId,
        lastResult: state.lastResult,
        history: recentResults(serverNow, 10),
        liveBets,
        connected,
        serverNow,
        roundMs: ROUND_MS,
    };
}
