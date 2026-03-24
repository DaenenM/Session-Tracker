// src/components/Header.jsx
// Main navigation bar — renders on every page
// Contains NavMenu (page links) and NavAuth (login/account dropdown)

import { useState } from 'react';
import NavMenu from './header-cards/NavMenu';
import NavAuth from './header-cards/NavAuth';

const Navbar = ({ onLogout }) => {
    // Controls whether the mobile slide-out menu is open
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile-only top banner — shows "Essentially" branding when menu is closed */}
            <div className={`navbar-brand mobile-banner ${isMobileOpen ? 'collapsed' : ''}`}>
                <h1>Essentially</h1>
            </div>

            {/* Hamburger button — only visible on mobile, toggles the slide-out menu */}
            <button
                className={`navbar-toggle ${isMobileOpen ? 'open' : ''}`}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                ☰
            </button>

            {/* Dark overlay behind the mobile menu — clicking it closes the menu */}
            {isMobileOpen && (
                <div className="navbar-overlay" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* Main nav — sidebar on desktop, slide-out drawer on mobile */}
            <nav className={`navbar ${isMobileOpen ? 'open' : ''}`}>
                <NavMenu
                    isMobileOpen={isMobileOpen}
                    setIsMobileOpen={setIsMobileOpen}
                />
                <NavAuth
                    onLogout={onLogout}
                    setIsMobileOpen={setIsMobileOpen}
                />
            </nav>
        </>
    );
};

export default Navbar;
