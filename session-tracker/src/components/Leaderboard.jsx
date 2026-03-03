// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import StyledName from './StyledName';
import '../css/Leaderboard.css';

export default function Leaderboard() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const users = snapshot.docs
                .map((doc) => {
                    const data = doc.data();
                    const totalXp = data.xp ?? 0;
                    const { level } = calculateLevel(totalXp);
                    return {
                        id: doc.id,
                        displayName: data.displayName || 'Anonymous',
                        nameColor: data.nameColor || null,
                        nameEmoji: data.nameEmoji || null,
                        coins: data.coins ?? 0,
                        level,
                    };
                })
                .sort((a, b) => b.coins - a.coins);

            setPlayers(users);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getRankDisplay = (index) => {
        if (index === 0) return '👑';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}`;
    };

    if (loading) {
        return (
            <div className="leaderboard-container">
                <div className="leaderboard-wrapper">
                    <div className="leaderboard-loading">Loading leaderboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-wrapper">
                <div className="leaderboard-header">
                    <h1 className="leaderboard-title">Leaderboard</h1>
                    <p className="leaderboard-subtitle">Top earners by coin balance</p>
                </div>

                {players.length === 0 ? (
                    <div className="leaderboard-empty">No players yet.</div>
                ) : (
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Coins</th>
                                    <th>Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((player, index) => (
                                    <tr
                                        key={player.id}
                                        className={`leaderboard-row ${player.id === user?.uid ? 'leaderboard-row-you' : ''} ${index < 3 ? `leaderboard-row-top${index + 1}` : ''}`}
                                    >
                                        <td className="leaderboard-rank">{getRankDisplay(index)}</td>
                                        <td className="leaderboard-name">
                                            <StyledName
                                                displayName={player.displayName}
                                                nameColor={player.nameColor}
                                                nameEmoji={player.nameEmoji}
                                            />
                                            {player.id === user?.uid && <span className="leaderboard-you-tag">YOU</span>}
                                        </td>
                                        <td className="leaderboard-coins">🪙 {player.coins.toLocaleString()}</td>
                                        <td className="leaderboard-level">Lv. {player.level}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}