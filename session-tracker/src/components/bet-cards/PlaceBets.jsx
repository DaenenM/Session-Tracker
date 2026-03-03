// src/components/bet-cards/PlaceBets.jsx
import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateLevel, getXpForBet } from '../../utils/leveling';

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

                const currentXp = userData.xp || 0;
                const xpGain = getXpForBet(amount);
                const newXp = currentXp + xpGain;

                const oldLevel = calculateLevel(currentXp).level;
                const newLevel = calculateLevel(newXp).level;
                const levelUpBonus = (newLevel - oldLevel) * 100;

                transaction.update(userDocRef, {
                    coins: currentCoins - amount + levelUpBonus,
                    xp: newXp,
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
        <div className="place-bet-section">
            <h3 className="place-bet-title">Place Your Bet</h3>

            {user && (
                <div className="coin-balance-box">
                    🪙 <span className="coin-balance-amount">{userCoins}</span> coins
                </div>
            )}

            {isSessionActive && (
                <div className="session-active-warning">
                    🔴 Betting is locked while a session is active
                </div>
            )}

            {selectedBet ? (
                <div className="selected-bet-box">
                    <div className="selected-bet-row">
                        <span className="selected-bet-label">Selected Range:</span>
                        <span className="selected-bet-value">{selectedBet.label}</span>
                    </div>
                    <div className="selected-bet-row">
                        <span className="selected-bet-label">Win Probability:</span>
                        <span className="selected-bet-probability">{selectedBet.probability}%</span>
                    </div>
                </div>
            ) : (
                <div className="no-selection-warning">
                    💡 Select a range above to get started
                </div>
            )}

            <div className="bet-amount-group">
                <label className="bet-amount-label">Bet Amount (coins)</label>
                <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="1"
                    max={userCoins}
                    className="bet-amount-input"
                    disabled={isSessionActive}
                />
                {betAmount > 0 && Number(betAmount) > userCoins && (
                    <span className="insufficient-coins-warning">Insufficient coins</span>
                )}
            </div>

            {betAmount > 0 && selectedBet && Number(betAmount) <= userCoins && (
                <div className="payout-box">
                    <div className="payout-row">
                        <span>Potential Payout:</span>
                        <span className="payout-amount">{calculatePayout()} coins</span>
                    </div>
                    <div className="payout-multiplier">
                        Multiplier: {(100 / selectedBet.probability).toFixed(2)}x
                    </div>
                </div>
            )}

            <button
                onClick={handlePlaceBet}
                disabled={isBetDisabled}
                className="place-bet-button"
            >
                {placing ? '⏳ Placing...' : isSessionActive ? '🔒 Betting Locked' : '🎲 Place Bet'}
            </button>
        </div>
    );
}