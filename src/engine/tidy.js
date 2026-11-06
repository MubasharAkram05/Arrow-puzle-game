import { DIRS } from './directions.js';
import { buildOccupancy, rayArrows } from './board.js';
import { roundsOf, waitsFor } from './deepen.js';

/**
 * Tidy arrow shapes on a finished hard board (3.17.0): arrows under 3 cells, and straight arrows under 4
 * cells, first grow their tail into empty cells next to it, else are joined end to end with a neighbour, so
 * boards have longer, bending arrows.
 *
 * A join keeps one arrow's head (the keeper) and adds the other arrow's cells to the keeper's tail. The
 * keeper's own way out does not change. Arrows that waited for the joined arrow now wait for the keeper.
 * It is safe when the keeper does not wait for the joined arrow (directly or through a chain): then no cycle
 * can appear and the board stays solvable. Keepers that leave no earlier in the solve than the joined arrow
 * are preferred, so nothing that waited for it leaves earlier (the floors are checked after every build).
 * Joins that make a bend are preferred. An arrow with no possible join keeps its shape (a last resort).
 */

/** Does an arrow run in one straight line? */
export function isStraight(a) {
  const p = a.path;
  if (p.length < 3) return true;
  const dr = p[1].r - p[0].r;
  const dc = p[1].c - p[0].c;
  for (let i = 2; i < p.length; i++) if (p[i].r - p[i - 1].r !== dr || p[i].c - p[i - 1].c !== dc) return false;
  return true;
}

/** Number of turns along an arrow's body. */
export function turnCount(a) {
  let t = 0;
  for (let i = 2; i < a.path.length; i++) {
    const [p, q, r] = [a.path[i - 2], a.path[i - 1], a.path[i]];
    if (q.r - p.r !== r.r - q.r || q.c - p.c !== r.c - q.c) t++;
  }
  return t;
}

/** Is an arrow too short for its shape (under 3 cells, or straight and under 4)? */
export const needsTidy = (a) => a.path.length > 0 && (a.path.length < 3 || (a.path.length < 4 && isStraight(a)));

const touches = (p, q) => Math.abs(p.r - q.r) + Math.abs(p.c - q.c) === 1;

