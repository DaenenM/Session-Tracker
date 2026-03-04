// src/components/session-cards/SaveButton.jsx
// Handles saving the session to Firestore, resolving bets, and resetting the form

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { getDatabase, ref, remove } from 'firebase/database';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { resolveBets } from '../../utils/betResolution';

const rtdb = getDatabase();

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
            onReset();
            localStorage.removeItem('session_backup');
            remove(ref(rtdb, 'liveSession'));
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