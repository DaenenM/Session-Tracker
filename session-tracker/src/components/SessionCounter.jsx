// src/components/SessionTracker.jsx
import { useState, useEffect, useRef } from "react";

// Firestore imports for database operations
import {
    collection,       // Reference a Firestore collection (e.g., 'sessions')
    addDoc,           // Add a new document to a collection
    collectionGroup,  // Query across ALL subcollections with the same name (e.g., all 'bets' under every user)
    getDocs,          // Fetch all documents from a query once (not real-time)
    doc,              // Reference a specific document by path (e.g., 'users/abc123')
    writeBatch,       // Group multiple writes into one atomic operation (all succeed or all fail)
} from "firebase/firestore";

import { db } from "../firebase";            // Firestore database instance
import { useAuth } from "../context/AuthContext"; // Auth context for current user info

// Realtime Database imports (separate from Firestore — used for live session syncing)
import {
    getDatabase,  // Get the Realtime Database instance
    ref,          // Create a reference to a path in RTDB (e.g., 'liveSession')
    set,          // Write data to an RTDB path (overwrites)
    remove,       // Delete data at an RTDB path
} from "firebase/database";

// Sub-components for each section of the form
import Counter from "./session-cards/Counter";       // +/- count input
import Timer from "./session-cards/Timer";           // Stopwatch with start/stop/reset
import ClassType from "./session-cards/ClassType";   // In-Person / Online toggle
import CurrentAvg from "./session-cards/CurrentAvg"; // Live average (count per minute)

const rtdb = getDatabase(); // Initialize Realtime Database

// --- Local Storage helpers ---
// Backup session data so it survives page refreshes
const saveToLocal = (data) => {
    localStorage.setItem('session_backup', JSON.stringify(data));
};

const clearLocal = () => {
    localStorage.removeItem('session_backup');
};

