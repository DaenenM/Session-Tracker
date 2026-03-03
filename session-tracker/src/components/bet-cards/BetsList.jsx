// src/components/bet-cards/BetsList.jsx

import { useState, useEffect } from 'react';

// Firestore imports
import {
    collectionGroup,  // Query across ALL 'bets' subcollections under every user
    collection,       // Reference a top-level collection (e.g., 'users')
    onSnapshot,       // Real-time listener — fires whenever data changes
    query,            // Build a Firestore query
} from 'firebase/firestore';

import { db } from '../../firebase';       // Firestore instance
import StyledName from '../StyledName';     // Renders display name with equipped color/emoji

export default function BetsList() {
    const [bets, setBets] = useState([]);       // All pending bets from every user
    const [users, setUsers] = useState({});     // Map of userId -> { displayName, nameColor, nameEmoji }
    const [loading, setLoading] = useState(true);

    // --- Listen to all users for live cosmetic data ---
    // This ensures name colors/emojis update instantly when someone equips new ones
    // Stored as a map: { "abc123": { displayName: "Daenen", nameColor: "#f87171", nameEmoji: "🔥" } }
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

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    // --- Listen to all bets across every user ---
    // collectionGroup('bets') queries users/{uid}/bets for ALL users at once
    // We filter to only 'pending' bets and sort newest first (client-side to avoid needing a Firestore index)
    useEffect(() => {
        const betsQuery = query(collectionGroup(db, 'bets'));

        const unsubscribe = onSnapshot(
            betsQuery,
            (snapshot) => {
                const allBets = snapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        // Navigate up the ref path: doc.ref -> 'bets' collection -> parent user document
                        userId: doc.ref.parent.parent.id,
                        ...doc.data(),
                    }))
                    .filter((bet) => bet.status === 'pending') // Only show unresolved bets
                    .sort((a, b) => {
                        // Sort by timestamp descending (newest first)
                        const timeA = a.timestamp?.toMillis?.() || 0;
                        const timeB = b.timestamp?.toMillis?.() || 0;
                        return timeB - timeA;
                    });
                setBets(allBets);
                setLoading(false);
            },
            (error) => {
                // If the query fails (e.g., missing index), stop the loading spinner
                console.error('BetsList listener error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    // Format Firestore Timestamp into a readable string like "Mar 3, 10:45 PM"
    const formatTime = (timestamp) => {
        if (!timestamp?.toDate) return '—'; // serverTimestamp() is null until written
        const date = timestamp.toDate();
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Map bet status to CSS class for badge styling
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
                            {bets.map((bet) => {
                                // Look up the user's CURRENT cosmetics from the users map
                                // This is live — if they change color in the shop, it updates here instantly
                                const userData = users[bet.userId] || {};
                                return (
                                    <tr key={bet.id}>
                                        <td>
                                            {/* Use live user data for color/emoji, fall back to bet data if user not found */}
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
                                        <td>
                                            <span className={`bet-status-badge ${getStatusClass(bet.status)}`}>
                                                {bet.status}
                                            </span>
                                        </td>
                                        <td>{formatTime(bet.timestamp)}</td>
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