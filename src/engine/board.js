import { DIRS } from './directions.js';

/**
 * @typedef {{r: number, c: number}} Cell
 * @typedef {{id: number, dir: number, path: Cell[]}} Arrow  path[0] is the head
 * @typedef {{rows: number, cols: number, arrows: Arrow[], mask: number[]|null}} Board
 */

/**
 * Occupancy array: cell index -> arrow id, -1 when empty.
 * @param {Board} level
 * @returns {Int16Array}
 */
export function buildOccupancy(level) {
  const occ = new Int16Array(level.rows * level.cols).fill(-1);
  for (const a of level.arrows) for (const p of a.path) occ[p.r * level.cols + p.c] = a.id;
  return occ;
}

/**
 * First arrow cell in front of a head.
 * @param {Int16Array} occ
 * @param {number} rows
 * @param {number} cols
 * @param {Cell} head
 * @param {number} dir
 * @returns {{id: number, dist: number}|null} dist = empty cells before the blocker; null if clear
 */
export function rayBlocker(occ, rows, cols, head, dir) {
  const d = DIRS[dir];
  let r = head.r + d.dr;
  let c = head.c + d.dc;
  let dist = 0;
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    const id = occ[r * cols + c];
    if (id !== -1) return { id, dist };
    r += d.dr;
    c += d.dc;
    dist++;
  }
  return null;
}

/**
 * Ids of every distinct arrow in front of a head (all must leave before it can).
 * @param {Int16Array} occ
 * @param {Board} level
 * @param {Arrow} arrow
 * @returns {number[]}
 */
export function rayArrows(occ, level, arrow) {
  const d = DIRS[arrow.dir];
  const ids = [];
  let r = arrow.path[0].r + d.dr;
  let c = arrow.path[0].c + d.dc;
  while (r >= 0 && r < level.rows && c >= 0 && c < level.cols) {
    const id = occ[r * level.cols + c];
    if (id !== -1 && id !== arrow.id && ids.indexOf(id) === -1) ids.push(id);
    r += d.dr;
    c += d.dc;
  }
  return ids;
}

/**
 * Ids of arrows that can escape right now.
 * @param {Int16Array} occ
 * @param {Board} level
 * @param {ArrayLike<number>} [removed] removed[id] truthy = already gone
 * @returns {number[]}
 */
export function freeArrows(occ, level, removed) {
  const out = [];
  for (const a of level.arrows) {
    if (removed && removed[a.id]) continue;
    if (!rayBlocker(occ, level.rows, level.cols, a.path[0], a.dir)) out.push(a.id);
  }
  return out;
}

/**
 * Remove an arrow's cells from an occupancy array.
 * @param {Int16Array} occ
 * @param {number} cols
 * @param {Arrow} arrow
 */
export function clearArrow(occ, cols, arrow) {
  for (const p of arrow.path) occ[p.r * cols + p.c] = -1;
}
