/**
 * Pure mask helpers shared by the shape build script (scripts/build-shapes.mjs) and the tests.
 * A mask is { w, h, bits } with bits a Uint8Array of w*h cells (1 = usable), row-major.
 */

/** Quality rules a shape must pass to become a board. */
export const QUALITY = Object.freeze({
  size: 64, // library resolution (longest side)
  minFill: 0.25, // filled share of the bounding box
  maxFill: 0.85,
  minAspect: 0.4, // short side / long side: long thin shapes make poor boards
  thinRes: 32, // no part thinner than 2 cells at this resolution (thin parts are thickened first)
  smallRes: 32, // still one piece and recognizable at this size (each shape also has its own minimum board)
  minSimilarity: 0.7, // overlap (IoU) between the small and the full version
  thinCells: 4, // parts thinner than this many cells (at size) are thickened, not cut off
});

/** @returns {{w: number, h: number, bits: Uint8Array}} */
export const emptyMask = (w, h) => ({ w, h, bits: new Uint8Array(w * h) });

/** Number of filled cells. */
export const filledCount = (m) => m.bits.reduce((s, b) => s + b, 0);

/** Filled share of the bounding box. */
export const fillRatio = (m) => filledCount(m) / (m.w * m.h);

/**
 * 4-connected components of cells whose value is `value`.
 * @returns {{cells: number[], edge: boolean}[]} edge = touches the mask border
 */
export function components(m, value = 1) {
  const { w, h, bits } = m;
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || bits[i] !== value) continue;
    const cells = [];
    let edge = false;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop();
      cells.push(j);
      const x = j % w;
      const y = (j - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (!seen[k] && bits[k] === value) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    out.push({ cells, edge });
  }
  return out;
}

/** Crop to the bounding box of the filled cells. */
export function crop(m) {
  let x0 = m.w;
  let y0 = m.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (m.bits[y * m.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return emptyMask(0, 0);
  const out = emptyMask(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) out.bits[y * out.w + x] = m.bits[(y + y0) * m.w + x + x0];
  return out;
}

/** Fill enclosed holes smaller than `maxHole` cells (big holes, like a donut's, stay). */
export function fillHoles(m, maxHole) {
  const out = { ...m, bits: m.bits.slice() };
  for (const c of components(m, 0)) if (!c.edge && c.cells.length < maxHole) for (const i of c.cells) out.bits[i] = 1;
  return out;
}

/** Keep only the biggest connected area. */
export function largestPart(m) {
  const parts = components(m, 1).sort((a, b) => b.cells.length - a.cells.length);
  const out = emptyMask(m.w, m.h);
  if (parts.length) for (const i of parts[0].cells) out.bits[i] = 1;
  return out;
}

/**
 * Remove parts thinner than k cells: keep only cells covered by some full k x k block (morphological opening).
 */
export function openMask(m, k) {
  const { w, h, bits } = m;
  const out = emptyMask(w, h);
  for (let y = 0; y + k <= h; y++)
    for (let x = 0; x + k <= w; x++) {
      let full = true;
      for (let dy = 0; dy < k && full; dy++)
        for (let dx = 0; dx < k && full; dx++) full = !!bits[(y + dy) * w + x + dx];
      if (full) for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) out.bits[(y + dy) * w + x + dx] = 1;
    }
  return out;
}

/** Grow a set of cells by one cell in the 8 directions. */
function dilate(m) {
  const { w, h, bits } = m;
  const out = emptyMask(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!bits[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.bits[ny * w + nx] = 1;
        }
    }
  return out;
}

/**
 * Thicken thin parts instead of cutting them off: cells not covered by any full k x k block (legs, tails,
 * stems, wings) grow by one cell on every side; thick parts stay as they are. The mask gets a 1-cell margin
 * so a thin part on the edge can grow too.
 * @param {{w: number, h: number, bits: Uint8Array}} m
 * @param {number} k
 * @returns {{w: number, h: number, bits: Uint8Array}}
 */
export function thickenThin(m, k) {
  const pad = emptyMask(m.w + 2, m.h + 2);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) pad.bits[(y + 1) * pad.w + x + 1] = m.bits[y * m.w + x];
  const open = openMask(pad, k);
  const thin = emptyMask(pad.w, pad.h);
  for (let i = 0; i < pad.bits.length; i++) thin.bits[i] = pad.bits[i] && !open.bits[i] ? 1 : 0;
  const grown = dilate(thin);
  for (let i = 0; i < pad.bits.length; i++) grown.bits[i] |= pad.bits[i];
  return crop(grown);
}

/**
 * Smooth edges: single-cell spurs (at most one filled neighbour) go and single-cell notches (three or four
 * filled neighbours) are filled, twice.
 */
