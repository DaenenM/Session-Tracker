// src/components/bet-cards/PlaceBets.jsx
import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const rtdb = getDatabase();

export default function PlaceBet({ selectedBet }) {
    const [betAmount, setBetAmount] = useState('');
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [placing, setPlacing] = useState(false);
    const { user, userCoins } = useAuth();

    useEffect(() => {
        const sessionRef = ref(rtdb, 'liveSession/running');
        const unsubscribe = onValue(sessionRef, (snapshot) => {
            setIsSessionActive(snapshot.val() === true);
        });
        return () => unsubscribe();
    }, []);

    const calculatePayout = () => {
        if (!selectedBet || !betAmount || betAmount <= 0) return 0;
        const multiplier = 100 / selectedBet.probability;
        return (Number(betAmount) * multiplier).toFixed(2);
    };

    const handlePlaceBet = async () => {
        if (isSessionActive || !selectedBet || !betAmount || betAmount <= 0 || !user) return;

        const amount = Number(betAmount);

        if (amount > userCoins) {
            alert('Not enough coins!');
            return;
        }

        setPlacing(true);

        try {
            const userDocRef = doc(db, 'users', user.uid);
            let userNameColor = null;
            let userNameEmoji = null;

            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) throw new Error('User not found');

                const userData = userSnap.data();
                const currentCoins = userData.coins || 0;
                if (currentCoins < amount) throw new Error('Insufficient coins');

                userNameColor = userData.nameColor || null;
                userNameEmoji = userData.nameEmoji || null;

                transaction.update(userDocRef, {
                    coins: currentCoins - amount,
                });
            });

            await addDoc(collection(db, 'users', user.uid, 'bets'), {
                displayName: user.displayName || 'Anonymous',
                nameColor: userNameColor,
                nameEmoji: userNameEmoji,
                range: selectedBet.label,
                probability: selectedBet.probability,
                amount: amount,
                potentialPayout: Number(calculatePayout()),
                multiplier: Number((100 / selectedBet.probability).toFixed(2)),
                timestamp: serverTimestamp(),
                status: 'pending',
            });

            setBetAmount('');
        } catch (err) {
            console.error('Failed to place bet:', err);
            alert(err.message === 'Insufficient coins' ? 'Not enough coins!' : 'Something went wrong. Try again.');
        } finally {
            setPlacing(false);
        }
    };

    const isBetDisabled = isSessionActive || !selectedBet || !betAmount || betAmount <= 0 || placing || Number(betAmount) > userCoins;

    return (
        <div className="bets-card place-bet-section">
            <div className="place-bet-head">
                <h2 className="bets-card-title">Bet Slip</h2>
                {user && (
                    <span className="coin-balance-box">
                        🪙 <span className="coin-balance-amount">{userCoins}</span>
                    </span>
                )}
            </div>

            {isSessionActive && (
                <div className="session-active-warning">
                    Betting is locked while a session is active
                </div>
            )}

            {selectedBet ? (
                <div className="selected-bet-box">
                    <div className="selected-bet-row">
                        <span className="selected-bet-label">Selection</span>
                        <span className="selected-bet-value">{selectedBet.label}</span>
                    </div>
                    <div className="selected-bet-row">
                        <span className="selected-bet-label">Win Chance</span>
                        <span className="selected-bet-probability">{selectedBet.probability}%</span>
                    </div>
                    <div className="selected-bet-row">
                        <span className="selected-bet-label">Multiplier</span>
                        <span className="selected-bet-value">
                            {(100 / selectedBet.probability).toFixed(2)}x
                        </span>
                    </div>
                </div>
            ) : (
                <div className="no-selection-warning">
                    Select a market to build your slip
                </div>
            )}

            <div className="bet-amount-group">
                <label className="bet-amount-label" htmlFor="betAmount">Stake</label>
                <input
                    id="betAmount"
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    max={userCoins}
                    className="bet-amount-input"
                    disabled={isSessionActive}
                />
                <div className="bet-amount-quick">
                    {[['25%', 0.25], ['50%', 0.5], ['Max', 1]].map(([label, pct]) => (
                        <button
                            key={label}
                            type="button"
                            className="bet-amount-quick-btn"
                            onClick={() => setBetAmount(String(Math.floor(userCoins * pct)))}
                            disabled={isSessionActive || userCoins <= 0}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {betAmount > 0 && Number(betAmount) > userCoins && (
                    <span className="insufficient-coins-warning">Insufficient coins</span>
                )}
            </div>

            {/* Reserved slot keeps the button from jumping as the payout appears */}
            <div className="payout-slot">
                {betAmount > 0 && selectedBet && Number(betAmount) <= userCoins && (
                    <div className="payout-box">
                        <span className="payout-label">Potential Payout</span>
                        <span className="payout-amount">🪙 {calculatePayout()}</span>
                    </div>
                )}
            </div>

            <button
                onClick={handlePlaceBet}
                disabled={isBetDisabled}
                className="place-bet-button"
            >
                {placing
                    ? 'Placing…'
                    : isSessionActive
                        ? 'Betting Locked'
                        : !selectedBet
                            ? 'Select a Market'
                            : !betAmount || betAmount <= 0
                                ? 'Enter a Stake'
                                : 'Place Bet'}
            </button>
        </div>
    );
}