/** Shared state of the tidy and fill passes: owners, blockers, waiters and solve rounds, kept exact. */
export function tidyContext(level, maxLen) {
  const { arrows, cols } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  const waiting = arrows.map(() => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const round = roundsOf(deps);
  /** Add `piece`'s cells to `keeper`'s tail (piece touches the tail with one of its ends). */
  const join = (keeper, piece) => {
    const tail = keeper.path[keeper.path.length - 1];
    const cells = touches(tail, piece.path[0]) ? piece.path : [...piece.path].reverse();
    keeper.path = keeper.path.concat(cells);
    for (const p of cells) occ[p.r * cols + p.c] = keeper.id;
    // arrows that waited for the piece now wait for the keeper
    for (const w of waiting[piece.id]) {
      deps[w] = deps[w].filter((x) => x !== piece.id);
      if (!deps[w].includes(keeper.id)) {
        deps[w].push(keeper.id);
        waiting[keeper.id].push(w);
      }
    }
    for (const b of deps[piece.id]) waiting[b] = waiting[b].filter((x) => x !== piece.id);
    deps[piece.id] = [];
    waiting[piece.id] = [];
    piece.path = [];
    // arrows that now wait for the keeper may leave later: push their rounds up
    pushRounds(keeper.id);
  };
  /** Push the rounds of everything waiting for `id` up after it got new waiters. */
  const pushRounds = (id) => {
    const queue = [id];
    while (queue.length) {
      const k = queue.pop();
      for (const w of waiting[k]) {
        if (round[w] > round[k]) continue;
        round[w] = round[k] + 1;
        queue.push(w);
      }
    }
  };
  /** Arrows whose way out crosses cell (r, c). */
  const rayThrough = (r, c) => {
    const out = [];
    for (let k = 0; k < 4; k++) {
      const { dr, dc } = DIRS[k];
      for (let rr = r - dr, cc = c - dc; rr >= 0 && rr < level.rows && cc >= 0 && cc < cols; rr -= dr, cc -= dc) {
        const id = occ[rr * cols + cc];
        if (id === -1) continue;
        const h = arrows[id].path[0];
        if (arrows[id].dir === k && h.r === rr && h.c === cc) out.push(id);
      }
    }
    return out;
  };
  /**
   * Grow x's tail into empty usable cells. Arrows whose way out crosses a new cell now wait for x, so a
   * cell is taken only when x does not wait for any of them (no cycle) and it is not in x's own way out.
   * @returns {boolean} true when x grew
   */
  const growTail = (x, want = needsTidy, skip = null) => {
    let grew = false;
    while (want(x) && x.path.length < maxLen) {
      const tail = x.path[x.path.length - 1];
      const prev = x.path[x.path.length - 2];
      let best = null;
      for (const { dr, dc } of DIRS) {
        const r = tail.r + dr;
        const c = tail.c + dc;
        const i = r * cols + c;
        if (r < 0 || r >= level.rows || c < 0 || c >= cols || occ[i] !== -1) continue;
        if (level.mask && !level.mask[i]) continue;
        const ws = rayThrough(r, c);
        if (ws.includes(x.id) || ws.some((w) => waitsFor(waiting, w, [x.id]))) continue;
        if (skip && ws.some((w) => skip(w, x))) continue;
        const bends = !prev || dr !== tail.r - prev.r || dc !== tail.c - prev.c;
        const score = (bends ? 0 : 10) - ws.length;
        if (!best || score < best.score) best = { r, c, ws, score };
      }
      if (!best) break;
      x.path.push({ r: best.r, c: best.c });
      occ[best.r * cols + best.c] = x.id;
      for (const w of best.ws)
        if (!deps[w].includes(x.id)) {
          deps[w].push(x.id);
          waiting[x.id].push(w);
        }
      pushRounds(x.id);
      grew = true;
    }
    return grew;
  };
  /**
   * Take the last cell of a neighbour's tail that touches x's tail (the neighbour keeps 3+ cells and a good
   * shape). Arrows whose way out crosses that cell now wait for x instead, so the same cycle rule applies.
   * @returns {boolean}
   */
  const stealTail = (x) => {
    const tail = x.path[x.path.length - 1];
    for (const { dr, dc } of DIRS) {
      const r = tail.r + dr;
      const c = tail.c + dc;
      if (r < 0 || r >= level.rows || c < 0 || c >= cols) continue;
      const id = occ[r * cols + c];
      if (id === -1 || id === x.id) continue;
      const y = arrows[id];
      const end = y.path[y.path.length - 1];
      if (end.r !== r || end.c !== c || y.path.length < 4) continue;
      if (needsTidy({ path: y.path.slice(0, -1) })) continue;
      const ws = rayThrough(r, c);
      if (ws.includes(x.id) || ws.some((w) => w !== y.id && waitsFor(waiting, w, [x.id]))) continue;
      y.path.pop();
      x.path.push({ r, c });
      occ[r * cols + c] = x.id;
      // arrows that crossed this cell now wait for x; they still wait for y only if they cross y elsewhere
      for (const w of ws) {
        if (!deps[w].includes(x.id)) {
          deps[w].push(x.id);
          waiting[x.id].push(w);
        }
        if (!rayArrows(occ, level, arrows[w]).includes(y.id)) {
          deps[w] = deps[w].filter((b) => b !== y.id);
          waiting[y.id] = waiting[y.id].filter((b) => b !== w);
        }
      }
      pushRounds(x.id);
      return true;
    }
    return false;
  };
  return { occ, deps, waiting, round, pushRounds, rayThrough, growTail, stealTail, join };
}

/**
 * Join short arrows into neighbours. Mutates the arrows: joined arrows get an empty path (the caller removes
 * them and renumbers).
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {number} maxLen longest arrow allowed
 * @param {number} [budget] most cells that may be left empty by dropping stubs nothing can fix
 * @returns {number} joins and drops made
 */
export function tidyShapes(level, maxLen, budget = 0) {
  const { arrows, cols } = level;
  const t = tidyContext(level, maxLen);
  const { occ, deps, waiting, round, growTail, stealTail, join } = t;
  let joins = 0;
  /** Can `piece` join `keeper`'s tail? Returns a score (lower = better), or null. */
  const fit = (keeper, piece) => {
    if (keeper === piece || !keeper.path.length || !piece.path.length) return null;
    if (keeper.path.length + piece.path.length > maxLen) return null;
    const tail = keeper.path[keeper.path.length - 1];
    if (!touches(tail, piece.path[0]) && !touches(tail, piece.path[piece.path.length - 1])) return null;
    if (waitsFor(waiting, piece.id, [keeper.id])) return null;
    // a keeper that leaves earlier than the piece may let the piece's waiters out earlier: last choice
    const early = round[keeper.id] < round[piece.id] ? 200 : 0;
    const prev = keeper.path[keeper.path.length - 2];
    const end = touches(tail, piece.path[0]) ? piece.path[0] : piece.path[piece.path.length - 1];
    const bends = !prev || end.r - tail.r !== tail.r - prev.r || end.c - tail.c !== tail.c - prev.c;
    return early + (bends ? 0 : 50) + keeper.path.length + piece.path.length;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const x of arrows) {
      if (!needsTidy(x)) continue;
      // first grow into empty cells (adds blocking), then join a neighbour
      if (growTail(x)) joins++;
      while (needsTidy(x) && stealTail(x)) joins++;
      if (!needsTidy(x)) continue;
      let best = null;
      const consider = (keeper, piece) => {
        const s = fit(keeper, piece);
        if (s !== null && (!best || s < best.s)) best = { keeper, piece, s };
      };
      // neighbours touching either end of x: x can keep its head and grow, or join a neighbour's tail
      for (const end of [x.path[0], x.path[x.path.length - 1]])
        for (const { dr, dc } of DIRS) {
          const r = end.r + dr;
          const c = end.c + dc;
          if (r < 0 || r >= level.rows || c < 0 || c >= cols) continue;
          const id = occ[r * cols + c];
          if (id === -1 || id === x.id) continue;
          consider(x, arrows[id]);
          consider(arrows[id], x);
        }
      if (best) {
        join(best.keeper, best.piece);
        joins++;
      }
    }
  }
  // last resort: a stub still too short is dropped (its cells stay empty) within the fill budget, when
  // every arrow waiting for it is still blocked by another arrow (so no arrow becomes free)
  for (const x of arrows) {
    if (!needsTidy(x) || x.path.length > budget || !deps[x.id].length) continue;
    if (waiting[x.id].some((w) => deps[w].length < 2)) continue;
    budget -= x.path.length;
    for (const p of x.path) occ[p.r * cols + p.c] = -1;
    for (const w of waiting[x.id]) deps[w] = deps[w].filter((b) => b !== x.id);
    for (const b of deps[x.id]) waiting[b] = waiting[b].filter((w) => w !== x.id);
    deps[x.id] = [];
    waiting[x.id] = [];
    x.path = [];
    joins++;
  }
  return joins;
}
