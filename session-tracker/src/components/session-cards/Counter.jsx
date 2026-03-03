// src/components/session-cards/Counter.jsx
export default function Counter({ count, setCount }) {
    const increment = () => setCount(c => c + 1);
    const decrement = () => setCount(c => (c > 0 ? c - 1 : 0));

    return (
        <div className="form-group">
            <label className="form-label">Essentially Count</label>
            <div className="counter-wrapper">
                <button type="button" onClick={decrement} className="counter-btn">−</button>
                <input
                    id="countInput"
                    name="count"
                    type="number"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 0)}
                    className="counter-input"
                />
                <button type="button" onClick={increment} className="counter-btn">+</button>
            </div>
        </div>
    );
}