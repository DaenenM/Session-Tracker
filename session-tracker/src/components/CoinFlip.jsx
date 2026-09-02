// src/components/CoinFlip.jsx
// Double-or-nothing coin flip. The user locks in a side and a stake, and the
// result is decided and settled inside a Firestore transaction BEFORE the coin
// animates — the animation then lands on the already-committed face, so what the
// coin shows can never disagree with what was paid out.

import { useState, useRef, useEffect } from 'react';
import { doc, runTransaction, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { wagerXpReward } from '../utils/wagerXp';

const MIN_BET = 1;
const SPIN_MS = 2600;       // must match the CSS animation duration
const FULL_SPINS = 5;       // whole rotations before settling on the result

export default function CoinFlip() {
    const { user, userCoins } = useAuth();

    const [choice, setChoice] = useState(null);       // 'heads' | 'tails'
    const [amount, setAmount] = useState('');
    const [flipping, setFlipping] = useState(false);
    const [result, setResult] = useState(null);       // { face, won, payout }
    const [showResult, setShowResult] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);       // recent flips, newest first

    // Landing rotation is applied inline so the coin can stop on either face
    const [rotation, setRotation] = useState(0);
    const timerRef = useRef(null);

    // Don't fire state updates after unmount if the user navigates mid-flip
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const bet = Number(amount);
    const betValid = Number.isFinite(bet) && bet >= MIN_BET && bet <= userCoins;
    const canFlip = !flipping && choice !== null && betValid && !!user;

    const formatCoins = (num) => {
        const n = Number(num);
        if (!Number.isFinite(n)) return '0';
        return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };

    const handleAmountChange = (e) => {
        const v = e.target.value;
        // Allow an empty field while typing; block negatives and letters
        if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) {
            setAmount(v);
            setError(null);
        }
    };

    const setPercent = (pct) => {
        if (flipping) return;
        const v = Math.floor(userCoins * pct * 100) / 100;
        setAmount(v > 0 ? String(v) : '');
        setError(null);
    };

    const handleFlip = async () => {
        if (!canFlip) return;

        setError(null);
        setShowResult(false);
        setResult(null);
        setFlipping(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            let outcome = null;

            // Decide and settle atomically. Re-reading coins inside the transaction
            // stops a double-click or a stale balance from spending twice.
            await runTransaction(db, async (transaction) => {
                const snap = await transaction.get(userDocRef);
                if (!snap.exists()) throw new Error('User not found');

                const data = snap.data();
                const currentCoins = data.coins || 0;
                if (currentCoins < bet) throw new Error('Insufficient coins');

                const face = Math.random() < 0.5 ? 'heads' : 'tails';
                const won = face === choice;
                // Even money: win returns the stake plus an equal profit
                const delta = won ? bet : -bet;

                // XP for the wager, plus the coin bonus if it levels up
                const { newXp, coinBonus } = wagerXpReward(data.xp, bet);

                transaction.update(userDocRef, {
                    coins: Math.round((currentCoins + delta + coinBonus) * 100) / 100,
                    xp: newXp,
                });

                outcome = { face, won, payout: delta };
            });

            // Log the flip for history; failure here must not affect the payout
            try {
                await addDoc(collection(db, 'users', user.uid, 'coinflips'), {
                    choice,
                    result: outcome.face,
                    amount: bet,
                    payout: outcome.payout,
                    won: outcome.won,
                    timestamp: serverTimestamp(),
                });
            } catch (logErr) {
                console.error('Could not record flip history:', logErr);
            }

            // Land on the committed face: heads shows the 0deg side, tails 180deg
            const landing = outcome.face === 'heads' ? 0 : 180;
            setRotation(prev => {
                // Always rotate forward from wherever the coin currently rests
                const base = Math.ceil(prev / 360) * 360;
                return base + FULL_SPINS * 360 + landing;
            });

            setResult(outcome);

            // Reveal the verdict only once the coin has physically settled
            timerRef.current = setTimeout(() => {
                setShowResult(true);
                setFlipping(false);
                setHistory(prev => [
                    { id: crypto.randomUUID(), ...outcome, choice, amount: bet },
                    ...prev,
                ].slice(0, 10));
            }, SPIN_MS);
        } catch (err) {
            console.error('Flip failed:', err);
            setError(
                err.message === 'Insufficient coins'
                    ? 'Not enough coins for that bet.'
                    : 'Something went wrong. Your coins were not touched.'
            );
            setFlipping(false);
        }
    };

    return (
        <div className="coinflip-container">
            <div className="coinflip-wrapper">
                <div className="coinflip-header">
                    <h2 className="coinflip-title">Coin Flip</h2>
                    <p className="coinflip-subtitle">Pick a side, place your bet, double or nothing</p>
                </div>

                {/* Coin stage */}
                <div className="coinflip-stage">
                    <div
                        className={`coinflip-coin ${flipping ? 'is-flipping' : ''}`}
                        style={{ transform: `rotateY(${rotation}deg)` }}
                    >
                        <div className="coinflip-face heads">
                            <span className="coinflip-face-icon">👑</span>
                            <span className="coinflip-face-label">Heads</span>
                        </div>
                        <div className="coinflip-face tails">
                            <span className="coinflip-face-icon">⚡</span>
                            <span className="coinflip-face-label">Tails</span>
                        </div>
                    </div>
                </div>

                {/* Result banner — reserved space so the layout doesn't jump */}
                <div className="coinflip-result-slot">
                    {showResult && result && (
                        <div className={`coinflip-result ${result.won ? 'won' : 'lost'}`}>
                            <span className="coinflip-result-face">
                                {result.face === 'heads' ? '👑 Heads' : '⚡ Tails'}
                            </span>
                            <span className="coinflip-result-verdict">
                                {result.won
                                    ? `You won +${formatCoins(result.payout)}`
                                    : `You lost ${formatCoins(Math.abs(result.payout))}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Side picker */}
                <div className="coinflip-section">
                    <span className="coinflip-label">Your Call</span>
                    <div className="coinflip-choices">
                        <button
                            type="button"
                            className={`coinflip-choice heads ${choice === 'heads' ? 'active' : ''}`}
                            onClick={() => setChoice('heads')}
                            disabled={flipping}
                        >
                            <span className="coinflip-choice-icon">👑</span>
                            <span>Heads</span>
                        </button>
                        <button
                            type="button"
                            className={`coinflip-choice tails ${choice === 'tails' ? 'active' : ''}`}
                            onClick={() => setChoice('tails')}
                            disabled={flipping}
                        >
                            <span className="coinflip-choice-icon">⚡</span>
                            <span>Tails</span>
                        </button>
                    </div>
                </div>

                {/* Stake */}
                <div className="coinflip-section">
                    <div className="coinflip-label-row">
                        <span className="coinflip-label">Bet Amount</span>
                        <span className="coinflip-balance">🪙 {formatCoins(userCoins)}</span>
                    </div>
                    <input
                        type="text"
                        inputMode="decimal"
                        className="coinflip-input"
                        value={amount}
                        onChange={handleAmountChange}
                        placeholder="0"
                        disabled={flipping}
                    />
                    <div className="coinflip-quick">
                        {[['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(([label, pct]) => (
                            <button
                                key={label}
                                type="button"
                                className="coinflip-quick-btn"
                                onClick={() => setPercent(pct)}
                                disabled={flipping || userCoins <= 0}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payout preview */}
                {betValid && (
                    <div className="coinflip-preview">
                        <span>Potential return</span>
                        <span className="coinflip-preview-value">+{formatCoins(bet)}</span>
                    </div>
                )}

                {error && <p className="coinflip-error">{error}</p>}

                <button
                    type="button"
                    className="coinflip-flip-btn"
                    onClick={handleFlip}
                    disabled={!canFlip}
                >
                    {flipping
                        ? 'Flipping…'
                        : !choice
                            ? 'Pick a side'
                            : !amount
                                ? 'Enter a bet'
                                : !betValid
                                    ? (bet > userCoins ? 'Not enough coins' : `Minimum bet is ${MIN_BET}`)
                                    : `Flip for ${formatCoins(bet)}`}
                </button>

                {/* Recent flips */}
                {history.length > 0 && (
                    <div className="coinflip-history">
                        <span className="coinflip-history-title">Recent Flips</span>
                        <div className="coinflip-history-list">
                            {history.map(h => (
                                <div
                                    key={h.id}
                                    className={`coinflip-history-item ${h.won ? 'won' : 'lost'}`}
                                    title={`Called ${h.choice} · landed ${h.face}`}
                                >
                                    <span className="coinflip-history-face">
                                        {h.face === 'heads' ? '👑' : '⚡'}
                                    </span>
                                    <span className="coinflip-history-amount">
                                        {h.won ? '+' : '−'}{formatCoins(Math.abs(h.payout))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
