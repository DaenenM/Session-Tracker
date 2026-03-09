// src/utils/calculateOdds.js

function calculateStandardDeviation(counts) {
    const n = counts.length;
    const sum = counts.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const variance = counts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2))
    };
}

function normalCDF(x, mean, stdDev) {
    const z = (x - mean) / stdDev;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - probability : probability;
}

function calculateProbability(lower, upper, mean, stdDev) {
    const pLower = normalCDF(lower, mean, stdDev);
    const pUpper = normalCDF(upper, mean, stdDev);
    return Number(((pUpper - pLower) * 100).toFixed(1));
}

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