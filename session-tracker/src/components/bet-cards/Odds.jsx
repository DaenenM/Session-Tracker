import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import calculateRanges from "../../utils/calculateRanges";
import calculateOdds from "../../utils/calculateOdds";

export default function Odds({ onSelectBet }) {
    const [bettingOdds, setBettingOdds] = useState([]);
    const [average, setAverage] = useState(null);
    const [activeBet, setActiveBet] = useState(null);
    
    
    useEffect(() => {
        const fetchAndCalculate = async () => {
            const snapshot = await getDocs(collection(db, 'sessions'));
            const counts = snapshot.docs.map(doc => doc.data().count);

            const ranges = calculateRanges(counts);
            const { odds, mean } = calculateOdds(counts, ranges);

            setBettingOdds(odds);
            setAverage(mean);
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
