import { CELL, HIT_FALLBACK, TAP } from '../config.js';
import { state } from '../game/state.js';
import { tapArrow } from '../game/game.js';
import { notePress, requestFrame, startMoving, stopMoving } from '../render/canvasBoard.js';
import { $ } from '../ui/dom.js';
import { bindZoom, emptyTap, releaseIsTap } from './zoom.js';

/**
 * Squared distance from a point to a segment.
 * @returns {number}
 */
export function distSq(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  let t = l2 === 0 ? 0 : ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (px - x1 - t * (x2 - x1)) ** 2 + (py - y1 - t * (y2 - y1)) ** 2;
}

/**
 * Arrow at a board point (board units). O(1): the cell under the point gives the arrow straight from the
 * occupancy grid; otherwise only the arrows in the 3x3 cells around it are measured, and the nearest one
 * within HIT_FALLBACK cells (line or head) wins.
 * @param {{rows: number, cols: number}} level
 * @param {Int16Array} occ cell -> arrow id (-1 empty)
 * @param {object[]} arrows live arrows with geom
 * @param {number} x
 * @param {number} y
 * @returns {object|null}
 */
export function arrowAt(level, occ, arrows, x, y) {
  const { rows, cols } = level;
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (r >= 0 && r < rows && c >= 0 && c < cols) {
    const id = occ[r * cols + c];
    if (id !== -1) return arrows[id];
  }
  let best = null;
  let bestD = (HIT_FALLBACK * CELL) ** 2;
  const seen = new Set();
  for (let rr = r - 1; rr <= r + 1; rr++) {
    for (let cc = c - 1; cc <= c + 1; cc++) {
      if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      const id = occ[rr * cols + cc];
      if (id === -1 || seen.has(id)) continue;
      seen.add(id);
      const a = arrows[id];
      const g = a.geom;
      const p = g.pts;
      // shaft segments (the last point is far outside the board) and the head
      for (let i = 0; i < p.length - 2; i++) {
        const d = distSq(x, y, p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
        if (d < bestD) [bestD, best] = [d, a];
      }
      const d = distSq(x, y, g.hx, g.hy, g.hx + g.dx * CELL * 0.55, g.hy + g.dy * CELL * 0.55);
      if (d < bestD) [bestD, best] = [d, a];
    }
  }
  return best;
}

/**
 * Arrow under a screen point.
 * @param {number} clientX
 * @param {number} clientY
 * @returns {object|null} live arrow
 */
export function pickArrow(clientX, clientY) {
  const rect = $('board').getBoundingClientRect();
  if (!rect.width) return null;
  const { rows, cols } = state.level;
  const x = ((clientX - rect.left) / rect.width) * cols * CELL;
  const y = ((clientY - rect.top) / rect.height) * rows * CELL;
  return arrowAt(state.level, state.occ, state.arrows, x, y);
}

/** The press in progress: {a, id, x, y, t} */
let press = null;

/** Drop the press highlight (the finger moved away, or the tap was handled). */
function unpress() {
  if (!press) return;
  const a = press.a;
  press = null;
  if (!a) return;
  a.pressed = false;
  if (!a.tone && !a.escaped && state.hintId !== a.id) stopMoving(a);
  else requestFrame();
}

/**
 * Taps on the board. Feedback is instant: the arrow under the finger lights up on pointerdown and acts on
 * pointerup, with no wait for a double tap (double tap only zooms out on empty space). A release counts
 * as a tap when the finger moved less than TAP.movePx and stayed under TAP.maxMs; anything else is a pan
 * or pinch. The next arrow can be tapped while the previous one is still sliding out.
 */
export function bindBoardInput() {
  bindZoom();
  const wrap = $('board-wrap');
  $('board').addEventListener('pointerdown', (e) => e.preventDefault());
  wrap.addEventListener('pointerdown', (e) => {
    unpress();
    if (!e.isPrimary || state.locked || state.hearts <= 0 || !state.level) return;
    const a = pickArrow(e.clientX, e.clientY);
    press = { a, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    if (a && !a.escaped && !a.busy) {
      a.pressed = true;
      notePress(e.timeStamp);
      startMoving(a, true);
    }
  });
  wrap.addEventListener('pointermove', (e) => {
    if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) >= TAP.movePx)
      unpress();
  });
  wrap.addEventListener('pointerup', (e) => {
    const p = press && press.id === e.pointerId ? press : null;
    const quick = p && performance.now() - p.t < TAP.maxMs;
    const tap = releaseIsTap(e) && quick && Math.hypot(e.clientX - p.x, e.clientY - p.y) < TAP.movePx;
    const a = p?.a;
    unpress();
    if (!tap || state.locked || state.hearts <= 0) return;
    if (a && !a.escaped && !a.busy) tapArrow(a);
    else if (!a) emptyTap();
  });
  wrap.addEventListener('pointercancel', unpress);
}
