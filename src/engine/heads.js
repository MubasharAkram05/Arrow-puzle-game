import { DIRS } from './directions.js';

/** The peeling grid and the choice of the next arrow head (used by generator.js). */

/**
 * Mutable grid used while building one candidate board.
 * free[i] = 1 when the cell is usable and not taken yet.
 */
export function createGrid(rows, cols, usable) {
  const free = Uint8Array.from(usable);
  const owner = new Int16Array(rows * cols).fill(-1);
  // head and tail cells of the arrows placed so far (snake growth wraps round them)
  const ends = new Uint8Array(rows * cols);
  const inB = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isFree = (r, c) => inB(r, c) && free[r * cols + c] === 1;
  // free neighbours of a cell (the four directions written out: this runs for every head candidate)
  const degree = (r, c) => {
    let n = 0;
    if (r > 0 && free[(r - 1) * cols + c] === 1) n++;
    if (r + 1 < rows && free[(r + 1) * cols + c] === 1) n++;
    if (c > 0 && free[r * cols + c - 1] === 1) n++;
    if (c + 1 < cols && free[r * cols + c + 1] === 1) n++;
    return n;
  };
  // lines whose first free cell may have moved (see bestHeads)
  const dirtyRows = new Uint8Array(rows).fill(1);
  const dirtyCols = new Uint8Array(cols).fill(1);
  const take = (r, c, id) => {
    grid.left--;
    free[r * cols + c] = 0;
    owner[r * cols + c] = id;
    dirtyRows[r] = 1;
    dirtyCols[c] = 1;
  };
  // per direction and line: how many unusable cells come first from the far edge (shapes)
  const skip = DIRS.map(({ dr, dc }) => {
    const lines = dc ? rows : cols;
    const len = dc ? cols : rows;
    return Int16Array.from({ length: lines }, (_, line) => {
      let k = 0;
      for (; k < len; k++) {
        const step = (dc || dr) > 0 ? len - 1 - k : k;
        if (usable[dc ? line * cols + step : step * cols + line]) break;
      }
      return k;
    });
  });
  // per direction and line: first free cell (-1 = none) and taken cells in front of it
  const first = DIRS.map(({ dc }) => new Int16Array(dc ? rows : cols));
  const ahead = DIRS.map(({ dc }) => new Int16Array(dc ? rows : cols));
  // per direction and line: latest solve round among the arrows in front, and whether only one arrow is there
  const top = DIRS.map(({ dc }) => new Int32Array(dc ? rows : cols));
  const solo = DIRS.map(({ dc }) => new Uint8Array(dc ? rows : cols));
  // direction mix (3.19.0): per direction and line, the arrow right in front; the direction of every placed
  // arrow and of every head cell (-1 = none)
  const near = DIRS.map(({ dc }) => new Int32Array(dc ? rows : cols));
  const dirOf = [];
  const dirCount = new Int32Array(4); // placed arrows per head direction
  const seed = -1; // head cell of the first free arrow (plain boards place a second one far from it)
  const headDir = new Int8Array(rows * cols).fill(-1);
  // solve round of every placed arrow (1 = free at the start), and the latest so far
  const round = [];
  const grid = {
    left: usable.reduce((n, u) => n + u, 0), // usable cells not taken yet
    rows,
    cols,
    free,
    owner,
    ends,
    inB,
    isFree,
    degree,
    take,
    skip,
    first,
    ahead,
    top,
    solo,
    near,
    dirOf,
    dirCount,
    seed,
    headDir,
    round,
    maxRound: 0,
    dirtyRows,
    dirtyCols,
  };
  return grid;
}

/** Keep the three lowest-score heads in `top` (sorted), without building a full candidate list. */
function keep3(top, k) {
  if (top.length === 3 && k.score >= top[2].score) return;
  let i = Math.min(top.length, 2);
  if (top.length < 3) top.push(k);
  else top[2] = k;
  while (i > 0 && top[i].score < top[i - 1].score) {
    [top[i], top[i - 1]] = [top[i - 1], top[i]];
    i--;
  }
}

/**
 * Re-scan one line: its first free cell from the far edge, the taken cells in front of it, the latest
 * solve round among those arrows and whether they are all one arrow.
 */
