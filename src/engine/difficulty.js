import { LEVELS, TIER_FLOORS } from '../config.js';
import { buildOccupancy, rayArrows } from './board.js';
import { solveLevel } from './solver.js';
import { extraMetrics } from './metrics.js';

/**
 * @typedef {object} DifficultyReport
 * @property {number[]} depths  per arrow: how many arrows must be removed before it is free
 * @property {number} startFree arrows that can escape on the first move
 * @property {number} startFreeRatio startFree / arrow count
 * @property {number} maxDepth  largest blocking depth
 * @property {number} avgDepth  mean blocking depth
 * @property {number} rounds    solver waves (longest dependency chain)
 * @property {boolean} solvable
 * @property {number} freePerRound average arrows free per solve round (see metrics.js)
 * @property {number} minFree   fewest free arrows at any move (a bottleneck)
 * @property {number} longestChain longest nearest-blocker chain, in arrows
 * @property {number} decoyRatio share of arrows blocked by exactly one arrow
 * @property {number} edgeFreeRatio share of start-free arrows with their head on the outer ring
 */

/**
 * Measure how hard a level is from its blocking structure.
 * An arrow must wait for every arrow in front of its head, and those wait for theirs,
 * so its blocking depth is the size of that transitive set.
 * @param {import('./board.js').Board} level
 * @returns {DifficultyReport}
 */
export function analyzeLevel(level) {
  const occ = buildOccupancy(level);
  const deps = level.arrows.map((a) => rayArrows(occ, level, a));
  const count = level.arrows.length;
  // each arrow's set of arrows that must leave before it, as a bitset (words of 32 arrows): OR-ing
  // bitsets is much faster than merging JS Sets, and the sizes are exactly the same
  const words = Math.ceil(count / 32) || 1;
  const bits = new Uint32Array(count * words);
  const done = new Uint8Array(count);
  const visiting = new Uint8Array(count);
  let cyclic = false;

  /** Fill arrow id's bitset (memoized DFS); a cycle marks the level unsolvable. */
  function closure(id) {
    if (done[id]) return;
    if (visiting[id]) {
      cyclic = true;
      return;
    }
    visiting[id] = 1;
    const base = id * words;
    for (const d of deps[id]) {
      closure(d);
      bits[base + (d >>> 5)] |= 1 << (d & 31);
      const db = d * words;
      for (let w = 0; w < words; w++) bits[base + w] |= bits[db + w];
    }
    visiting[id] = 0;
    done[id] = 1;
  }

  /** Number of set bits in arrow id's bitset. */
  function size(id) {
    let total = 0;
    for (let w = id * words, end = w + words; w < end; w++) {
      let v = bits[w];
      v -= (v >>> 1) & 0x55555555;
      v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
      total += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
    }
    return total;
  }

  const depths = level.arrows.map((a) => {
    closure(a.id);
    return size(a.id);
  });
  const n = depths.length || 1;
  const startFree = deps.filter((d) => d.length === 0).length;
  const { rounds, solvable } = solveLevel(level);
  return {
    depths,
    startFree,
    startFreeRatio: startFree / n,
    maxDepth: Math.max(0, ...depths),
    avgDepth: depths.reduce((s, d) => s + d, 0) / n,
    rounds,
    solvable: solvable && !cyclic,
    ...extraMetrics(level, occ, deps, rounds),
  };
}

const C = LEVELS.curve;
const lerp = (a, b, t) => a + (b - a) * t;

/** 0 at the first curve level, 1 at fullSizeLevel: a square-root ramp (fast early, slower later). */
function early(n) {
  const t = (n - C.firstLevel) / (C.fullSizeLevel - C.firstLevel);
  return Math.min(1, Math.max(0, t)) ** C.growth;
}

/** 0 at fullSizeLevel, 1 at lateLevel, on a log scale (keeps rising for very high levels). */
function late(n) {
  if (n <= C.fullSizeLevel) return 0;
  return Math.min(1, Math.log(n / C.fullSizeLevel) / Math.log(C.lateLevel / C.fullSizeLevel));
}

/** Value of a [start, full size] or [start, full size, late] curve at level n. */
function ramp(v, n) {
  return v.length === 3 && n > C.fullSizeLevel ? lerp(v[1], v[2], late(n)) : lerp(v[0], v[1], early(n));
}

/**
 * Display name of a level's difficulty (Normal, Hard, Super Hard, Expert).
 * @param {number} n
 * @returns {string}
 */
export function tierLabel(n) {
  return C.tiers.reduce((label, t) => (n >= t.from ? t.label : label), C.tiers[0].label);
}

/**
 * The difficulty curve: everything a level number needs to build its board. Every value grows
 * (or, for the max values, shrinks) with the level and never goes back, for any level number.
 * @param {number} level 1-based, any size
 * @returns {{gridW: number, gridH: number, targetArrows: number, maxStartFree: number,
 *   minAvgDepth: number, minSolveRounds: number, maxFreePerRound: number, minLongestChain: number,
 *   minDecoyRatio: number, maxEdgeFreeRatio: number, longArrowShare: number, shapeScale: number,
 *   depthBias: number, boardGrow: number, growUpTo: number, floorFallback: object|null, tier: string}}
 */
export function difficultyFor(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  const e = early(n);
  const gridW = Math.round(lerp(C.gridW[0], C.gridW[1], e));
  const gridH = Math.round(lerp(C.gridH[0], C.gridH[1], e));
  const targetArrows = Math.round(gridW * gridH * C.arrowsPerCell);
  const tier = tierLabel(n);
  const f = TIER_FLOORS[tier];
  return {
    gridW,
    gridH,
    targetArrows,
    maxStartFree: f.maxStartFree,
    minAvgDepth: Math.floor(ramp(C.depthPerArrow, n) * targetArrows * f.boost * 10) / 10,
    minSolveRounds: Math.floor(ramp(C.roundsPerArrow, n) * targetArrows * f.boost),
    maxFreePerRound: f.maxFreePerRound,
    minLongestChain: f.minLongestChain,
    minDecoyRatio: f.minDecoyRatio,
    maxEdgeFreeRatio: f.maxEdgeFreeRatio,
    boardGrow: f.boardGrow || 0,
    growUpTo: f.growUpTo || Infinity,
    floorFallback: f.floorFallback || null,
    longArrowShare: Math.round(ramp(C.longArrowShare, n) * 1000) / 1000,
    shapeScale: Math.round(lerp(C.shapeScale[0], C.shapeScale[1], e) * 1000) / 1000,
    depthBias: Math.round(lerp(C.depthBias[0], C.depthBias[1], e) * 100) / 100,
    tier,
  };
}
