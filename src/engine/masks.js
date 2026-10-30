import { DIRS } from './directions.js';
import { insideArt, SHAPE_ART } from './shapeArt.js';
import { getShape } from './shapes/library.js';
import { insideMask } from './shapes/quality.js';

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

/**
 * Build a 0/1 usable-cell array for a library shape (the library must be loaded).
 * Cells with no usable neighbour are dropped.
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
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!m[r * cols + c]) continue;
      const hasNeighbour = DIRS.some(({ dr, dc }) => {
        const rr = r + dr;
        const cc = c + dc;
        return rr >= 0 && rr < rows && cc >= 0 && cc < cols && m[rr * cols + cc];
      });
      if (!hasNeighbour) m[r * cols + c] = 0;
    }
  }
  return m;
}
