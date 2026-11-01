/**
 * Drawing one board on a 2D canvas context: arrows (shaft + head) and the dot grid, in board units
 * (CELL per cell). Used by canvasBoard.js.
 */
import { CELL } from '../config.js';
import { traceHead } from './canvasHeads.js';

/**
 * Add cumulative lengths along an arrow's polyline (for the snake movement).
 * @param {{pts: {x: number, y: number}[]}} g arrow geometry from arrowGeometry
 * @returns {object} g with g.cum
 */
export function withLengths(g) {
  const cum = [0];
  for (let i = 1; i < g.pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(g.pts[i].x - g.pts[i - 1].x, g.pts[i].y - g.pts[i - 1].y));
  }
  g.cum = cum;
  return g;
}

/** Trace the part of a polyline between distances from and to (board units). */
function traceSpan(ctx, g, from, to) {
  const { pts, cum } = g;
  let started = false;
  for (let i = 1; i < pts.length; i++) {
    const a = cum[i - 1];
    const b = cum[i];
    if (b < from) continue;
    if (a > to) break;
    const p = pts[i - 1];
    const q = pts[i];
    const len = b - a || 1;
    const t0 = Math.max(0, (from - a) / len);
    const t1 = Math.min(1, (to - a) / len);
    if (!started) {
      ctx.moveTo(p.x + (q.x - p.x) * t0, p.y + (q.y - p.y) * t0);
      started = true;
    }
    ctx.lineTo(p.x + (q.x - p.x) * t1, p.y + (q.y - p.y) * t1);
  }
}

/** Colour of an arrow right now. */
function toneOf(a, look) {
  const c = look.colors;
  if (a.tone === 'err') return c.error;
  if (a.tone === 'primary' || a.pressed || a.id === look.hintId) return c.primary;
  return c.arrow;
}

/**
 * Draw one arrow (shaft, then head) at its current offset, alpha and bump.
 * @param {CanvasRenderingContext2D} ctx in board units
 * @param {object} a live arrow with geom (see withLengths)
 * @param {{m: object, colors: object, hintId: number}} look stroke metrics, theme colours, hinted arrow
 * @param {number} [glow] draw the wide hint glow at this opacity instead
 */
export function drawArrow(ctx, a, look, glow) {
  const g = a.geom;
  const m = look.m;
  const s = a.offset || 0;
  ctx.save();
  if (a.bumpX || a.bumpY) ctx.translate(a.bumpX || 0, a.bumpY || 0);
  ctx.globalAlpha = glow || (a.alpha ?? 1);
  const color = glow ? look.colors.primary : toneOf(a, look);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = glow ? m.sw * 2.8 : m.sw;
  ctx.beginPath();
  traceSpan(ctx, g, s, s + g.dashLen);
  ctx.stroke();
  ctx.translate(g.hx + g.dx * s, g.hy + g.dy * s);
  ctx.rotate((g.rot * Math.PI) / 180);
  traceHead(ctx, m, glow ? 1.4 / 0.25 : 1);
  ctx.restore();
}

/**
 * Dot grid (only cells inside the mask, only inside the box when given).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{rows: number, cols: number, mask: ArrayLike<number>|null}} level
 * @param {number} radius dot radius (board units)
 * @param {string} color
 * @param {{x0: number, y0: number, x1: number, y1: number}} box
 */
export function drawDots(ctx, level, radius, color, box) {
  const { rows, cols, mask } = level;
  const r0 = Math.max(0, Math.floor(box.y0 / CELL));
  const r1 = Math.min(rows - 1, Math.ceil(box.y1 / CELL));
  const c0 = Math.max(0, Math.floor(box.x0 / CELL));
  const c1 = Math.min(cols - 1, Math.ceil(box.x1 / CELL));
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (mask && !mask[r * cols + c]) continue;
      const x = (c + 0.5) * CELL;
      const y = (r + 0.5) * CELL;
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/**
 * Box around an arrow's cells, one cell wider on each side for the head and round caps (board units).
 * @param {{path: {r: number, c: number}[]}} a
 * @returns {{x0: number, y0: number, x1: number, y1: number}}
 */
export function arrowBox(a) {
  let r0 = Infinity;
  let c0 = Infinity;
  let r1 = -Infinity;
  let c1 = -Infinity;
  for (const p of a.path) {
    r0 = Math.min(r0, p.r);
    c0 = Math.min(c0, p.c);
    r1 = Math.max(r1, p.r);
    c1 = Math.max(c1, p.c);
  }
  return { x0: (c0 - 1) * CELL, y0: (r0 - 1) * CELL, x1: (c1 + 2) * CELL, y1: (r1 + 2) * CELL };
}

/** Do two boxes overlap? */
export const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
