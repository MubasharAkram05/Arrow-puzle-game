import { LEVELS, SNAKE } from '../config.js';
import { makeMask } from './masks.js';
import { shapeOrder } from './shapes/library.js';
import { shapeAt } from './shapes/plan.js';
import { minBoardSide } from './masks.js';
import { difficultyFor, tierLabel } from './difficulty.js';

/** Global arrow length limits. */
export const MIN_LEN = LEVELS.minLen;
/** Shortest arrow a hard-board pass may leave after cutting (from level 4; 2-cell arrows only as a last resort). */
export const SHAPE_MIN_LEN = 3;
export const MAX_LEN = LEVELS.maxLen;
/** Minimum share of usable cells covered by arrows. */
export const MIN_FILL = LEVELS.minFill;

/**
 * Is level n a shape level? From level 4: two plain boards, then one shape (levels 6, 9, 12, ...). Works without
 * the library.
 * @param {number} n
 * @returns {boolean}
 */
export const isShapeLevel = (n) =>
  n >= LEVELS.shapeFrom && (n - LEVELS.shapeFrom) % LEVELS.shapeEvery === LEVELS.shapeEvery - 1;

/**
 * Board shape id of a level (null for the tutorial and plain levels). Every cycle of (library size) shape
 * levels shows each shape once (see shapes/plan.js); later cycles get bigger boards. Needs the shape library.
 * @param {number} n
 * @returns {string|null}
 */
export function shapeOf(n) {
  if (!isShapeLevel(n)) return null;
  return shapeAt(shapeOrder(), Math.floor((n - LEVELS.shapeFrom) / LEVELS.shapeEvery));
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
    // never below the size where the shape still reads as itself
    sizeCache.set(key, Math.max(n, minBoardSide(mask)));
  }
  return sizeCache.get(key);
}

/**
 * The exact board mask a level plays on: the same shape, size and mask the generator uses (Levels page
 * icons draw this). Null for the tutorial.
 * @param {number} n
 * @returns {{shape: string, rows: number, cols: number, bits: number[]}|null}
 */
