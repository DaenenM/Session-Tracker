// src/components/Shop.jsx
import { useState, useEffect } from 'react';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { SHOP_ITEMS, getItemById } from '../utils/shopItems';
import StyledName from './StyledName';
import '../css/Shop.css';

export default function Shop() {
    const { user, userCoins } = useAuth();
    const [ownedItems, setOwnedItems] = useState([]);
    const [equippedColor, setEquippedColor] = useState(null);
    const [equippedEmoji, setEquippedEmoji] = useState(null);
    const [buying, setBuying] = useState(null);
    const [tab, setTab] = useState('colors');

    // Fetch user's owned items and equipped cosmetics
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                setOwnedItems(data.ownedItems || []);
                setEquippedColor(data.nameColor || null);
                setEquippedEmoji(data.nameEmoji || null);
            }
        };
        fetchData();
    }, [user]);

    const handleBuy = async (item) => {
        if (!user || buying) return;
        if (ownedItems.includes(item.id)) return;
        if (userCoins < item.price) {
            alert('Not enough coins!');
            return;
        }

        setBuying(item.id);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) throw new Error('User not found');

                const data = userSnap.data();
                const currentCoins = data.coins || 0;
                if (currentCoins < item.price) throw new Error('Insufficient coins');

                const currentOwned = data.ownedItems || [];
                if (currentOwned.includes(item.id)) throw new Error('Already owned');

                transaction.update(userDocRef, {
                    coins: currentCoins - item.price,
                    ownedItems: [...currentOwned, item.id],
                });
            });

            setOwnedItems(prev => [...prev, item.id]);
        } catch (err) {
            console.error('Purchase failed:', err);
            alert(err.message === 'Insufficient coins' ? 'Not enough coins!' : 'Something went wrong.');
        } finally {
            setBuying(null);
        }
    };

    const handleEquip = async (item) => {
        if (!user || !ownedItems.includes(item.id)) return;

        const userDocRef = doc(db, 'users', user.uid);
        const isColor = item.type === 'color';
        const currentEquipped = isColor ? equippedColor : equippedEmoji;
        const isUnequipping = currentEquipped === item.value;

        const update = isColor
            ? { nameColor: isUnequipping ? null : item.value }
            : { nameEmoji: isUnequipping ? null : item.value };

        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(userDocRef, update);
            });

            if (isColor) setEquippedColor(isUnequipping ? null : item.value);
            else setEquippedEmoji(isUnequipping ? null : item.value);
        } catch (err) {
            console.error('Equip failed:', err);
        }
    };

    const renderItem = (item) => {
        const owned = ownedItems.includes(item.id);
        const isEquipped = item.type === 'color'
            ? equippedColor === item.value
            : equippedEmoji === item.value;

        return (
            <div key={item.id} className={`shop-item ${owned ? 'shop-item-owned' : ''} ${isEquipped ? 'shop-item-equipped' : ''}`}>
                <div className="shop-item-preview">
                    {item.type === 'color' ? (
                        item.value === 'rainbow' ? (
                            <span className="shop-color-swatch shop-color-rainbow"></span>
                        ) : (
                            <span className="shop-color-swatch" style={{ background: item.value }}></span>
                        )
                    ) : (
                        <span className="shop-emoji-preview">{item.value}</span>
                    )}
                </div>
                <div className="shop-item-info">
                    <span className="shop-item-name">{item.name}</span>
                    {!owned && <span className="shop-item-price">🪙 {item.price}</span>}
                    {owned && isEquipped && <span className="shop-item-equipped-tag">Equipped</span>}
                    {owned && !isEquipped && <span className="shop-item-owned-tag">Owned</span>}
                </div>
                <div className="shop-item-actions">
                    {!owned ? (
                        <button
                            className="shop-buy-btn"
                            onClick={() => handleBuy(item)}
                            disabled={buying === item.id || userCoins < item.price}
                        >
                            {buying === item.id ? '...' : 'Buy'}
                        </button>
                    ) : (
                        <button
                            className="shop-equip-btn"
                            onClick={() => handleEquip(item)}
                        >
                            {isEquipped ? 'Unequip' : 'Equip'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="shop-container">
            <div className="shop-wrapper">
                <div className="shop-header">
                    <h1 className="shop-title">Shop</h1>
                    <p className="shop-subtitle">Customize your identity</p>
                    <div className="shop-balance">🪙 {userCoins} coins</div>
                </div>

                {/* Preview */}
                <div className="shop-preview-section">
                    <span className="shop-preview-label">Preview</span>
                    <div className="shop-preview-box">
                        <StyledName
                            displayName={user?.displayName || 'Player'}
                            nameColor={equippedColor}
                            nameEmoji={equippedEmoji}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="shop-tabs">
                    <button
                        className={`shop-tab ${tab === 'colors' ? 'shop-tab-active' : ''}`}
                        onClick={() => setTab('colors')}
                    >
                        🎨 Colors
                    </button>
                    <button
                        className={`shop-tab ${tab === 'emojis' ? 'shop-tab-active' : ''}`}
                        onClick={() => setTab('emojis')}
                    >
                        ✨ Emojis
                    </button>
                </div>

                {/* Items Grid */}
                <div className="shop-items-grid">
                    {SHOP_ITEMS[tab].map(renderItem)}
                </div>
            </div>
        </div>
    );
}