export function smoothEdges(m) {
  let cur = m;
  for (let pass = 0; pass < 2; pass++) {
    const { w, h, bits } = cur;
    const out = { w, h, bits: bits.slice() };
    const n = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? bits[y * w + x] : 0);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = n(x - 1, y) + n(x + 1, y) + n(x, y - 1) + n(x, y + 1);
        if (bits[y * w + x] && k <= 1) out.bits[y * w + x] = 0;
        else if (!bits[y * w + x] && k >= 3) out.bits[y * w + x] = 1;
      }
    cur = out;
  }
  return cur;
}

/** Is any filled cell outside every full 2x2 block (a part only 1 cell thin)? */
export const hasThinPart = (m) => filledCount(openMask(m, 2)) !== filledCount(m);

/**
 * Resample to a square grid of n x n cells with the shape centred and its proportions kept,
 * exactly as the game samples a mask onto a board (cell centres).
 */
export function toBoard(m, n) {
  const out = emptyMask(n, n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) out.bits[r * n + c] = insideMask(m, ((c + 0.5) / n) * 2 - 1, ((r + 0.5) / n) * 2 - 1);
  return out;
}

/**
 * Is a normalized point (x, y in [-1, 1], y down) inside the mask? The mask keeps its proportions and is centred.
 * @returns {0|1}
 */
export function insideMask(m, x, y) {
  const size = Math.max(m.w, m.h);
  const c = Math.floor(((x + 1) / 2) * size - (size - m.w) / 2);
  const r = Math.floor(((y + 1) / 2) * size - (size - m.h) / 2);
  return c >= 0 && r >= 0 && c < m.w && r < m.h ? m.bits[r * m.w + c] : 0;
}

/** Overlap (intersection over union) of two masks of the same size. */
export function similarity(a, b) {
  let and = 0;
  let or = 0;
  for (let i = 0; i < a.bits.length; i++) {
    and += a.bits[i] & b.bits[i];
    or += a.bits[i] | b.bits[i];
  }
  return or ? and / or : 0;
}

/**
 * Check a library mask against the board rules.
 * @returns {string|null} why the shape can't be a board, or null when it passes
 */
export function qualityProblem(m, q = QUALITY) {
  if (!m.w || !m.h) return 'empty';
  const fill = fillRatio(m);
  if (fill < q.minFill) return `fill ${(fill * 100).toFixed(0)}% < ${q.minFill * 100}%`;
  if (fill > q.maxFill) return `fill ${(fill * 100).toFixed(0)}% > ${q.maxFill * 100}%`;
  const aspect = Math.min(m.w, m.h) / Math.max(m.w, m.h);
  if (aspect < q.minAspect) return `too long and thin (${m.w}x${m.h})`;
  if (components(m).length !== 1) return 'more than one area';
  const thin = toBoard(m, q.thinRes);
  if (hasThinPart(thin)) return `part thinner than 2 cells at ${q.thinRes}x${q.thinRes}`;
  if (components(thin).length !== 1) return `splits apart at ${q.thinRes}x${q.thinRes}`;
  const small = toBoard(m, q.smallRes);
  if (components(small).length !== 1) return `splits apart at ${q.smallRes}x${q.smallRes}`;
  // the small board (cell-centre sampling) against a smooth area-average of the same size
  const sim = similarity(small, downTo(toBoard(m, q.smallRes * 4), q.smallRes));
  if (sim < q.minSimilarity)
    return `unrecognizable at ${q.smallRes}x${q.smallRes} (overlap ${(sim * 100).toFixed(0)}%)`;
  return null;
}

/**
 * Smooth reference of a mask on an n x n board: each cell is filled when at least half of its area is.
 * @returns {{w: number, h: number, bits: Uint8Array}}
 */
export const areaMask = (m, n) => downTo(toBoard(m, n * 4), n);

/** Box-average an n*k square mask down to n x n (a cell is filled when at least half of it is). */
function downTo(m, n) {
  const k = m.w / n;
  const out = emptyMask(n, n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      let s = 0;
      for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) s += m.bits[(r * k + y) * m.w + c * k + x];
      out.bits[r * n + c] = s * 2 >= k * k ? 1 : 0;
    }
  return out;
}

const RLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Run-length encode bits (row-major), runs alternate starting with empty cells.
 * Each run is one character 0-60 ('0'-'Y'); 'Z' adds 61 and the run continues in the next character.
 */
export function encodeRle(bits) {
  let out = '';
  const emit = (n) => {
    for (; n >= 61; n -= 61) out += 'Z';
    out += RLE[n];
  };
  let cur = 0;
  let run = 0;
  for (const b of bits) {
    if (b === cur) run++;
    else {
      emit(run);
      cur = b;
      run = 1;
    }
  }
  emit(run);
  return out;
}

/** Decode encodeRle output into n bits. */
export function decodeRle(str, n) {
  const bits = new Uint8Array(n);
  let i = 0;
  let cur = 0;
  let run = 0;
  for (const ch of str) {
    const v = RLE.indexOf(ch);
    run += v;
    if (v === 61) continue;
    if (cur) bits.fill(1, i, i + run);
    i += run;
    run = 0;
    cur ^= 1;
  }
  return bits;
}
