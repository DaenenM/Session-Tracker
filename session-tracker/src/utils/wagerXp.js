// src/utils/wagerXp.js
//
// Shared XP handling for wagers placed in the casino games.
//
// Range bets already award XP through betResolution.js when a session resolves.
// Coin flip and roulette settle instantly, so they apply the same reward here —
// scaled by stake via getXpForBet, with the same 100-coins-per-level bonus the
// rest of the app uses.

import { calculateLevel, getXpForBet } from './leveling';

// Coins granted for each level gained, matching betResolution.js
const LEVEL_UP_BONUS = 100;

/**
 * Works out the XP and level-up bonus for a wager.
 *
 * Pure, so it can be called inside a Firestore transaction without doing any
 * reads of its own — the caller passes the balances it already read.
 *
 * @param {number} currentXp  the player's XP before this wager
 * @param {number} amount     the stake, which scales the reward
 * @returns {{ xpGain: number, newXp: number, levelsGained: number, coinBonus: number }}
 */
export function wagerXpReward(currentXp, amount) {
    const xpGain = getXpForBet(amount);
    const newXp = (currentXp || 0) + xpGain;

    const oldLevel = calculateLevel(currentXp || 0).level;
    const newLevel = calculateLevel(newXp).level;
    const levelsGained = Math.max(0, newLevel - oldLevel);

    return {
        xpGain,
        newXp,
        levelsGained,
        coinBonus: levelsGained * LEVEL_UP_BONUS,
    };
}
