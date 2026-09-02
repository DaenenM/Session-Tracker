// src/components/Roulette.jsx
//
// Public roulette. Every client watches the same round on a shared clock.
//
// Rounds are derived from the clock, so all browsers agree on the result without
// any server, and nothing runs when nobody has the page open. The stake is
// deducted the moment a bet is placed, and payouts settle when the round ends —
// or on the next page load if the tab was closed.

import { useState, useRef, useEffect, useCallback } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import useRouletteRound from '../hooks/useRouletteRound';
import {
    POCKETS, PAYOUTS, chanceOf, generateReelStrip, landingOffsetFor,
} from '../utils/rouletteWheel';
import { SPIN_MS } from '../utils/rouletteRounds';
import { wagerXpReward } from '../utils/wagerXp';
import StyledName from './StyledName';
import '../css/Roulette.css';

const MIN_BET = 1;
const STRIP_LENGTH = 60;
const WIN_INDEX = 50;      // where the winning tile sits in the strip
const ITEM_WIDTH = 74;     // px per tile — must match .roulette-tile in the CSS
const ITEM_GAP = 8;
// Imported so the reel animation and the round's phase boundary can never drift
// apart — they are the same moment by definition

// Green sits between red and black, mirroring the wheel
const BET_ORDER = ['red', 'green', 'black'];

