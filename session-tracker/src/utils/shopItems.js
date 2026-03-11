// src/utils/shopItems.js

export const SHOP_ITEMS = {
    colors: [
        { id: 'color-white', name: 'White', type: 'color', value: '#ffffff', price: 10 },
        { id: 'color-red', name: 'Red', type: 'color', value: '#f87171', price: 75 },
        { id: 'color-blue', name: 'Blue', type: 'color', value: '#60a5fa', price: 75 },
        { id: 'color-green', name: 'Green', type: 'color', value: '#4ade80', price: 75 },
        { id: 'color-purple', name: 'Purple', type: 'color', value: '#c084fc', price: 100 },
        { id: 'color-pink', name: 'Pink', type: 'color', value: '#f472b6', price: 100 },
        { id: 'color-orange', name: 'Orange', type: 'color', value: '#fb923c', price: 100 },
        { id: 'color-cyan', name: 'Cyan', type: 'color', value: '#22d3ee', price: 150 },
        { id: 'color-gold', name: 'Gold', type: 'color', value: '#fbbf24', price: 300 },
        { id: 'color-rainbow', name: 'Rainbow', type: 'color', value: 'rainbow', price: 500 },
    ],
    emojis: [
        { id: 'emoji-bread', name: 'Bread', type: 'emoji', value: '🥖', price: 100 },
        { id: 'emoji-cat', name: 'cat', type: 'emoji', value: '😸', price: 150 },
        { id: 'emoji-lightning', name: 'Lightning', type: 'emoji', value: '⚡', price: 200 },
        { id: 'emoji-rocket', name: 'Rocket', type: 'emoji', value: '🚀', price: 225 },
        { id: 'emoji-skull', name: 'Skull', type: 'emoji', value: '💀', price: 250 },
        { id: 'emoji-star', name: 'Star', type: 'emoji', value: '⭐', price: 275 },
        { id: 'emoji-fire', name: 'Fire', type: 'emoji', value: '🔥', price: 300 },
        { id: 'emoji-diamond', name: 'Diamond', type: 'emoji', value: '💎', price: 325 },
        { id: 'emoji-ghost', name: 'Ghost', type: 'emoji', value: '👻', price: 350 },
        { id: 'emoji-moneywings', name: 'Money Wings', type: 'emoji', value: '💸', price: 500 },
        { id: 'emoji-crown', name: 'Crown', type: 'emoji', value: '👑', price: 1000 },
        
    ],
};

export const getItemById = (id) => {
    return [...SHOP_ITEMS.colors, ...SHOP_ITEMS.emojis].find(item => item.id === id) || null;
};