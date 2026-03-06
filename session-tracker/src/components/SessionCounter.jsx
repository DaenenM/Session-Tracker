// src/components/SessionTracker.jsx

import { useState, useRef } from "react";
import { getDatabase, ref, set } from "firebase/database";

import Counter from "./session-cards/Counter";
import Timer from "./session-cards/Timer";
import ClassType from "./session-cards/ClassType";
import CurrentAvg from "./session-cards/CurrentAvg";
import SaveButton from "./session-cards/SaveButton";

const rtdb = getDatabase();

const saveToLocal = (data) => localStorage.setItem('session_backup', JSON.stringify(data));
const loadFromLocal = () => {
    try {
        const raw = localStorage.getItem('session_backup');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export default function SessionTracker() {
    const backup = loadFromLocal();

    const [count, setCount] = useState(backup?.count ?? 0);
    const [classType, setClassType] = useState(backup?.classType ?? "");
    const [isRunning, setIsRunning] = useState(false);
    const [time, setTime] = useState(backup?.sessionTime ?? 0);

    const countRef = useRef(backup?.count ?? 0);
    const classTypeRef = useRef(backup?.classType ?? "");
    const isRunningRef = useRef(false);
    const timeRef = useRef(backup?.sessionTime ?? 0);
    const sessionStartedAtRef = useRef(null);

    // ✅ Pure function — takes explicit values, no closure deps, safe to call anywhere
    const pushToRTDB = (overrides = {}) => {
        const payload = {
            count: countRef.current,
            classType: classTypeRef.current,
            sessionTime: isRunningRef.current ? 0 : timeRef.current,
            sessionStartedAt: sessionStartedAtRef.current,
            running: isRunningRef.current,
            ...overrides,
        };
        set(ref(rtdb, 'liveSession'), payload);
    };

    const saveAll = (overrides = {}) => {
        saveToLocal({
            count: countRef.current,
            classType: classTypeRef.current,
            sessionTime: timeRef.current,
            ...overrides,
        });
    };

    // syncAll used by Timer and SaveButton (combines both)
    const syncAll = (overrides = {}) => {
        pushToRTDB(overrides);
        saveAll(overrides);
    };

    // ✅ Immediately syncs count to RTDB + localStorage on every change
    const handleSetCount = (val) => {
        const resolved = typeof val === "function" ? val(countRef.current) : val;
        countRef.current = resolved;
        setCount(resolved);
        pushToRTDB({ count: resolved });
        saveAll({ count: resolved });
    };

    // ✅ Immediately syncs classType to RTDB + localStorage on every change
    const handleSetClassType = (val) => {
        classTypeRef.current = val;
        setClassType(val);
        pushToRTDB({ classType: val });
        saveAll({ classType: val });
    };

    const handleReset = () => {
        countRef.current = 0;
        classTypeRef.current = '';
        timeRef.current = 0;
        sessionStartedAtRef.current = null;
        isRunningRef.current = false;
        setCount(0);
        setClassType('');
        setTime(0);
        setIsRunning(false);
    };

    return (
        <div className="session-container">
            <form onSubmit={(e) => e.preventDefault()} className="form-card">
                <h1 className="form-title">Session Tracker</h1>
                <Counter count={count} setCount={handleSetCount} />
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
                <ClassType classType={classType} setClassType={handleSetClassType} />
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