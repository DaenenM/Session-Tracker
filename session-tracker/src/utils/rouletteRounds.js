// src/utils/rouletteRounds.js
//
// Round scheduling and results, computed entirely on the client.
//
// There is no server deciding outcomes. Instead every round's result is derived
// from its round number by a fixed hash, so all clients independently compute
// the same answer for the same round — no coordination, no requests, and the
// wheel simply stops when nobody is watching.
//
// Tradeoff, stated plainly: because the derivation lives in the shipped bundle,
// a determined player could read it and know a result in advance. This is a
// deliberate choice to stay on Firebase's free plan; a tamper-proof version
// needs a server (Cloud Functions on Blaze).

import { POCKETS } from './rouletteWheel';

// A round runs in two phases:
//
//   0 .............. SPIN_MS ................... ROUND_MS
//   |--- reel spinning ---|--- betting open ---|
//
// The reel shows the previous round's result while it spins, so betting is only
// meaningful once it stops. The countdown the player sees is the betting phase
// alone, which is why it starts after the winner is announced.

// Reel animation length. Must match the transition duration in Roulette.jsx,
// which imports this constant so the two can never drift apart.
export const SPIN_MS = 5200;

// How long betting stays open after the winner is announced — this is the
// number the countdown starts from
export const BETTING_MS = 15_000;

// Total round length. Derived rather than hardcoded so changing either phase
// keeps the round consistent.
export const ROUND_MS = SPIN_MS + BETTING_MS;

// Last stretch of the betting phase stops accepting bets, so one can't be
// slipped in as the next spin begins
export const BETTING_CLOSES_MS = 1000;

// Mixed into the hash so results aren't the same across a fresh deploy of the
// same code elsewhere. Changing this reshuffles every future round.
const SEED = 0x9e3779b9;

// xorshift-style integer hash (MurmurHash3 finalizer). Deterministic, well
// distributed, and cheap — the same round id always yields the same pocket.
function hashRound(roundId) {
    let h = (roundId ^ SEED) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

// Which round is running at a given moment
export const roundIdFor = (ms) => Math.floor(ms / ROUND_MS);

// The pocket a round lands on. Pure — same input, same output, on every client.
export function pocketForRound(roundId) {
    return POCKETS[hashRound(roundId) % POCKETS.length];
}

// Everything the UI needs about the round at `now` (a server-corrected clock)
export function roundStateAt(now) {
    const id = roundIdFor(now);
    const startsAt = id * ROUND_MS;
    const endsAt = startsAt + ROUND_MS;
    const intoRound = now - startsAt;

    // Betting opens the moment the reel finishes and the winner is on screen
    const bettingStartsAt = startsAt + SPIN_MS;
    const spinning = intoRound < SPIN_MS;

    // Countdown covers the betting phase only, so it starts at zero while the
    // reel is still turning
    const msRemaining = Math.max(0, endsAt - Math.max(now, bettingStartsAt));

    return {
        id,
        startsAt,
        endsAt,
        spinning,
        msRemaining,
        secondsRemaining: Math.ceil(msRemaining / 1000),
        bettingOpen: !spinning && msRemaining > BETTING_CLOSES_MS,
        // The result of the round that just finished — what the reel lands on
        lastResult: { id: id - 1, ...pocketForRound(id - 1) },
    };
}

// The last `count` finished rounds, newest first, for the history strip.
//
// A round is only "finished" for display purposes once the reel has landed on
// it. While the reel is still spinning it is resolving round `current - 1`, so
// that result is withheld — otherwise the history would spoil the outcome
// several seconds before the animation revealed it.
export function recentResults(now, count = 10) {
    const current = roundIdFor(now);
    const intoRound = now - current * ROUND_MS;
    const spinning = intoRound < SPIN_MS;

    // Skip the round currently being revealed by the reel
    const newest = spinning ? current - 2 : current - 1;

    const out = [];
    for (let i = 0; i < count; i++) {
        const id = newest - i;
        if (id < 0) break;
        out.push({ id, ...pocketForRound(id) });
    }
    return out;
}
