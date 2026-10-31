import { DIRS } from './directions.js';
import { buildOccupancy, rayArrows } from './board.js';
import { MIN_LEN } from './levels.js';
import { roundsOf, waitsFor } from './deepen.js';

/** Passes that cut and join arrows on a finished board: decoys and late walls. */

/**
 * Make decoys: an arrow with two or more arrows in its way becomes blocked by only its nearest one when
 * the farther ones only cross its way out with the end of their tail. Those tail cells are removed (the
 * arrows keep their heads, so their own way out does not change). Removing cells only empties cells, so the
 * board stays solvable; a cut is undone if it would leave any arrow free. Mutates the arrows.
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {number} budget most cells that may be removed (keeps the board's fill)
 * @param {{maxCut?: number, want?: number}} [opts] most cells one cut may remove (default: just the
 *   crossing cells); stop once this many arrows are decoys
 * @returns {number} cells removed
 */
export function makeDecoys(level, budget, opts = {}) {
  const { arrows, cols } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  let used = 0;
  const decoys = () => deps.filter((d) => d.length === 1).length;
  const order = arrows.filter((a) => deps[a.id].length >= 2).sort((x, y) => deps[x.id].length - deps[y.id].length);
  for (const a of order) {
    if (used >= budget || decoys() >= (opts.want ?? Infinity)) break;
    const far = deps[a.id].slice(1);
    if (!far.length) continue;
    // cells of each far blocker in a's way out
    const { dr, dc } = DIRS[a.dir];
    const hit = new Map(far.map((id) => [id, new Set()]));
    for (
      let r = a.path[0].r + dr, c = a.path[0].c + dc;
      r >= 0 && r < level.rows && c >= 0 && c < cols;
      r += dr, c += dc
    ) {
      const id = occ[r * cols + c];
      if (hit.has(id)) hit.get(id).add(r * cols + c);
    }
    // each far blocker must lose only the end of its tail, and keep enough cells
    const cuts = [];
    for (const [id, cells] of hit) {
      const p = arrows[id].path;
      const k = p.findIndex((q) => cells.has(q.r * cols + q.c));
      if (k < MIN_LEN || p.length - k > (opts.maxCut ?? cells.size)) break;
      cuts.push({ id, k });
    }
    const size = cuts.reduce((s, x) => s + arrows[x.id].path.length - x.k, 0);
    if (cuts.length !== far.length || used + size > budget) continue;
    for (const { id, k } of cuts) for (const q of arrows[id].path.slice(k)) occ[q.r * cols + q.c] = -1;
    // arrows that had one of the cut arrows in their way: none may become free
    const touched = arrows.filter((w) => cuts.some((x) => deps[w.id].includes(x.id)));
    const fresh = touched.map((w) => rayArrows(occ, level, w));
    if (fresh.some((d) => !d.length)) {
      for (const { id, k } of cuts) for (const q of arrows[id].path.slice(k)) occ[q.r * cols + q.c] = id;
      continue;
    }
    for (const { id, k } of cuts) arrows[id].path = arrows[id].path.slice(0, k);
    touched.forEach((w, i) => (deps[w.id] = fresh[i]));
    used += size;
  }
  return used;
}

/**
 * Join short arrows onto the tail of arrows that leave later (long walls that come out late). Arrow A keeps
 * its head, so its own way out does not change; neighbour B is joined only when A does not wait for B
 * (directly or through a chain), so no cycle can appear. Only a B that leaves no later than A is joined,
 * so arrows that waited for B (and now wait for A) never leave earlier: fewer arrows, same or more solve
 * rounds, so fewer free arrows per round.
 * Joined arrows get an empty path (the caller removes them). Mutates the arrows.
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {number} joins most arrows to join (keeps the arrow count above the level's minimum)
 * @param {number} maxLen longest arrow allowed
 * @returns {number} arrows joined
 */
export function joinLate(level, joins, maxLen) {
  const { arrows, cols } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  const waiting = arrows.map(() => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const round = roundsOf(deps);
  let done = 0;
  const order = arrows.map((a) => a.id).sort((x, y) => round[y] - round[x] || x - y);
  for (const id of order) {
    if (done >= joins) break;
    const a = arrows[id];
    if (!a.path.length) continue;
    const tail = a.path[a.path.length - 1];
    for (const { dr, dc } of DIRS) {
      const r = tail.r + dr;
      const c = tail.c + dc;
      if (r < 0 || r >= level.rows || c < 0 || c >= cols) continue;
      const bid = occ[r * cols + c];
      if (bid === -1 || bid === id) continue;
      const b = arrows[bid];
      // free arrows stay as they are (they are the board's first moves)
      if (!deps[bid].length || round[bid] > round[id] || a.path.length + b.path.length > maxLen) continue;
      const atHead = b.path[0].r === r && b.path[0].c === c;
      const last = b.path[b.path.length - 1];
      if (!atHead && (last.r !== r || last.c !== c)) continue;
      if (waitsFor(waiting, bid, [id])) continue; // a waits for b: joining would make a cycle
      a.path = a.path.concat(atHead ? b.path : [...b.path].reverse());
      for (const p of b.path) occ[p.r * cols + p.c] = id;
      b.path = [];
      // b's blockers no longer have b waiting; arrows that waited for b now wait for a
      for (const x of deps[bid]) waiting[x].splice(waiting[x].indexOf(bid), 1);
      deps[bid] = [];
      for (const w of waiting[bid]) {
        deps[w] = deps[w].filter((x) => x !== bid);
        if (!deps[w].includes(id)) {
          deps[w].push(id);
          waiting[id].push(w);
        }
      }
      waiting[bid] = [];
      done++;
      break;
    }
  }
  return done;
}
