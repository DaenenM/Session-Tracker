// src/components/CrateOpener.jsx
import { useState, useEffect, useRef } from 'react';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { rollCrate, generateReelStrip, getRarityColor } from '../utils/crateRewards';
import '../css/Crate.css';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const WIN_INDEX = 32;
const ITEM_WIDTH = 120; // px per reel item
const ITEM_GAP = 8;

export default function CrateOpener({ onClose }) {
    const { user } = useAuth();
    const [state, setState] = useState('ready'); // ready | spinning | landed | claimed
    const [reelStrip, setReelStrip] = useState([]);
    const [winningReward, setWinningReward] = useState(null);
    const [canOpen, setCanOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);
    const reelRef = useRef(null);

    // Check cooldown
    useEffect(() => {
        if (!user) return;

        const checkCooldown = async () => {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (!userSnap.exists()) return;

            const data = userSnap.data();
            const lastOpened = data.lastCrateOpened || 0;
            const now = Date.now();
            const diff = now - lastOpened;

            if (diff >= COOLDOWN_MS) {
                setCanOpen(true);
            } else {
                setCanOpen(false);
                startCooldownTimer(COOLDOWN_MS - diff);
            }
            setLoading(false);
        };

        checkCooldown();
    }, [user]);

    const startCooldownTimer = (remaining) => {
        const update = () => {
            const hrs = Math.floor(remaining / 3600000);
            const mins = Math.floor((remaining % 3600000) / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
        };
        update();

        const interval = setInterval(() => {
            remaining -= 1000;
            if (remaining <= 0) {
                clearInterval(interval);
                setCanOpen(true);
                setTimeLeft('');
            } else {
                const hrs = Math.floor(remaining / 3600000);
                const mins = Math.floor((remaining % 3600000) / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    };

    const handleOpen = () => {
        if (!canOpen || state !== 'ready') return;

        const reward = rollCrate();
        const strip = generateReelStrip(reward, 40, WIN_INDEX);

        setWinningReward(reward);
        setReelStrip(strip);
        setState('spinning');

        // Calculate scroll distance to center the winning item
        // Scroll so the winning item is centered under the pointer
        // Each item is ITEM_WIDTH + ITEM_GAP apart
        // We want the CENTER of the winning item to align with the center of the window
        const scrollTo = (WIN_INDEX * (ITEM_WIDTH + ITEM_GAP)) + (ITEM_WIDTH / 2);

        // Start the animation after a tick
        requestAnimationFrame(() => {
            if (reelRef.current) {
                reelRef.current.style.transition = 'none';
                reelRef.current.style.transform = 'translateX(0)';

                requestAnimationFrame(() => {
                    if (reelRef.current) {
                        reelRef.current.style.transition = 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)';
                        reelRef.current.style.transform = `translateX(-${scrollTo}px)`;
                    }
                });
            }
        });

        // Land after animation
        setTimeout(() => {
            setState('landed');
        }, 4200);
    };

    const handleClaim = async () => {
        if (!user || !winningReward || state !== 'landed') return;
        setState('claimed');

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) return;

                const data = userSnap.data();
                const updates = { lastCrateOpened: Date.now() };

                if (winningReward.type === 'coins') {
                    updates.coins = (data.coins || 0) + winningReward.value;
                } else if (winningReward.type === 'shopItem') {
                    const owned = data.ownedItems || [];
                    if (owned.includes(winningReward.shopId)) {
                        // Already owned — give coin equivalent instead
                        const coinRefund = Math.floor(winningReward.weight * 15) + 25;
                        updates.coins = (data.coins || 0) + coinRefund;
                    } else {
                        updates.ownedItems = [...owned, winningReward.shopId];
                    }
                }

                transaction.update(userDocRef, updates);
            });

            setCanOpen(false);
            startCooldownTimer(COOLDOWN_MS);
        } catch (err) {
            console.error('Failed to claim crate:', err);
        }
    };

    if (loading) {
        return (
            <div className="crate-overlay" onClick={onClose}>
                <div className="crate-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="crate-loading">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="crate-overlay" onClick={state === 'ready' || state === 'claimed' ? onClose : undefined}>
            <div className="crate-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crate-close-btn" onClick={onClose}>✕</button>

                <h2 className="crate-title">Daily Crate</h2>
                <p className="crate-subtitle">
                    {!canOpen && state === 'ready'
                        ? `Next crate in ${timeLeft}`
                        : state === 'ready'
                        ? 'Your free daily crate is ready!'
                        : state === 'spinning'
                        ? 'Opening...'
                        : state === 'landed'
                        ? 'You got:'
                        : 'Claimed!'}
                </p>

                {/* Reel Window */}
                <div className="crate-reel-window">
                    <div className="crate-reel-pointer"></div>
                    <div className="crate-reel-track" ref={reelRef}>
                        {reelStrip.map((item, i) => (
                            <div
                                key={i}
                                className={`crate-reel-item ${i === WIN_INDEX && state === 'landed' ? 'crate-reel-winner' : ''}`}
                                style={{ '--rarity-color': getRarityColor(item.rarity) }}
                            >
                                <span className="crate-reel-item-label">{item.label}</span>
                                <span className="crate-reel-item-rarity">{item.rarity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reward reveal */}
                {state === 'landed' && winningReward && (
                    <div className="crate-reward-reveal" style={{ '--rarity-color': getRarityColor(winningReward.rarity) }}>
                        <span className="crate-reward-label">{winningReward.label}</span>
                        <span className="crate-reward-rarity">{winningReward.rarity}</span>
                    </div>
                )}

                {state === 'claimed' && winningReward && (
                    <div className="crate-reward-reveal crate-reward-claimed" style={{ '--rarity-color': getRarityColor(winningReward.rarity) }}>
                        <span className="crate-reward-label">{winningReward.label}</span>
                        <span className="crate-reward-rarity">Added to your account!</span>
                    </div>
                )}

                {/* Action buttons */}
                <div className="crate-actions">
                    {state === 'ready' && canOpen && (
                        <button className="crate-open-btn" onClick={handleOpen}>
                            🎁 Open Crate
                        </button>
                    )}
                    {state === 'ready' && !canOpen && (
                        <button className="crate-open-btn crate-open-btn-disabled" disabled>
                            ⏳ {timeLeft}
                        </button>
                    )}
                    {state === 'landed' && (
                        <button className="crate-claim-btn" onClick={handleClaim}>
                            ✨ Claim Reward
                        </button>
                    )}
                    {state === 'claimed' && (
                        <button className="crate-close-action-btn" onClick={onClose}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
