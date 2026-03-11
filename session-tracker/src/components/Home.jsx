// src/components/Home.jsx
// Main landing page — shows hero section, level/XP progress, and feature navigation cards

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from "firebase/firestore"; // onSnapshot for real-time updates (replaces getDoc)
import { db, auth } from '../firebase';               // Firestore + Auth instances
import { calculateLevel } from '../utils/leveling';   // Derives level, currentXp, xpForNextLevel from total XP
import CrateOpener from './CrateOpener';               // Daily crate modal with spinning reel
import '../css/Home.css';
import useActiveBets from '../utils/useActiveBets';

export default function HomePage({ onNavigate }) {

  const activeBetCount = useActiveBets();
  // Level data derived from total XP — { level, currentXp, xpForNextLevel }
  const [levelData, setLevelData] = useState(null);

  // Controls whether the crate modal is visible
  const [showCrate, setShowCrate] = useState(false);

  // --- Real-time listener for user stats ---
  // Uses onSnapshot instead of getDoc so the XP bar updates instantly
  // when the user claims a crate, places a bet, or gains XP from any source
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Subscribe to the user's Firestore document — fires on every change
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const totalXp = data.xp ?? 0;
        // Calculate level info from raw XP total (no level field stored in DB)
        setLevelData(calculateLevel(totalXp));
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, []);

  // Calculate XP progress bar percentage (0-100)
  const xpProgress = levelData
    ? (levelData.currentXp / levelData.xpForNextLevel) * 100
    : 0;

  // Feature cards — each links to a different page
  const features = [
    {
      icon: '📡',
      title: 'Live',
      description: 'Watch sessions unfold in real time. See counts and timers update live.',
      path: '/live',
      accent: '#4ade80',
    },
    {
      icon: '📊',
      title: 'Stats',
      description: 'Dive into your performance data. Trends, averages, and insights.',
      path: '/stats',
      accent: '#fbbf24',
    },
    {
      icon: '🎲',
      title: 'Bets',
      description: 'Put your predictions on the line. Compete with confidence.',
      path: '/bets',
      accent: '#f87171',
    },
    {
      icon: '🏆',
      title: 'Leaderboard',
      description: 'See where you rank among the community. Climb to the top.',
      path: '/leaderboard',
      accent: '#c084fc',
    },
  ];

  return (
    <div className="home-container">
      <div className="home-content">

        {/* --- Hero Section --- */}
        <section className="hero-section">
          <div className="hero-badge">Welcome back</div>
          <h1 className="hero-title">
            The Session Tracker<span className="hero-dot">.</span>
          </h1>
          <p className="hero-subtitle">
            Your session tracking count, compete in real time, and climb the ranks.
          </p>
          <div className="hero-actions">
            <button className="hero-btn hero-btn-primary" onClick={() => onNavigate?.('/live')}>
              Watch Live
              <span className="hero-btn-arrow">→</span>
            </button>
            {/* Opens the daily crate modal */}
            <button className="hero-btn hero-btn-secondary" onClick={() => setShowCrate(true)}>
              🎁 Open Crate
            </button>

            <button className="hero-btn hero-btn-secondary" onClick={() => onNavigate?.('/shop')}>
              Shop
              <span className="hero-btn-arrow">→</span>
            </button>
          </div>
        </section>

        {/* --- Level & Active Bets Summary --- */}
        <h2 className="section-title">Level & Active Bets</h2>
        <section className="stats-bar">
          <div className="stat-item">
            <span className="stat-number">{levelData?.level ?? '—'}</span>
            <span className="stat-label">Level</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
              <span className="stat-number">{activeBetCount}</span>
              <span className="stat-label">Active Bets</span>
          </div>
        </section>

        {/* --- XP Progress Bar --- */}
        {/* Only renders once level data has loaded */}
        {levelData && (
          <section className="xp-bar-section">
            <div className="xp-bar-header">
              <span className="xp-level-label">Level {levelData.level}</span>
              <span className="xp-count">{levelData.currentXp} / {levelData.xpForNextLevel} XP</span>
            </div>
            <div className="xp-bar-track">
              {/* Fill width is a percentage of current XP toward next level */}
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </section>
        )}

        {/* --- Feature Navigation Cards --- */}
        <section className="features-section">
          <h2 className="section-title">Explore</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <button
                key={feature.path}
                className="feature-card"
                // --accent CSS variable used for hover/border color per card
                style={{ '--accent': feature.accent, animationDelay: `${0.1 + index * 0.08}s` }}
                onClick={() => onNavigate?.(feature.path)}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
                <span className="feature-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* --- Daily Crate Modal --- */}
      {/* Renders on top of everything when showCrate is true */}
      {showCrate && <CrateOpener onClose={() => setShowCrate(false)} />}
    </div>
  );
}