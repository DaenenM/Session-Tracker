// src/components/Bets.jsx
import { useState } from 'react';
import Odds from './bet-cards/Odds';
import PlaceBet from './bet-cards/PlaceBets';
import BetsList from './bet-cards/BetsList';

export default function Bets() {
    const [selectedBet, setSelectedBet] = useState(null);

    const handleSelectBet = (bet) => {
        setSelectedBet(bet);
    };

    return (
        <div className="bets-container">
            <div className="bets-wrapper">
                <div className="bets-header">
                    <h1 className="bets-title">Bets</h1>
                </div>
                
                <div className="bets-content">
                    <Odds onSelectBet={handleSelectBet} />
                    <PlaceBet selectedBet={selectedBet} />
                </div>

                <BetsList />
            </div>
        </div>
    );
}