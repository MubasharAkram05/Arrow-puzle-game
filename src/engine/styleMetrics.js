import { isStraight, turnCount } from './tidy.js';

/**
 * Snake-style metrics (3.18.0): how much a board looks like long, bending arrows packed side by side.
 *
 * - avgLength: mean arrow length in cells.
 * - longShare15: share of arrows with 15+ cells.
 * - turns3Share: share of arrows with 3+ turns.
 * - wrapRatio: share of arrows that wrap part of another arrow: some cell of another arrow has this arrow
 *   on 3 of its 4 sides (looking up to WRAP_REACH cells away, through other arrows). A straight line or an
 *   L can only be on 1 or 2 sides; a U, a hook or a spiral holds the cell inside.
 * - hugRatio: share of arrow cells with a parallel neighbour: a cell next to it, across the cell's run,
 *   belongs to another arrow that runs the same way there (two lanes side by side).
 * - fill: share of usable cells covered by arrows.
 */
export const WRAP_REACH = 6;

/** Axes a cell's body runs along: bit 1 = horizontal, bit 2 = vertical (a corner has both). */
function cellAxes(path, i) {
  let m = 0;
  for (const j of [i - 1, i + 1]) {
    const q = path[j];
    if (!q) continue;
    m |= q.r === path[i].r ? 1 : 2;
  }
  return m;
}

/**
 * @param {{rows: number, cols: number, mask?: Uint8Array|number[]|null, arrows: {path: {r: number, c: number}[]}[]}} level
 * @returns {{avgLength: number, longShare15: number, turns3Share: number, straightShare: number,
 *   avgTurns: number, wrapRatio: number, hugRatio: number, fill: number}}
 */
export function styleMetrics(level) {
  const { rows, cols, arrows } = level;
  const n = arrows.length || 1;
  const owner = new Int32Array(rows * cols).fill(-1);
  const axes = new Uint8Array(rows * cols);
  let cells = 0;
  arrows.forEach((a, id) => {
    a.path.forEach((p, i) => {
      owner[p.r * cols + p.c] = id;
      axes[p.r * cols + p.c] = cellAxes(a.path, i);
    });
    cells += a.path.length;
  });
  // hugging: a neighbour across the run that runs the same way
  let hugged = 0;
  for (let i = 0; i < rows * cols; i++) {
    const id = owner[i];
    if (id < 0) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const m = axes[i];
    const across = [];
    if (m & 1) across.push([r - 1, c, 1], [r + 1, c, 1]);
    if (m & 2) across.push([r, c - 1, 2], [r, c + 1, 2]);
    if (
      across.some(([rr, cc, ax]) => {
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return false;
        const j = rr * cols + cc;
        return owner[j] >= 0 && owner[j] !== id && axes[j] & ax;
      })
    )
      hugged++;
  }
  // wrapping: another arrow's cell with this arrow on 3 of its 4 sides
  const wraps = new Uint8Array(arrows.length);
  const seen = new Int32Array(arrows.length).fill(-1);
  const sides = new Uint8Array(arrows.length);
  const steps = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let i = 0; i < rows * cols; i++) {
    const id = owner[i];
    if (id < 0) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const touched = [];
    steps.forEach(([dr, dc], k) => {
      for (let s = 1; s <= WRAP_REACH; s++) {
        const rr = r + dr * s;
        const cc = c + dc * s;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) break;
        const o = owner[rr * cols + cc];
        if (o < 0 || o === id) continue;
        if (seen[o] !== i) {
          seen[o] = i;
          sides[o] = 0;
          touched.push(o);
        }
        sides[o] |= 1 << k;
      }
    });
    for (const o of touched) {
      const b = sides[o];
      if ((b & 1) + ((b >> 1) & 1) + ((b >> 2) & 1) + ((b >> 3) & 1) >= 3) wraps[o] = 1;
    }
  }
  let usable = rows * cols;
  if (level.mask) {
    usable = 0;
    for (let i = 0; i < rows * cols; i++) if (level.mask[i]) usable++;
  }
  const lens = arrows.map((a) => a.path.length);
  return {
    avgLength: cells / n,
    longShare15: lens.filter((l) => l >= 15).length / n,
    turns3Share: arrows.filter((a) => turnCount(a) >= 3).length / n,
    straightShare: arrows.filter(isStraight).length / n,
    avgTurns: arrows.reduce((s, a) => s + turnCount(a), 0) / n,
    wrapRatio: wraps.reduce((s, w) => s + w, 0) / n,
    hugRatio: cells ? hugged / cells : 0,
    fill: usable ? cells / usable : 0,
  };
}
