// LiveView.jsx
import { useState, useEffect, useRef } from 'react';
import '../css/Live.css';
import { getDatabase, ref, onValue } from "firebase/database";

const rtdb = getDatabase();

export default function LiveView() {
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(0);
  const [classType, setClassType] = useState('');
  const [pulse, setPulse] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const sessionDataRef = useRef({ sessionTime: 0, sessionStartedAt: null, running: false });

  // Listen to Firebase for live updates
  useEffect(() => {
    const sessionRef = ref(rtdb, 'liveSession');

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setCount(0);
        setTime(0);
        setClassType('');
        setIsActive(false);
        sessionDataRef.current = { sessionTime: 0, sessionStartedAt: null, running: false };
        return;
      }

      const newCount = data.count || 0;
      setCount(prev => {
        if (newCount !== prev) {
          setPulse(true);
          setTimeout(() => setPulse(false), 400);
        }
        return newCount;
      });

      setClassType(data.classType || '');
      setIsActive(data.running || false);
      sessionDataRef.current = {
        sessionTime: data.sessionTime || 0,
        sessionStartedAt: data.sessionStartedAt || null,
        running: data.running || false,
      };
    });

    return () => unsubscribe();
  }, []);

  // Tick the timer locally every second when active
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const { sessionTime, sessionStartedAt } = sessionDataRef.current;
      if (sessionStartedAt) {
        setTime(sessionTime + Math.floor((Date.now() - sessionStartedAt) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="live-container">
      <div className="live-card">
        <div className="live-header">
          <div className="live-header-left">
            <h1 className="live-title">Live Feed</h1>
          </div>
          <div className={`live-status ${isActive ? 'active' : 'idle'}`}>
            <span className="live-status-dot"></span>
            <span className="live-status-text">{isActive ? 'Active' : 'Idle'}</span>
          </div>
        </div>
        <div className="live-section">
          <label className="live-label">Count</label>
          <div className={`live-count-display ${pulse ? 'pulse' : ''}`}>
            <span className="live-count-number">{count}</span>
          </div>
        </div>
        <div className="live-section">
          <label className="live-label">Session Time</label>
          <div className={`live-timer-display ${isActive ? 'running' : ''}`}>
            <span className="live-timer-number">{formatTime(time)}</span>
          </div>
        </div>
        <div className="live-section">
          <label className="live-label">Session Info</label>
          <div className="live-info-row">
            <div className="live-info-chip">
              <span className="live-info-chip-label">Type</span>
              <span className="live-info-chip-value">
                {classType === 'inPerson' ? 'In-Person' : classType === 'online' ? 'Online' : '—'}
              </span>
            </div>
            <div className="live-info-chip">
              <span className="live-info-chip-label">Rate</span>
              <span className="live-info-chip-value">
                {time > 0 ? `${(count / (time / 60)).toFixed(1)}/min` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}