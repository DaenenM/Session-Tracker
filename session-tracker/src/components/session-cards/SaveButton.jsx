// src/components/session-cards/SaveButton.jsx
// Handles saving the session to Firestore, resolving all pending bets,
// and resetting the form state after a successful save

import { useState } from 'react';
import {
    collection,       // Reference a Firestore collection
    addDoc,           // Add a new document
    collectionGroup,  // Query all 'bets' subcollections across users
    getDocs,          // Fetch documents once
    doc,              // Reference a specific document
    writeBatch,       // Batch multiple writes atomically
} from 'firebase/firestore';
import { getDatabase, ref, remove } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const rtdb = getDatabase();

// --- Bet Resolution Logic ---

// Checks if a bet's range matches the final count
// Supports: "0–10" (range), "Over 42.5", "Under 42.5"
const isWinningBet = (range, finalCount) => {
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
    const { getDoc } = await import('firebase/firestore');
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? (userSnap.data().coins || 0) : 0;
};

// Resolves ALL pending bets when a session is saved
// Marks each as 'won' or 'lost' and credits winners' coins
const resolveBets = async (finalCount) => {
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
                // betDoc.ref.parent = 'bets' collection, .parent = user document
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

export default function SaveButton({ count, time, classType, isRunning, onReset, timeRef, isRunningRef, sessionStartedAtRef, syncAll }) {
    const { user } = useAuth();
    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null

    // Calculate elapsed time accounting for running timer
    const calcTime = (sessionTime, startedAt) => {
        return sessionTime + Math.floor((Date.now() - startedAt) / 1000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || (count === 0 && time === 0)) return;

        // Get the final time — if timer is running, calculate from start point
        const currentTime = isRunning ? calcTime(timeRef.current, Date.now()) : timeRef.current;

        // Stop timer if it's still running before saving
        if (isRunning) {
            sessionStartedAtRef.current = null;
            isRunningRef.current = false;
            syncAll({ running: false, sessionStartedAt: null, sessionTime: timeRef.current });
        }

        // Calculate session stats
        const finalCount = count;
        const timeInMinutes = Math.round(currentTime / 60);
        const timeDecimal = parseFloat((currentTime / 60).toFixed(2));
        const avgPerMin = currentTime > 0 ? parseFloat((count / (currentTime / 60)).toFixed(2)) : 0;

        setSaveStatus('saving');
        try {
            // 1. Save session record to Firestore
            await addDoc(collection(db, 'sessions'), {
                userId: user.uid,
                userName: user.displayName || 'Unknown',
                date: new Date().toISOString(),
                classType: classType || 'unknown',
                timeSeconds: currentTime,
                timeMinutes: timeInMinutes,
                timeDecimal,
                count: finalCount,
                avgPerMin,
            });

            // 2. Resolve all pending bets against the final count
            const { winners, losers } = await resolveBets(finalCount);
            console.log(`Bets resolved: ${winners} winners, ${losers} losers (final count: ${finalCount})`);

            // 3. Reset form and clear live session
            setSaveStatus('saved');
            onReset(); // Reset count, time, classType in parent
            localStorage.removeItem('session_backup');
            remove(ref(rtdb, 'liveSession')); // Clear live session from RTDB
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Failed to save session:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    return (
        <button
            type="submit"
            className="submit-btn"
            disabled={saveStatus === 'saving'}
            onClick={handleSave}
        >
            {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? '✓ Saved!'
                : saveStatus === 'error'
                ? 'Error — Try Again'
                : 'Save Session'}
        </button>
    );
}