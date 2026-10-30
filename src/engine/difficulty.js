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
  const closures = new Array(level.arrows.length);
  const visiting = new Uint8Array(level.arrows.length);
  let cyclic = false;

  /** Set of arrows that must leave before arrow id (memoized DFS). */
  function closure(id) {
    if (closures[id]) return closures[id];
    if (visiting[id]) {
      cyclic = true;
      return new Set();
    }
    visiting[id] = 1;
    const set = new Set();
    for (const d of deps[id]) {
      set.add(d);
      for (const x of closure(d)) set.add(x);
    }
    visiting[id] = 0;
    closures[id] = set;
    return set;
  }

  const depths = level.arrows.map((a) => closure(a.id).size);
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
 *   depthBias: number, tier: string}}
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
    longArrowShare: Math.round(ramp(C.longArrowShare, n) * 1000) / 1000,
    shapeScale: Math.round(lerp(C.shapeScale[0], C.shapeScale[1], e) * 1000) / 1000,
    depthBias: Math.round(lerp(C.depthBias[0], C.depthBias[1], e) * 100) / 100,
    tier,
  };
}
