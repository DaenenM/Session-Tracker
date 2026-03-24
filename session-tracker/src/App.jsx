// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import RouteGuard from './hooks/RouteGuard';
import Stats from './components/Stats';
import Footer from './components/Footer';
import Settings from './components/Settings';
import Bets from './components/Bets';
import Leaderboard from './components/Leaderboard';
import Shop from './components/Shop';
import UserStats from './components/UserStats';
import ToDo from './components/ToDo';
import Admin from './components/Admin';

function AppContent() {
  const { loading, logout, user, userCoins } = useAuth();

  if (loading) {
    return (
      <div className="guard-loading" style={{ minHeight: '100vh' }}>
        <div className="guard-spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar
        isSignedIn={user !== null}
        userName={user?.displayName}
        coins={userCoins}
        onLogout={logout}
      />
      <div className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LiveView />} />

          <Route path="/counter" element={
            <RouteGuard requiredRole="staff">
              <SessionTracker />
            </RouteGuard>
          } />

          <Route path="/stats" element={
            <RouteGuard>
              <Stats />
            </RouteGuard>
          } />

          <Route path="/bets" element={
            <RouteGuard>
              <Bets />
            </RouteGuard>
          } />

          <Route path="/leaderboard" element={
            <RouteGuard>
              <Leaderboard />
            </RouteGuard>
          } />

          <Route path="/shop" element={
            <RouteGuard>
              <Shop />
            </RouteGuard>
          } />

          <Route path="/todo" element={
            <RouteGuard>
              <ToDo />
            </RouteGuard>
          } />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={
            <RouteGuard requiredRole="staff">
              <Admin />
            </RouteGuard>
          } />

          <Route path="/settings" element={
            <RouteGuard requiredRole="user">
              <Settings />
            </RouteGuard>
          } />

          <Route path="/account/stats" element={
            <RouteGuard>
              <UserStats />
            </RouteGuard>
          } />

          {/* Catch-all — redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
