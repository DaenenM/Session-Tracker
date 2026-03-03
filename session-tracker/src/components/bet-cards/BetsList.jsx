// src/components/bet-cards/BetsList.jsx
import { useState, useEffect } from 'react';
import { collectionGroup, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import StyledName from '../StyledName';

export default function BetsList() {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const betsQuery = query(collectionGroup(db, 'bets'));

        const unsubscribe = onSnapshot(
            betsQuery,
            (snapshot) => {
                const allBets = snapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }))
                    .filter((bet) => bet.status === 'pending')
                    .sort((a, b) => {
                        const timeA = a.timestamp?.toMillis?.() || 0;
                        const timeB = b.timestamp?.toMillis?.() || 0;
                        return timeB - timeA;
                    });
                setBets(allBets);
                setLoading(false);
            },
            (error) => {
                console.error('BetsList listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const formatTime = (timestamp) => {
        if (!timestamp?.toDate) return '—';
        const date = timestamp.toDate();
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'won': return 'bet-status-won';
            case 'lost': return 'bet-status-lost';
            default: return 'bet-status-pending';
        }
    };

    if (loading) {
        return <div className="bets-list-loading">Loading bets...</div>;
    }

    return (
        <div className="bets-list-section">
            <h3 className="bets-list-title">All Bets</h3>

            {bets.length === 0 ? (
                <div className="bets-list-empty">No bets placed yet.</div>
            ) : (
                <div className="bets-list-table-wrapper">
                    <table className="bets-list-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Range</th>
                                <th>Amount</th>
                                <th>Multiplier</th>
                                <th>Payout</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => (
                                <tr key={bet.id}>
                                    <td>
                                        <StyledName
                                            displayName={bet.displayName}
                                            nameColor={bet.nameColor}
                                            nameEmoji={bet.nameEmoji}
                                        />
                                    </td>
                                    <td>{bet.range}</td>
                                    <td>🪙 {bet.amount}</td>
                                    <td>{bet.multiplier}x</td>
                                    <td>🪙 {bet.potentialPayout}</td>
                                    <td>
                                        <span className={`bet-status-badge ${getStatusClass(bet.status)}`}>
                                            {bet.status}
                                        </span>
                                    </td>
                                    <td>{formatTime(bet.timestamp)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}