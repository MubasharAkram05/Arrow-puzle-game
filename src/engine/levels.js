import { LEVELS } from '../config.js';
import { MASK_SHAPES, makeMask } from './masks.js';
import { difficultyFor, tierLabel } from './difficulty.js';

/** Global arrow length limits. */
export const MIN_LEN = LEVELS.minLen;
export const MAX_LEN = LEVELS.maxLen;
/** Minimum share of usable cells covered by arrows. */
export const MIN_FILL = LEVELS.minFill;

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

const sizeCache = new Map();

/**
 * Smallest square board on which a shape has at least `cells` usable cells (capped at maskMaxCols).
 * @param {string} mask
 * @param {number} from smallest width to try
 * @param {number} cells
 * @returns {number}
 */
export function shapeSize(mask, from, cells) {
  const key = `${mask}:${from}:${cells}`;
  if (!sizeCache.has(key)) {
    const usable = (n) => makeMask(mask, n, n).reduce((s, x) => s + x, 0);
    // jump close to the answer from the shape's coverage, then step up
    const cover = usable(from) / (from * from);
    let n = Math.max(from, Math.floor(Math.sqrt(cells / Math.max(cover, 0.05))) - 2);
    while (n < LEVELS.maskMaxCols && usable(n) < cells) n++;
    sizeCache.set(key, n);
  }
  return sizeCache.get(key);
}

/**
 * @typedef {object} LevelConfig
 * @property {string} tier
 * @property {number} rows
 * @property {number} cols
 * @property {string|null} mask
 * @property {number} seed
 */

const SHORT_ONLY = Object.freeze({
  short: { min: 2, max: 6 },
  medium: { min: 7, max: 12, share: 0 },
  long: { min: 13, max: 30, share: 0 },
});

/** Level 1, drawn by hand like the reference: three straight arrows (two up, one down), all free. */
export const LEVEL_ONE = Object.freeze({
  rows: 5,
  cols: 3,
  arrows: [
    { id: 0, dir: 0, path: [0, 1, 2, 3, 4].map((r) => ({ r, c: 0 })) },
    { id: 1, dir: 0, path: [0, 1, 2, 3, 4].map((r) => ({ r, c: 1 })) },
    { id: 2, dir: 2, path: [4, 3, 2, 1, 0].map((r) => ({ r, c: 2 })) },
  ],
});

/**
 * Board size, goals and mask for a level number (any number). Levels 2-3 are small tutorial boards;
 * from level 4 everything follows difficultyFor.
 * @param {number} n level number (1-based)
 * @returns {LevelConfig & object}
 */
export function getLevelConfig(n) {
  const base = {
    seed: n,
    hearts: LEVELS.hearts,
    lenMin: LEVELS.minLen,
    longStyles: LEVELS.longStyles,
  };
  const tut = LEVELS.tutorial[n];
  if (n < LEVELS.curve.firstLevel) {
    const t = tut || { cols: 5, rows: 5, arrows: [3, 8], rounds: [1, 4] };
    return {
      ...base,
      tier: 'tutorial',
      difficulty: tierLabel(n),
      rows: t.rows,
      cols: t.cols,
      mask: null,
      depthBias: 0,
      lenMax: SHORT_ONLY.short.max,
      styles: LEVELS.tutorialStyles,
      lengths: SHORT_ONLY,
      arrowsMin: t.arrows[0],
      arrowsMax: t.arrows[1],
      goals: { maxStartFree: 3, minAvgDepth: 0, minRounds: t.rounds[0], maxRounds: t.rounds[1] },
    };
  }
  const d = difficultyFor(n);
  const mask = shapeOf(n);
  let rows = d.gridH;
  let cols = d.gridW;
  // shape boards are square and grow until the shape holds shapeScale x the plain board's cells
  if (mask) cols = rows = shapeSize(mask, d.gridW, Math.round(d.gridW * d.gridH * d.shapeScale));
  const goals = { maxStartFree: d.maxStartFree, minAvgDepth: d.minAvgDepth, minRounds: d.minSolveRounds };
  if (mask)
    Object.assign(goals, {
      maxStartFree: d.maxStartFree + LEVELS.maskExtraFree,
      maxStartFreeShare: LEVELS.maskFreeShare,
    });
  return {
    ...base,
    tier: d.tier,
    difficulty: d.tier,
    rows,
    cols,
    mask,
    depthBias: d.depthBias,
    lenMax: 12,
    styles: LEVELS.styles,
    lengths: {
      short: { min: 2, max: 6 },
      medium: { min: 7, max: 12, share: LEVELS.curve.mediumShare },
      long: { min: 13, max: 30, share: d.longArrowShare },
    },
    arrowsMin: Math.floor(d.targetArrows * LEVELS.curve.minArrowsShare),
    goals,
  };
}
