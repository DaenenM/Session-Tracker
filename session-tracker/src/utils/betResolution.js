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

export const isWinningBet = (range, finalCount) => {
    if (range.toLowerCase().startsWith('over')) {
        return finalCount > parseFloat(range.split(' ')[1]);
    }
    if (range.toLowerCase().startsWith('under')) {
        return finalCount < parseFloat(range.split(' ')[1]);
    }
    const parts = range.split(/[–\-]/);
    if (parts.length === 2) {
        const low = parseFloat(parts[0].trim());
        const high = parseFloat(parts[1].trim());
        return finalCount >= low && finalCount <= high;
    }
    return false;
};

export const getWinXp = (multiplier) => {
    if (multiplier >= 10) return 200;
    if (multiplier >= 5) return 50;
    if (multiplier >= 3) return 25;
    return 20;
};

const getUserData = async (userId) => {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return { coins: 0, xp: 0 };
    const data = userSnap.data();
    return { coins: data.coins || 0, xp: data.xp || 0 };
};

export const resolveBets = async (finalCount) => {
    const betsSnapshot = await getDocs(collectionGroup(db, 'bets'));
    const pendingBets = betsSnapshot.docs.filter(d => d.data().status === 'pending');
    if (pendingBets.length === 0) return { winners: 0, losers: 0 };

    let winners = 0;
    let losers = 0;

    const batchSize = 500;
    for (let i = 0; i < pendingBets.length; i += batchSize) {
        const chunk = pendingBets.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const betDoc of chunk) {
            const bet = betDoc.data();
            const won = isWinningBet(bet.range, finalCount);
            const userId = betDoc.ref.parent.parent.id;
            const userRef = doc(db, 'users', userId);
            const userData = await getUserData(userId);

            // Everyone gets participation XP based on bet amount
            const participationXp = getXpForBet(bet.amount);

            batch.update(betDoc.ref, {
                status: won ? 'won' : 'lost',
                finalCount,
                resolvedAt: new Date().toISOString(),
            });

            if (won) {
                winners++;
                const multiplier = bet.multiplier || 1;
                const bonusXp = getWinXp(multiplier);
                const totalXp = participationXp + bonusXp;
                const newXp = userData.xp + totalXp;

                const oldLevel = calculateLevel(userData.xp).level;
                const newLevel = calculateLevel(newXp).level;
                const levelUpBonus = (newLevel - oldLevel) * 100;

                batch.update(userRef, {
                    coins: userData.coins + (bet.potentialPayout || 0) + levelUpBonus,
                    xp: newXp,
                });
            } else {
                losers++;
                const newXp = userData.xp + participationXp;

                const oldLevel = calculateLevel(userData.xp).level;
                const newLevel = calculateLevel(newXp).level;
                const levelUpBonus = (newLevel - oldLevel) * 100;

                batch.update(userRef, {
                    coins: userData.coins + levelUpBonus,
                    xp: newXp,
                });
            }
        }
        await batch.commit();
    }
    return { winners, losers };
};