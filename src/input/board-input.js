import { CELL, HIT_FALLBACK } from '../config.js';
import { state } from '../game/state.js';
import { tapArrow } from '../game/game.js';
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
 * Arrow under the pointer: exact grid cell first, then a small radius around lines.
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
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (r >= 0 && r < rows && c >= 0 && c < cols) {
    const id = state.occ[r * cols + c];
    if (id !== -1) return state.arrows[id];
  }
  let best = null;
  let bestD = (HIT_FALLBACK * CELL) ** 2;
  for (const a of state.arrows) {
    if (a.escaped) continue;
    const p = a.geom.pts;
    for (let i = 0; i < p.length - 2; i++) {
      const d = distSq(x, y, p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    const g = a.geom;
    const d = distSq(x, y, g.hx, g.hy, g.hx + g.dx * CELL * 0.45, g.hy + g.dy * CELL * 0.45);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

/**
 * Listen for taps on the board. A tap fires on release, so a drag or pinch (zoom/pan) never removes an arrow.
 */
export function bindBoardInput() {
  bindZoom();
  $('board').addEventListener('pointerdown', (e) => e.preventDefault());
  $('board-wrap').addEventListener('pointerup', (e) => {
    if (!releaseIsTap(e) || state.locked || state.hearts <= 0) return;
    const a = pickArrow(e.clientX, e.clientY);
    if (a && !a.escaped && !a.busy) tapArrow(a);
    else if (!a) emptyTap();
  });
}