const loadFromLocal = () => {
    try {
        const raw = localStorage.getItem('session_backup');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

// --- Bet Resolution Logic ---

// Checks if a bet's range matches the final count
// Supports: "0–10" (range), "Over 42.5", "Under 42.5"
const isWinningBet = (range, finalCount) => {
    if (range.toLowerCase().startsWith('over')) {
        const threshold = parseFloat(range.split(' ')[1]);
        return finalCount > threshold;
    }
    if (range.toLowerCase().startsWith('under')) {
        const threshold = parseFloat(range.split(' ')[1]);
        return finalCount < threshold;
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

// Resolves ALL pending bets when a session is saved
// Marks each as 'won' or 'lost' and credits winners' coins
const resolveBets = async (finalCount) => {
    // collectionGroup('bets') fetches bets from ALL users at once
    const betsSnapshot = await getDocs(collectionGroup(db, 'bets'));
    const pendingBets = betsSnapshot.docs.filter(
        (d) => d.data().status === 'pending'
    );

    if (pendingBets.length === 0) return { winners: 0, losers: 0 };

    let winners = 0;
    let losers = 0;

    // Firestore batches max out at 500 operations, so we chunk
    const batchSize = 500;
    for (let i = 0; i < pendingBets.length; i += batchSize) {
        const chunk = pendingBets.slice(i, i + batchSize);
        const batch = writeBatch(db); // Atomic batch — all updates commit together

        for (const betDoc of chunk) {
            const bet = betDoc.data();
            const won = isWinningBet(bet.range, finalCount);

            // Update the bet document status
            batch.update(betDoc.ref, {
                status: won ? 'won' : 'lost',
                finalCount: finalCount,
                resolvedAt: new Date().toISOString(),
            });

            if (won) {
                winners++;
                // betDoc.ref.parent = 'bets' collection, .parent = user document
                const userId = betDoc.ref.parent.parent.id;
                const userRef = doc(db, 'users', userId);
                // Add winnings to the user's coin balance
                batch.update(userRef, {
                    coins: (bet.potentialPayout || 0) + (await getCoins(userId)),
                });
            } else {
                losers++;
            }
        }

        await batch.commit(); // Execute all updates in this batch
    }

    return { winners, losers };
};

// Helper: fetch a user's current coin balance (needed for batch payouts)
const getCoins = async (userId) => {
    const { getDoc } = await import('firebase/firestore');
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? (userSnap.data().coins || 0) : 0;
};

export default function SessionTracker() {
    const { user } = useAuth();           // Current logged-in user
    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null

    const backup = loadFromLocal(); // Restore any unsaved session data

    const [count, setCount] = useState(backup?.count ?? 0);
    const [classType, setClassType] = useState(backup?.classType ?? "");
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(backup?.sessionTime ?? 0);

    // Refs keep values accessible inside intervals/callbacks without re-renders
    const intervalRef = useRef(null);
    const isRunningRef = useRef(false);
    const timeRef = useRef(backup?.sessionTime ?? 0);
    const sessionStartedAtRef = useRef(null);

    // Keep ref and state in sync (ref for intervals, state for UI)
    const setIsRunningSync = (val) => {
        isRunningRef.current = val;
        setIsRunning(val);
    };

    useEffect(() => { timeRef.current = time; }, [time]);

    // Calculate elapsed time from a start point
    const calcTime = (sessionTime, startedAt) => {
        return sessionTime + Math.floor((Date.now() - startedAt) / 1000);
    };

    // Sync session data to both Realtime Database (for live viewers) and localStorage (for backup)
    const syncAll = (overrides = {}) => {
        const data = {
            count,
            classType,
            sessionTime: isRunningRef.current ? 0 : timeRef.current,
            sessionStartedAt: sessionStartedAtRef.current,
            running: isRunningRef.current,
            ...overrides,
        };
        // Push to RTDB so LiveView can show it in real-time
        set(ref(rtdb, 'liveSession'), {
            count: data.count,
            classType: data.classType,
            sessionTime: data.sessionTime,
            sessionStartedAt: data.sessionStartedAt,
            running: data.running,
        });
        // Save to localStorage as crash recovery backup
        saveToLocal({
            count: data.count,
            classType: data.classType,
            sessionTime: data.sessionTime,
        });
    };

    // Re-sync whenever count or classType changes
    useEffect(() => { syncAll(); }, [count, classType]);

    // Timer tick — runs every second while active
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    const startTimer = () => {
        const now = Date.now();
        sessionStartedAtRef.current = now;
        setIsRunningSync(true);
        syncAll({ running: true, sessionStartedAt: now, sessionTime: timeRef.current });
    };

    const stopTimer = () => {
        sessionStartedAtRef.current = null;
        setIsRunningSync(false);
        syncAll({ running: false, sessionStartedAt: null, sessionTime: timeRef.current });
    };

    const resetTimer = () => {
        sessionStartedAtRef.current = null;
        timeRef.current = 0;
        setTime(0);
        setIsRunningSync(false);
        syncAll({ running: false, sessionStartedAt: null, sessionTime: 0 });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Save session to Firestore and resolve all pending bets
    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || (count === 0 && time === 0)) return;

        const currentTime = isRunning ? calcTime(timeRef.current, Date.now()) : timeRef.current;
        if (isRunning) stopTimer();

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

            // 2. Resolve all pending bets based on final count
            const { winners, losers } = await resolveBets(finalCount);
            console.log(`Bets resolved: ${winners} winners, ${losers} losers (final count: ${finalCount})`);

            // 3. Reset everything
            setSaveStatus('saved');
            setCount(0);
            setTime(0);
            setClassType('');
            clearLocal();
            remove(ref(rtdb, 'liveSession')); // Clear live session from RTDB
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Failed to save session:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    return (
        <div className="session-container">
            <form onSubmit={handleSave} className="form-card">
                <h1 className="form-title">Session Tracker</h1>
                <Counter count={count} setCount={setCount} />
                <Timer
                    time={time}
                    formatTime={formatTime}
                    onStart={startTimer}
                    onStop={stopTimer}
                    onReset={resetTimer}
                />
                <ClassType classType={classType} setClassType={setClassType} />
                <CurrentAvg count={count} time={time} />
                <button type="submit" className="submit-btn" disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? 'Error — Try Again' : 'Save Session'}
                </button>
            </form>
        </div>
    );
}