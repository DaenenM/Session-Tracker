// src/utils/rouletteWheel.js
//
// CS:GO-style roulette: 15 pockets — 7 red, 7 black, 1 green.
//
// This module is presentation only. Round results are drawn server-side by the
// scheduleRoulette Cloud Function and bets are settled by settleRoulette — the
// client never decides an outcome, it only renders one it was given.
//
// Red and black each win 7/15 (46.7%) and pay 2x; green wins 1/15 (6.7%) and
// pays 14x. Those payouts give every bet the same ~6.67% house edge, so no
// option is better value than another.

export const POCKETS = [
    { n: 0, color: 'green' },
    { n: 1, color: 'red' },
    { n: 2, color: 'black' },
    { n: 3, color: 'red' },
    { n: 4, color: 'black' },
    { n: 5, color: 'red' },
    { n: 6, color: 'black' },
    { n: 7, color: 'red' },
    { n: 8, color: 'black' },
    { n: 9, color: 'red' },
    { n: 10, color: 'black' },
    { n: 11, color: 'red' },
    { n: 12, color: 'black' },
    { n: 13, color: 'red' },
    { n: 14, color: 'black' },
];

export const PAYOUTS = {
    red: 2,
    black: 2,
    green: 14,
};

export const BET_COLORS = ['red', 'black', 'green'];

// Chance of a colour landing, as a percentage
export const chanceOf = (color) => {
    const hits = POCKETS.filter((p) => p.color === color).length;
    return (hits / POCKETS.length) * 100;
};

// The repeating visual pattern of the reel: one green followed by strictly
// alternating red/black. Every 15th tile is green, and no two neighbours ever
// share a colour, so the strip reads like a continuous wheel.
const PATTERN_LENGTH = 15;
const patternColorAt = (index) => {
    const slot = ((index % PATTERN_LENGTH) + PATTERN_LENGTH) % PATTERN_LENGTH;
    if (slot === 0) return 'green';
    // Slots 1..14 alternate red/black. 14 is even, so the last slot before the
    // next green is black — green is always flanked by black and red.
    return slot % 2 === 1 ? 'red' : 'black';
};

// Builds the visual strip the reel scrolls through.
//
// The strip is one continuous loop of the pattern above: green every 15 tiles,
// red and black alternating in between, identical on every spin.
//
// The winning tile must sit at `winIndex` AND match the pattern, so the pattern
// is phase-shifted to line the right slot type up with the result: a green win
// puts a green slot at winIndex, a red or black win puts that colour there.
// Shifting the whole strip keeps the 15-tile cadence intact — only where the
// loop starts changes, which is invisible mid-reel.
// Small integer hash used to derive per-round choices. Seeding the strip from
// the round number instead of Math.random() means every client builds the exact
// same reel, so two people watching the same round see an identical spin.
function seededValue(seed, salt) {
    let h = (Math.imul(seed ^ salt, 0x27d4eb2d) ^ salt) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
    return (h ^ (h >>> 13)) >>> 0;
}

// `seed` should be the round number. Omitting it falls back to a random reel,
// which is only useful for the placeholder strip before the first real round.
// Where the reel stops within the winning tile, as a fraction of tile width in
// [-0.25, 0.25]. Seeded from the round so every client stops in the same place.
export const landingOffsetFor = (seed) =>
    (seededValue(seed, 7) / 0xffffffff - 0.5) * 0.5;

export const generateReelStrip = (winningPocket, totalItems = 60, winIndex = 50, seed = null) => {
    const REDS = POCKETS.filter((p) => p.color === 'red');
    const BLACKS = POCKETS.filter((p) => p.color === 'black');
    const GREEN = POCKETS.find((p) => p.color === 'green');

    // Deterministic when seeded, random otherwise
    const pick = (salt, range) => (seed === null
        ? Math.floor(Math.random() * range)
        : seededValue(seed, salt) % range);

    // Find a phase where the pattern colour at winIndex equals the result
    const candidates = [];
    for (let phase = 0; phase < PATTERN_LENGTH; phase++) {
        if (patternColorAt(winIndex + phase) === winningPocket.color) candidates.push(phase);
    }
    // Every colour appears in the pattern, so a phase always exists
    const phase = candidates.length ? candidates[pick(1, candidates.length)] : 0;

    // Rotate through the real pockets so the numbers behind each colour vary
    let redCursor = pick(2, REDS.length);
    let blackCursor = pick(3, BLACKS.length);

    const strip = [];
    for (let i = 0; i < totalItems; i++) {
        if (i === winIndex) {
            strip.push(winningPocket);
            continue;
        }
        const color = patternColorAt(i + phase);
        if (color === 'green') {
            strip.push(GREEN);
        } else if (color === 'red') {
            strip.push(REDS[redCursor++ % REDS.length]);
        } else {
            strip.push(BLACKS[blackCursor++ % BLACKS.length]);
        }
    }

    return strip;
};
