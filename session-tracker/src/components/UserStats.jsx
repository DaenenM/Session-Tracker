// src/components/UserStats.jsx
import { useState, useEffect } from 'react';
import { collection, query, getDocs, getDoc, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import StyledName from './StyledName';

export default function UserStats() {
    const { user, userCoins, userNameColor, userNameEmoji } = useAuth();
    const [wonBets, setWonBets] = useState([]);
    const [lostBets, setLostBets] = useState([]);
    const [levelData, setLevelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [winnings, setWinnings] = useState(0);


    // Real-time XP listener (same as homepage)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const totalXp = docSnap.data().xp ?? 0;
                setLevelData(calculateLevel(totalXp));
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch bets
    useEffect(() => {
        if (!user) return;

        const fetchBets = async () => {
            const betsRef = collection(db, 'users', user.uid, 'bets');
            const betsSnap = await getDocs(betsRef);

            const won = [];
            const lost = [];
            const pending = [];
            let totalWinnings = 0

            betsSnap.docs.forEach(d => {
                const bet = { id: d.id, ...d.data() };
                if (bet.status === 'won'){
                    won.push(bet);
                    totalWinnings += bet.potentialPayout
                } 
                else if (bet.status === 'lost') lost.push(bet);
                else if (bet.status === 'pending') pending.push(bet);
            });
            setWonBets(won);
            setLostBets(lost);
            setLoading(false);
            setWinnings(totalWinnings);
        };

        fetchBets();
    }, [user]);

    if (loading) {
        return (
            <div className="guard-loading">
                <div className="guard-spinner"></div>
            </div>
        );
    }

    const xpProgress = levelData
        ? (levelData.currentXp / levelData.xpForNextLevel) * 100
        : 0;

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

                {/* XP Bar (same style as homepage) */}
                {levelData && (
                    <div className="userstats-xp-section">
                        <div className="userstats-xp-header">
                            <span className="userstats-xp-level">Level {levelData.level}</span>
                            <span className="userstats-xp-count">{levelData.currentXp} / {levelData.xpForNextLevel} XP</span>
                        </div>
                        <div className="userstats-xp-track">
                            <div className="userstats-xp-fill" style={{ width: `${xpProgress}%` }} />
                        </div>
                    </div>
                )}
                <div className='grid grid-cols-2'>
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
                        <h3 className="userstats-bets-title winnings">
                            Total Winnings <span className="userstats-bets-count">+{winnings}</span>
                        </h3>
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
        </div>
    );
}