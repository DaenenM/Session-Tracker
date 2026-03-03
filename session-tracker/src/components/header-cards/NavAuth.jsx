// src/components/header-cards/NavAuth.jsx
// Handles the authentication section of the navbar
// Shows Login/Register links when logged out, or account dropdown when logged in

import { useState } from 'react';
import { Coins } from 'lucide-react';           // Coin icon from Lucide icon library
import StyledName from '../StyledName';          // Renders name with equipped color/emoji from shop
import { useAuth } from '../../context/AuthContext'; // Auth context for user state, coins, cosmetics

export default function NavAuth({ onNavigate, onLogout, setIsMobileOpen }) {
    // Controls the account dropdown visibility
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    // Pull user data directly from AuthContext — no need to pass as props
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
            onLogout?.();       // Sign out via AuthContext
            onNavigate?.('/');   // Redirect to home
        } else {
            onNavigate?.(item.path);
        }
        setIsAccountOpen(false);  // Close the dropdown
        setIsMobileOpen(false);   // Close the mobile menu
    };

    // --- Logged out state: show Login and Register links ---
    if (!user) {
        return (
            <div className="navbar-auth">
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
            </div>
        );
    }

    // --- Logged in state: show styled name, coins, and dropdown ---
    return (
        <div className="navbar-auth">
            <div className="navbar-account">
                {/* Account trigger button — shows name with shop cosmetics and coin balance */}
                <button
                    className="navbar-account-trigger"
                    onClick={() => setIsAccountOpen(!isAccountOpen)}
                >
                    {/* Display name with equipped color and emoji from shop */}
                    <StyledName
                        displayName={user.displayName || 'Account'}
                        nameColor={userNameColor}
                        nameEmoji={userNameEmoji}
                    />
                    {/* Coin balance display */}
                    <span className="navbar-coins">
                        <Coins size={18} color="#f0c040" />
                        {formatCoins(userCoins)}
                    </span>
                    {/* Chevron arrow — rotates when dropdown is open */}
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

                {/* Dropdown menu — only renders when open */}
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