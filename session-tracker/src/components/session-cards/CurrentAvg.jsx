// src/components/session-cards/CurrentAvg.jsx
export default function CurrentAvg({ count, time }) {
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