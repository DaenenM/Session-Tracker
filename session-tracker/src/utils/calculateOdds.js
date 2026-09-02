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
// ============================================
// OVER / UNDER
// ============================================

// Over/under is priced off recent form only. The full history stretches back to
// sessions that no longer reflect how the instructor talks now, so the line is
// built from the most recent sessions rather than every session ever recorded.
const OVER_UNDER_WINDOW = 10;

// Picks the line for an over/under bet from the last N sessions.
//
// `sessions` is a list of { count, date } — newest-first ordering is not
// assumed, the caller's order is ignored and dates are sorted here.
//
// The line always lands on a .5 boundary so an integer count can never tie it:
// every session is strictly over or strictly under, and there is no push case
// to refund.
// Picks the best .5 line for one set of counts.
//
// The median is the natural centre, but snapping it to a .5 boundary can tip the
// split when the median value repeats — both duplicates then fall on the under
// side. So the median is the starting point and nearby .5 boundaries are checked,
// keeping whichever divides the set most evenly.
function bestLineFor(counts) {
    if (counts.length === 0) return null;

    const sorted = [...counts].sort((a, b) => a - b);
    const mid = sorted.length / 2;
    const median = sorted.length % 2
        ? sorted[Math.floor(mid)]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    const imbalanceAt = (candidate) => {
        const over = counts.filter((c) => c > candidate).length;
        const under = counts.filter((c) => c < candidate).length;
        return Math.abs(over - under);
    };

    const base = Math.floor(median) + 0.5;
    let line = base;
    let best = imbalanceAt(base);

    // Walk outward from the median; only a strictly better boundary wins, so the
    // line stays as close to the centre as the data allows
    for (let offset = 1; offset <= 3 && best > 0; offset++) {
        for (const candidate of [base - offset, base + offset]) {
            if (candidate < 0) continue;
            const score = imbalanceAt(candidate);
            if (score < best) {
                best = score;
                line = candidate;
            }
        }
    }

    return line;
}

// Snaps any value onto a .5 boundary, so the line can never tie an integer count
const toHalf = (value) => Math.floor(value) + 0.5;

// Picks the line for an over/under bet.
//
// Two lines are computed — one from recent form (the last N sessions) and one
// from the full history — and the quoted line sits midway between them. Recent
// form alone overreacts to a hot or cold streak; all-time alone is slow to
// notice a real shift. The midpoint tracks the trend without chasing it.
//
// `sessions` is a list of { count, date }. The caller's ordering is ignored;
// dates are sorted here.
export function calculateOverUnderLine(sessions) {
    const byNewest = [...sessions].sort((a, b) => {
        // Sessions without a date sink to the bottom rather than corrupting the order
        const ta = a.date ? Date.parse(a.date) : 0;
        const tb = b.date ? Date.parse(b.date) : 0;
        return tb - ta;
    });

    const allCounts = byNewest
        .map((s) => Number(s.count))
        .filter((c) => Number.isFinite(c));

    if (allCounts.length === 0) return null;

    const recentCounts = allCounts.slice(0, OVER_UNDER_WINDOW);

    const recentLine = bestLineFor(recentCounts);
    const allTimeLine = bestLineFor(allCounts);

    // Midpoint of the two, snapped back onto a .5 boundary. Averaging two .5
    // values can land on a whole number (229.5 + 198.5) / 2 = 214, which would
    // let a count tie the line — toHalf pushes it to 214.5.
    const line = toHalf((recentLine + allTimeLine) / 2);

    return {
        line,
        recentLine,
        allTimeLine,
        sessionsUsed: recentCounts.length,
        totalSessions: allCounts.length,
        window: OVER_UNDER_WINDOW,
    };
}
