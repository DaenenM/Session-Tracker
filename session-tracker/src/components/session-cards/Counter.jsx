// src/components/session-cards/Counter.jsx
// Handles the +/- count input with increment, decrement, and manual entry

import { useCallback } from 'react';

export default function Counter({ count, setCount }) {
    // Increment by 1
    const increment = useCallback(() => setCount(c => c + 1), [setCount]);

    // Decrement by 1, floor at 0
    const decrement = useCallback(() => setCount(c => (c > 0 ? c - 1 : 0)), [setCount]);

    // Handle manual input — parse to integer, default to 0
    const handleChange = (e) => {
        setCount(parseInt(e.target.value, 10) || 0);
    };

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
                    onChange={handleChange}
                    className="counter-input"
                />
                <button type="button" onClick={increment} className="counter-btn">+</button>
            </div>
        </div>
    );
}