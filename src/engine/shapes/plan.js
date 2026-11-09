/**
 * Which shape each shape level shows (every third level from 6, see levels.js isShapeLevel). Shape levels come
 * in slots of four, repeating (3.20.0): a letter, another shape, a number, another shape.
 * - Letters go strictly A, B, C ... Z, then A again (the first shape level, level 6, is A).
 * - Numbers go strictly 1, 2 ... 9, 0, then 1 again.
 * - The other slots show every other shape (not a letter or number) once per cycle. Their library order is
 *   cut into two halves (shapes that need a board bigger than SHAPE_BOARD.lateSide always in the second half);
 *   a shape stays in its half from cycle to cycle, so it never comes back within half a cycle. Inside a half
 *   the categories are mixed at random (seeded), never the same category twice in a row, also across the
 *   halves and from cycle to cycle (every cycle ends with a shape of one fixed category and never starts with
 *   one). A letter or number sits between any two of them anyway.
 * Deterministic: the same level always gets the same shape.
 */
import { hashSeed, mulberry32 } from '../rng.js';
import { SHAPE_BOARD } from '../../config.js';
import { minBoardSide } from '../masks.js';
import { getShape } from './library.js';

/** Categories with their own slots, shown in order. */
export const ORDERED_CATEGORIES = Object.freeze(['letters', 'numbers']);

const cycles = new Map(); // cycle number -> other shape ids (for the current library order)
let base = null;
let parts = null; // {letters, numbers, others, halves: [first half, second half, end category]}

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

/** Letters (A..Z), numbers (1..9, 0), and the halves of the other shapes, fixed for a library order. */
function split(order) {
  const of = (cat) => order.filter((id) => categoryOf(id) === cat).sort();
  const letters = of('letters');
  const digits = of('numbers'); // number0 .. number9
  const numbers = [...digits.slice(1), ...digits.slice(0, 1)]; // 1 .. 9, then 0
  const others = order.filter((id) => !ORDERED_CATEGORIES.includes(categoryOf(id)));
  // shapes that need a big board go to the second half, where boards are big anyway
  const big = (id) => minBoardSide(id) > SHAPE_BOARD.lateSide;
  const sorted = [...others.filter((id) => !big(id)), ...others.filter(big)];
  const half = Math.ceil(sorted.length / 2);
  const second = sorted.slice(half);
  // every cycle ends with the most common category of the second half (and never starts with it)
  const count = {};
  for (const id of second) count[categoryOf(id)] = (count[categoryOf(id)] || 0) + 1;
  const endCat = Object.keys(count).sort((a, b) => count[b] - count[a] || (a < b ? -1 : 1))[0];
  return { letters, numbers, others, halves: [sorted.slice(0, half), second, endCat] };
}

/** Parts of the current library order (recomputed when the order changes). */
function partsOf(order) {
  if (base !== order) {
    base = order;
    parts = split(order);
    cycles.clear();
  }
  return parts;
}

/**
 * Arrange one half: categories drawn at random in proportion to the shapes left (seeded), never the same
 * category twice in a row; each category in a seeded shuffle.
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
  for (const [c, q] of queues) queues.set(c, shuffled(q, Math.floor(rng() * 2 ** 31)));
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
 * The other shapes (not letters or numbers) of one cycle, in the order their slots show them.
 * @param {string[]} order library order (every shape once)
 * @param {number} cycle 0, 1, 2, ...
 * @returns {string[]}
 */
export function cycleOrder(order, cycle) {
  const { halves } = partsOf(order);
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
 * Shape of the k-th shape level (k = 0 for the first one, level 6): slots of four, a letter (k = 0, 4, 8 ...),
 * another shape, a number (k = 2, 6, 10 ...), another shape.
 * @param {string[]} order library order
 * @param {number} k
 * @returns {string}
 */
export function shapeAt(order, k) {
  const { letters, numbers, others } = partsOf(order);
  if (k % 4 === 0 && letters.length) return letters[(k / 4) % letters.length];
  if (k % 4 === 2 && numbers.length) return numbers[((k - 2) / 4) % numbers.length];
  // the other slots: k = 1, 3, 5, 7 ... are the 0th, 1st, 2nd, 3rd ... other shape
  const j = Math.floor(k / 2);
  const n = others.length;
  return cycleOrder(order, Math.floor(j / n))[j % n];
}
