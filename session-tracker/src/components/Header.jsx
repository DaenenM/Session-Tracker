import { useState } from 'react';
import NavMenu from './header-cards/NavMenu';
import { Coins } from 'lucide-react';
import StyledName from './StyledName';

const Navbar = ({ isSignedIn = false, onNavigate, onLogout, userName, coins }) => {
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Format coins with commas (1000 -> 1,000)
    const formatCoins = (num) => {
      if (num === undefined || num === null) return '0';
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const accountItems = [
      { label: 'Settings', path: '/settings' },
      { label: 'Stats', path: '/account/stats' },
      { label: 'Logout', path: '/logout' }
    ];

    return (
    <>
        {/* Mobile Top Banner */}
        <div className={`navbar-brand mobile-banner ${isMobileOpen ? 'collapsed' : ''}`}>
          <h1>Essentially</h1>
        </div>

        {/* Hamburger — always visible on mobile */}
        <button
          className={`navbar-toggle ${isMobileOpen ? 'open' : ''}`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          ☰
        </button>

        {/* Overlay */}
        {isMobileOpen && (
          <div
          className="navbar-overlay"
          onClick={() => setIsMobileOpen(false)}
          />
        )}

      <nav className={`navbar ${isMobileOpen ? 'open' : ''}`}>
        <NavMenu 
          isMobileOpen={isMobileOpen} 
          setIsMobileOpen={setIsMobileOpen} 
          onNavigate={onNavigate} 
        />

        <div className="navbar-auth">
          {!isSignedIn ? (
            <>
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.('/login');
                  setIsMobileOpen(false);
                }}
                className="navbar-link navbar-auth-link"
              >
                Login
              </a>
              <a
                href="/register"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.('/register');
                  setIsMobileOpen(false);
                }}
                className="navbar-link navbar-auth-link"
              >
                Register
              </a>
            </>
          ) : (
            <div className="navbar-account">
              <button
                className="navbar-account-trigger"
                onClick={() => setIsAccountOpen(!isAccountOpen)}
              >
                <span>{userName || 'Account'}</span>
                <span className="navbar-coins">
                  <Coins size={18} color="#f0c040" />
                  {formatCoins(coins)}
                </span>
                <svg
                  className={`navbar-account-icon ${isAccountOpen ? 'open' : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isAccountOpen && (
                <ul className="navbar-dropdown">
                  {accountItems.map((item) => (
                    <li key={item.path} className="navbar-dropdown-item">
                      <a
                        href={item.path}
                        onClick={(e) => {
                          e.preventDefault();
                          if (item.label === 'Logout') {
                            onLogout?.();
                            onNavigate?.('/');
                          } else {
                            onNavigate?.(item.path);
                          }
                          setIsAccountOpen(false);
                          setIsMobileOpen(false);
                        }}
                        className="navbar-dropdown-link"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
