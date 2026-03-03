import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

function calculateStandardDeviation(data) {
    const n = data.length;
    const sum = data.reduce((acc, item) => acc + item.count, 0);
    const mean = sum / n;
    const squaredDifferences = data.map(item => Math.pow(item.count - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / n;
    const stdDev = Math.sqrt(variance);
    return {
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2))
    };
}

function normalCDF(x, mean, stdDev) {
    const z = (x - mean) / stdDev;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - probability : probability;
}

function calculateProbability(lower, upper, mean, stdDev) {
    const pLower = normalCDF(lower, mean, stdDev);
    const pUpper = normalCDF(upper, mean, stdDev);
    return Number(((pUpper - pLower) * 100).toFixed(1));
}

const ranges = [
    { label: '<100', lower: 0, upper: 100 },
    { label: '101-120', lower: 101, upper: 120 },
    { label: '121-140', lower: 121, upper: 140 },
    { label: '141-160', lower: 141, upper: 160 },
    { label: '161-180', lower: 161, upper: 180 },
    { label: '181-200', lower: 181, upper: 200 },
    { label: '201-220', lower: 201, upper: 220 },
    { label: '221-240', lower: 221, upper: 240 },
    { label: '241-260', lower: 241, upper: 260 },
    { label: '261+', lower: 261, upper: 999 }
];

export default function Odds({ onSelectBet }) {
    const [bettingOdds, setBettingOdds] = useState([]);
    const [average, setAverage] = useState(null);
    const [activeBet, setActiveBet] = useState(null);

    useEffect(() => {
        const fetchAndCalculate = async () => {
            const snapshot = await getDocs(collection(db, 'sessions'));
            const sessionCounts = snapshot.docs.map(doc => ({ count: doc.data().count }));

            const stats = calculateStandardDeviation(sessionCounts);
            const odds = ranges.map(range => ({
                ...range,
                probability: calculateProbability(range.lower, range.upper, stats.mean, stats.stdDev)
            }));

            setBettingOdds(odds);
            setAverage(stats.mean);
        };

        fetchAndCalculate();
    }, []);

    const handleSelect = (bet) => {
        setActiveBet(bet.label);
        onSelectBet(bet);
    };

    return (
        <div>
            <div className="odds-row">
                {average !== null && (
                    <div className="odds-column">
                        <span className="odds-subtitle">Over / Under</span>
                        <div className="over-under-section">
                            <span className="over-under-label">
                                Line: <span className="over-under-average">{average}</span>
                                <span className="over-under-payout">2x payout</span>
                            </span>
                            <div className="over-under-buttons">
                                <button
                                    className={`over-under-button over-button ${activeBet === `Over ${average}` ? 'active' : ''}`}
                                    onClick={() => handleSelect({ label: `Over ${average}`, lower: average, upper: 999, probability: 50, payout: 2 })}
                                >
                                    Over {average}
                                </button>
                                <button
                                    className={`over-under-button under-button ${activeBet === `Under ${average}` ? 'active' : ''}`}
                                    onClick={() => handleSelect({ label: `Under ${average}`, lower: 0, upper: average, probability: 50, payout: 2 })}
                                >
                                    Under {average}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="odds-column">
                    <span className="odds-subtitle">Range Bets</span>
                    <div className="odds-range-list">
                        {bettingOdds.map((bet, index) => (
                            <button
                                key={index}
                                className={`odds-button ${activeBet === bet.label ? 'active' : ''}`}
                                onClick={() => handleSelect(bet)}
                            >
                                <span className="odds-label">{bet.label}</span>
                                <span className="odds-probability">{bet.probability}%</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
