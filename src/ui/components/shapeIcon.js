/**
 * Filled silhouettes of board shapes: a small one for level tiles (sampled like a board) and a full-detail
 * one for the Shape Collection. Both need the shape library to be loaded.
 */
import { getShape, levelMask, makeMask } from '../../engine/index.js';

const SIZE = 16;
const cache = new Map();

/**
 * SVG path of a bit grid, one rectangle per horizontal run of filled cells (keeps the markup small).
 * @param {ArrayLike<number>} bits
 * @param {number} w
 * @param {number} h
 * @returns {string}
 */
export function runsPath(bits, w, h) {
  let d = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bits[y * w + x]) continue;
      let end = x;
      while (end + 1 < w && bits[y * w + end + 1]) end++;
      d += `M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end;
    }
  }
  return d;
}

/**
 * Small silhouette for a level tile, drawn from the same mask the generator uses.
 * @param {string} name shape id (see src/engine/shapes/library.js)
 * @param {string} [cls] extra classes
 * @returns {string} svg markup
 */
export function shapeIcon(name, cls = '') {
  if (!cache.has(name)) cache.set(name, runsPath(makeMask(name, SIZE, SIZE), SIZE, SIZE));
  return `<svg class="icon ${cls}" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true"><path d="${cache.get(name)}" fill="currentColor" stroke="none"/></svg>`;
}

/**
 * A level's board outline for its Levels page node: the exact mask the game board uses (same function,
 * same size), as crisp vector cells that stay sharp at any size.
 * @param {number} n level number (4 and up)
 * @param {string} [cls] extra classes
 * @returns {string} svg markup
 */
export function levelIcon(n, cls = '') {
  const m = levelMask(n);
  const key = `${m.shape}:${m.rows}x${m.cols}`;
  if (!cache.has(key)) cache.set(key, runsPath(m.bits, m.cols, m.rows));
  const side = Math.max(m.rows, m.cols);
  return `<svg class="icon ${cls}" viewBox="${(m.cols - side) / 2} ${(m.rows - side) / 2} ${side} ${side}" data-shape="${m.shape}" aria-hidden="true" shape-rendering="crispEdges"><path d="${cache.get(key)}" fill="currentColor" stroke="none"/></svg>`;
}

/**
 * Full-detail silhouette of a library shape, centred in a square.
 * @param {string} id
 * @param {string} [cls]
 * @returns {string} svg markup
 */
export function shapeArt(id, cls = '') {
  const s = getShape(id);
  const size = Math.max(s.w, s.h);
  return `<svg class="${cls}" viewBox="${(s.w - size) / 2} ${(s.h - size) / 2} ${size} ${size}" aria-hidden="true" shape-rendering="crispEdges"><path d="${runsPath(s.bits, s.w, s.h)}" fill="currentColor"/></svg>`;
}
