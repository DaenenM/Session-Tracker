// src/utils/crateRewards.js

// Loot table: weight determines relative chance
// Higher weight = more common
//
// The four premium unlocks (gold, rainbow, crown, money wings) are deliberately
// several times rarer than the rest — they are the chase items, and pulling one
// should feel like an event rather than a matter of turning up.
export const CRATE_REWARDS = [
    // --- COINS ---
    // 100 is the floor, 1000 the ceiling. Weights drop off sharply so the top
    // tier stays a genuine result rather than a routine one.
    //
    // These absorb the 79 weight the XP drops used to hold, split in proportion
    // to their old values. That keeps the table's grand total unchanged, so
    // every shop item's drop rate is exactly what it was before XP was removed.
    { id: 'coins-100', type: 'coins', value: 100, label: '🪙 100 Coins', rarity: 'common', weight: 47.31 },
    { id: 'coins-150', type: 'coins', value: 150, label: '🪙 150 Coins', rarity: 'common', weight: 33.80 },
    { id: 'coins-250', type: 'coins', value: 250, label: '🪙 250 Coins', rarity: 'uncommon', weight: 20.28 },
    { id: 'coins-500', type: 'coins', value: 500, label: '🪙 500 Coins', rarity: 'rare', weight: 8.45 },
    { id: 'coins-1000', type: 'coins', value: 1000, label: '🪙 1000 Coins', rarity: 'epic', weight: 2.37 },

    // --- COLORS ---
    { id: 'color-white', type: 'shopItem', shopId: 'color-white', label: '🎨 White Name', rarity: 'common', weight: 5 },
    { id: 'color-red', type: 'shopItem', shopId: 'color-red', label: '🎨 Red Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-blue', type: 'shopItem', shopId: 'color-blue', label: '🎨 Blue Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-green', type: 'shopItem', shopId: 'color-green', label: '🎨 Green Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-purple', type: 'shopItem', shopId: 'color-purple', label: '🎨 Purple Name', rarity: 'rare', weight: 2 },
    { id: 'color-pink', type: 'shopItem', shopId: 'color-pink', label: '🎨 Pink Name', rarity: 'rare', weight: 2 },
    { id: 'color-orange', type: 'shopItem', shopId: 'color-orange', label: '🎨 Orange Name', rarity: 'rare', weight: 2 },
    { id: 'color-cyan', type: 'shopItem', shopId: 'color-cyan', label: '🎨 Cyan Name', rarity: 'rare', weight: 1.5 },
    { id: 'color-gold', type: 'shopItem', shopId: 'color-gold', label: '🎨 Gold Name', rarity: 'epic', weight: 0.18 },
    { id: 'color-rainbow', type: 'shopItem', shopId: 'color-rainbow', label: '🌈 Rainbow Name', rarity: 'legendary', weight: 0.04 },

    // --- EMOJIS ---
    { id: 'emoji-cat', type: 'shopItem', shopId: 'emoji-cat', label: '😸 Cat Badge', rarity: 'uncommon', weight: 2.5 },
    { id: 'emoji-lightning', type: 'shopItem', shopId: 'emoji-lightning', label: '⚡ Lightning Badge', rarity: 'rare', weight: 1.5 },
    { id: 'emoji-rocket', type: 'shopItem', shopId: 'emoji-rocket', label: '🚀 Rocket Badge', rarity: 'rare', weight: 1.2 },
    { id: 'emoji-skull', type: 'shopItem', shopId: 'emoji-skull', label: '💀 Skull Badge', rarity: 'rare', weight: 1 },
    { id: 'emoji-star', type: 'shopItem', shopId: 'emoji-star', label: '⭐ Star Badge', rarity: 'rare', weight: 1 },
    { id: 'emoji-fire', type: 'shopItem', shopId: 'emoji-fire', label: '🔥 Fire Badge', rarity: 'epic', weight: 0.8 },
    { id: 'emoji-diamond', type: 'shopItem', shopId: 'emoji-diamond', label: '💎 Diamond Badge', rarity: 'epic', weight: 0.6 },
    { id: 'emoji-ghost', type: 'shopItem', shopId: 'emoji-ghost', label: '👻 Ghost Badge', rarity: 'epic', weight: 0.5 },
    { id: 'emoji-moneywings', type: 'shopItem', shopId: 'emoji-moneywings', label: '💸 Money Wings Badge', rarity: 'legendary', weight: 0.06 },
    { id: 'emoji-crown', type: 'shopItem', shopId: 'emoji-crown', label: '👑 Crown Badge', rarity: 'legendary', weight: 0.03 },
];

const RARITY_COLORS = {
    common: '#9ca3af',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#c084fc',
    legendary: '#fbbf24',
};

export const getRarityColor = (rarity) => RARITY_COLORS[rarity] || '#9ca3af';

// Weighted random pick
export const rollCrate = () => {
    const totalWeight = CRATE_REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const reward of CRATE_REWARDS) {
        roll -= reward.weight;
        if (roll <= 0) return reward;
    }

    return CRATE_REWARDS[0]; // fallback
};

// Generate the reel strip (visual items that scroll by)
export const generateReelStrip = (winningReward, totalItems = 40, winIndex = 32) => {
    const strip = [];
    for (let i = 0; i < totalItems; i++) {
        if (i === winIndex) {
            strip.push(winningReward);
        } else {
            strip.push(CRATE_REWARDS[Math.floor(Math.random() * CRATE_REWARDS.length)]);
        }
    }
    return strip;
};
// Every reward with its drop chance, grouped by rarity — used by the loot table
// in the crate modal so players can see the odds before opening.
//
// Chance is derived from the same weights rollCrate uses, so the displayed odds
// can never drift from the actual drop rates.
export const getLootTable = () => {
    const totalWeight = CRATE_REWARDS.reduce((sum, r) => sum + r.weight, 0);

    const withChance = CRATE_REWARDS.map((r) => ({
        ...r,
        chance: (r.weight / totalWeight) * 100,
    }));

    // Rarest first within each tier, so the headline drops sit at the top
    const order = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

    return order
        .map((rarity) => ({
            rarity,
            color: getRarityColor(rarity),
            items: withChance
                .filter((r) => r.rarity === rarity)
                .sort((a, b) => a.chance - b.chance),
            // Combined odds of getting anything from this tier
            totalChance: withChance
                .filter((r) => r.rarity === rarity)
                .reduce((sum, r) => sum + r.chance, 0),
        }))
        .filter((group) => group.items.length > 0);
};
