import { hashSeed, mulberry32 } from './rng.js';
import { MASK_SHAPES } from './masks.js';

/** Global arrow length limits. */
export const MIN_LEN = 2;
export const MAX_LEN = 20;
/** Minimum share of usable cells covered by arrows. */
export const MIN_FILL = 0.9;

/**
 * Difficulty tier settings for each level range.
 * depthBias: how strongly heads that point across other arrows are preferred.
 * goals: minimum difficulty a generated board must reach (see analyzeLevel):
 *   maxStartFree  at most this many arrows free on the first move
 *   minAvgDepth   mean number of arrows that must leave before each arrow
 *   minRounds     length of the longest dependency chain
 */
export const TIERS = Object.freeze({
  tutorial: {
    difficulty: 'Normal',
    hearts: 3,
    lenMin: 2,
    lenMax: 7,
    depthBias: 0,
    goals: null,
    styles: { straight: 3, L: 3, U: 1 },
  },
  normal: {
    difficulty: 'Normal',
    hearts: 3,
    lenMin: 2,
    lenMax: 10,
    depthBias: 0.15,
    goals: { maxStartFree: 6, minAvgDepth: 1.2, minRounds: 3 },
    styles: { straight: 2, L: 3, U: 2, zigzag: 1, spiral: 1, snake: 2 },
  },
  hard: {
    difficulty: 'Hard',
    hearts: 4,
    lenMin: 2,
    lenMax: 14,
    depthBias: 0.6,
    goals: { maxStartFree: 4, minAvgDepth: 3, minRounds: 6 },
    styles: { straight: 1, L: 2, U: 2, zigzag: 2, spiral: 2, snake: 3 },
  },
  superHard: {
    difficulty: 'Super Hard',
    hearts: 4,
    lenMin: 3,
    lenMax: 20,
    depthBias: 1.0,
    goals: { maxStartFree: 3, minAvgDepth: 6, minRounds: 8 },
    styles: { straight: 1, L: 2, U: 2, zigzag: 2, spiral: 2, snake: 4 },
  },
});

/** Mask shapes have shorter rays, so their depth goals are scaled down (start-free cap stays). */
export const MASK_GOAL_SCALE = 0.8;

/** Copy tier settings for a board, easing depth goals on masked boards. */
function tierConfig(tier, mask) {
  const t = TIERS[tier];
  const goals =
    t.goals && mask
      ? {
          ...t.goals,
          minAvgDepth: t.goals.minAvgDepth * MASK_GOAL_SCALE,
          minRounds: Math.round(t.goals.minRounds * MASK_GOAL_SCALE),
        }
      : t.goals;
  return { ...t, goals };
}

/**
 * @typedef {object} LevelConfig
 * @property {string} tier
 * @property {number} rows
 * @property {number} cols
 * @property {string|null} mask
 * @property {number} seed
 */

/**
 * Board size, tier and mask for a level number.
 * @param {number} n level number (1-based)
 * @returns {LevelConfig & typeof TIERS.normal}
 */
export function getLevelConfig(n) {
  const rng = mulberry32(hashSeed(n, 0x51ed));
  let tier;
  let size;
  let maxSize;
  if (n <= 5) {
    tier = 'tutorial';
    size = n <= 3 ? 5 : 6;
    maxSize = size;
  } else if (n <= 20) {
    tier = 'normal';
    size = 7 + Math.floor((n - 6) / 5);
    maxSize = 9;
  } else if (n <= 50) {
    tier = 'hard';
    size = 10 + Math.floor((n - 21) / 8);
    maxSize = 13;
  } else {
    tier = 'superHard';
    size = Math.min(16, 14 + Math.floor((n - 51) / 20));
    maxSize = 16;
  }
  const mask = n % 10 === 0 ? MASK_SHAPES[(n / 10 - 1) % MASK_SHAPES.length] : null;
  let rows = size;
  let cols = size;
  if (mask) {
    rows = cols = maxSize;
  } else if (n > 5 && rng() < 0.5) {
    rows = Math.min(maxSize, size + 1);
  }
  const cfg = { ...tierConfig(tier, mask), tier, rows, cols, mask, seed: n };
  if (tier === 'tutorial') {
    cfg.arrowsMin = 4;
    cfg.arrowsMax = 8;
  }
  return cfg;
}
