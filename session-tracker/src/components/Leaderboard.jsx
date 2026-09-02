// src/components/Leaderboard.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import StyledName from './StyledName';
import useBetRecords from '../hooks/useBetRecords';
import '../css/Leaderboard.css';

export default function Leaderboard() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { records, loading: recordsLoading } = useBetRecords();

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

    // Records store a userId, so look the player up in the list we already have
    const findPlayer = (userId) => players.find((p) => p.id === userId) || null;

    const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

    // Holder line: styled name plus an optional context tag on the right
    const holderLine = (userId, tag, fallbackName) => {
        const holder = findPlayer(userId);
        return (
            <div className="lb-record-holder">
                {holder ? (
                    <StyledName
                        displayName={holder.displayName}
                        nameColor={holder.nameColor}
                        nameEmoji={holder.nameEmoji}
                    />
                ) : (
                    <span className="lb-record-unknown">{fallbackName || 'Unknown player'}</span>
                )}
                {tag && <span className="lb-record-source">{tag}</span>}
            </div>
        );
    };

    // A plain sub-line for records that belong to the site rather than a player
    const metaLine = (text) => (
        <div className="lb-record-holder">
            <span className="lb-record-meta">{text}</span>
        </div>
    );

    // One tile. Returns null when the record doesn't exist yet so the card stays
    // out of the DOM entirely — it appears on its own once data arrives, since
    // the listeners are live.
    const card = (key, { label, icon, tone, record, value, holder }) => {
        if (!record) return null;
        return (
            <div key={key} className={`lb-record-card ${tone || ''}`}>
                <div className="lb-record-head">
                    <span className="lb-record-icon">{icon}</span>
                    <span className="lb-record-label">{label}</span>
                </div>
                <span className="lb-record-value">{value}</span>
                {holder}
            </div>
        );
    };

    // Coin flips show as "Coin Flip"; range bets show their range label
    const srcTag = (r) => (r.source === 'flip' ? 'Coin Flip' : r.label);

    const { biggestWin, biggestLoss, totalWagered, totalBets } = records;

    const recordCards = [
        card('win', {
            label: 'Largest Amount Won', icon: '🏆', tone: 'win',
            record: biggestWin,
            value: biggestWin && `🪙 ${fmt(biggestWin.value)}`,
            holder: biggestWin && holderLine(biggestWin.userId, srcTag(biggestWin)),
        }),
        card('loss', {
            label: 'Biggest Loss', icon: '💀', tone: 'loss',
            record: biggestLoss,
            value: biggestLoss && `🪙 ${fmt(biggestLoss.value)}`,
            holder: biggestLoss && holderLine(biggestLoss.userId, srcTag(biggestLoss)),
        }),
        card('wagered', {
            label: 'Total Bets Placed', icon: '💰', tone: 'win',
            record: totalBets > 0 ? totalBets : null,
            value: `🪙 ${fmt(totalWagered)}`,
            holder: metaLine(`across ${fmt(totalBets)} wagers`),
        }),
    ].filter(Boolean);

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

                {!recordsLoading && recordCards.length > 0 && (
                    <div className="lb-records-section">
                        <span className="lb-records-title">Hall of Records</span>
                        <div className="lb-records">{recordCards}</div>
                    </div>
                )}

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
