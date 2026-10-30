/**
 * Pure zoom numbers (no DOM), so the default zoom can be unit tested.
 */
import { ZOOM } from '../config.js';

/**
 * Scale a level starts at: dense boards (cells under minTapPx) open zoomed in so a cell is
 * about startCellPx wide; boards with big enough cells open fully fitted (1).
 * @param {number} cellPx on-screen cell size when the whole board fits
 * @param {typeof ZOOM} [z]
 * @returns {number}
 */
export function startScale(cellPx, z = ZOOM) {
  if (!(cellPx > 0) || cellPx >= z.minTapPx) return 1;
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
