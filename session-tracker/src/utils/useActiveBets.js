// src/hooks/useActiveBets.js
// Returns the current user's pending bet count in real-time

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function useActiveBets() {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const betsRef = collection(db, 'users', user.uid, 'bets');
        const pendingQuery = query(betsRef, where('status', '==', 'pending'));

        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
            setCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [user]);

    return count;
}