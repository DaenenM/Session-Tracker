// src/components/UserStats.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import StyledName from './StyledName';

export default function UserStats() {
    const { user, userCoins, userNameColor, userNameEmoji } = useAuth();
    const [wonBets, setWonBets] = useState([]);
    const [lostBets, setLostBets] = useState([]);
    const [levelData, setLevelData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [winnings, setWinnings] = useState(0);
    const [wagered, setWagered] = useState(0);

    // Real-time XP listener (same as homepage)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const totalXp = docSnap.data().xp ?? 0;
                setLevelData(calculateLevel(totalXp));
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch bets
    useEffect(() => {
        if (!user) return;

        const fetchBets = async () => {
            const betsRef = collection(db, 'users', user.uid, 'bets');
            const betsSnap = await getDocs(betsRef);

            const won = [];
            const lost = [];
            let totalWinnings = 0;
            let totalWagered = 0;

            betsSnap.docs.forEach(d => {
                const bet = { id: d.id, ...d.data() };
                if (bet.status === 'won') {
                    won.push(bet);
                    totalWinnings += bet.potentialPayout ?? 0;
                    totalWagered += bet.amount ?? 0;
                } else if (bet.status === 'lost') {
                    lost.push(bet);
                    totalWagered += bet.amount ?? 0;
                }
            });

            setWonBets(won);
            setLostBets(lost);
            setWinnings(totalWinnings);
            setWagered(totalWagered);
            setLoading(false);
        };

        fetchBets();
    }, [user]);

    if (loading) {
        return (
            <div className="guard-loading">
                <div className="guard-spinner"></div>
            </div>
        );
    }

    const xpProgress = levelData
        ? (levelData.currentXp / levelData.xpForNextLevel) * 100
        : 0;

    // Whole coins stay clean; fractional amounts (payouts are 2dp) never show
    // floating-point tails like 1234.5600000000002 from summing them
    const formatCoins = (num) => {
        if (num === undefined || num === null) return '0';
        const n = Number(num);
        if (!Number.isFinite(n)) return '0';
        // Collapse -0 and tiny negatives that round to zero, so no "-0" can render
        const safe = Math.abs(n) < 0.005 ? 0 : n;
        return safe.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    // Net always carries 2dp (including trailing zeros) so the figure reads as an
    // exact currency amount rather than shifting width as balances change
    const formatExact = (num) => {
        const n = Number(num);
        if (!Number.isFinite(n)) return '0.00';
        const safe = Math.abs(n) < 0.005 ? 0 : n;
        return safe.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const settled = wonBets.length + lostBets.length;
    const winRate = settled > 0 ? Math.round((wonBets.length / settled) * 100) : 0;
    // Net is winnings minus everything staked across settled bets. Rounded to 2dp
    // up front so the sign test can't render a floating-point crumb as "−0".
    const net = Math.round((winnings - wagered) * 100) / 100;

    // Both columns share the same row markup, so keep it in one place
    const renderBet = (bet, outcome) => (
        <li key={bet.id} className={`userstats-bet-item userstats-bet-${outcome}`}>
            <span className="userstats-bet-range">{bet.range}</span>
            <span className="userstats-bet-amount">{formatCoins(bet.amount)}</span>
            <span className="userstats-bet-result">
                {outcome === 'won'
                    ? `+${formatCoins(bet.potentialPayout)}`
                    : `-${formatCoins(bet.amount)}`}
            </span>
            <span className="userstats-bet-count">{bet.finalCount}</span>
        </li>
    );

    return (
        <div className="userstats-container">
            <div className="userstats-wrapper">
                <div className="userstats-header">
                    <h2 className="userstats-title">My Stats</h2>
                </div>

                <div className="userstats-profile">
                    <div className="userstats-profile-name">
                        <StyledName
                            displayName={user.displayName || 'User'}
                            nameColor={userNameColor}
                            nameEmoji={userNameEmoji}
                        />
                    </div>
                    <span className="userstats-coins">🪙 {formatCoins(userCoins)}</span>
                </div>

                {/* XP Bar (same style as homepage) */}
                {levelData && (
                    <div className="userstats-xp-section">
                        <div className="userstats-xp-header">
                            <span className="userstats-xp-level">Level {levelData.level}</span>
                            <span className="userstats-xp-count">
                                {levelData.currentXp} / {levelData.xpForNextLevel} XP
                            </span>
                        </div>
                        <div className="userstats-xp-track">
                            <div className="userstats-xp-fill" style={{ width: `${xpProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Headline numbers, so the totals aren't buried under a column */}
                <div className="userstats-summary">
                    <div className="userstats-summary-card">
                        <span className="userstats-summary-label">Record</span>
                        <span className="userstats-summary-value">
                            {wonBets.length}<span className="userstats-summary-sep">–</span>{lostBets.length}
                        </span>
                    </div>
                    <div className="userstats-summary-card">
                        <span className="userstats-summary-label">Win Rate</span>
                        <span className="userstats-summary-value">{winRate}%</span>
                    </div>
                    <div className="userstats-summary-card">
                        <span className="userstats-summary-label">Winnings</span>
                        <span className="userstats-summary-value gold">+{formatCoins(winnings)}</span>
                    </div>
                    <div className="userstats-summary-card">
                        <span className="userstats-summary-label">Net</span>
                        <span className={`userstats-summary-value ${net >= 0 ? 'positive' : 'negative'}`}>
                            {net >= 0 ? '+' : '−'}{formatExact(Math.abs(net))}
                        </span>
                    </div>
                </div>

                <div className="userstats-columns">
                    {/* Won Bets */}
                    <section className="userstats-bets-section">
                        <h3 className="userstats-bets-title won">
                            Bets Won <span className="userstats-bets-count">{wonBets.length}</span>
                        </h3>
                        {wonBets.length === 0 ? (
                            <p className="userstats-empty">No wins yet</p>
                        ) : (
                            <>
                                <div className="userstats-bets-head">
                                    <span>Range</span>
                                    <span>Bet</span>
                                    <span>Result</span>
                                    <span>Final</span>
                                </div>
                                <ul className="userstats-bets-list">
                                    {wonBets.map(bet => renderBet(bet, 'won'))}
                                </ul>
                            </>
                        )}
                    </section>

                    {/* Lost Bets */}
                    <section className="userstats-bets-section">
                        <h3 className="userstats-bets-title lost">
                            Bets Lost <span className="userstats-bets-count">{lostBets.length}</span>
                        </h3>
                        {lostBets.length === 0 ? (
                            <p className="userstats-empty">No losses yet</p>
                        ) : (
                            <>
                                <div className="userstats-bets-head">
                                    <span>Range</span>
                                    <span>Bet</span>
                                    <span>Result</span>
                                    <span>Final</span>
                                </div>
                                <ul className="userstats-bets-list">
                                    {lostBets.map(bet => renderBet(bet, 'lost'))}
                                </ul>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
