import { hashSeed, mulberry32 } from './rng.js';
import { MASK_SHAPES } from './masks.js';

/** Global arrow length limits. */
export const MIN_LEN = 2;
export const MAX_LEN = 20;
/** Widest board (cells). Big boards are played with pinch zoom. */
export const MAX_COLS = 30;
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
    lenMax: 9,
    depthBias: 0.3,
    goals: { maxStartFree: 5, minAvgDepth: 3, minRounds: 6 },
    styles: { straight: 2, L: 3, U: 2, zigzag: 2, spiral: 1, snake: 2 },
  },
  hard: {
    difficulty: 'Hard',
    hearts: 3,
    lenMin: 2,
    lenMax: 10,
    depthBias: 0.6,
    goals: { maxStartFree: 4, minAvgDepth: 9, minRounds: 12 },
    styles: { straight: 1, L: 3, U: 2, zigzag: 2, spiral: 2, snake: 3 },
  },
  superHard: {
    difficulty: 'Super Hard',
    hearts: 3,
    lenMin: 2,
    lenMax: 12,
    depthBias: 1.0,
    goals: { maxStartFree: 3, minAvgDepth: 20, minRounds: 20 },
    styles: { straight: 1, L: 3, U: 2, zigzag: 2, spiral: 2, snake: 4 },
  },
});

/** Mask shapes have shorter rays and more edge cells, so their goals are eased. */
export const MASK_GOAL_SCALE = 0.7;
/** Extra arrows allowed free at the start on a masked board (its jagged edge lets more out). */
export const MASK_EXTRA_FREE = 6;

/** Copy tier settings for a board, easing depth goals on masked boards. */
function tierConfig(tier, mask) {
  const t = TIERS[tier];
  const goals =
    t.goals && mask
      ? {
          ...t.goals,
          maxStartFree: t.goals.maxStartFree + MASK_EXTRA_FREE,
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
  let cols;
  if (n <= 3) {
    tier = 'tutorial';
    cols = 5;
  } else if (n <= 5) {
    tier = 'normal';
    cols = n === 4 ? 8 : 12;
  } else if (n <= 30) {
    tier = 'hard';
    cols = 14 + Math.floor((n - 6) / 3);
  } else {
    tier = 'superHard';
    cols = Math.min(MAX_COLS, 22 + Math.floor((n - 31) / 5));
  }
  const mask = n % 10 === 0 ? MASK_SHAPES[(n / 10 - 1) % MASK_SHAPES.length] : null;
  // portrait boards like a phone screen; masked boards are square so the shape isn't stretched
  let rows = cols;
  if (mask) cols = rows = Math.min(MAX_COLS, cols + 2);
  else if (n > 3) rows = cols + 2 + Math.floor(rng() * 3);
  const cfg = { ...tierConfig(tier, mask), tier, rows, cols, mask, seed: n };
  if (tier === 'tutorial') {
    cfg.arrowsMin = 4;
    cfg.arrowsMax = 8;
  }
  return cfg;
}
