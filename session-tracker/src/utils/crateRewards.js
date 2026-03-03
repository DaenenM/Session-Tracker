// src/utils/crateRewards.js

// Loot table: weight determines relative chance
// Higher weight = more common
export const CRATE_REWARDS = [
    // --- COINS (80% total) ---
    { id: 'coins-25', type: 'coins', value: 25, label: '25 Coins', rarity: 'common', weight: 20 },
    { id: 'coins-50', type: 'coins', value: 50, label: '50 Coins', rarity: 'common', weight: 18 },
    { id: 'coins-75', type: 'coins', value: 75, label: '75 Coins', rarity: 'common', weight: 15 },
    { id: 'coins-100', type: 'coins', value: 100, label: '100 Coins', rarity: 'uncommon', weight: 12 },
    { id: 'coins-150', type: 'coins', value: 150, label: '150 Coins', rarity: 'uncommon', weight: 8 },
    { id: 'coins-200', type: 'coins', value: 200, label: '200 Coins', rarity: 'rare', weight: 5 },

    // --- COLORS (15% total) ---
    { id: 'color-red', type: 'shopItem', shopId: 'color-red', label: '🎨 Red Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-blue', type: 'shopItem', shopId: 'color-blue', label: '🎨 Blue Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-green', type: 'shopItem', shopId: 'color-green', label: '🎨 Green Name', rarity: 'uncommon', weight: 3 },
    { id: 'color-purple', type: 'shopItem', shopId: 'color-purple', label: '🎨 Purple Name', rarity: 'rare', weight: 2 },
    { id: 'color-cyan', type: 'shopItem', shopId: 'color-cyan', label: '🎨 Cyan Name', rarity: 'rare', weight: 1.5 },
    { id: 'color-gold', type: 'shopItem', shopId: 'color-gold', label: '🎨 Gold Name', rarity: 'epic', weight: 1 },
    { id: 'color-rainbow', type: 'shopItem', shopId: 'color-rainbow', label: '🌈 Rainbow Name', rarity: 'legendary', weight: 0.3 },

    // --- EMOJIS (5% total) ---
    { id: 'emoji-fire', type: 'shopItem', shopId: 'emoji-fire', label: '🔥 Fire Badge', rarity: 'rare', weight: 1.5 },
    { id: 'emoji-star', type: 'shopItem', shopId: 'emoji-star', label: '⭐ Star Badge', rarity: 'rare', weight: 1.5 },
    { id: 'emoji-lightning', type: 'shopItem', shopId: 'emoji-lightning', label: '⚡ Lightning Badge', rarity: 'rare', weight: 1.2 },
    { id: 'emoji-crown', type: 'shopItem', shopId: 'emoji-crown', label: '👑 Crown Badge', rarity: 'epic', weight: 0.8 },
    { id: 'emoji-diamond', type: 'shopItem', shopId: 'emoji-diamond', label: '💎 Diamond Badge', rarity: 'epic', weight: 0.6 },
    { id: 'emoji-skull', type: 'shopItem', shopId: 'emoji-skull', label: '💀 Skull Badge', rarity: 'epic', weight: 0.7 },
    { id: 'emoji-rocket', type: 'shopItem', shopId: 'emoji-rocket', label: '🚀 Rocket Badge', rarity: 'epic', weight: 0.7 },
    { id: 'emoji-ghost', type: 'shopItem', shopId: 'emoji-ghost', label: '👻 Ghost Badge', rarity: 'legendary', weight: 0.4 },
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
            // Random filler from the loot table
            strip.push(CRATE_REWARDS[Math.floor(Math.random() * CRATE_REWARDS.length)]);
        }
    }
    return strip;
};
