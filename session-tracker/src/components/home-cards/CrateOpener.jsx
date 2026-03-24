// src/components/CrateOpener.jsx
import { useState, useEffect, useRef } from 'react';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { rollCrate, generateReelStrip, getRarityColor } from '../../utils/crateRewards';
import { calculateLevel } from '../../utils/leveling';
import '../../css/Crate.css';

const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours
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

    // Check cooldown on mount
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

        // Roll the reward and generate the visual reel strip
        const reward = rollCrate();
        const strip = generateReelStrip(reward, 40, WIN_INDEX);

        setWinningReward(reward);
        setReelStrip(strip);
        setState('spinning');

        // Scroll so the winning item lands centered under the pointer
        const scrollTo = (WIN_INDEX * (ITEM_WIDTH + ITEM_GAP)) + (ITEM_WIDTH / 2);

        // Animate the reel
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

        // Auto-claim as soon as spin animation finishes
        // Pass `reward` directly — state may not be updated yet in this tick
        setTimeout(() => {
            setState('landed');
            claimReward(reward);
        }, 4200);
    };

    // Claims the reward and writes to Firestore
    // Accepts `reward` param so it doesn't rely on potentially-stale state
    const claimReward = async (reward) => {
        if (!user || !reward) return;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                if (!userSnap.exists()) return;

                const data = userSnap.data();
                const updates = { lastCrateOpened: Date.now() };

                // Base 10 XP just for opening a crate
                let xpGain = 10;

                if (reward.type === 'coins') {
                    // Coin reward — add directly to balance
                    updates.coins = (data.coins || 0) + reward.value;
                } else if (reward.type === 'xp') {
                    // XP reward — stacks with the base 10 XP
                    xpGain += reward.value;
                } else if (reward.type === 'shopItem') {
                    const owned = data.ownedItems || [];
                    if (owned.includes(reward.shopId)) {
                        // Already owned — refund coins based on rarity
                        const coinRefund = Math.floor(reward.weight * 15) + 25;
                        updates.coins = (data.coins || 0) + coinRefund;
                    } else {
                        // New item — add to owned inventory
                        updates.ownedItems = [...owned, reward.shopId];
                    }
                }

                // Apply XP and check for level-up coin bonus (+100 per level gained)
                const currentXp = data.xp || 0;
                const newXp = currentXp + xpGain;
                const oldLevel = calculateLevel(currentXp).level;
                const newLevel = calculateLevel(newXp).level;
                const levelUpBonus = (newLevel - oldLevel) * 100;

                updates.xp = newXp;
                if (levelUpBonus > 0) {
                    updates.coins = (updates.coins ?? data.coins ?? 0) + levelUpBonus;
                }

                transaction.update(userDocRef, updates);
            });

            setState('claimed');
            setCanOpen(false);
            startCooldownTimer(COOLDOWN_MS);
        } catch (err) {
            console.error('Failed to claim crate:', err);
            setState('landed'); // Fallback so the modal isn't stuck
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

    // Block closing while spinning or mid-claim (landed = claiming in progress)
    const canClose = state === 'ready' || state === 'claimed';

    return (
        <div className="crate-overlay" onClick={canClose ? onClose : undefined}>
            <div className="crate-modal" onClick={(e) => e.stopPropagation()}>

                <h2 className="crate-title">Daily Crate</h2>
                <p className="crate-subtitle">
                    {!canOpen && state === 'ready'
                        ? `Next crate in ${timeLeft}`
                        : state === 'ready'
                        ? 'Your free daily crate is ready!'
                        : state === 'spinning'
                        ? 'Opening...'
                        : state === 'landed'
                        ? 'Claiming reward...'
                        : 'Claimed!'}
                </p>

                {/* Reel Window */}
                <div className="crate-reel-window">
                    <div className="crate-reel-pointer"></div>
                    <div className="crate-reel-track" ref={reelRef}>
                        {reelStrip.map((item, i) => (
                            <div
                                key={i}
                                className={`crate-reel-item ${i === WIN_INDEX && (state === 'landed' || state === 'claimed') ? 'crate-reel-winner' : ''}`}
                                style={{ '--rarity-color': getRarityColor(item.rarity) }}
                            >
                                <span className="crate-reel-item-label">{item.label}</span>
                                <span className="crate-reel-item-rarity">{item.rarity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reward reveal — shows during both landed (claiming) and claimed states */}
                {(state === 'landed' || state === 'claimed') && winningReward && (
                    <div
                        className={`crate-reward-reveal ${state === 'claimed' ? 'crate-reward-claimed' : ''}`}
                        style={{ '--rarity-color': getRarityColor(winningReward.rarity) }}
                    >
                        <span className="crate-reward-label">{winningReward.label}</span>
                        <span className="crate-reward-rarity">
                            {state === 'claimed' ? 'Added to your account! (+10 XP)' : winningReward.rarity}
                        </span>
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
                    {/* No manual claim button — reward is auto-claimed after spin */}
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
