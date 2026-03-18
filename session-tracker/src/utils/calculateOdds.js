// src/utils/calculateOdds.js

// Calculates the mean and standard deviation from an array of session counts
function calculateStandardDeviation(counts) {
    const n = counts.length;
    const sum = counts.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // Population variance (dividing by n, not n-1)
    const variance = counts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2))
    };
}

// Approximates the cumulative distribution function (CDF) of a normal distribution
// Uses the Abramowitz & Stegun polynomial approximation (formula 26.2.17)
function normalCDF(x, mean, stdDev) {
    const z = (x - mean) / stdDev; // Convert to standard normal (z-score)
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2); // Normal PDF constant (1/√2π ≈ 0.3989)
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    // Reflect for positive z values since the approximation gives the left tail
    return z > 0 ? 1 - probability : probability;
}

// Returns the probability (as a percentage) that a value falls between lower and upper
// by taking the difference of two CDF evaluations
function calculateProbability(lower, upper, mean, stdDev) {
    const pLower = normalCDF(lower, mean, stdDev);
    const pUpper = normalCDF(upper, mean, stdDev);
    return Number(((pUpper - pLower) * 100).toFixed(1));
}

// Takes historical session counts and a set of bet ranges,
// returns the probability of landing in each range based on a normal distribution fit
export default function calculateOdds(counts, ranges) {
    const stats = calculateStandardDeviation(counts);

    const odds = ranges.map(range => ({
        label: range.highest === Infinity ? `${range.lowest}+` : `${range.lowest}-${range.highest}`,
        lower: range.lowest,
        upper: range.highest,
        probability: calculateProbability(range.lowest, range.highest, stats.mean, stats.stdDev)
    }));

    return { odds, mean: stats.mean };
}