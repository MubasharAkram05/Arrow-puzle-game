import { hashSeed, mulberry32 } from './rng.js';
import { MASK_SHAPES } from './masks.js';

/** Global arrow length limits. */
export const MIN_LEN = 2;
export const MAX_LEN = 20;
/** Minimum share of usable cells covered by arrows. */
export const MIN_FILL = 0.9;

/**
 * Difficulty tier settings shared by levels and the daily challenge.
 * depthBias: how strongly heads that point across other arrows are preferred.
 */
export const TIERS = Object.freeze({
  tutorial: {
    difficulty: 'Normal',
    hearts: 3,
    lenMin: 2,
    lenMax: 7,
    depthBias: 0,
    styles: { straight: 3, L: 3, U: 1 },
  },
  normal: {
    difficulty: 'Normal',
    hearts: 3,
    lenMin: 2,
    lenMax: 10,
    depthBias: 0.15,
    styles: { straight: 2, L: 3, U: 2, zigzag: 1, spiral: 1, snake: 2 },
  },
  hard: {
    difficulty: 'Hard',
    hearts: 4,
    lenMin: 2,
    lenMax: 14,
    depthBias: 0.35,
    styles: { straight: 1, L: 2, U: 2, zigzag: 2, spiral: 2, snake: 3 },
  },
  superHard: {
    difficulty: 'Super Hard',
    hearts: 4,
    lenMin: 3,
    lenMax: 20,
    depthBias: 0.55,
    styles: { straight: 1, L: 2, U: 2, zigzag: 2, spiral: 2, snake: 4 },
  },
});

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
  const cfg = { ...TIERS[tier], tier, rows, cols, mask, seed: n };
  if (tier === 'tutorial') {
    cfg.arrowsMin = 4;
    cfg.arrowsMax = 8;
  }
  return cfg;
}

/**
 * Local date as a YYYYMMDD integer.
 * @param {Date} date
 * @returns {number}
 */
export function dateKey(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Super Hard config for the daily challenge.
 * @param {number} key YYYYMMDD
 * @returns {LevelConfig & typeof TIERS.superHard}
 */
export function getDailyConfig(key) {
  const rng = mulberry32(hashSeed(key, 0xda11));
  const useMask = rng() < 0.3;
  const mask = useMask ? MASK_SHAPES[Math.floor(rng() * MASK_SHAPES.length)] : null;
  const size = mask ? 15 : 14;
  const rows = mask ? size : size + (rng() < 0.5 ? 1 : 0);
  return { ...TIERS.superHard, tier: 'superHard', rows, cols: size, mask, seed: 1e8 + key };
}
