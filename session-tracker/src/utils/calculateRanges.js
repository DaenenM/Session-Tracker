// src/utils/calculateRanges.js

// Generates evenly distributed bet ranges from historical session counts
// rows = number of ranges to create (default 11, plus one overflow range)
export default function calculateRanges(counts, rows = 11) {
    const ranges = [];

    const highest = Math.max(...counts);
    const lowest = Math.min(...counts);

    // Size of each range bucket, rounded to nearest whole number
    const difference = highest - lowest;
    const step = Math.floor(difference / rows + 0.5);

    let lastHighest = 0;
    let count = 0;

    while (count < rows) {
        if (count === 0) {
            // First range: covers everything below the historical minimum
            ranges.push({ lowest: 0, highest: lowest - 1 });
            lastHighest = lowest - 1;

        } else if (rows - count === 1) {
            // Last iteration: cap at the historical max, then add an overflow range (max+)
            ranges.push({ lowest: lastHighest + 1, highest: highest });
            ranges.push({ lowest: highest + 1, highest: Infinity });

        } else {
            // Middle ranges: step-sized buckets filling the gap between min and max
            const nextLowest = lastHighest + 1;
            lastHighest = nextLowest + step;
            ranges.push({ lowest: nextLowest, highest: nextLowest + step });
        }
        count++;
    }

    return ranges;
}