// src/components/Home.jsx
// Landing page. The route is public, so this renders two different pages:
// a pitch for signed-out visitors, and a dashboard for signed-in users.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { calculateLevel } from '../utils/leveling';
import CrateOpener from './home-cards/CrateOpener';
import '../css/Home.css';
import useActiveBets from '../hooks/useActiveBets';
import useCrateStatus from '../hooks/useCrateStatus';

// Every destination on the site, so this actually works as a map
const FEATURES = [
  {
    icon: '📡', title: 'Live', path: '/live', accent: '#4ade80',
    description: 'Watch the count climb in real time.',
  },
  {
    icon: '🎲', title: 'Bets', path: '/bets', accent: '#f87171',
    description: 'Back a range before the session starts.',
  },
  {
    icon: '🎮', title: 'Games', path: '/games', accent: '#facc15',
    description: 'Coin flip and roulette. Every wager earns XP.',
  },
  {
    icon: '📊', title: 'Stats', path: '/stats', accent: '#fbbf24',
    description: 'Trends, averages, and session history.',
  },
  {
    icon: '🏆', title: 'Leaderboard', path: '/leaderboard', accent: '#c084fc',
    description: 'See who is up and who is chasing.',
  },
  {
    icon: '💰', title: 'Shop', path: '/shop', accent: '#38bdf8',
    description: 'Spend winnings on name colors and emoji.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, userCoins } = useAuth();
  const activeBetCount = useActiveBets();
  const crate = useCrateStatus();

  // Level data derived from total XP — { level, currentXp, xpForNextLevel }
  const [levelData, setLevelData] = useState(null);

  // Controls whether the crate modal is visible
  const [showCrate, setShowCrate] = useState(false);

  // --- Real-time listener for user stats ---
  // onSnapshot rather than getDoc so the XP bar updates the moment the user
  // claims a crate, places a bet, or gains XP from any source
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

  const xpProgress = levelData
    ? (levelData.currentXp / levelData.xpForNextLevel) * 100
    : 0;

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const featureGrid = (
    <div className="features-grid">
      {FEATURES.map((feature, index) => (
        <button
          key={feature.path}
          className="feature-card"
          style={{ '--accent': feature.accent, animationDelay: `${0.1 + index * 0.06}s` }}
          onClick={() => navigate(feature.path)}
        >
          <span className="feature-icon">{feature.icon}</span>
          <span className="feature-text">
            <span className="feature-title">{feature.title}</span>
            <span className="feature-desc">{feature.description}</span>
          </span>
          <span className="feature-arrow">→</span>
        </button>
      ))}
    </div>
  );

  // ---------- Signed out: explain the site and ask for a sign-up ----------
  if (!user) {
    return (
      <div className="home-container">
        <div className="home-content">
          <section className="hero-section hero-centered">
            <span className="hero-badge">Live session betting</span>
            <h1 className="hero-title">
              The Session Tracker<span className="hero-dot">.</span>
            </h1>
            <p className="hero-subtitle">
              Track how many times the word gets said, bet on the final count,
              and climb the leaderboard against everyone else in the room.
            </p>
            <div className="hero-actions">
              <button className="hero-btn hero-btn-primary" onClick={() => navigate('/register')}>
                Create Account
                <span className="hero-btn-arrow">→</span>
              </button>
              <button className="hero-btn hero-btn-secondary" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
            <button className="hero-link" onClick={() => navigate('/live')}>
              or watch a live session first
            </button>
          </section>

          <section className="how-section">
            <h2 className="section-title">How it works</h2>
            <ol className="how-steps">
              <li className="how-step">
                <span className="how-step-num">1</span>
                <span className="how-step-title">A session starts</span>
                <span className="how-step-desc">
                  The counter runs live while class is on. Betting locks once it begins.
                </span>
              </li>
              <li className="how-step">
                <span className="how-step-num">2</span>
                <span className="how-step-title">Back a range</span>
                <span className="how-step-desc">
                  Pick over/under or a tighter range. Longer odds pay more.
                </span>
              </li>
              <li className="how-step">
                <span className="how-step-num">3</span>
                <span className="how-step-title">Get paid out</span>
                <span className="how-step-desc">
                  Winnings and XP land automatically when the final count is saved.
                </span>
              </li>
            </ol>
          </section>

          <section className="features-section">
            <h2 className="section-title">Explore</h2>
            {featureGrid}
          </section>
        </div>
      </div>
    );
  }

  // ---------- Signed in: personal dashboard ----------
  const firstName = (user.displayName || 'there').split(' ')[0];

  return (
    <div className="home-container">
      <div className="home-content">

        <section className="hero-section">
          <span className="hero-badge">Welcome back</span>
          <h1 className="hero-title">
            {firstName}<span className="hero-dot">.</span>
          </h1>
          <p className="hero-subtitle">
            Here is where you stand. Jump back into a session or place your next bet.
          </p>
          <div className="hero-actions">
            <button className="hero-btn hero-btn-primary" onClick={() => navigate('/live')}>
              Watch Live
              <span className="hero-btn-arrow">→</span>
            </button>
            <button className="hero-btn hero-btn-secondary" onClick={() => navigate('/bets')}>
              Place a Bet
            </button>
          </div>
        </section>

        {/* Snapshot: coins, level with inline XP progress, open bets */}
        <section className="dash-grid">
          <div className="dash-card">
            <span className="dash-label">Balance</span>
            <span className="dash-value gold">🪙 {fmt(userCoins)}</span>
          </div>

          <div className="dash-card dash-card-level">
            <div className="dash-level-head">
              <span className="dash-label">Level</span>
              {levelData && (
                <span className="dash-xp-count">
                  {fmt(levelData.currentXp)} / {fmt(levelData.xpForNextLevel)} XP
                </span>
              )}
            </div>
            <span className="dash-value">{levelData?.level ?? '—'}</span>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <button className="dash-card dash-card-action" onClick={() => navigate('/bets')}>
            <span className="dash-label">Open Bets</span>
            <span className="dash-value">{activeBetCount}</span>
            <span className="dash-hint">
              {activeBetCount > 0 ? 'View your slips →' : 'Place your first bet →'}
            </span>
          </button>
        </section>

        {/* Daily crate — a claim prompt when ready, a quiet countdown when not */}
        <button
          className={`crate-cta ${crate.ready ? 'is-ready' : 'is-waiting'}`}
          onClick={() => setShowCrate(true)}
          disabled={crate.loading}
        >
          <span className="crate-cta-icon" aria-hidden="true">🎁</span>
          <span className="crate-cta-text">
            <span className="crate-cta-title">
              {crate.ready ? 'Your crate is ready' : 'Daily Crate'}
            </span>
            <span className="crate-cta-sub">
              {crate.loading
                ? 'Checking availability…'
                : crate.ready
                  ? 'Open it for coins and XP'
                  : `Next crate in ${crate.timeLeft}`}
            </span>
          </span>
          <span className="crate-cta-action">
            {crate.ready ? 'Open' : 'View'}
            <span className="crate-cta-arrow">→</span>
          </span>
        </button>

        <section className="features-section">
          <h2 className="section-title">Explore</h2>
          {featureGrid}
        </section>

      </div>

      {showCrate && <CrateOpener onClose={() => setShowCrate(false)} />}
    </div>
  );
}
