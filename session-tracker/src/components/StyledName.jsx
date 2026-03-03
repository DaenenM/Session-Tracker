// src/components/StyledName.jsx

const ANIMATED_EMOJIS = ['👑', '💎', '👻', '💸', '🔥'];

export default function StyledName({ displayName, nameColor, nameEmoji }) {
    const isRainbow = nameColor === 'rainbow';
    const isAnimated = nameEmoji && ANIMATED_EMOJIS.includes(nameEmoji);

    return (
        <span className={`styled-name ${isRainbow ? 'styled-name-rainbow' : ''}`}
              style={!isRainbow && nameColor ? { color: nameColor } : undefined}>
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
        default: return '';
    }
}