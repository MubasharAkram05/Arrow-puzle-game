import { DIRS } from './directions.js';
import { buildOccupancy, clearArrow, freeArrows } from './board.js';
import { MAX_LEN, MIN_FILL, MIN_LEN } from './levels.js';

/**
 * Greedy solver. Removing an arrow only frees cells, so greedy removal solves any solvable board.
 * @param {import('./board.js').Board} level
 * @returns {{solvable: boolean, order: number[], rounds: number}} rounds = waves of simultaneous removals
 */
export function solveLevel(level) {
  const occ = buildOccupancy(level);
  const removed = new Uint8Array(level.arrows.length);
  const order = [];
  let rounds = 0;
  for (;;) {
    const free = freeArrows(occ, level, removed);
    if (!free.length) break;
    rounds++;
    for (const id of free) {
      removed[id] = 1;
      order.push(id);
      clearArrow(occ, level.cols, level.arrows[id]);
    }
  }
  return { solvable: order.length === level.arrows.length, order, rounds };
}

/**
 * Full structural check used by tests.
 * @param {object} level
 * @returns {string[]} problems (empty = valid)
 */
export function validateLevel(level) {
  const errs = [];
  const seen = new Int16Array(level.rows * level.cols).fill(-1);
  level.arrows.forEach((a, idx) => {
    if (a.id !== idx) errs.push(`bad id ${a.id}`);
    if (a.path.length < MIN_LEN || a.path.length > MAX_LEN) errs.push(`arrow ${idx} length ${a.path.length}`);
    a.path.forEach((p, i) => {
      if (p.r < 0 || p.r >= level.rows || p.c < 0 || p.c >= level.cols) {
        errs.push('out of bounds');
        return;
      }
      const k = p.r * level.cols + p.c;
      if (level.mask && !level.mask[k]) errs.push(`arrow ${idx} outside mask`);
      if (seen[k] !== -1) errs.push(`cell overlap at ${p.r},${p.c}`);
      seen[k] = idx;
      const prev = a.path[i - 1];
      if (i > 0 && Math.abs(p.r - prev.r) + Math.abs(p.c - prev.c) !== 1) errs.push(`arrow ${idx} not contiguous`);
    });
    const d = DIRS[a.dir];
    if (!d || a.path[0].r - a.path[1].r !== d.dr || a.path[0].c - a.path[1].c !== d.dc) {
      errs.push(`arrow ${idx} bad direction`);
    }
  });
  if (level.fill < MIN_FILL) errs.push(`fill ${level.fill.toFixed(2)}`);
  if (!solveLevel(level).solvable) errs.push('not solvable');
  return errs;
}