function scanLine(grid, d, line) {
  const { cols, rows, free, owner, skip, first, ahead, round } = grid;
  const { dr, dc } = DIRS[d];
  const len = dc ? cols : rows;
  let depth = 0;
  let top = 0;
  let one = -1;
  let multi = 0;
  let near = -1; // the arrow right in front (the last one met walking toward the free cell, 3.19.0)
  // cells outside a shape at the start of the line can never matter: skip them
  for (let k = skip[d][line]; k < len; k++) {
    // walk against the direction, starting at the far edge the arrow would leave through
    const step = (dc || dr) > 0 ? len - 1 - k : k;
    const i = dc ? line * cols + step : step * cols + line;
    if (free[i]) {
      first[d][line] = step;
      ahead[d][line] = depth;
      grid.top[d][line] = top;
      grid.solo[d][line] = one !== -1 && !multi ? 1 : 0;
      grid.near[d][line] = near;
      return;
    }
    const o = owner[i];
    if (o !== -1) {
      depth++;
      near = o;
      if (round[o] > top) top = round[o];
      if (one === -1) one = o;
      else if (one !== o) multi = 1;
    }
  }
  first[d][line] = -1;
}

/**
 * Direction mix (3.19.0): extra score (lower = better) for a head at (r, c) pointing d. The arrows in front
 * should point across or against it, not the same way (or the one right in front leaves and frees this one,
 * like a queue), and heads close by should point other ways.
 */
function dirScore(grid, w, r, c, d, line) {
  const { rows, cols, headDir, dirOf } = grid;
  const n = grid.near[d][line];
  const nd = n >= 0 ? dirOf[n] : -1;
  let s = 0;
  if (nd === d) s += w.queue;
  else if (nd >= 0) s -= w.cross;
  // heads within w.radius cells pointing the same way
  let alike = 0;
  let all = 0;
  for (let rr = Math.max(0, r - w.radius); rr <= Math.min(rows - 1, r + w.radius); rr++)
    for (let cc = Math.max(0, c - w.radius); cc <= Math.min(cols - 1, c + w.radius); cc++) {
      const h = headDir[rr * cols + cc];
      if (h < 0) continue;
      all++;
      if (h === d) alike++;
    }
  // the whole board: directions already over-used (a fill front sweeping one way points every head one way)
  const placed = dirOf.length;
  if (placed >= 8) s += w.balance * (grid.dirCount[d] / placed - 0.25);
  return s + (all ? (w.near * alike) / all : 0);
}

/**
 * Best heads for the next arrow. Every free cell whose way out only crosses taken or unused cells can
 * be a head (reverse peeling: such an arrow is only blocked by arrows placed before it). Only the first
 * free cell of a line can qualify (every cell behind it has a free cell ahead), so each line keeps that
 * cell cached and is re-scanned only after a cell in it was taken.
 *
 * Scores (lower = better) push the board toward hard structure:
 * - roundBias: heads behind the latest arrows, so the solve becomes one long chain (few free moves at a time)
 * - decoyBias: heads with exactly one arrow in front (they look free but are not)
 * @returns {{any: object[], deep: object[], free: object[]}} three best heads overall, three best with arrows in
 *   front, and three best with nothing in front
 */
export function bestHeads(grid, cfg, rng, sidePenalty) {
  const { rows, cols, isFree, degree, first, ahead, top, solo, maxRound, dirtyRows, dirtyCols } = grid;
  for (let d = 0; d < 4; d++) {
    const dirty = DIRS[d].dc ? dirtyRows : dirtyCols;
    for (let line = 0; line < dirty.length; line++) if (dirty[line]) scanLine(grid, d, line);
  }
  dirtyRows.fill(0);
  dirtyCols.fill(0);
  const any = [];
  const deep = [];
  const free = [];
  for (let d = 0; d < 4; d++) {
    const { dr, dc } = DIRS[d];
    const lines = dc ? rows : cols;
    for (let line = 0; line < lines; line++) {
      const step = first[d][line];
      if (step < 0) continue;
      const r = dc ? line : step;
      const c = dc ? step : line;
      if (!isFree(r - dr, c - dc)) continue;
      const depth = ahead[d][line];
      const t = top[d][line];
      let score = degree(r, c) - depth * cfg.depthBias + rng() * 1.2;
      if (depth) {
        score += (maxRound - t) * (cfg.roundBias || 0) - (solo[d][line] ? cfg.decoyBias || 0 : 0);
        if (cfg.dirMix) score += dirScore(grid, cfg.dirMix, r, c, d, line);
      } else if (grid.hidden === r * cols + c)
        score -= 1000; // the corridor's end: the hidden first move
      else {
        // a free head next to a side can't be hidden later (see hideFreeMoves): keep chosen free heads off the sides
        if (line < 2 || line > lines - 3) score += sidePenalty;
        // a second fill seed (plain boards) starts far from the first one, so two fronts meet in the middle
        if (grid.seed >= 0 && cfg.seedFar)
          score -=
            (cfg.seedFar * (Math.abs(r - Math.floor(grid.seed / cols)) + Math.abs(c - (grid.seed % cols)))) /
            (rows + cols);
      }
      const cand = { r, c, d, depth, top: t, score };
      keep3(any, cand);
      if (depth) keep3(deep, cand);
      else keep3(free, cand);
    }
  }
  return { any, deep, free };
}
