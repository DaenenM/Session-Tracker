import { useAuth } from '../../context/AuthContext';

const NavMenu = ({ isMobileOpen, setIsMobileOpen, onNavigate }) => {
  const { hasRole } = useAuth();

  const allItems = [
    { label: '🏠 Home', path: '/' },
    { label: '📡 Live', path: '/live' },
    { label: '🎲 Bets', path: '/bets' },
    { label: '📊 Stats', path: '/stats' },
    { label: '🏆 Leaderboard', path: '/leaderboard' },
    { label: '💰 Shop', path: '/shop' },
    { label: '📋 To Do', path: '/todo' },
    { label: '🔢 Counter', path: '/counter', role: 'staff' },
    { label: '📌 Admin', path: '/admin', role: 'staff' },
  ];

  const visibleItems = allItems.filter(function(item) {
    if (!item.role) return true;
    return hasRole(item.role);
  });

  function handleClick(e, path) {
    e.preventDefault();
    onNavigate(path);
    setIsMobileOpen(false);
  }

  return (
    <>
      <div className="navbar-brand">
        <h1>Essentially</h1>
      </div>
      <div className="navbar-divider"></div>
      <ul className="navbar-menu">
        {visibleItems.map(function(item) {
          return (
            <li key={item.path} className="navbar-item">
              <a href={item.path} onClick={function(e) { handleClick(e, item.path); }} className="navbar-link">
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
      <div className="navbar-divider"></div>
    </>
  );
};

export default NavMenu;