import {
    collectionGroup,
    getDocs,
    getDoc,
    doc,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { calculateLevel } from './leveling';
import { getXpForBet } from './leveling';

// Checks if a bet's range matches the final session count
// Supports "over X", "under X", and "low-high" range formats
export const isWinningBet = (range, finalCount) => {
    if (range.toLowerCase().startsWith('over')) {
        return finalCount > parseFloat(range.split(' ')[1]);
    }
    if (range.toLowerCase().startsWith('under')) {
        return finalCount < parseFloat(range.split(' ')[1]);
    }
    // Handle "X-Y" or "X–Y" (hyphen or en-dash)
    const parts = range.split(/[–\-]/);
    if (parts.length === 2) {
        const low = parseFloat(parts[0].trim());
        const high = parseFloat(parts[1].trim());
        return finalCount >= low && finalCount <= high;
    }
    return false;
};

// Bonus XP reward for winning, scaled by how risky the bet was (higher multiplier = more XP)
export const getWinXp = (multiplier) => {
    if (multiplier >= 10) return 200;
    if (multiplier >= 5) return 50;
    if (multiplier >= 3) return 25;
    return 20;
};

// Fetches a user's current coins and XP from Firestore
const getUserData = async (userId) => {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return { coins: 0, xp: 0 };
    const data = userSnap.data();
    return { coins: data.coins || 0, xp: data.xp || 0 };
};

// Resolves all pending bets against the final session count
// Calculates payouts, XP gains, and level-up bonuses, then writes everything in batches
export const resolveBets = async (finalCount) => {
    const betsSnapshot = await getDocs(collectionGroup(db, 'bets'));
    const pendingBets = betsSnapshot.docs.filter(d => d.data().status === 'pending');
    if (pendingBets.length === 0) return { winners: 0, losers: 0 };

    let winners = 0;
    let losers = 0;

    // Accumulate coin and XP deltas per user before touching Firestore
    const userDeltas = {};

    for (const betDoc of pendingBets) {
        const bet = betDoc.data();
        const won = isWinningBet(bet.range, finalCount);
        const userId = betDoc.ref.parent.parent.id; // bets subcollection sits under users/{uid}
        const participationXp = getXpForBet(bet.amount); // XP just for placing a bet

        if (!userDeltas[userId]) userDeltas[userId] = { coinsDelta: 0, xpDelta: 0 };

        if (won) {
            winners++;
            const multiplier = bet.multiplier || 1;
            const bonusXp = getWinXp(multiplier);
            userDeltas[userId].coinsDelta += bet.potentialPayout || 0;
            userDeltas[userId].xpDelta += participationXp + bonusXp;
        } else {
            losers++;
            userDeltas[userId].xpDelta += participationXp; // Still earn XP for participating
        }
    }

    // Fetch each user's current data once (not per-bet)
    const userIds = Object.keys(userDeltas);
    const userDataMap = {};
    await Promise.all(userIds.map(async (userId) => {
        userDataMap[userId] = await getUserData(userId);
    }));

    // Firestore batches are capped at 500 operations
    const allDocs = [...pendingBets];
    const batchSize = 500;

    // Batch 1: mark each bet as won/lost with the final count and timestamp
    for (let i = 0; i < allDocs.length; i += batchSize) {
        const chunk = allDocs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const betDoc of chunk) {
            const won = isWinningBet(betDoc.data().range, finalCount);
            batch.update(betDoc.ref, {
                status: won ? 'won' : 'lost',
                finalCount,
                resolvedAt: new Date().toISOString(),
            });
        }
        await batch.commit();
    }

    // Batch 2: apply accumulated coin/XP deltas to each user
    // Also grants 100 bonus coins per level gained
    const userEntries = Object.entries(userDeltas);
    for (let i = 0; i < userEntries.length; i += batchSize) {
        const chunk = userEntries.slice(i, i + batchSize);
        const batch = writeBatch(db);
        for (const [userId, { coinsDelta, xpDelta }] of chunk) {
            const userData = userDataMap[userId];
            const oldXp = userData.xp;
            const newXp = oldXp + xpDelta;

            // Check if the XP gain pushed the user to a new level
            const oldLevel = calculateLevel(oldXp).level;
            const newLevel = calculateLevel(newXp).level;
            const levelUpBonus = (newLevel - oldLevel) * 100;

            const userRef = doc(db, 'users', userId);
            batch.update(userRef, {
                coins: userData.coins + coinsDelta + levelUpBonus,
                xp: newXp,
            });
        }
        await batch.commit();
    }

    return { winners, losers };
};