// src/components/Games.jsx
// Hub listing the casino games, so the nav carries one entry instead of one
// per game.

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/Games.css';

const GAMES = [
    {
        icon: '🪙',
        title: 'Coin Flip',
        path: '/coinflip',
        accent: '#facc15',
        tagline: 'Double or nothing',
        description: 'Call heads or tails and flip for an even-money payout.',
        odds: '2x payout · 50% chance',
    },
    {
        icon: '🎡',
        title: 'Roulette',
        path: '/roulette',
        accent: '#ef4444',
        tagline: 'Play against everyone',
        description: 'Back red, black or green on a shared wheel that spins for the whole table.',
        odds: '2x red / black · 14x green',
    },
];

export default function Games() {
    const navigate = useNavigate();
    const { user, userCoins } = useAuth();

    const fmt = (n) =>
        Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return (
        <div className="games-container">
            <div className="games-wrapper">
                <div className="games-header">
                    <h1 className="games-title">Games</h1>
                    <p className="games-subtitle">
                        Every wager earns XP
                    </p>
                    {user && (
                        <span className="games-balance">🪙 {fmt(userCoins)}</span>
                    )}
                </div>

                <div className="games-grid">
                    {GAMES.map((game) => (
                        <button
                            key={game.path}
                            className="game-card"
                            style={{ '--accent': game.accent }}
                            onClick={() => navigate(game.path)}
                        >
                            <span className="game-card-icon">{game.icon}</span>
                            <span className="game-card-tagline">{game.tagline}</span>
                            <span className="game-card-title">{game.title}</span>
                            <span className="game-card-desc">{game.description}</span>
                            <span className="game-card-odds">{game.odds}</span>
                            <span className="game-card-cta">
                                Play <span className="game-card-arrow">→</span>
                            </span>
                        </button>
                    ))}
                </div>

                {!user && (
                    <p className="games-signin">Sign in to play.</p>
                )}
            </div>
        </div>
    );
}
