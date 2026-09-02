import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import calculateRanges from "../../utils/calculateRanges";
import calculateOdds, { calculateOverUnderLine } from "../../utils/calculateOdds";

// Payout multiplier for a range. Very long odds are shown as "x99+" so the
// value can never outgrow its fixed-width pill.
const formatMultiplier = (probability) => {
    const m = 100 / probability;
    return m >= 100 ? 'x99+' : `x${m.toFixed(2)}`;
};

export default function Odds({ onSelectBet }) {
    const [bettingOdds, setBettingOdds] = useState([]);
    const [overUnder, setOverUnder] = useState(null);
    const [activeBet, setActiveBet] = useState(null);
    
    
    useEffect(() => {
        const fetchAndCalculate = async () => {
            const snapshot = await getDocs(collection(db, 'sessions'));
            const sessions = snapshot.docs.map(doc => {
                const data = doc.data();
                return { count: data.count, date: data.date };
            });

            // Range bets keep using the full history
            const counts = sessions.map(s => s.count);
            const ranges = calculateRanges(counts);
            const { odds } = calculateOdds(counts, ranges);
            setBettingOdds(odds);

            // The over/under line comes from recent form only
            setOverUnder(calculateOverUnderLine(sessions));
        };

        fetchAndCalculate();
    }, []);

    // A bucket with a non-positive probability would render as "x-34.48" or
    // "xInfinity". Those rows aren't bettable, so skip them rather than showing
    // a broken price.
    const bettableOdds = bettingOdds.filter(
        (bet) => Number(bet.probability) > 0 && Number.isFinite(Number(bet.probability))
    );

    const handleSelect = (bet) => {
        setActiveBet(bet.label);
        onSelectBet(bet);
    };

    return (
        <div>
            <div className="odds-row">
                {overUnder && (
                    <div className="odds-column">
                        <span className="odds-subtitle">Over / Under</span>
                        <div className="over-under-section">
                            <span className="over-under-label">
                                Line: <span className="over-under-average">{overUnder.line}</span>
                                <span className="over-under-payout">2x payout</span>
                            </span>
                            <div className="over-under-buttons">
                                <button
                                    className={`over-under-button over-button ${activeBet === `Over ${overUnder.line}` ? 'active' : ''}`}
                                    onClick={() => handleSelect({ label: `Over ${overUnder.line}`, lower: overUnder.line, upper: 999, probability: 50, payout: 2 })}
                                >
                                    Over {overUnder.line}
                                </button>
                                <button
                                    className={`over-under-button under-button ${activeBet === `Under ${overUnder.line}` ? 'active' : ''}`}
                                    onClick={() => handleSelect({ label: `Under ${overUnder.line}`, lower: 0, upper: overUnder.line, probability: 50, payout: 2 })}
                                >
                                    Under {overUnder.line}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="odds-column">
                    <span className="odds-subtitle">Range Bets</span>
                    <div className="odds-range-list">
                        {bettableOdds.map((bet, index) => (
                            <button
                                key={index}
                                className={`odds-button ${activeBet === bet.label ? 'active' : ''}`}
                                onClick={() => handleSelect(bet)}
                            >
                                <span className="odds-label">{bet.label}</span>
                                <span className="odds-figures">
                                    <span className="odds-probability">{bet.probability}%</span>
                                    <span className="odds-multiplier">
                                        {formatMultiplier(bet.probability)}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
