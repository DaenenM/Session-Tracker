// src/utils/leveling.js

export const getXpForLevel = (level) => {
    return Math.floor(100 * Math.pow(1.2, level - 1));
};

export const calculateLevel = (totalXp) => {
    let level = 1;
    let remaining = totalXp;

    while (remaining >= getXpForLevel(level)) {
        remaining -= getXpForLevel(level);
        level++;
    }

    return {
        level,
        currentXp: remaining,
        xpForNextLevel: getXpForLevel(level),
    };
};

// XP reward based on bet amount
export const getXpForBet = (amount) => {
    if (amount >= 100) return 30;
    if (amount >= 51) return 20;
    if (amount >= 26) return 15;
    if (amount >= 11) return 6;
    return 2;
};