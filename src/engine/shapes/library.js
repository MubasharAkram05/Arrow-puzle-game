/**
 * Board-shape library: 600+ silhouettes built by scripts/build-shapes.mjs into library.json.
 * The JSON is a lazy chunk (loadShapeLibrary), so app start stays fast; shape levels wait for it.
 */
import { LEVELS } from '../../config.js';
import { components, decodeRle, fillRatio } from './quality.js';

/**
 * @typedef {object} Shape
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} w
 * @property {number} h
 * @property {Uint8Array} bits
 * @property {string} source e.g. 'g:cat'
 * @property {string} license
 * @property {number} complexity lower = more compact (shown earlier)
 */

let lib = null;
let loading = null;

/**
 * Outline length against a circle of the same area, plus the empty share of the box.
 * Compact shapes (circle, apple) score low, spiky or hollow ones high.
 */
export function complexity(m) {
  let edges = 0;
  let cells = 0;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!m.bits[y * m.w + x]) continue;
      cells++;
      if (x === 0 || !m.bits[y * m.w + x - 1]) edges++;
      if (x === m.w - 1 || !m.bits[y * m.w + x + 1]) edges++;
      if (y === 0 || !m.bits[(y - 1) * m.w + x]) edges++;
      if (y === m.h - 1 || !m.bits[(y + 1) * m.w + x]) edges++;
    }
  // holes add outline too; a solid disc scores about 1.1
  return edges / (2 * Math.sqrt(Math.PI * cells)) + (1 - fillRatio(m)) + (components(m, 0).length > 1 ? 0.2 : 0);
}

/**
 * Order shape levels follow: categories take turns (first round in `rotation` order, then spread by size so
 * every category runs through the whole cycle), easy shapes first inside a category, never two of the same
 * category in a row. Deterministic.
 * @param {Shape[]} shapes
 * @param {string[]} rotation category ids
 * @returns {string[]} shape ids
 */
export function buildOrder(shapes, rotation) {
  const queues = new Map(rotation.map((c) => [c, []]));
  for (const s of shapes) {
    if (!queues.has(s.category)) queues.set(s.category, []);
    queues.get(s.category).push(s);
  }
  const cats = [...queues.keys()].filter((c) => queues.get(c).length);
  for (const c of cats) queues.get(c).sort((a, b) => a.complexity - b.complexity || (a.id < b.id ? -1 : 1));
  const order = [];
  // first round: one of each, in rotation order
  for (const c of cats) order.push(queues.get(c).shift());
  // then smooth weighted round robin: each category is picked in proportion to what it has left
  const weight = new Map(cats.map((c) => [c, queues.get(c).length]));
  const total = [...weight.values()].reduce((a, b) => a + b, 0);
  const credit = new Map(cats.map((c) => [c, 0]));
  for (let i = 0; i < total; i++) {
    let best = null;
    for (const c of cats) {
      if (!queues.get(c).length) continue;
      credit.set(c, credit.get(c) + weight.get(c));
      if (!best || credit.get(c) > credit.get(best)) best = c;
    }
    credit.set(best, credit.get(best) - total);
    order.push(queues.get(best).shift());
  }
  // no two of the same category in a row: pull the next different one forward
  for (let i = 1; i < order.length; i++) {
    if (order[i].category !== order[i - 1].category) continue;
    const j = order.findIndex((s, k) => k > i && s.category !== order[i - 1].category);
    if (j > 0) order.splice(i, 0, ...order.splice(j, 1));
  }
  return order.map((s) => s.id);
}

/**
 * Use a parsed library.json (tests and scripts can pass it directly).
 * @param {object} json
 */
export function setShapeLibrary(json) {
  const f = Object.fromEntries(json.fields.map((k, i) => [k, i]));
  const shapes = json.shapes.map((row) => {
    const w = row[f.width];
    const h = row[f.height];
    const s = {
      id: row[f.id],
      name: row[f.name],
      category: row[f.category],
      w,
      h,
      bits: decodeRle(row[f.rle], w * h),
      source: row[f.source],
      license: row[f.license],
    };
    s.complexity = complexity(s);
    return s;
  });
  const byId = new Map(shapes.map((s) => [s.id, s]));
  lib = {
    shapes,
    byId,
    categories: json.categories,
    sources: json.sources,
    order: buildOrder(shapes, LEVELS.shapeRotation),
  };
  return lib;
}

/**
 * Load the library chunk once (later calls share the same promise).
 * @returns {Promise<object>}
 */
export function loadShapeLibrary() {
  if (lib) return Promise.resolve(lib);
  loading ??= import('./library.json')
    .then((m) => setShapeLibrary(m.default))
    .catch((err) => {
      loading = null; // allow a retry (e.g. a flaky network on the web build)
      throw err;
    });
  return loading;
}

/** @returns {boolean} true once the library is loaded */
export const shapeLibraryReady = () => lib !== null;

function need() {
  if (!lib) throw new Error('Shape library not loaded: await loadShapeLibrary() first');
  return lib;
}

/** @returns {Shape[]} every shape */
export const allShapes = () => need().shapes;

/** @returns {{id: string, name: string, target: number}[]} categories in display order */
export const shapeCategories = () => need().categories;

/** @returns {object} source key -> {name, license, url, author} */
export const shapeSources = () => need().sources;

/** @returns {string[]} shape ids in the order shape levels use them */
export const shapeOrder = () => need().order;

/**
 * @param {string} id
 * @returns {Shape|undefined}
 */
export const getShape = (id) => need().byId.get(id);
