// src/components/header-cards/NavAuth.jsx
// Handles the authentication section of the navbar
// Shows Login/Register links when logged out, or account dropdown when logged in

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins } from 'lucide-react';
import StyledName from '../StyledName';
import { useAuth } from '../../context/AuthContext';

export default function NavAuth({ onLogout, setIsMobileOpen }) {
    const navigate = useNavigate();

    // Controls the account dropdown visibility
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    // Pull user data directly from AuthContext
    const { user, userCoins, userNameColor, userNameEmoji } = useAuth();

    // Format coin numbers with commas (e.g., 1000 -> "1,000")
    const formatCoins = (num) => {
        if (num === undefined || num === null) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Dropdown menu items for logged-in users
    const accountItems = [
        { label: 'Settings', path: '/settings' },
        { label: 'Stats', path: '/account/stats' },
        { label: 'Logout', path: '/logout' },
    ];

    // Handles clicks on dropdown items — logs out or navigates, then closes menus
    const handleItemClick = (e, item) => {
        e.preventDefault();
        if (item.label === 'Logout') {
            onLogout?.();
            navigate('/');
        } else {
            navigate(item.path);
        }
        setIsAccountOpen(false);
        setIsMobileOpen(false);
    };

    // --- Logged out state: show Login and Register links ---
    if (!user) {
        return (
            <div className="navbar-auth">
                <a
                    href="/login"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/login');
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
                        navigate('/register');
                        setIsMobileOpen(false);
                    }}
                    className="navbar-link navbar-auth-link"
                >
                    Register
                </a>
            </div>
        );
    }

    // --- Logged in state: show styled name, coins, and dropdown ---
    return (
        <div className="navbar-auth">
            <div className="navbar-account">
                <button
                    className="navbar-account-trigger"
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                >
                    <StyledName
                        displayName={user.displayName || 'Account'}
                        nameColor={userNameColor}
                        nameEmoji={userNameEmoji}
                    />
                    <span className="navbar-coins">
                        <Coins size={18} color="#f0c040" />
                        {formatCoins(userCoins)}
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
                                    onClick={(e) => handleItemClick(e, item)}
                                    className="navbar-dropdown-link"
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