export default function Roulette() {
    const { user, userCoins } = useAuth();
    const {
        roundId, secondsRemaining, bettingOpen, spinning, lastResult,
        displayRoundId, history, liveBets, connected,
    } = useRouletteRound();

    const [amount, setAmount] = useState('');
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState(null);
    const [strip, setStrip] = useState(() => generateReelStrip(POCKETS[0], STRIP_LENGTH, WIN_INDEX));
    const [revealed, setRevealed] = useState(false);

    const reelRef = useRef(null);
    const spunRoundRef = useRef(null);   // last round the reel animated for
    const timerRef = useRef(null);
    // The current round's bet is captured here before the round rolls over and
    // liveBets clears, so the outcome can still be judged once the reel lands
    const pendingBetRef = useRef(null);

    // Outcome of the round that just finished: { won, amount, color, credit }
    const [outcome, setOutcome] = useState(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const bet = Number(amount);
    const betValid = Number.isFinite(bet) && bet >= MIN_BET && bet <= userCoins;

    // The bet this user already has on the current round, if any
    // This user's bet among those on display
    const myShownBet = user ? liveBets.find((b) => b.uid === user.uid) : null;

    // A bet only blocks further betting if it belongs to the round still open.
    // While the reel spins, the bets on screen are last round's and must not
    // count against the round coming up.
    const myBet = !spinning && displayRoundId === roundId ? myShownBet : null;

    // Keep the bet on hand so the result message survives the round rollover
    useEffect(() => {
        if (myShownBet) {
            pendingBetRef.current = { ...myShownBet, roundId: displayRoundId };
        }
    }, [myShownBet, displayRoundId]);

    const fmt = (n) =>
        Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // Drives the reel onto the pocket for the round that just ended.
    //
    // Both the strip and the stop position are seeded from the round number, so
    // every client renders an identical spin rather than its own variation.
    const animateTo = useCallback((pocket, seed) => {
        setRevealed(false);
        setStrip(generateReelStrip(pocket, STRIP_LENGTH, WIN_INDEX, seed));

        requestAnimationFrame(() => {
            const el = reelRef.current;
            if (!el) return;
            el.style.transition = 'none';
            el.style.transform = 'translateX(0)';

            requestAnimationFrame(() => {
                if (!reelRef.current) return;
                // Small offset within the tile so the reel doesn't stop dead
                // centre every round, which reads mechanical. Derived from the
                // round so it is the same offset on every client.
                const jitter = landingOffsetFor(seed) * ITEM_WIDTH;
                const target = WIN_INDEX * (ITEM_WIDTH + ITEM_GAP) + ITEM_WIDTH / 2 + jitter;

                reelRef.current.style.transition =
                    `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.18, 1)`;
                reelRef.current.style.transform = `translateX(-${target}px)`;
            });
        });

        timerRef.current = setTimeout(() => setRevealed(true), SPIN_MS);
    }, []);

    // Work out whether the finished round was a win for this player
    const judgeRound = useCallback((result) => {
        const staked = pendingBetRef.current;
        // Only judge the round the bet was actually placed on
        if (!staked || staked.roundId !== result.id) {
            setOutcome(null);
            return;
        }
        pendingBetRef.current = null;

        const won = staked.color === result.color;
        setOutcome({
            won,
            amount: staked.amount,
            color: staked.color,
            resultColor: result.color,
            // A win returns the stake plus profit; the stake was already taken
            credit: won ? staked.amount * PAYOUTS[staked.color] : 0,
        });
    }, []);

    // Spin once per round, as soon as the previous round's result is known
    useEffect(() => {
        if (!lastResult) return;
        if (spunRoundRef.current === lastResult.id) return;
        spunRoundRef.current = lastResult.id;
        setOutcome(null);
        animateTo({ n: lastResult.n, color: lastResult.color }, lastResult.id);

        // Reveal the verdict only once the reel has physically stopped
        const id = setTimeout(() => judgeRound(lastResult), SPIN_MS);
        return () => clearTimeout(id);
    }, [lastResult, animateTo, judgeRound]);

    const handleAmountChange = (e) => {
        const v = e.target.value;
        if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
            setAmount(v);
            setError(null);
        }
    };

    const setPercent = (pct) => {
        const v = Math.floor(userCoins * pct * 100) / 100;
        setAmount(v > 0 ? String(v) : '');
        setError(null);
    };

    const handleBet = async (color) => {
        if (!user || placing || myBet || !bettingOpen || spinning || !betValid) return;

        setPlacing(true);
        setError(null);
        try {
            const userRef = doc(db, 'users', user.uid);
            const betRef = doc(db, 'rouletteRounds', String(roundId), 'bets', user.uid);

            // Stake is taken here, so closing the tab can never dodge a loss.
            // Re-reading inside the transaction stops a double-click or a stale
            // balance from spending twice.
            await runTransaction(db, async (tx) => {
                const [userSnap, betSnap] = await Promise.all([
                    tx.get(userRef), tx.get(betRef),
                ]);
                if (!userSnap.exists()) throw new Error('User not found.');
                if (betSnap.exists()) throw new Error('You already bet this round.');

                const data = userSnap.data();
                const coins = data.coins || 0;
                if (coins < bet) throw new Error('Not enough coins.');

                // XP for placing the wager, plus the coin bonus if it levels up
                const { newXp, coinBonus } = wagerXpReward(data.xp, bet);

                tx.update(userRef, {
                    coins: Math.round((coins - bet + coinBonus) * 100) / 100,
                    xp: newXp,
                });

                tx.set(betRef, {
                    uid: user.uid,
                    displayName: data.displayName || 'Anonymous',
                    nameColor: data.nameColor || null,
                    nameEmoji: data.nameEmoji || null,
                    color,
                    amount: bet,
                    roundId,
                    settled: false,
                    placedAt: serverTimestamp(),
                });
            });

            setAmount('');
        } catch (err) {
            console.error('Bet failed:', err);
            setError(err?.message || 'Could not place that bet.');
        } finally {
            setPlacing(false);
        }
    };

    // Group the round's bets by colour for the three lists
    const betsByColor = { red: [], green: [], black: [] };
    for (const b of liveBets) {
        if (betsByColor[b.color]) betsByColor[b.color].push(b);
    }
    for (const list of Object.values(betsByColor)) {
        list.sort((a, b) => b.amount - a.amount);
    }
    const totalFor = (color) =>
        betsByColor[color].reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    // bettingOpen is already false during the spin; naming `spinning` here makes
    // the "no bets until the tile lands" rule explicit rather than implied
    const canBet = !!user && bettingOpen && !spinning && !myBet && betValid && !placing;

    return (
        <div className="roulette-container">
            <div className="roulette-wrapper">
                <div className="roulette-header">
                    <h1 className="roulette-title">Roulette</h1>
                </div>

                {/* Round status */}
                <div className="roulette-status">
                    <span className={`roulette-dot ${connected ? 'live' : 'offline'}`} />
                    {!connected ? (
                        <span className="roulette-status-text">Reconnecting…</span>
                    ) : spinning ? (
                        <span className="roulette-status-text">Spinning…</span>
                    ) : bettingOpen ? (
                        <span className="roulette-status-text">
                            Next spin in <strong>{secondsRemaining}s</strong>
                        </span>
                    ) : (
                        <span className="roulette-status-text">Betting closed</span>
                    )}
                    <span className="roulette-round-id">#{roundId}</span>
                </div>

                {/* Reel */}
                <div className="roulette-reel-window">
                    <div className="roulette-marker" aria-hidden="true" />
                    <div className="roulette-reel-track" ref={reelRef}>
                        {strip.map((pocket, i) => (
                            <div
                                key={i}
                                className={`roulette-tile roulette-tile-${pocket.color} ${
                                    i === WIN_INDEX && revealed ? 'is-winner' : ''
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Last 10 results */}
                {history.length > 0 && (
                    <div className="roulette-history">
                        <span className="roulette-history-title">Last 10 Rounds</span>
                        <div className="roulette-history-list">
                            {history.map((h) => (
                                <span
                                    key={h.id}
                                    className={`roulette-history-chip rhc-${h.color}`}
                                    title={`Round #${h.id} — ${h.color}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Stake */}
                <div className="roulette-section">
                    <div className="roulette-label-row">
                        <span className="roulette-label">Bet Amount</span>
                        <span className="roulette-balance">🪙 {fmt(userCoins)}</span>
                    </div>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="roulette-input"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        disabled={!!myBet || !bettingOpen || spinning}
                    />
                    <div className="roulette-quick">
                        {[['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(([label, pct]) => (
                            <button
                                key={label}
                                type="button"
                                className="roulette-quick-btn"
                                onClick={() => setPercent(pct)}
                                disabled={!!myBet || !bettingOpen || spinning || userCoins <= 0}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p className="roulette-error">{error}</p>}
                {outcome ? (
                    <p className={`roulette-outcome ${outcome.won ? 'won' : 'lost'}`}>
                        {outcome.won ? (
                            <>Nice — <strong>{outcome.color}</strong> paid 🪙 {fmt(outcome.credit)}</>
                        ) : (
                            <>Unlucky — it landed <strong>{outcome.resultColor}</strong>. −🪙 {fmt(outcome.amount)}</>
                        )}
                    </p>
                ) : null}

                {/* Three betting columns — green deliberately in the middle */}
                <div className="roulette-board">
                    {BET_ORDER.map((color) => (
                        <div key={color} className={`roulette-column rcol-${color}`}>
                            <button
                                type="button"
                                className={`roulette-color rc-${color} ${myShownBet?.color === color ? 'active' : ''}`}
                                onClick={() => handleBet(color)}
                                disabled={!canBet}
                            >
                                <span className="roulette-color-name">{color}</span>
                                <span className="roulette-color-odds">
                                    {PAYOUTS[color]}x · {chanceOf(color).toFixed(1)}%
                                </span>
                            </button>

                            <div className="roulette-pool">
                                <span className="roulette-pool-count">
                                    {betsByColor[color].length} bet
                                    {betsByColor[color].length === 1 ? '' : 's'}
                                </span>
                                <span className="roulette-pool-total">
                                    🪙 {fmt(totalFor(color))}
                                </span>
                            </div>

                            <ul className="roulette-bet-list">
                                {betsByColor[color].length === 0 ? (
                                    <li className="roulette-bet-empty">No bets yet</li>
                                ) : (
                                    betsByColor[color].map((b) => (
                                        <li
                                            key={b.uid}
                                            className={`roulette-bet-row ${b.uid === user?.uid ? 'is-you' : ''}`}
                                        >
                                            <span className="roulette-bet-name">
                                                <StyledName
                                                    displayName={b.displayName}
                                                    nameColor={b.nameColor}
                                                    nameEmoji={b.nameEmoji}
                                                />
                                            </span>
                                            <span className="roulette-bet-amount">
                                                🪙 {fmt(b.amount)}
                                            </span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    ))}
                </div>

                {!user && (
                    <p className="roulette-signin">Sign in to place a bet.</p>
                )}
            </div>
        </div>
    );
}
