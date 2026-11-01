import { DIRS } from './directions.js';
import { insideArt, SHAPE_ART } from './shapeArt.js';
import { getShape } from './shapes/library.js';
import { areaMask, components, insideMask, similarity } from './shapes/quality.js';
import { SHAPE_BOARD } from '../config.js';
import { SHAPE_MIN_SIDE } from './shapes/removed.js';

/**
 * The game's first 20 shapes, in the order shape levels used before the shape library (3.7.0).
 * Kept to migrate old saves (level number -> shape id) and as a source for scripts/build-shapes.mjs.
 */
export const ORIGINAL_SHAPES = Object.freeze([
  'heart',
  'arrow',
  'mushroom',
  'circle',
  'plane',
  'whale',
  'diamond',
  'cat',
  'letterA',
  'donut',
  'star',
  'dog',
  'house',
  'fish',
  'hourglass',
  'bird',
  'apple',
  'plus',
  'tree',
  'letterZ',
]);

/** Point-in-polygon test (even-odd rule). */
function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Five-point star polygon in normalized coordinates. */
function starPolygon() {
  const poly = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? 1.12 : 0.56;
    poly.push([Math.cos(ang) * rad, Math.sin(ang) * rad + 0.12]);
  }
  return poly;
}
const STAR = starPolygon();

/**
 * Is a normalized point inside one of the 20 original shapes (formula or pixel art)? x and y are in [-1, 1],
 * y points down. Used by scripts/build-shapes.mjs; the game samples the shape library instead.
 * @param {string} shape
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function insideShape(shape, x, y) {
  switch (shape) {
    case 'circle':
      return x * x + y * y <= 1.02;
    case 'hourglass':
      return Math.abs(x) <= Math.abs(y) + 0.22;
    case 'heart': {
      const X = x * 1.15;
      const Y = -y * 1.2 + 0.12;
      const q = X * X + Y * Y - 1;
      return q * q * q - X * X * Y * Y * Y <= 0;
    }
    case 'star':
      return insidePolygon(x, y, STAR);
    default:
      return SHAPE_ART[shape] ? insideArt(shape, x, y) : true;
  }
}

/** Filled 4-neighbours of a cell. */
function neighbours(m, rows, cols, r, c) {
  let n = 0;
  for (const { dr, dc } of DIRS) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && m[rr * cols + cc]) n++;
  }
  return n;
}

/**
 * Clean a sampled mask at board size without changing what it looks like: single-cell spurs and bumps
 * (a cell with at most one filled neighbour) go, single-cell notches and holes (an empty cell with three or
 * four filled neighbours) are filled. Mutates m.
 * @param {number[]} m
 * @param {number} rows
 * @param {number} cols
 */
export function smoothMask(m, rows, cols) {
  for (let pass = 0, changed = true; changed && pass < 3; pass++) {
    changed = false;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (m[r * cols + c] && neighbours(m, rows, cols, r, c) <= 1) {
          m[r * cols + c] = 0;
          changed = true;
        }
  }
  const fill = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!m[r * cols + c] && neighbours(m, rows, cols, r, c) >= 3) fill.push(r * cols + c);
  for (const i of fill) m[i] = 1;
}

/**
 * Build a 0/1 usable-cell array for a library shape (the library must be loaded): sampled at cell centres,
 * then smoothed (see smoothMask).
 * @param {string|null} shape shape id, null = every cell usable
 * @param {number} rows
 * @param {number} cols
 * @returns {number[]}
 */
export function makeMask(shape, rows, cols) {
  const m = new Array(rows * cols).fill(1);
  if (!shape) return m;
  const art = getShape(shape);
  if (!art) throw new Error(`Unknown shape: ${shape}`);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * 2 - 1;
      const y = ((r + 0.5) / rows) * 2 - 1;
      m[r * cols + c] = insideMask(art, x, y);
    }
  }
  smoothMask(m, rows, cols);
  return m;
}

const minSides = new Map();

/**
 * Smallest square board on which a shape still reads as itself: its smoothed board mask is one piece and
 * overlaps (IoU) a smooth area-average of the full-detail shape by at least SHAPE_BOARD.minSimilarity.
 * Small, detailed shapes need more cells. Capped at SHAPE_BOARD.maxSide (the library resolution); shapes in
 * SHAPE_MIN_SIDE (checked by eye) get at least their listed side.
 * @param {string} shape
 * @returns {number}
 */
export function minBoardSide(shape) {
  if (!minSides.has(shape)) {
    const art = getShape(shape);
    let n = SHAPE_BOARD.fromSide;
    for (; n < SHAPE_BOARD.maxSide; n++) {
      const bits = Uint8Array.from(makeMask(shape, n, n));
      const board = { w: n, h: n, bits };
      if (components(board).length === 1 && similarity(board, areaMask(art, n)) >= SHAPE_BOARD.minSimilarity) break;
    }
    minSides.set(shape, Math.max(n, SHAPE_MIN_SIDE[shape] || 0));
  }
  return minSides.get(shape);
}
