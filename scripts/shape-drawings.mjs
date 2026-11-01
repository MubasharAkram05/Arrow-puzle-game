/**
 * Hand-drawn shapes: our own designs, built from plain geometry (circles, ellipses, polygons) on a
 * 64-cell grid, not traced from any icon set. Used by scripts/build-shapes.mjs as 'draw:<name>' sources.
 *
 * Each drawing has a size (w x h cells, longest side 64) and an inside(x, y) test in cell units
 * (x right, y down, 0..w and 0..h). Holes must be big enough to survive the build's hole filling
 * (56 cells at 64), so eyes are at least 4.5 cells in radius.
 */

const disk = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const ellipse = (cx, cy, rx, ry, deg = 0) => {
  const a = (deg * Math.PI) / 180;
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
  };
};
/** Convex or concave polygon, even-odd rule. */
const poly = (pts) => (x, y) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** Thick line segment with round ends. */
const bar = (x0, y0, x1, y1, width) => (x, y) => {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 <= (width / 2) ** 2;
};
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const any =
  (...fs) =>
  (x, y) =>
    fs.some((f) => f(x, y));
const minus =
  (f, ...holes) =>
  (x, y) =>
    f(x, y) && !holes.some((h) => h(x, y));

/** Lion: a fluffy mane of round puffs around a round face; a gap on both sides of the face (open at the top and chin), eyes and nose. */
function lion() {
  const [cx, cy] = [32, 32];
  const puffs = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * 2 * Math.PI - Math.PI / 2;
    return disk(cx + 23 * Math.cos(a), cy + 23 * Math.sin(a), 8.5);
  });
  const mane = any(disk(cx, cy, 25), ...puffs);
  const r = (x, y) => Math.hypot(x - cx, y - cy);
  const gap = (x, y) => r(x, y) > 16.5 && r(x, y) < 21 && y > cy - 9 && Math.abs(x - cx) > 4.5;
  return {
    w: 64,
    h: 64,
    inside: minus(
      mane,
      gap,
      disk(26, 30, 4.6),
      disk(38, 30, 4.6),
      poly([
        [26, 37],
        [38, 37],
        [32, 44],
      ]),
    ),
  };
}

/** Fox: sitting, a wide pointed face with tall pointed ears, a narrow neck, and a big bushy tail curling up on the right. */
function fox() {
  return {
    w: 64,
    h: 64,
    inside: any(
      poly([
        [5, 12],
        [41, 12],
        [38, 23],
        [23, 37],
        [8, 23],
      ]),
      poly([
        [6, 15],
        [6, 0],
        [10, 0],
        [21, 12],
      ]),
      poly([
        [25, 12],
        [36, 0],
        [40, 0],
        [40, 15],
      ]),
      ellipse(23, 50, 12, 14),
      ellipse(45, 45, 19, 10, -62),
      poly([
        [50, 31],
        [62, 14],
        [58, 35],
      ]),
      ellipse(36, 60, 14, 4.5),
    ),
  };
}

/** Letter Q: a thick ring with a thick diagonal tail. */
function letterQ() {
  const ring = minus(ellipse(30, 30, 29, 30), ellipse(30, 30, 15, 16));
  return { w: 64, h: 64, inside: any(ring, bar(38, 40, 57, 59, 12)) };
}

/** Clock: a thick rim, a hub and two thick hands (the long one touches the rim at 12). */
function clock() {
  const face = disk(32, 32, 22.5);
  const hands = any(disk(32, 32, 6.5), bar(32, 32, 32, 8, 7.5), bar(32, 32, 47, 32, 7.5));
  return { w: 64, h: 64, inside: (x, y) => disk(32, 32, 31.8)(x, y) && (!face(x, y) || hands(x, y)) };
}

/** Pizza slice: a round crust on top, the slice narrowing to a point, two pepperoni holes. */
function pizzaSlice() {
  const slice = poly([
    [6, 9],
    [58, 9],
    [32, 63],
  ]);
  const crust = minus(ellipse(32, 11, 31, 11), rect(0, 11, 64, 64));
  return { w: 64, h: 64, inside: minus(any(slice, crust, rect(4, 9, 60, 13)), disk(26, 24, 5.5), disk(36, 39, 5.2)) };
}

/** Tiger head: round head with round ears and a round cheek ruff, a stripe notch on the forehead and two on each cheek, eyes and nose. */
function tigerHead() {
  const head = any(ellipse(32, 35, 27, 23), disk(13, 15, 9.5), disk(51, 15, 9.5), ellipse(32, 47, 31, 14));
  const stripes = [
    poly([
      [28.5, 11],
      [35.5, 11],
      [32, 22],
    ]),
    poly([
      [0, 33],
      [0, 41],
      [13, 37],
    ]),
    poly([
      [64, 33],
      [64, 41],
      [51, 37],
    ]),
    poly([
      [0, 47],
      [0, 55],
      [11, 51],
    ]),
    poly([
      [64, 47],
      [64, 55],
      [53, 51],
    ]),
  ];
  return {
    w: 64,
    h: 64,
    inside: minus(
      head,
      ...stripes,
      disk(23, 34, 4.8),
      disk(41, 34, 4.8),
      poly([
        [26, 44],
        [38, 44],
        [32, 51],
      ]),
    ),
  };
}

export const DRAWINGS = { lion, fox, letterQ, clock, pizzaSlice, tigerHead };

/**
 * Raster a drawing: 4x4 samples per cell, a cell is filled when half its samples are inside.
 * @param {string} name
 * @returns {{w: number, h: number, bits: Uint8Array}|null}
 */
export function drawMask(name) {
  const make = DRAWINGS[name];
  if (!make) return null;
  const { w, h, inside } = make();
  const bits = new Uint8Array(w * h);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      let n = 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) n += inside(c + (j + 0.5) / 4, r + (i + 0.5) / 4);
      bits[r * w + c] = n >= 8 ? 1 : 0;
    }
  return { w, h, bits };
}
