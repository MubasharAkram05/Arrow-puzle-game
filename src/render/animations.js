import { CELL } from '../config.js';
import { state } from '../game/state.js';
import { requestFrame, startMoving, stopMoving } from './canvasBoard.js';
import { escapeFx } from './effects/index.js';

/**
 * requestAnimationFrame tween from 0 to 1.
 * @param {number} duration ms
 * @param {(t: number) => number} ease
 * @param {(v: number) => void} step receives the eased value
 * @returns {Promise<void>}
 */
export function tween(duration, ease, step) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      step(ease(t));
      requestFrame();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Slide an arrow along its own path and straight out of the board.
 * @param {object} a live arrow
 * @returns {Promise<void>}
 */
export function animateEscape(a) {
  const g = a.geom;
  const dist = g.dashLen + (g.toEdge + 1.5) * CELL;
  const dur = Math.max(260, Math.min(450, 200 + dist * 0.06));
  const fx = escapeFx(a); // equipped escape effect (null for the classic slide or reduced motion)
  a.pressed = false;
  a.tone = 'primary';
  startMoving(a);
  return tween(dur, easeIn, (t) => {
    a.offset = dist * t;
    if (t > 0.6) a.alpha = 1 - (t - 0.6) / 0.4;
    if (fx) fx(t, dist * t);
  });
}

/**
 * Move forward until the head touches the blocker, flash red, slide back.
 * @param {object} a live arrow
 * @param {{id: number, dist: number}} block
 * @returns {Promise<void>}
 */
export async function animateBlocked(a, block) {
  const m = state.metrics;
  const hit = (block.dist + 1) * CELL - m.sw / 2 - m.tip;
  a.pressed = false;
  startMoving(a);
  await tween(Math.min(300, 140 + block.dist * 25), easeIn, (t) => (a.offset = hit * t));
  a.tone = 'err';
  const other = state.arrows[block.id];
  if (other && !other.escaped) bump(other, a.geom.dx, a.geom.dy);
  await tween(280, easeOut, (t) => (a.offset = hit * (1 - t)));
  await wait(120);
  a.tone = null;
  a.offset = 0;
  if (state.hintId !== a.id) stopMoving(a);
  requestFrame();
}

/** Small nudge on the arrow that was hit. */
function bump(o, dx, dy) {
  startMoving(o);
  tween(
    180,
    (t) => t,
    (t) => {
      const k = Math.sin(t * Math.PI) * 6;
      o.bumpX = dx * k;
      o.bumpY = dy * k;
    },
  ).then(() => {
    o.bumpX = o.bumpY = 0;
    if (!o.tone && !o.pressed && state.hintId !== o.id) stopMoving(o);
  });
}
