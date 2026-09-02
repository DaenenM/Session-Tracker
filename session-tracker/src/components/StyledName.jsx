// src/components/StyledName.jsx

const ANIMATED_EMOJIS = ['👑', '💎', '👻', '💸', '🔥', '⭐'];

// Gold is the premium colour, so it gets a gradient sheen rather than a flat
// fill. Matched on its shop value so the check stays in one place.
const GOLD_VALUE = '#fbbf24';

export default function StyledName({ displayName, nameColor, nameEmoji }) {
    const isRainbow = nameColor === 'rainbow';
    const isGold = nameColor === GOLD_VALUE;
    // Both use background-clip for their fill, so neither takes an inline color
    const isGradient = isRainbow || isGold;
    const isAnimated = nameEmoji && ANIMATED_EMOJIS.includes(nameEmoji);

    const variantClass = isRainbow
        ? 'styled-name-rainbow'
        : isGold
            ? 'styled-name-gold'
            : '';

    return (
        <span className={`styled-name ${variantClass}`}
              style={!isGradient && nameColor ? { color: nameColor } : undefined}>
            {nameEmoji && (
                <span className={`styled-name-emoji ${isAnimated ? `emoji-anim-${getAnimClass(nameEmoji)}` : ''}`}>
                    {nameEmoji}{' '}
                </span>
            )}
            {displayName || 'Anonymous'}
        </span>
    );
}

function getAnimClass(emoji) {
    switch (emoji) {
        case '💸': return 'fly';
        case '👑': return 'shine';
        case '💎': return 'sparkle';
        case '👻': return 'float';
        case '🔥': return 'flicker';
        case '⭐': return 'twinkle';
        default: return '';
    }
}