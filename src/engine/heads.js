import { DIRS } from './directions.js';

/** The peeling grid and the choice of the next arrow head (used by generator.js). */

/**
 * Mutable grid used while building one candidate board.
 * free[i] = 1 when the cell is usable and not taken yet.
 */
export function createGrid(rows, cols, usable) {
  const free = Uint8Array.from(usable);
  const owner = new Int16Array(rows * cols).fill(-1);
  const inB = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isFree = (r, c) => inB(r, c) && free[r * cols + c] === 1;
  const degree = (r, c) => DIRS.reduce((n, d) => n + (isFree(r + d.dr, c + d.dc) ? 1 : 0), 0);
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
  // solve round of every placed arrow (1 = free at the start), and the latest so far
  const round = [];
  const grid = {
    left: usable.reduce((n, u) => n + u, 0), // usable cells not taken yet
    rows,
    cols,
    free,
    owner,
    inB,
    isFree,
    degree,
    take,
    skip,
    first,
    ahead,
    top,
    solo,
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
      return;
    }
    const o = owner[i];
    if (o !== -1) {
      depth++;
      if (round[o] > top) top = round[o];
      if (one === -1) one = o;
      else if (one !== o) multi = 1;
    }
  }
  first[d][line] = -1;
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
 * @returns {{any: object[], deep: object[]}} three best heads overall, and three best with arrows in front
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
      if (depth) score += (maxRound - t) * (cfg.roundBias || 0) - (solo[d][line] ? cfg.decoyBias || 0 : 0);
      // a free head next to a side can't be hidden later (see hideFreeMoves): keep chosen free heads off the sides
      else if (grid.hidden === r * cols + c)
        score -= 1000; // the corridor's end: the hidden first move
      else if (line < 2 || line > lines - 3) score += sidePenalty;
      const cand = { r, c, d, depth, top: t, score };
      keep3(any, cand);
      if (depth) keep3(deep, cand);
    }
  }
  return { any, deep };
}
