import { LEVELS } from '../config.js';
import { hashSeed, mulberry32 } from './rng.js';
import { MASK_SHAPES } from './masks.js';

/** Global arrow length limits. */
export const MIN_LEN = LEVELS.minLen;
export const MAX_LEN = LEVELS.maxLen;
/** Widest board (cells). Big boards are played with pinch zoom. */
export const MAX_COLS = LEVELS.maxCols;
/** Minimum share of usable cells covered by arrows. */
export const MIN_FILL = LEVELS.minFill;
/** Tier settings (numbers in src/config.js). */
export const TIERS = LEVELS.tiers;

/**
 * Board shape of a level, or null for a plain rectangle. Every 3rd level after the tutorial
 * is a shape, cycling through MASK_SHAPES.
 * @param {number} n
 * @returns {string|null}
 */
export function shapeOf(n) {
  if (n < LEVELS.shapeFrom || n % LEVELS.shapeEvery !== 0) return null;
  return MASK_SHAPES[(n / LEVELS.shapeEvery - Math.ceil(LEVELS.shapeFrom / LEVELS.shapeEvery)) % MASK_SHAPES.length];
}

/** Tier name for a level number. */
export function tierOf(n) {
  return Object.keys(TIERS).find((k) => n >= TIERS[k].levels[0] && n <= TIERS[k].levels[1]);
}

/** Copy tier settings for a board, easing goals on masked boards. */
function tierConfig(tier, mask) {
  const t = TIERS[tier];
  const goals =
    t.goals && mask
      ? {
          ...t.goals,
          maxStartFree: t.goals.maxStartFree + LEVELS.maskExtraFree,
          minAvgDepth: t.goals.minAvgDepth * LEVELS.maskGoalScale,
          minRounds: Math.round(t.goals.minRounds * LEVELS.maskGoalScale),
        }
      : t.goals;
  const styles = t.styles || LEVELS.styles;
  return {
    ...t,
    goals,
    styles,
    longStyles: LEVELS.longStyles,
    lenMin: LEVELS.minLen,
    lenMax: t.lengths.medium.share ? t.lengths.medium.max : t.lengths.short.max,
  };
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
 * @returns {LevelConfig & object}
 */
export function getLevelConfig(n) {
  const rng = mulberry32(hashSeed(n, 0x51ed));
  const tier = tierOf(n);
  const t = TIERS[tier];
  const z = t.size;
  let cols = Math.min(z.max, z.from + Math.floor((n - t.levels[0]) / z.every));
  const mask = shapeOf(n);
  // portrait boards like a phone screen; shape boards are square so the shape isn't stretched
  let rows;
  if (mask) cols = rows = Math.min(MAX_COLS, cols + LEVELS.maskExtraCols);
  else rows = cols + z.tall + (tier === 'tutorial' ? 0 : Math.floor(rng() * 2));
  const cfg = { ...tierConfig(tier, mask), tier, rows, cols, mask, seed: n };
  if (t.arrows && (!mask || tier === 'tutorial')) [cfg.arrowsMin, cfg.arrowsMax] = t.arrows;
  return cfg;
}
