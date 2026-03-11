// src/components/bet-cards/YourBets.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, deleteDoc, runTransaction } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const rtdb = getDatabase();

export default function YourBets() {
    const { user } = useAuth();
    const [bets, setBets] = useState([]);
    const [isSessionActive, setIsSessionActive] = useState(false);

    // Listen for active session
    useEffect(() => {
        const sessionRef = ref(rtdb, 'liveSession/running');
        const unsubscribe = onValue(sessionRef, (snapshot) => {
            setIsSessionActive(snapshot.val() === true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        const betsRef = collection(db, 'users', user.uid, 'bets');
        const pendingQuery = query(betsRef, where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setBets(items);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCancel = async (bet) => {
        if (!user || isSessionActive) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const betDocRef = doc(db, 'users', user.uid, 'bets', bet.id);

            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) return;

                const currentCoins = userSnap.data().coins || 0;
                transaction.update(userDocRef, { coins: currentCoins + bet.amount });
                transaction.delete(betDocRef);
            });
        } catch (err) {
            console.error('Failed to cancel bet:', err);
        }
    };

    if (!user || bets.length === 0) return null;

    return (
        <div className="your-bets-section">
            <h3 className="your-bets-title">Your Bets</h3>
            {isSessionActive && (
                <div className="session-active-warning">
                    🔒 Cancellations locked during active session
                </div>
            )}
            <div className="your-bets-table-wrapper">
                <table className="your-bets-table">
                    <thead>
                        <tr>
                            <th>Bet Type</th>
                            <th>Amount</th>
                            <th>Payout</th>
                            <th>Cancel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bets.map((bet) => (
                            <tr key={bet.id}>
                                <td>{bet.range}</td>
                                <td>🪙 {bet.amount}</td>
                                <td>🪙 {bet.potentialPayout}</td>
                                <td>
                                    <button
                                        className="your-bets-cancel-btn"
                                        onClick={() => handleCancel(bet)}
                                        disabled={isSessionActive}
                                        title={isSessionActive ? 'Locked during session' : 'Cancel bet and refund coins'}
                                    >
                                        {isSessionActive ? '🔒' : '✕'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}