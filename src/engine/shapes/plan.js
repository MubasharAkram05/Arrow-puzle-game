/**
 * Which shape each level shows. From level 4 every level is a shape. The library order (see buildOrder:
 * easy shapes first, categories taking turns) is cut into two halves; every cycle of (library size) levels
 * shows each shape exactly once, in a seeded shuffle of the first half followed by a seeded shuffle of the
 * second half (shapes that need a big board, BIG_BOARD_SHAPES, always in the second half). A shape stays in
 * its half from cycle to cycle, so the same shape never comes back within
 * half a cycle, even across the end of a cycle (a fresh full shuffle could put it back a few levels later).
 * Deterministic: the same level always gets the same shape.
 */
import { hashSeed, mulberry32 } from '../rng.js';
import { BIG_BOARD_SHAPES } from './removed.js';

const cycles = new Map(); // cycle number -> shape ids (for the current library order)
let base = null;

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

/**
 * Shape ids of one cycle.
 * @param {string[]} order library order (every shape once)
 * @param {number} cycle 0, 1, 2, ...
 * @returns {string[]}
 */
export function cycleOrder(order, cycle) {
  if (base !== order) {
    base = order;
    cycles.clear();
  }
  if (!cycles.has(cycle)) {
    // shapes that need a big board go to the second half, where boards are big anyway
    const late = order.filter((id) => BIG_BOARD_SHAPES[id]);
    const sorted = [...order.filter((id) => !BIG_BOARD_SHAPES[id]), ...late];
    const half = Math.ceil(order.length / 2);
    cycles.set(cycle, [
      ...shuffled(sorted.slice(0, half), hashSeed(0x5a1d, cycle * 2)),
      ...shuffled(sorted.slice(half), hashSeed(0x5a1d, cycle * 2 + 1)),
    ]);
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
