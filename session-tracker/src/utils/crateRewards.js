// src/utils/crateRewards.js

// Loot table: weight determines relative chance
// Higher weight = more common
export const CRATE_REWARDS = [
    // --- XP (most common drops) ---
    { id: 'xp-5', type: 'xp', value: 5, label: '5 XP', rarity: 'common', weight: 25 },
    { id: 'xp-10', type: 'xp', value: 10, label: '10 XP', rarity: 'common', weight: 22 },
    { id: 'xp-15', type: 'xp', value: 15, label: '15 XP', rarity: 'common', weight: 18 },
    { id: 'xp-25', type: 'xp', value: 25, label: '25 XP', rarity: 'uncommon', weight: 10 },
    { id: 'xp-50', type: 'xp', value: 50, label: '50 XP', rarity: 'rare', weight: 4 },

    // --- COINS ---
    { id: 'coins-25', type: 'coins', value: 25, label: '25 Coins', rarity: 'common', weight: 12 },
    { id: 'coins-50', type: 'coins', value: 50, label: '50 Coins', rarity: 'common', weight: 10 },
    { id: 'coins-75', type: 'coins', value: 75, label: '75 Coins', rarity: 'uncommon', weight: 7 },
    { id: 'coins-100', type: 'coins', value: 100, label: '100 Coins', rarity: 'uncommon', weight: 5 },
    { id: 'coins-150', type: 'coins', value: 150, label: '150 Coins', rarity: 'rare', weight: 3 },
    { id: 'coins-200', type: 'coins', value: 200, label: '200 Coins', rarity: 'rare', weight: 2 },

    // --- COLORS ---
    { id: 'color-white', type: 'shopItem', shopId: 'color-white', label: '🎨 White Name', rarity: 'common', weight: 5 },
    { id: 'color-red', type: 'shopItem', shopId: 'color-red', label: '🎨 Red Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-blue', type: 'shopItem', shopId: 'color-blue', label: '🎨 Blue Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-green', type: 'shopItem', shopId: 'color-green', label: '🎨 Green Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-purple', type: 'shopItem', shopId: 'color-purple', label: '🎨 Purple Name', rarity: 'rare', weight: 2 },
    { id: 'color-pink', type: 'shopItem', shopId: 'color-pink', label: '🎨 Pink Name', rarity: 'rare', weight: 2 },
    { id: 'color-orange', type: 'shopItem', shopId: 'color-orange', label: '🎨 Orange Name', rarity: 'rare', weight: 2 },
    { id: 'color-cyan', type: 'shopItem', shopId: 'color-cyan', label: '🎨 Cyan Name', rarity: 'rare', weight: 1.5 },
    { id: 'color-gold', type: 'shopItem', shopId: 'color-gold', label: '🎨 Gold Name', rarity: 'epic', weight: 0.8 },
    { id: 'color-rainbow', type: 'shopItem', shopId: 'color-rainbow', label: '🌈 Rainbow Name', rarity: 'legendary', weight: 0.2 },

    // --- EMOJIS ---
    { id: 'emoji-cat', type: 'shopItem', shopId: 'emoji-cat', label: '😸 Cat Badge', rarity: 'uncommon', weight: 2.5 },
    { id: 'emoji-lightning', type: 'shopItem', shopId: 'emoji-lightning', label: '⚡ Lightning Badge', rarity: 'rare', weight: 1.5 },
    { id: 'emoji-rocket', type: 'shopItem', shopId: 'emoji-rocket', label: '🚀 Rocket Badge', rarity: 'rare', weight: 1.2 },
    { id: 'emoji-skull', type: 'shopItem', shopId: 'emoji-skull', label: '💀 Skull Badge', rarity: 'rare', weight: 1 },
    { id: 'emoji-star', type: 'shopItem', shopId: 'emoji-star', label: '⭐ Star Badge', rarity: 'rare', weight: 1 },
    { id: 'emoji-fire', type: 'shopItem', shopId: 'emoji-fire', label: '🔥 Fire Badge', rarity: 'epic', weight: 0.8 },
    { id: 'emoji-diamond', type: 'shopItem', shopId: 'emoji-diamond', label: '💎 Diamond Badge', rarity: 'epic', weight: 0.6 },
    { id: 'emoji-ghost', type: 'shopItem', shopId: 'emoji-ghost', label: '👻 Ghost Badge', rarity: 'epic', weight: 0.5 },
    { id: 'emoji-moneywings', type: 'shopItem', shopId: 'emoji-moneywings', label: '💸 Money Wings Badge', rarity: 'legendary', weight: 0.3 },
    { id: 'emoji-crown', type: 'shopItem', shopId: 'emoji-crown', label: '👑 Crown Badge', rarity: 'legendary', weight: 0.15 },
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