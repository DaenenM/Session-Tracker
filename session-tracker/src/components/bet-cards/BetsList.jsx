// src/components/bet-cards/BetsList.jsx
import { useState, useEffect } from 'react';
import { collectionGroup, collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import StyledName from '../StyledName';

export default function BetsList() {
    const [bets, setBets] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersMap = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                usersMap[doc.id] = {
                    displayName: data.displayName || 'Anonymous',
                    nameColor: data.nameColor || null,
                    nameEmoji: data.nameEmoji || null,
                };
            });
            setUsers(usersMap);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const betsQuery = query(collectionGroup(db, 'bets'));
        const unsubscribe = onSnapshot(
            betsQuery,
            (snapshot) => {
                const allBets = snapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        userId: doc.ref.parent.parent.id,
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
                            </tr>
                        </thead>
                        <tbody>
                            {bets.map((bet) => {
                                const userData = users[bet.userId] || {};
                                return (
                                    <tr key={bet.id}>
                                        <td>
                                            <StyledName
                                                displayName={userData.displayName || bet.displayName || 'Anonymous'}
                                                nameColor={userData.nameColor}
                                                nameEmoji={userData.nameEmoji}
                                            />
                                        </td>
                                        <td>{bet.range}</td>
                                        <td>🪙 {bet.amount}</td>
                                        <td>{bet.multiplier}x</td>
                                        <td>🪙 {bet.potentialPayout}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}