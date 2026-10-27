/**
 * mulberry32: small, fast, deterministic PRNG.
 * @param {number} seed 32-bit seed
 * @returns {() => number} function returning floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mix two integers into one 32-bit seed (retry attempts and sub-streams).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function hashSeed(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * Random integer in [lo, hi].
 * @param {() => number} rng
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Weighted random key from an object of {key: weight}.
 * @param {() => number} rng
 * @param {Record<string, number>} weights
 * @returns {string}
 */
export function weightedPick(rng, weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let x = rng() * total;
  for (const k in weights) {
    x -= weights[k];
    if (x < 0) return k;
  }
  return Object.keys(weights)[0];
}
