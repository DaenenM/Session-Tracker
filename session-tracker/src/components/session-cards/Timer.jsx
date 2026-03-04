// src/components/session-cards/Timer.jsx
// Stopwatch component with start/stop/reset controls
// Timer logic (intervals, refs) lives in SessionTracker — this is purely presentational

import { useState, useEffect, useRef } from 'react';

export default function Timer({ time, setTime, isRunning, setIsRunning, syncAll, timeRef, sessionStartedAtRef, isRunningRef }) {
    const intervalRef = useRef(null);

    // Format seconds into MM:SS display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Keep ref in sync with state so intervals read the latest value
    useEffect(() => { timeRef.current = time; }, [time]);

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

    // Keep ref and state in sync for isRunning
    const setIsRunningSync = (val) => {
        isRunningRef.current = val;
        setIsRunning(val);
    };

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

    return (
        <div className="form-group">
            <label className="form-label">Session Time</label>
            <div className="stopwatch-display">{formatTime(time)}</div>
            <div className="stopwatch-controls">
                <button type="button" onClick={startTimer} className="stopwatch-btn play"><span>▶</span></button>
                <button type="button" onClick={stopTimer} className="stopwatch-btn pause"><span>❚❚</span></button>
                <button type="button" onClick={resetTimer} className="stopwatch-btn reset"><span className="reset-icon">↺</span></button>
            </div>
        </div>
    );
}