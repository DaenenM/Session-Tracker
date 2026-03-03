// src/components/session-cards/Timer.jsx
export default function Timer({ time, formatTime, onStart, onStop, onReset }) {
    return (
        <div className="form-group">
            <label className="form-label">Session Time</label>
            <div className="stopwatch-display">{formatTime(time)}</div>
            <div className="stopwatch-controls">
                <button type="button" onClick={onStart} className="stopwatch-btn play"><span>▶</span></button>
                <button type="button" onClick={onStop} className="stopwatch-btn pause"><span>❚❚</span></button>
                <button type="button" onClick={onReset} className="stopwatch-btn reset"><span className="reset-icon">↺</span></button>
            </div>
        </div>
    );
}