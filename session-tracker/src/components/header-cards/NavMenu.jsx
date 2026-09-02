// src/components/header-cards/NavMenu.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Icon is kept separate from the label so it can be sized and aligned on its own
// rather than inheriting the label's text metrics
const ALL_ITEMS = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '📡', label: 'Live', path: '/live' },
  { icon: '🎲', label: 'Bets', path: '/bets' },
  { icon: '🎮', label: 'Games', path: '/games' },
  { icon: '📊', label: 'Stats', path: '/stats' },
  { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
  { icon: '💰', label: 'Shop', path: '/shop' },
  { icon: '🔢', label: 'Counter', path: '/counter', role: 'staff' },
  { icon: '📌', label: 'Admin', path: '/admin', role: 'staff' },
];

const NavMenu = ({ setIsMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const visibleItems = ALL_ITEMS.filter((item) => !item.role || hasRole(item.role));

  // "/" would prefix-match every route, so it only counts as active on an exact
  // match; everything else also lights up for its nested pages.
  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleClick = (e, path) => {
    e.preventDefault();
    navigate(path);
    setIsMobileOpen(false);
  };

  return (
    <>
      <div className="navbar-brand">
        <h1>Essentially</h1>
      </div>

      <ul className="navbar-menu">
        {visibleItems.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path} className="navbar-item">
              <a
                href={item.path}
                onClick={(e) => handleClick(e, item.path)}
                className={`navbar-link ${active ? 'active' : ''}`}
                // Tells screen readers which page is current, not just sighted users
                aria-current={active ? 'page' : undefined}
              >
                <span className="navbar-link-icon" aria-hidden="true">{item.icon}</span>
                <span className="navbar-link-label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
};

export default NavMenu;
