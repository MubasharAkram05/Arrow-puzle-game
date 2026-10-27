import { randInt } from './rng.js';

/** Turn values used in plans. */
const STRAIGHT = 0;
const RIGHT = 1;
const LEFT = 3;

/**
 * Relative turn plan for an arrow shape. plan[i] is the turn taken before step i.
 * @param {string} style straight | L | U | zigzag | spiral | snake
 * @param {number} len target arrow length
 * @param {() => number} rng
 * @returns {number[]} 0 straight, 1 right, 3 left
 */
export function makePlan(style, len, rng) {
  const plan = new Array(len + 2).fill(STRAIGHT);
  const t = rng() < 0.5 ? RIGHT : LEFT;
  const u = 4 - t;
  if (style === 'L') {
    plan[randInt(rng, 1, Math.max(1, len - 3))] = t;
  } else if (style === 'U') {
    const a = randInt(rng, 1, 4);
    const b = randInt(rng, 1, 2);
    plan[a] = t;
    plan[a + b] = t;
  } else if (style === 'zigzag') {
    // square wave: side h, forward w, other side h, forward w
    const h = randInt(rng, 1, 2);
    const w = randInt(rng, 1, 2);
    const pad = (n) => new Array(n).fill(STRAIGHT);
    const unit = [t, ...pad(h - 1), u, ...pad(w - 1), u, ...pad(h - 1), t, ...pad(w - 1)];
    for (let i = randInt(rng, 0, 1), k = 0; i < plan.length; i++, k++) plan[i] = unit[k % unit.length];
  } else if (style === 'spiral') {
    // inward spiral: same turn each segment, segments shrink every two turns
    let seg = randInt(rng, 3, 5);
    let i = seg;
    let repeat = 1;
    while (i < plan.length && seg > 0) {
      plan[i] = t;
      i += seg;
      if (repeat === 0) {
        seg--;
        repeat = 1;
      } else {
        repeat = 0;
      }
    }
  } else if (style === 'snake') {
    for (let i = 1; i < plan.length; i++) {
      const x = rng();
      plan[i] = x < 0.6 ? STRAIGHT : x < 0.8 ? RIGHT : LEFT;
    }
  }
  return plan;
}
