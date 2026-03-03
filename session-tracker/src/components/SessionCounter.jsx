// src/components/SessionTracker.jsx
import { useState, useEffect, useRef } from "react";
import { collection, addDoc, collectionGroup, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getDatabase, ref, set, remove } from "firebase/database";
import Counter from "./session-cards/Counter";
import Timer from "./session-cards/Timer";
import ClassType from "./session-cards/ClassType";
import CurrentAvg from "./session-cards/CurrentAvg";

const rtdb = getDatabase();

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

const isWinningBet = (range, finalCount) => {
    if (range.toLowerCase().startsWith('over')) {
        const threshold = parseFloat(range.split(' ')[1]);
        return finalCount > threshold;
    }
    if (range.toLowerCase().startsWith('under')) {
        const threshold = parseFloat(range.split(' ')[1]);
        return finalCount < threshold;
    }

    const parts = range.split(/[–\-]/);
    if (parts.length === 2) {
        const low = parseFloat(parts[0].trim());
        const high = parseFloat(parts[1].trim());
        return finalCount >= low && finalCount <= high;
    }

    return false;
};

const resolveBets = async (finalCount) => {
    const betsSnapshot = await getDocs(collectionGroup(db, 'bets'));
    const pendingBets = betsSnapshot.docs.filter(
        (d) => d.data().status === 'pending'
    );

    if (pendingBets.length === 0) return { winners: 0, losers: 0 };

    let winners = 0;
    let losers = 0;

    const batchSize = 500;
    for (let i = 0; i < pendingBets.length; i += batchSize) {
        const chunk = pendingBets.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const betDoc of chunk) {
            const bet = betDoc.data();
            const won = isWinningBet(bet.range, finalCount);

            batch.update(betDoc.ref, {
                status: won ? 'won' : 'lost',
                finalCount: finalCount,
                resolvedAt: new Date().toISOString(),
            });

            if (won) {
                winners++;
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

const getCoins = async (userId) => {
    const { getDoc } = await import('firebase/firestore');
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? (userSnap.data().coins || 0) : 0;
};

export default function SessionTracker() {
    const { user } = useAuth();
    const [saveStatus, setSaveStatus] = useState(null);

    const backup = loadFromLocal();

    const [count, setCount] = useState(backup?.count ?? 0);
    const [classType, setClassType] = useState(backup?.classType ?? "");
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(backup?.sessionTime ?? 0);
    const intervalRef = useRef(null);
    const isRunningRef = useRef(false);
    const timeRef = useRef(backup?.sessionTime ?? 0);
    const sessionStartedAtRef = useRef(null);

    const setIsRunningSync = (val) => {
        isRunningRef.current = val;
        setIsRunning(val);
    };

    useEffect(() => { timeRef.current = time; }, [time]);

    const calcTime = (sessionTime, startedAt) => {
        return sessionTime + Math.floor((Date.now() - startedAt) / 1000);
    };

    const syncAll = (overrides = {}) => {
        const data = {
            count,
            classType,
            sessionTime: isRunningRef.current ? 0 : timeRef.current,
            sessionStartedAt: sessionStartedAtRef.current,
            running: isRunningRef.current,
            ...overrides,
        };
        set(ref(rtdb, 'liveSession'), {
            count: data.count,
            classType: data.classType,
            sessionTime: data.sessionTime,
            sessionStartedAt: data.sessionStartedAt,
            running: data.running,
        });
        saveToLocal({
            count: data.count,
            classType: data.classType,
            sessionTime: data.sessionTime,
        });
    };

    useEffect(() => { syncAll(); }, [count, classType]);

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

            const { winners, losers } = await resolveBets(finalCount);
            console.log(`Bets resolved: ${winners} winners, ${losers} losers (final count: ${finalCount})`);

            setSaveStatus('saved');
            setCount(0);
            setTime(0);
            setClassType('');
            clearLocal();
            remove(ref(rtdb, 'liveSession'));
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