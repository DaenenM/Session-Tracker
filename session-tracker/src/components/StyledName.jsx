// src/components/StyledName.jsx

export default function StyledName({ displayName, nameColor, nameEmoji }) {
    const isRainbow = nameColor === 'rainbow';

    return (
        <span className={`styled-name ${isRainbow ? 'styled-name-rainbow' : ''}`}
              style={!isRainbow && nameColor ? { color: nameColor } : undefined}>
            {nameEmoji && <span className="styled-name-emoji">{nameEmoji} </span>}
            {displayName || 'Anonymous'}
        </span>
    );
}