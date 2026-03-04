// src/components/SessionTracker.jsx
// Main session tracking form — orchestrates sub-components
// Each sub-component owns its own logic; this file wires them together

import { useState, useRef } from "react";
import { getDatabase, ref, set } from "firebase/database";

// Sub-components — each handles its own section of the form
import Counter from "./session-cards/Counter";
import Timer from "./session-cards/Timer";
import ClassType from "./session-cards/ClassType";
import CurrentAvg from "./session-cards/CurrentAvg";
import SaveButton from "./session-cards/SaveButton";

const rtdb = getDatabase();

// --- Local Storage helpers ---
// Backup session data so it survives page refreshes
const saveToLocal = (data) => localStorage.setItem('session_backup', JSON.stringify(data));
const loadFromLocal = () => {
    try {
        const raw = localStorage.getItem('session_backup');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export default function SessionTracker() {
    // Restore any unsaved session from localStorage
    const backup = loadFromLocal();

    // --- Shared state across sub-components ---
    const [count, setCount] = useState(backup?.count ?? 0);
    const [classType, setClassType] = useState(backup?.classType ?? "");
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(backup?.sessionTime ?? 0);

    // Refs for timer — accessible inside intervals without causing re-renders
    const isRunningRef = useRef(false);
    const timeRef = useRef(backup?.sessionTime ?? 0);
    const sessionStartedAtRef = useRef(null);

    // Sync to RTDB (for LiveView) and localStorage (for crash recovery)
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

    // Called by SaveButton after a successful save — resets all form state
    const handleReset = () => {
        setCount(0);
        setTime(0);
        setClassType('');
        timeRef.current = 0;
        sessionStartedAtRef.current = null;
        isRunningRef.current = false;
        setIsRunning(false);
    };

    return (
        <div className="session-container">
            <form onSubmit={(e) => e.preventDefault()} className="form-card">
                <h1 className="form-title">Session Tracker</h1>
                <Counter count={count} setCount={setCount} />
                <Timer
                    time={time}
                    setTime={setTime}
                    isRunning={isRunning}
                    setIsRunning={setIsRunning}
                    syncAll={syncAll}
                    timeRef={timeRef}
                    sessionStartedAtRef={sessionStartedAtRef}
                    isRunningRef={isRunningRef}
                />
                <CurrentAvg count={count} time={time} />
                <ClassType classType={classType} setClassType={setClassType} />
                <SaveButton
                    count={count}
                    time={time}
                    classType={classType}
                    isRunning={isRunning}
                    onReset={handleReset}
                    timeRef={timeRef}
                    isRunningRef={isRunningRef}
                    sessionStartedAtRef={sessionStartedAtRef}
                    syncAll={syncAll}
                />
            </form>
        </div>
    );
}