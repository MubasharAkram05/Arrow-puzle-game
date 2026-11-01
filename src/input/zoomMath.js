/**
 * Pure zoom numbers (no DOM), so the default zoom can be unit tested.
 */
import { ZOOM } from '../config.js';

/**
 * Scale a level starts at: dense boards (cells under zoomBelowPx) open zoomed in so a cell is
 * about startCellPx wide; boards with big enough cells open fully fitted (1).
 * @param {number} cellPx on-screen cell size when the whole board fits
 * @param {typeof ZOOM} [z]
 * @returns {number}
 */
export function startScale(cellPx, z = ZOOM) {
  if (!(cellPx > 0) || cellPx >= z.zoomBelowPx) return 1;
  return Math.min(z.maxScale, z.startCellPx / cellPx);
}

/**
 * Furthest a board may zoom in: until a cell is about a fingertip wide, never below the start scale.
 * @param {number} cellPx
 * @param {typeof ZOOM} [z]
 * @returns {number}
 */
export function maxScaleFor(cellPx, z = ZOOM) {
  if (!(cellPx > 0)) return 1;
  return Math.max(1, startScale(cellPx, z), Math.min(z.maxScale, z.targetCellPx / cellPx));
}

/**
 * Translate that puts board point q (offset from the card centre, unscaled px) at screen point p,
 * given the card centre c (without translate) and scale s.
 * @returns {{x: number, y: number}}
 */
export function translateFor(q, p, c, s) {
  return { x: p.x - c.x - s * q.x, y: p.y - c.y - s * q.y };
}

/**
 * Where a zoomed level's first view should be centred, so it shows arrows and never an empty area (the
 * hole of a ring or donut shape, a gap in a shape). Looks at every view-sized window of the board and
 * picks the one nearest the board centre whose cells are at least `minCover` (80%) arrow cells. On a big board
 * (the view shows less than `bigShare` of it) the window must also hold the head of a free arrow, so the
 * first move is in sight. Falls back to dropping the free-arrow rule, then to the most-covered window.
 * Summed-area tables make each window O(1): O(rows x cols) in all.
 * @param {{rows: number, cols: number, arrows: {id: number, path: {r: number, c: number}[]}[]}} level
 * @param {number[]} freeIds arrows that can leave on the first move
 * @param {number} winCols view width in cells
 * @param {number} winRows view height in cells
 * @param {{minCover?: number, bigShare?: number}} [opts]
 * @returns {{fx: number, fy: number}} view centre as fractions (0-1) of the board width and height
 */
export function startFocus(level, freeIds, winCols, winRows, opts = {}) {
  const { rows, cols, arrows } = level;
  const minCover = opts.minCover ?? 0.8;
  const big = (winCols * winRows) / (rows * cols) < (opts.bigShare ?? 0.25);
  const W = cols + 1;
  const cover = new Int32Array(W * (rows + 1));
  const heads = new Int32Array(W * (rows + 1));
  const free = new Set(freeIds);
  for (const a of arrows) {
    for (const p of a.path) cover[(p.r + 1) * W + p.c + 1] = 1;
    if (free.has(a.id) && a.path.length) heads[(a.path[0].r + 1) * W + a.path[0].c + 1] = 1;
  }
  // in-place summed-area tables (row r+1, column c+1 holds the sum over rows <= r and columns <= c)
  for (const t of [cover, heads])
    for (let r = 1; r <= rows; r++)
      for (let c = 1; c <= cols; c++) t[r * W + c] += t[(r - 1) * W + c] + t[r * W + c - 1] - t[(r - 1) * W + c - 1];
  const sum = (t, r0, c0, r1, c1) => t[r1 * W + c1] - t[r0 * W + c1] - t[r1 * W + c0] + t[r0 * W + c0];
  const h = Math.max(1, Math.min(rows, Math.round(winRows)));
  const w = Math.max(1, Math.min(cols, Math.round(winCols)));
  const [mr, mc] = [rows / 2, cols / 2];
  const pick = [null, null, null]; // best window: with a free head (when big), without, most covered
  const bestDist = [Infinity, Infinity];
  let bestCover = -1;
  for (let r0 = 0; r0 + h <= rows; r0++)
    for (let c0 = 0; c0 + w <= cols; c0++) {
      const share = sum(cover, r0, c0, r0 + h, c0 + w) / (h * w);
      const centre = { r: r0 + h / 2, c: c0 + w / 2 };
      if (share > bestCover) [bestCover, pick[2]] = [share, centre];
      if (share < minCover) continue;
      const d = (centre.r - mr) ** 2 + (centre.c - mc) ** 2;
      if (d < bestDist[1]) [bestDist[1], pick[1]] = [d, centre];
      if (big && d < bestDist[0] && sum(heads, r0, c0, r0 + h, c0 + w) > 0) [bestDist[0], pick[0]] = [d, centre];
    }
  const at = (big && pick[0]) || pick[1] || pick[2] || { r: mr, c: mc };
  return { fx: at.c / cols, fy: at.r / rows };
}
