// src/hooks/useCrateStatus.js
// Tracks whether the daily crate is available, so the homepage button can show
// readiness (and a live countdown) without the user opening the modal first.
//
// COOLDOWN_MS must stay in sync with CrateOpener — the modal remains the
// authority that actually gates claiming; this is presentation only.

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

const formatRemaining = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return 'less than a minute';
};

export default function useCrateStatus() {
    const { user } = useAuth();
    const [lastOpened, setLastOpened] = useState(null);
    const [now, setNow] = useState(() => Date.now());

    // Live value so a claim elsewhere flips the button without a refresh
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            setLastOpened(snap.exists() ? snap.data().lastCrateOpened || 0 : 0);
        });
        return () => unsubscribe();
    }, [user]);

    // Tick once a minute so the countdown stays roughly current. A minute is
    // enough precision for an "in 3h 20m" label and costs almost nothing.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    // Unknown until the snapshot lands — callers should treat null as "loading"
    if (lastOpened === null) {
        return { ready: false, loading: true, timeLeft: null };
    }

    const elapsed = now - lastOpened;
    const ready = elapsed >= COOLDOWN_MS;

    return {
        ready,
        loading: false,
        timeLeft: ready ? null : formatRemaining(COOLDOWN_MS - elapsed),
    };
}
