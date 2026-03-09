// src/utils/calculateRanges.js

export default function calculateRanges(counts, rows = 11) {
    const ranges = [];

    const highest = Math.max(...counts);
    const lowest = Math.min(...counts);
    
    const difference = highest - lowest;
    const step = Math.floor(difference / rows + 0.5);

    let lastHighest = 0;
    let count = 0;

    while (count < rows) {
        if (count === 0) {
            ranges.push({ lowest: 0, highest: lowest - 1 });
            lastHighest = lowest - 1;

        } else if (rows - count === 1) {
            ranges.push({ lowest: lastHighest + 1, highest: highest });
            ranges.push({ lowest: highest + 1, highest: Infinity });

        } else {
            const nextLowest = lastHighest + 1;
            lastHighest = nextLowest + step;
            ranges.push({ lowest: nextLowest, highest: nextLowest + step });
        }
        count++;
    }

    return ranges;
}