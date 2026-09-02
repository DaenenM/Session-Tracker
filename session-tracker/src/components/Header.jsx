// src/components/Header.jsx
// Main navigation — a fixed sidebar on desktop, a slide-out drawer on mobile.
// Contains NavMenu (page links) and NavAuth (login/account dropdown).

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import NavMenu from './header-cards/NavMenu';
import NavAuth from './header-cards/NavAuth';

const Navbar = ({ onLogout }) => {
    const [openedAt, setOpenedAt] = useState(null);
    const location = useLocation();

    // The drawer is open only while the route it was opened on is still current.
    // Deriving this from the path closes it on back/forward navigation too,
    // without an effect that syncs state after the fact.
    const isMobileOpen = openedAt === location.pathname;

    const setIsMobileOpen = useCallback((next) => {
        setOpenedAt((current) => {
            const open = current === location.pathname;
            const value = typeof next === 'function' ? next(open) : next;
            return value ? location.pathname : null;
        });
    }, [location.pathname]);

    // Escape closes the drawer — expected of any overlay, and the only keyboard
    // route out of it
    useEffect(() => {
        if (!isMobileOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setIsMobileOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMobileOpen, setIsMobileOpen]);

    // Stop the page behind the drawer from scrolling while it is open
    useEffect(() => {
        if (!isMobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [isMobileOpen]);

    return (
        <>
            {/* Mobile-only top bar — branding plus the drawer toggle */}
            <header className="navbar-topbar">
                <span className="navbar-topbar-brand">Essentially</span>
                <button
                    className={`navbar-toggle ${isMobileOpen ? 'open' : ''}`}
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMobileOpen}
                    aria-controls="primary-navigation"
                >
                    {/* Three bars that fold into an X when open */}
                    <span className="navbar-toggle-bars" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </button>
            </header>

            {/* Dark backdrop behind the drawer — clicking it closes the menu */}
            <div
                className={`navbar-overlay ${isMobileOpen ? 'visible' : ''}`}
                onClick={() => setIsMobileOpen(false)}
                aria-hidden="true"
            />

            <nav
                id="primary-navigation"
                className={`navbar ${isMobileOpen ? 'open' : ''}`}
            >
                <NavMenu setIsMobileOpen={setIsMobileOpen} />
                <NavAuth
                    onLogout={onLogout}
                    setIsMobileOpen={setIsMobileOpen}
                />
            </nav>
        </>
    );
};

export default Navbar;
