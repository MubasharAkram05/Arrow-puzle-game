import { DIRS } from './directions.js';
import { waitsFor } from './deepen.js';
import { needsTidy, tidyContext } from './tidy.js';

/**
 * Fill gaps (3.18.0, snake boards): after the hard-board passes, the empty cells they left are filled again,
 * so boards are almost full. Two steps, repeated while they make progress:
 *
 * 1. Tail growth: an arrow grows its tail into an empty usable cell next to it (see tidy.js growTail).
 * 2. Head advance: an arrow moves its head forward into the empty cells in front of it (its blockers stay the
 *    same, so a decoy stays a decoy).
 * 3. Bumps: a body steps out into two empty cells along one of its straight steps (a battlement bump).
 * 4. Pocket arrows: a new arrow is grown through an empty pocket of 3+ cells, its head pointing at an arrow.
 *
 * Both keep the board solvable. Arrows whose way out crosses a newly taken cell now wait for its arrow, so
 * a cell is taken only when that arrow waits for none of them (directly or through a chain): no cycle can
 * appear. A new arrow always has an arrow in front, so nothing new is free at the start. Cells in the way out
 * of a decoy (an arrow with exactly one blocker) are only given to that blocker, so decoys stay decoys.
 */

/**
 * @param {{rows: number, cols: number, mask?: number[]|null, arrows: object[]}} level mutated (arrows added)
 * @param {number} maxLen longest arrow allowed
 * @returns {number} cells filled
 */
export function fillGaps(level, maxLen) {
  const t = tidyContext(level, maxLen);
  const { deps } = t;
  // a cell in a decoy's way out may only go to its one blocker (it stays a decoy); the way out of a free
  // arrow stays empty (the first moves stay as hideFreeMoves left them)
  const isDecoy = (w, x) => deps[w].length === 0 || (deps[w].length === 1 && deps[w][0] !== x.id);
  let filled = 0;
  for (let pass = 0; pass < 4; pass++) {
    let any = false;
    // arrows too short for their shape grow first
    const order = [...level.arrows].sort((a, b) => needsTidy(b) - needsTidy(a));
    for (const x of order) {
      if (!x.path.length) continue;
      const before = x.path.length;
      if (t.growTail(x, () => true, isDecoy)) {
        filled += x.path.length - before;
        any = true;
      }
    }
    const moved = advanceHeads(level, t, maxLen) + bumps(level, t, maxLen);
    const added = pocketArrows(level, t, maxLen);
    filled += moved + added;
    if (!any && !moved && !added) break;
  }
  return filled;
}

/**
 * Grow new arrows through empty pockets. Each pocket is walked from its most closed-in cell, hugging its
 * walls and turning where it can (like growSnake). Either end may become the head; it is kept only when
 * its way out crosses no cell of its own, hits at least one arrow, and no cycle appears.
 * @returns {number} cells filled
 */
function pocketArrows(level, t, maxLen) {
  const { rows, cols, arrows } = level;
  const { occ, deps, waiting, round, pushRounds } = t;
  const usable = (i) => !level.mask || level.mask[i];
  // cells no new arrow may take: in the way out of a decoy (it would get a second blocker) or a free arrow
  const reserved = new Uint8Array(rows * cols);
  arrows.forEach((a, id) => {
    if (!a.path.length || deps[id].length > 1) return;
    const { dr, dc } = DIRS[a.dir];
    for (let r = a.path[0].r + dr, c = a.path[0].c + dc; r >= 0 && r < rows && c >= 0 && c < cols; r += dr, c += dc)
      reserved[r * cols + c] = 1;
  });
  const open = (r, c) =>
    r >= 0 &&
    r < rows &&
    c >= 0 &&
    c < cols &&
    occ[r * cols + c] === -1 &&
    usable(r * cols + c) &&
    !reserved[r * cols + c];
  const freeAround = (r, c) => DIRS.reduce((n, { dr, dc }) => n + (open(r + dr, c + dc) ? 1 : 0), 0);
  let filled = 0;
  for (let i = 0; i < rows * cols; i++) {
    const r0 = Math.floor(i / cols);
    const c0 = i % cols;
    // start in a closed-in cell (one way on): the walk then covers the pocket end to end
    if (!open(r0, c0) || freeAround(r0, c0) > 1) continue;
    const path = [{ r: r0, c: c0 }];
    const inPath = new Set([i]);
    let heading = -1;
    while (path.length < maxLen) {
      const cur = path[path.length - 1];
      let best = null;
      for (let k = 0; k < 4; k++) {
        const nr = cur.r + DIRS[k].dr;
        const nc = cur.c + DIRS[k].dc;
        if (!open(nr, nc) || inPath.has(nr * cols + nc)) continue;
        const s = freeAround(nr, nc) * 2 + (k === heading ? 1 : 0);
        if (!best || s < best.s) best = { k, nr, nc, s };
      }
      if (!best) break;
      path.push({ r: best.nr, c: best.nc });
      inPath.add(best.nr * cols + best.nc);
      heading = best.k;
    }
    if (path.length < 3) continue;
    const fit = bestHead(level, t, path, inPath);
    if (!fit) continue;
    // place it: new id at the end, cells taken, blockers and waiters linked, rounds pushed
    const id = arrows.length;
    const a = { id, dir: fit.dir, path: fit.path };
    arrows.push(a);
    for (const p of a.path) occ[p.r * cols + p.c] = id;
    deps[id] = fit.blockers;
    waiting[id] = [];
    for (const b of fit.blockers) waiting[b].push(id);
    for (const w of fit.waiters) {
      deps[w].push(id);
      waiting[id].push(w);
    }
    round[id] = 1 + Math.max(...fit.blockers.map((b) => round[b]));
    pushRounds(id);
    filled += a.path.length;
  }
  return filled;
}

