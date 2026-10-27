import { CELL } from '../config.js';
import { state } from '../game/state.js';
import { setArrowOffset } from './board.js';

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
  a.el.classList.add('out');
  return tween(dur, easeIn, (t) => {
    setArrowOffset(a, dist * t);
    if (t > 0.6) a.el.style.opacity = String(1 - (t - 0.6) / 0.4);
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
  await tween(Math.min(300, 140 + block.dist * 25), easeIn, (t) => setArrowOffset(a, hit * t));
  a.el.classList.add('err');
  const other = state.arrows[block.id];
  if (other && other.el && !other.escaped) bump(other.el, a.geom.dx, a.geom.dy);
  await tween(280, easeOut, (t) => setArrowOffset(a, hit * (1 - t)));
  await wait(120);
  a.el.classList.remove('err');
}

/** Small nudge on the arrow that was hit. */
function bump(el, dx, dy) {
  tween(
    180,
    (t) => t,
    (t) => {
      const k = Math.sin(t * Math.PI) * 6;
      el.setAttribute('transform', `translate(${dx * k} ${dy * k})`);
    },
  ).then(() => el.removeAttribute('transform'));
}
