// src/components/Bets.jsx
import { useState } from 'react';
import Odds from './bet-cards/Odds';
import PlaceBet from './bet-cards/PlaceBets';
import YourBets from './bet-cards/YourBets';
import BetsList from './bet-cards/BetsList';

export default function Bets() {
    const [selectedBet, setSelectedBet] = useState(null);

    return (
        <div className="bets-container">
            <div className="bets-wrapper">
                <div className="bets-header">
                    <h1 className="bets-title">Bets</h1>
                    <p className="bets-subtitle">Pick a market, set your stake, then wait for the count</p>
                </div>

                {/* Markets on the left, bet slip on the right. The slip is narrower
                    and sticks while the longer markets column scrolls past it. */}
                <div className="bets-content">
                    <div className="bets-col bets-col-markets">
                        <section className="bets-card">
                            <h2 className="bets-card-title">Markets</h2>
                            <Odds onSelectBet={setSelectedBet} />
                        </section>
                    </div>

                    <div className="bets-col bets-col-slip">
                        <PlaceBet selectedBet={selectedBet} />
                        <YourBets />
                    </div>
                </div>

                {/* Full-width All Bets table below */}
                <BetsList />
            </div>
        </div>
    );
}
