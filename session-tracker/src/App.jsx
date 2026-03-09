// src/App.jsx
import { useState, useEffect } from 'react';
import './index.css';
import './css/Header.css';
import './css/SessionCounter.css';
import './css/Live.css';
import './css/Auth.css';
import './css/Stats.css';
import './css/Bets.css';
import './css/Leaderboard.css';
import './css/Shop.css';
import './css/UserStats.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Header';
import HomePage from './components/Home';
import SessionTracker from './components/SessionCounter';
import LiveView from './components/LiveView';
import Login from './components/Login';
import Register from './components/Register';
import RouteGuard from './components/RouteGuard';
import Stats from './components/Stats';
import Footer from './components/Footer';
import Settings from './components/Settings';
import Bets from './components/Bets';
import Leaderboard from './components/Leaderboard';
import Shop from './components/Shop';
import UserStats from './components/UserStats';
import { getDatabase, ref, set, onDisconnect, onValue, remove } from "firebase/database";
import { getAuth } from "firebase/auth";

function AppContent() {
  const { loading, isAuthenticated, logout, user, userCoins } = useAuth();

  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || '/';
  });

  const handleNavigate = (path) => {
    setCurrentPage(path);
  };

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  if (loading) {
    return (
      <div className="guard-loading" style={{ minHeight: '100vh' }}>
        <div className="guard-spinner"></div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return <HomePage onNavigate={handleNavigate} />;

      case '/live':
        return <LiveView />;

      case '/counter':
        return (
          <RouteGuard requiredRole="staff" onNavigate={handleNavigate}>
            <SessionTracker />
          </RouteGuard>
        );

      case '/stats':
        return (
          <RouteGuard onNavigate={handleNavigate}>
            <Stats />
          </RouteGuard>
        );

      case '/bets':
        return (
          <RouteGuard onNavigate={handleNavigate}>
            <Bets />
          </RouteGuard>
        );

      case '/leaderboard':
        return (
            <RouteGuard onNavigate={handleNavigate}>
                <Leaderboard />
            </RouteGuard>
        );

      case '/shop':
        return (
            <RouteGuard onNavigate={handleNavigate}>
                <Shop />
            </RouteGuard>
        );

      case '/login':
        return <Login onNavigate={handleNavigate} />;

      case '/register':
        return <Register onNavigate={handleNavigate} />;

      case '/settings':
        return (
          <RouteGuard requiredRole="user" onNavigate={handleNavigate}>
            <Settings onNavigate={handleNavigate} />
          </RouteGuard>
        );
      case '/account/stats':
        return (
            <RouteGuard onNavigate={handleNavigate}>
                <UserStats />
            </RouteGuard>
        );

      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <Navbar 
        isSignedIn={user !== null}
        userName={user?.displayName}
        coins={userCoins}  // ← Need to add this!
        onNavigate={handleNavigate}
        onLogout={logout}
      />
      <div className="page-container">
        {renderPage()}
      </div>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;