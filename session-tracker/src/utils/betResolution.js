// src/utils/betResolution.js
// Handles resolving all pending bets when a session is saved
// Called by SaveButton after the session is written to Firestore

import {
    collectionGroup,  // Query all 'bets' subcollections across users
    getDocs,          // Fetch documents once
    getDoc,           // Fetch a single document
    doc,              // Reference a specific document
    writeBatch,       // Batch multiple writes atomically
} from 'firebase/firestore';
import { db } from '../firebase';

// Checks if a bet's range matches the final count
// Supports: "0–10" (range), "Over 42.5", "Under 42.5"
export const isWinningBet = (range, finalCount) => {
    if (range.toLowerCase().startsWith('over')) {
        return finalCount > parseFloat(range.split(' ')[1]);
    }
    if (range.toLowerCase().startsWith('under')) {
        return finalCount < parseFloat(range.split(' ')[1]);
    }
    // Range bets like "0–10" or "11-20" (handles both dash types)
    const parts = range.split(/[–\-]/);
    if (parts.length === 2) {
        const low = parseFloat(parts[0].trim());
        const high = parseFloat(parts[1].trim());
        return finalCount >= low && finalCount <= high;
    }
    return false;
};

// Fetch a user's current coin balance (needed for batch payouts)
const getCoins = async (userId) => {
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? (userSnap.data().coins || 0) : 0;
};

// Resolves ALL pending bets against the final session count
// Marks each as 'won' or 'lost' and credits winners' coins
export const resolveBets = async (finalCount) => {
    // collectionGroup('bets') fetches bets from ALL users at once
    const betsSnapshot = await getDocs(collectionGroup(db, 'bets'));
    const pendingBets = betsSnapshot.docs.filter(d => d.data().status === 'pending');
    if (pendingBets.length === 0) return { winners: 0, losers: 0 };

    let winners = 0;
    let losers = 0;

    // Firestore batches max out at 500 operations, so we chunk
    const batchSize = 500;
    for (let i = 0; i < pendingBets.length; i += batchSize) {
        const chunk = pendingBets.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const betDoc of chunk) {
            const bet = betDoc.data();
            const won = isWinningBet(bet.range, finalCount);

            // Update the bet document status
            batch.update(betDoc.ref, {
                status: won ? 'won' : 'lost',
                finalCount,
                resolvedAt: new Date().toISOString(),
            });

            if (won) {
                winners++;
                // Navigate up: betDoc.ref -> 'bets' collection -> parent user document
                const userId = betDoc.ref.parent.parent.id;
                const userRef = doc(db, 'users', userId);
                batch.update(userRef, {
                    coins: (bet.potentialPayout || 0) + (await getCoins(userId)),
                });
            } else {
                losers++;
            }
        }
        await batch.commit();
    }
    return { winners, losers };
};