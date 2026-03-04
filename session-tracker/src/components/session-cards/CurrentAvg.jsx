// src/components/session-cards/CurrentAvg.jsx
// Displays the live average count per minute
// Recalculates every render as count and time change

export default function CurrentAvg({ count, time }) {
    // Avoid division by zero — show 0.0 if timer hasn't started
    const avg = time > 0 ? (count / (time / 60)).toFixed(1) : '0.0';

    return (
        <div className="form-group">
            <div className="live-avg-display">
                <span className="live-avg-number">{avg}</span>
                <span className="live-avg-unit">/min</span>
            </div>
        </div>
    );
}