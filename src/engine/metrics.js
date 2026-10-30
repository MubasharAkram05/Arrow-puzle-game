import { DIRS } from './directions.js';
import { rayBlocker } from './board.js';

/**
 * Extra difficulty metrics: how a board feels while solving, not just how deep its chains are.
 *
 * - freePerRound: average arrows free in each solve round (arrows / rounds). Fewer options at a time.
 * - minFree: a player removes one arrow per move (always the one free the longest); the fewest arrows
 *   free at any move. 1 means a bottleneck where only one move is possible.
 * - longestChain: longest chain of nearest blockers (A's nearest blocker is B, B's is C, ...),
 *   counted in arrows. This is the chain a player has to read off the board.
 * - decoyRatio: share of arrows blocked by exactly one arrow. They point at the edge with one arrow
 *   in the way, so they look free but cost a heart.
 * - edgeFreeRatio: share of start-free arrows whose head sits on the outer ring of the board
 *   (the grid border, or next to a cell outside a shape). Lower = free moves are hidden inside.
 */

/** Is a cell on the outer ring (grid border, or touching an unusable shape cell)? */
export function onRing(level, r, c) {
  if (r === 0 || c === 0 || r === level.rows - 1 || c === level.cols - 1) return true;
  if (!level.mask) return false;
  return DIRS.some(({ dr, dc }) => !level.mask[(r + dr) * level.cols + (c + dc)]);
}

/**
 * Free arrows per move when one arrow is removed per move (oldest free first).
 * @param {number[][]} deps per arrow: every arrow in front of its head
 * @returns {{freePerMove: number, minFree: number, solved: number}}
 */
export function freePerMove(deps) {
  const n = deps.length;
  const left = deps.map((d) => d.length);
  const waiting = Array.from({ length: n }, () => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const queue = [];
  for (let id = 0; id < n; id++) if (!left[id]) queue.push(id);
  let head = 0;
  let sum = 0;
  let minFree = Infinity;
  while (head < queue.length) {
    const free = queue.length - head;
    sum += free;
    if (free < minFree) minFree = free;
    const id = queue[head++];
    for (const w of waiting[id]) if (--left[w] === 0) queue.push(w);
  }
  return { freePerMove: head ? sum / head : 0, minFree: head ? minFree : 0, solved: head };
}

/**
 * Longest nearest-blocker chain, in arrows (a free arrow alone is a chain of 1).
 * @param {(number|null)[]} nearest per arrow: id of the first arrow in front of its head, or null
 * @returns {number}
 */
export function longestNearestChain(nearest) {
  const len = new Int32Array(nearest.length);
  let best = 0;
  for (let id = 0; id < nearest.length; id++) {
    // walk down until a known length (or a free arrow), then fill the walked part back
    const walk = [];
    let x = id;
    while (x !== null && !len[x] && walk.length <= nearest.length) {
      walk.push(x);
      x = nearest[x];
    }
    let l = x === null || walk.length > nearest.length ? 0 : len[x];
    for (let i = walk.length - 1; i >= 0; i--) len[walk[i]] = ++l;
    if (len[id] > best) best = len[id];
  }
  return best;
}

/**
 * All extra metrics for a level.
 * @param {import('./board.js').Board} level
 * @param {Int16Array} occ occupancy (see buildOccupancy)
 * @param {number[][]} deps per arrow: every arrow in front of its head
 * @param {number} rounds solve rounds
 * @returns {{freePerRound: number, minFree: number, longestChain: number, decoyRatio: number,
 *   edgeFreeRatio: number}}
 */
export function extraMetrics(level, occ, deps, rounds) {
  const n = level.arrows.length || 1;
  const nearest = level.arrows.map((a) => rayBlocker(occ, level.rows, level.cols, a.path[0], a.dir)?.id ?? null);
  const free = level.arrows.filter((a, i) => !deps[i].length);
  const edge = free.filter((a) => onRing(level, a.path[0].r, a.path[0].c)).length;
  const { minFree } = freePerMove(deps);
  return {
    freePerRound: rounds ? level.arrows.length / rounds : 0,
    minFree,
    longestChain: longestNearestChain(nearest),
    decoyRatio: deps.filter((d) => d.length === 1).length / n,
    edgeFreeRatio: free.length ? edge / free.length : 0,
  };
}
