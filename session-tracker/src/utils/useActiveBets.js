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

        // Listen to the user's bets subcollection, filtered to pending only
        const betsRef = collection(db, 'users', user.uid, 'bets');
        const pendingQuery = query(betsRef, where('status', '==', 'pending'));

        // onSnapshot gives us real-time updates — count updates instantly when bets resolve
        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
            setCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [user]);

    return count;
}