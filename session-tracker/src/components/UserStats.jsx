// src/components/UserStats.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, getDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import StyledName from './StyledName';

export default function UserStats() {
    const { user, userCoins, userNameColor, userNameEmoji } = useAuth();
    const [wonBets, setWonBets] = useState([]);
    const [lostBets, setLostBets] = useState([]);
    const [pendingBets, setPendingBets] = useState([]);
    const [xp, setXp] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(null); // tracks which bet is being cancelled

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
                setXp(userSnap.data().xp || 0);
            }

            const betsRef = collection(db, 'users', user.uid, 'bets');
            const betsSnap = await getDocs(betsRef);

            const won = [];
            const lost = [];
            const pending = [];

            betsSnap.docs.forEach(d => {
                const bet = { id: d.id, ...d.data() };
                if (bet.status === 'won') won.push(bet);
                else if (bet.status === 'lost') lost.push(bet);
                else if (bet.status === 'pending') pending.push(bet);
            });

            setWonBets(won);
            setLostBets(lost);
            setPendingBets(pending);
            setLoading(false);
        };

        fetchStats();
    }, [user]);

    const handleCancelBet = async (bet) => {
        if (!user || cancelling) return;
        setCancelling(bet.id);

        try {
            // Refund coins
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();

            // Deduct XP gained from placing the bet (if any)
            const xpToRemove = bet.xpGained || 0;
            const newXp = Math.max(0, (userData.xp || 0) - xpToRemove);

            await updateDoc(userRef, {
                coins: (userData.coins || 0) + bet.amount,
                xp: newXp,
            });

            // Delete the bet document
            await deleteDoc(doc(db, 'users', user.uid, 'bets', bet.id));

            // Update local state
            setPendingBets(prev => prev.filter(b => b.id !== bet.id));
            setXp(newXp);
        } catch (err) {
            console.error('Failed to cancel bet:', err);
        } finally {
            setCancelling(null);
        }
    };

    if (loading) {
        return (
            <div className="guard-loading">
                <div className="guard-spinner"></div>
            </div>
        );
    }

    const { level, currentXp, xpForNext } = calculateLevel(xp);
    const xpPercent = xpForNext > 0 ? (currentXp / xpForNext) * 100 : 100;

    const formatCoins = (num) => {
        if (num === undefined || num === null) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    return (
        <div className="userstats-container">
            <div className="userstats-wrapper">
                <div className="userstats-header">
                    <h2 className="userstats-title">My Stats</h2>
                </div>

                <div className="userstats-profile">
                    <div className="userstats-profile-name">
                        <StyledName
                            displayName={user.displayName || 'User'}
                            nameColor={userNameColor}
                            nameEmoji={userNameEmoji}
                        />
                    </div>
                    <span className="userstats-coins">🪙 {formatCoins(userCoins)}</span>
                </div>

                <div className="userstats-level">
                    <div className="userstats-level-header">
                        <span className="userstats-level-label">Level {level}</span>
                        <span className="userstats-xp-text">{currentXp} / {xpForNext} XP</span>
                    </div>
                    <div className="userstats-xp-track">
                        <div className="userstats-xp-fill" style={{ width: `${xpPercent}%` }}></div>
                    </div>
                </div>

                {/* Pending Bets */}
                <div className="userstats-bets-section">
                    <h3 className="userstats-bets-title active">
                        Active Bets <span className="userstats-bets-count">({pendingBets.length})</span>
                    </h3>
                    {pendingBets.length === 0 ? (
                        <p className="userstats-empty">No active bets</p>
                    ) : (
                        <ul className="userstats-bets-list">
                            {pendingBets.map(bet => (
                                <li key={bet.id} className="userstats-bet-item userstats-bet-pending">
                                    <span className="userstats-bet-range">{bet.range}</span>
                                    <span className="userstats-bet-amount">Bet: {formatCoins(bet.amount)}</span>
                                    <span className="userstats-bet-payout">Payout: {formatCoins(bet.potentialPayout)}</span>
                                    <button
                                        className="userstats-cancel-btn"
                                        onClick={() => handleCancelBet(bet)}
                                        disabled={cancelling === bet.id}
                                    >
                                        {cancelling === bet.id ? 'Cancelling...' : 'Cancel'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Won Bets */}
                <div className="userstats-bets-section">
                    <h3 className="userstats-bets-title won">
                        Bets Won <span className="userstats-bets-count">({wonBets.length})</span>
                    </h3>
                    {wonBets.length === 0 ? (
                        <p className="userstats-empty">No wins yet</p>
                    ) : (
                        <ul className="userstats-bets-list">
                            {wonBets.map(bet => (
                                <li key={bet.id} className="userstats-bet-item userstats-bet-won">
                                    <span className="userstats-bet-range">{bet.range}</span>
                                    <span className="userstats-bet-amount">Bet: {formatCoins(bet.amount)}</span>
                                    <span className="userstats-bet-result">+{formatCoins(bet.potentialPayout)}</span>
                                    <span className="userstats-bet-count">Final: {bet.finalCount}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Lost Bets */}
                <div className="userstats-bets-section">
                    <h3 className="userstats-bets-title lost">
                        Bets Lost <span className="userstats-bets-count">({lostBets.length})</span>
                    </h3>
                    {lostBets.length === 0 ? (
                        <p className="userstats-empty">No losses yet</p>
                    ) : (
                        <ul className="userstats-bets-list">
                            {lostBets.map(bet => (
                                <li key={bet.id} className="userstats-bet-item userstats-bet-lost">
                                    <span className="userstats-bet-range">{bet.range}</span>
                                    <span className="userstats-bet-amount">Bet: {formatCoins(bet.amount)}</span>
                                    <span className="userstats-bet-result">-{formatCoins(bet.amount)}</span>
                                    <span className="userstats-bet-count">Final: {bet.finalCount}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}