/**
 * Pick the head end of a pocket path: its way out must not cross the path, must hit an arrow, and none of
 * the arrows it waits for may wait for an arrow that will wait for it. A decoy head (one arrow in front)
 * is preferred. Straight 3-cell paths are skipped (they look like stubs).
 * @returns {{dir: number, path: object[], blockers: number[], waiters: number[]}|null}
 */
function bestHead(level, t, path, inPath) {
  const { rows, cols } = level;
  const { occ, waiting, rayThrough } = t;
  const straight =
    path.every((p, i) => i < 2 || p.r - path[i - 1].r === path[1].r - path[0].r) &&
    path.every((p, i) => i < 2 || p.c - path[i - 1].c === path[1].c - path[0].c);
  if (path.length === 3 && straight) return null;
  // arrows whose way out crosses a path cell will wait for the new arrow
  const waiters = new Set();
  for (const p of path) for (const w of rayThrough(p.r, p.c)) waiters.add(w);
  let best = null;
  for (const body of [path, [...path].reverse()]) {
    const h = body[0];
    const n = body[1];
    const dir = DIRS.findIndex((d) => d.dr === h.r - n.r && d.dc === h.c - n.c);
    const { dr, dc } = DIRS[dir];
    const blockers = [];
    let self = false;
    for (let r = h.r + dr, c = h.c + dc; r >= 0 && r < rows && c >= 0 && c < cols; r += dr, c += dc) {
      const i = r * cols + c;
      if (inPath.has(i)) {
        self = true;
        break;
      }
      if (occ[i] !== -1 && !blockers.includes(occ[i])) blockers.push(occ[i]);
    }
    if (self || !blockers.length) continue;
    const ws = [...waiters];
    if (blockers.some((b) => waiters.has(b)) || ws.some((w) => waitsFor(waiting, w, blockers))) continue;
    const score = blockers.length === 1 ? 0 : 1;
    if (!best || score < best.score) best = { score, dir, path: body, blockers, waiters: ws };
  }
  return best;
}

/**
 * Can arrow x take empty cell i? It must be usable and empty, not in x's own way out (unless x's head moves
 * there: ownWay), x must not wait for any arrow whose way out crosses it (no cycle), no other decoy may get
 * x as a second blocker, and no free arrow may be blocked.
 * @returns {number[]|null} the arrows that will wait for x, or null
 */
function canTake(level, t, x, i, ownWay = false) {
  const { cols } = level;
  if (t.occ[i] !== -1 || (level.mask && !level.mask[i])) return null;
  const through = t.rayThrough(Math.floor(i / cols), i % cols);
  // a body cell in the arrow's own way out would block it for good (only its head may move there)
  if (!ownWay && through.includes(x.id)) return null;
  const ws = through.filter((w) => w !== x.id);
  const keep = (w) => t.deps[w].length === 0 || (t.deps[w].length === 1 && t.deps[w][0] !== x.id);
  if (ws.some((w) => keep(w) || waitsFor(t.waiting, w, [x.id]))) return null;
  return ws;
}

/** Give cell i to arrow x: arrows crossing it now wait for x. */
function take(level, t, x, i, ws) {
  t.occ[i] = x.id;
  for (const w of ws)
    if (!t.deps[w].includes(x.id)) {
      t.deps[w].push(x.id);
      t.waiting[x.id].push(w);
    }
  t.pushRounds(x.id);
}

/** Move heads forward into the empty cells in front of them. @returns {number} cells filled */
function advanceHeads(level, t, maxLen) {
  const { rows, cols } = level;
  let filled = 0;
  for (const x of level.arrows) {
    // a free arrow keeps its head where it is (hidden inside the board, see hideFreeMoves)
    if (!x.path.length || !t.deps[x.id].length) continue;
    const { dr, dc } = DIRS[x.dir];
    while (x.path.length < maxLen) {
      const r = x.path[0].r + dr;
      const c = x.path[0].c + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      const ws = canTake(level, t, x, r * cols + c, true);
      if (!ws) break;
      x.path.unshift({ r, c });
      take(level, t, x, r * cols + c, ws);
      filled++;
    }
  }
  return filled;
}

/**
 * Bumps: where a body steps straight from p to q (not the head step) and the two cells beside both are
 * empty, the body goes out and back through them (p, a, b, q). @returns {number} cells filled
 */
function bumps(level, t, maxLen) {
  const { rows, cols } = level;
  let filled = 0;
  for (const x of level.arrows) {
    for (let i = 1; i + 1 < x.path.length && x.path.length + 2 <= maxLen; i++) {
      const p = x.path[i];
      const q = x.path[i + 1];
      const across =
        p.r === q.r
          ? [
              [-1, 0],
              [1, 0],
            ]
          : [
              [0, -1],
              [0, 1],
            ];
      for (const [dr, dc] of across) {
        const a = { r: p.r + dr, c: p.c + dc };
        const b = { r: q.r + dr, c: q.c + dc };
        if (a.r < 0 || a.r >= rows || a.c < 0 || a.c >= cols || b.r < 0 || b.r >= rows || b.c < 0 || b.c >= cols)
          continue;
        const ia = a.r * cols + a.c;
        const ib = b.r * cols + b.c;
        const wa = canTake(level, t, x, ia);
        if (!wa) continue;
        t.occ[ia] = x.id; // so b's check sees a taken
        const wb = canTake(level, t, x, ib);
        t.occ[ia] = -1;
        if (!wb) continue;
        x.path.splice(i + 1, 0, a, b);
        take(level, t, x, ia, wa);
        take(level, t, x, ib, wb);
        filled += 2;
        i += 2;
        break;
      }
    }
  }
  return filled;
}
