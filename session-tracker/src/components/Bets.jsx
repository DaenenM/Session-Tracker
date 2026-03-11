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
                </div>

                {/* Top section: Odds left, Place Bet + Your Bets right */}
                <div className="bets-content">
                    <div className="bets-left">
                        <Odds onSelectBet={setSelectedBet} />
                    </div>
                    <div className="bets-right">
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