export function levelMask(n) {
  const cfg = getLevelConfig(n);
  if (!cfg.mask) return null;
  return { shape: cfg.mask, rows: cfg.rows, cols: cfg.cols, bits: makeMask(cfg.mask, cfg.rows, cfg.cols) };
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
 * @param {string|null} [shape] play this shape at level n's difficulty instead of the level's own board (null: plain)
 * @param {number} [grow] cells added to a shape board's side (when the shape keeps missing its floors)
 * @returns {LevelConfig & object}
 */
export function getLevelConfig(n, shape, grow = 0) {
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
  const mask = shape === undefined ? shapeOf(n) : shape; // null: a plain board (tests)
  // Expert boards get boardGrow more cells on each side, but never past growUpTo (a board already
  // bigger than that keeps its own size)
  const grown = (side) => Math.max(side, Math.min(side + d.boardGrow, d.growUpTo));
  // snake arrows are longer (fewer per board): boards hold boardScale x the cells, so the depth stays; plain
  // boards (3.20.0) hold as many usable cells as a shape board of the level (shapeScale), so they are as hard
  const scale = d.arrowShape.boardScale || 1;
  const plain = d.arrowShape.plainArea ?? d.shapeScale;
  let rows = grown(Math.round(d.gridH * Math.sqrt(scale * plain)));
  let cols = grown(Math.round(d.gridW * Math.sqrt(scale * plain)));
  // shape boards are square and grow until the shape holds shapeScale x the plain board's cells
  if (mask) cols = rows = grown(shapeSize(mask, d.gridW, Math.round(d.gridW * d.gridH * d.shapeScale * scale))) + grow;
  const goals = {
    maxStartFree: d.maxStartFree,
    minAvgDepth: d.minAvgDepth,
    minRounds: d.minSolveRounds,
    maxFreePerRound: d.maxFreePerRound,
    minLongestChain: d.minLongestChain,
    minDecoyRatio: d.minDecoyRatio,
    maxEdgeFreeRatio: d.maxEdgeFreeRatio,
    // arrow shapes and blocking (3.17.0): see TIER_FLOORS arrowShape
    minBlockersAhead: d.arrowShape.minBlockersAhead,
    minBlockedShare: LEVELS.minBlockedShare,
    maxStraightShare: d.arrowShape.maxStraight,
    // snake arrows (3.18.0): every board turns often and runs its arrows side by side
    minAvgTurns: d.arrowShape.minAvgTurns,
    minHugRatio: d.arrowShape.minHug,
    maxShortShare: LEVELS.maxShortShare,
    maxStraightStubs: 0, // straight arrows are 4+ cells
  };
  // a shape's jagged edge lets more arrows out at the start, so shapes keep their extra first moves
  // (and those sit on the shape's edge); every other floor is the same as a plain level of that number
  if (mask)
    Object.assign(goals, {
      maxStartFree: d.maxStartFree + LEVELS.maskExtraFree,
      maxStartFreeShare: LEVELS.maskFreeShare,
      maxEdgeFreeRatio: 1,
    });
  // direction mix targets (3.19.0): no same-way queues. Up to the tier's dirPicks boards that meet every floor
  // are tried for one under both targets (see generator.js). Plain boards too (3.20.0): they start the fill
  // from several free arrows (plainSeeds), so it doesn't sweep the board as one front
  const dirGoals = { maxSameDirBlock: d.arrowShape.maxSameDirBlock, maxQueueMoves: d.arrowShape.maxQueueMoves };
  return {
    ...base,
    tier: d.tier,
    difficulty: d.tier,
    rows,
    cols,
    mask,
    depthBias: d.depthBias,
    // from level 4: no arrow under 3 cells (2 only as a last resort), 3-5 / 6-10 / 11-25 cells, bends first
    shapeRules: true,
    lenMin: 3,
    lenMax: SNAKE.mediumMax,
    styles: LEVELS.styles,
    // snake growth (3.18.0): turn often, follow the arrows already placed (see grow.js growSnake)
    snake: { ...SNAKE.grow, turn: d.arrowShape.turn, follow: d.arrowShape.follow, plug: SNAKE.dirMix.plug },
    dirMix: SNAKE.dirMix, // direction mix while peeling (3.19.0, see heads.js dirScore)
    minFill: d.arrowShape.minFill, // share of usable cells covered by arrows (3.18.0: boards almost full)
    lengths: {
      short: { min: 3, max: 5 },
      medium: { min: 6, max: SNAKE.mediumMax, share: d.arrowShape.mediumShare },
      long: { min: SNAKE.longMin, max: SNAKE.longMax, share: d.arrowShape.longShare },
    },
    arrowShape: d.arrowShape,
    // depth aim (Normal, Hard): try a few more boards until one is depthAim x the depth floor (see generator)
    depthAim: d.arrowShape.depthAim || 0,
    depthPicks: d.arrowShape.depthPicks || 1,
    // snake arrows are longer, so a board holds fewer of them (the depth floors stay the same)
    arrowsMin: Math.floor(d.targetArrows * LEVELS.curve.minArrowsShare * SNAKE.arrowsShare),
    goals,
    dirGoals,
    dirPicks: (!mask && d.arrowShape.plainDirPicks) || d.arrowShape.dirPicks,
    plainSeeds: SNAKE.plainSeeds,
    seedFar: mask ? 0 : SNAKE.seedFar,
    floorFallback: d.floorFallback,
    ...LEVELS.curve.hardness,
    // plain boards: less pull to build behind the latest arrows, so the two fill fronts both grow (fewer queues)
    ...(mask ? {} : { roundBias: SNAKE.plainRoundBias }),
    // snake boards refill cut cells (fill.js), so a decoy cut may take a whole long tail
    deepen: { ...LEVELS.curve.hardness.deepen, maxCut: SNAKE.longMax },
  };
}
