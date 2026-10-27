import { buildOccupancy, rayArrows } from './board.js';
import { solveLevel } from './solver.js';

/**
 * @typedef {object} DifficultyReport
 * @property {number[]} depths  per arrow: how many arrows must be removed before it is free
 * @property {number} startFree arrows that can escape on the first move
 * @property {number} startFreeRatio startFree / arrow count
 * @property {number} maxDepth  largest blocking depth
 * @property {number} avgDepth  mean blocking depth
 * @property {number} rounds    solver waves (longest dependency chain)
 * @property {boolean} solvable
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
  };
}
