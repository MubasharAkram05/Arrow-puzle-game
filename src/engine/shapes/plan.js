/**
 * Which shape each shape level shows (every third level from 6, see levels.js isShapeLevel). The library order
 * (see buildOrder: easy shapes first, categories taking turns) is cut into two halves; every cycle of (library
 * size) shape levels shows each shape exactly once: the first half's shapes, then the second half's (shapes
 * that need a board bigger than SHAPE_BOARD.lateSide always in the second half). A shape stays in its half
 * from cycle to cycle, so it never comes back within half a cycle, even across the end of a cycle.
 *
 * Inside a half the categories are mixed at random (seeded), with three rules (3.20.0):
 * - letters come in alphabetical order (A, B, C ... Z, then A again next cycle) and numbers in order (0 ... 9):
 *   the first half holds the first letters and numbers, the second half the rest
 * - two shapes in a row are never from the same category, also across the halves and from cycle to cycle
 *   (every cycle ends with a shape of one fixed category and never starts with one)
 * - other categories come in a seeded shuffle, mixed between the letters and numbers (never all in a row)
 * Deterministic: the same level always gets the same shape.
 */
import { hashSeed, mulberry32 } from '../rng.js';
import { SHAPE_BOARD } from '../../config.js';
import { minBoardSide } from '../masks.js';
import { getShape } from './library.js';

/** Categories shown in order (their ids sort in that order: letterA..letterZ, number0..number9). */
export const ORDERED_CATEGORIES = Object.freeze(['letters', 'numbers']);

const cycles = new Map(); // cycle number -> shape ids (for the current library order)
let base = null;
let halves = null; // [first half ids, second half ids, the category every cycle ends with]

/** Seeded Fisher-Yates shuffle (a copy). */
function shuffled(ids, seed) {
  const out = ids.slice();
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const categoryOf = (id) => getShape(id)?.category ?? 'others';

/** The two halves of the library order (fixed for an order) and the category every cycle ends with. */
function splitHalves(order) {
  // shapes that need a big board go to the second half, where boards are big anyway
  const big = (id) => minBoardSide(id) > SHAPE_BOARD.lateSide;
  const sorted = [...order.filter((id) => !big(id)), ...order.filter(big)];
  const half = Math.ceil(order.length / 2);
  const parts = [sorted.slice(0, half), sorted.slice(half)];
  // letters and numbers: the first half keeps as many as it had, but the alphabetically first ones
  for (const cat of ORDERED_CATEGORIES) {
    const all = order.filter((id) => categoryOf(id) === cat).sort();
    const k = parts[0].filter((id) => categoryOf(id) === cat).length;
    const pick = [all.slice(0, k), all.slice(k)];
    parts.forEach((p, h) => {
      const at = p.map((id, i) => (categoryOf(id) === cat ? i : -1)).filter((i) => i >= 0);
      at.forEach((i, j) => (p[i] = pick[h][j]));
    });
  }
  // every cycle ends with the most common other category of the second half (and never starts with it)
  const count = {};
  for (const id of parts[1])
    if (!ORDERED_CATEGORIES.includes(categoryOf(id))) count[categoryOf(id)] = (count[categoryOf(id)] || 0) + 1;
  const endCat = Object.keys(count).sort((a, b) => count[b] - count[a] || (a < b ? -1 : 1))[0];
  return [parts[0], parts[1], endCat];
}

/**
 * Arrange one half: categories drawn at random in proportion to the shapes left (seeded), never the same
 * category twice in a row. Letters and numbers come off their queue in order, others in a seeded shuffle.
 * @param {string[]} ids
 * @param {() => number} rng
 * @param {{prev?: string, firstNot?: string, lastCat?: string}} rules
 * @returns {string[]|null} null when the draw got stuck (the caller tries the next seed)
 */
function arrange(ids, rng, rules) {
  const queues = new Map();
  for (const id of ids) {
    const c = categoryOf(id);
    if (!queues.has(c)) queues.set(c, []);
    queues.get(c).push(id);
  }
  for (const [c, q] of queues) {
    if (ORDERED_CATEGORIES.includes(c)) q.sort();
    else queues.set(c, shuffled(q, Math.floor(rng() * 2 ** 31)));
  }
  // the last shape is kept back (one of lastCat), so every cycle ends with that category
  const last = rules.lastCat && queues.get(rules.lastCat)?.length ? queues.get(rules.lastCat).pop() : null;
  const out = [];
  let prev = rules.prev;
  const total = ids.length - (last ? 1 : 0);
  for (let i = 0; i < total; i++) {
    const left = total - i;
    const cats = [...queues.keys()].filter((c) => {
      if (!queues.get(c).length || c === prev) return false;
      if (i === 0 && c === rules.firstNot) return false;
      if (last && i === total - 1 && c === rules.lastCat) return false;
      return true;
    });
    if (!cats.length) return null;
    // a category holding more than half of what is left must go now, or it would end up back to back
    const urgent = cats.find((c) => queues.get(c).length * 2 > left + 1);
    let c = urgent;
    if (!c) {
      let r = rng() * cats.reduce((n, k) => n + queues.get(k).length, 0);
      c = cats.find((k) => (r -= queues.get(k).length) < 0) ?? cats[cats.length - 1];
    }
    out.push(queues.get(c).shift());
    prev = c;
  }
  if (last) out.push(last);
  return out;
}

/**
 * Shape ids of one cycle.
 * @param {string[]} order library order (every shape once)
 * @param {number} cycle 0, 1, 2, ...
 * @returns {string[]}
 */
export function cycleOrder(order, cycle) {
  if (base !== order) {
    base = order;
    halves = splitHalves(order);
    cycles.clear();
  }
  if (!cycles.has(cycle)) {
    const [first, second, endCat] = halves;
    let ids = null;
    for (let attempt = 0; !ids && attempt < 64; attempt++) {
      const a = arrange(first, mulberry32(hashSeed(hashSeed(0x5a1d, cycle * 2), attempt)), { firstNot: endCat });
      const b =
        a &&
        arrange(second, mulberry32(hashSeed(hashSeed(0x5a1d, cycle * 2 + 1), attempt)), {
          prev: categoryOf(a[a.length - 1]),
          lastCat: endCat,
        });
      if (a && b) ids = [...a, ...b];
    }
    // (never needed with the real library: a plain seeded shuffle of each half as a last resort)
    cycles.set(
      cycle,
      ids ?? [...shuffled(first, hashSeed(0x5a1d, cycle * 2)), ...shuffled(second, hashSeed(0x5a1d, cycle * 2 + 1))],
    );
    if (cycles.size > 64) cycles.delete(cycles.keys().next().value);
  }
  return cycles.get(cycle);
}

/**
 * Shape of the k-th shape level (k = 0 for the first one).
 * @param {string[]} order library order
 * @param {number} k
 * @returns {string}
 */
export function shapeAt(order, k) {
  const n = order.length;
  return cycleOrder(order, Math.floor(k / n))[k % n];
}
