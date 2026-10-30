import { DIRS } from './directions.js';
import { buildOccupancy, rayArrows } from './board.js';
import { MIN_LEN } from './levels.js';
import { onRing } from './metrics.js';
import { crossesItself, turnedDir, waitsFor } from './deepen.js';

/**
 * Hide free moves inside the board. A free arrow whose head sits on the outer ring is an obvious first move:
 * - if its first cells run straight toward the edge, it loses 1-2 head cells. Its new head is one or two
 *   cells in from the edge with empty cells in front, still free but no longer on the ring. Kept only if
 *   no arrow that waited for it becomes free.
 * - otherwise it is turned around when its new way out is blocked and nothing there waits for it, so it
 *   is no longer free (at least one free arrow always stays), while more than `limit` arrows are free or
 *   more than `maxEdge` of them sit on the ring. Hidden free arrows are also turned while more than
 *   `limit` arrows are free.
 * - if still more than `limit` are free (or more than `maxEdge` of them sit on the ring), free arrows on
 *   the ring are removed (cells left empty) within budget. Arrows this frees must sit inside the board.
 * Removing cells only empties cells and turns keep the board acyclic, so it stays solvable. Mutates arrows.
 * @param {{rows: number, cols: number, mask: number[]|null, arrows: object[]}} level
 * @param {() => number} rng
 * @param {number} [limit] most free arrows wanted on the first move
 * @param {number} [maxEdge] most share of free arrows that may sit on the ring
 * @param {number} [budget] most cells that may be emptied by dropping free arrows on the ring (their path
 *   becomes empty; the caller removes them)
 * @returns {number} arrows changed
 */
export function hideFreeMoves(level, rng, limit = 1, budget = 0, maxEdge = 1) {
  const { arrows } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  const ring = (a) => onRing(level, a.path[0].r, a.path[0].c);
  let changed = 0;
  for (const a of arrows) {
    if (!ring(a) || deps[a.id].length) continue;
    const h = a.path[0];
    const { dr, dc } = DIRS[a.dir];
    const straight = (k) => a.path[k] && a.path[k].r === h.r - k * dr && a.path[k].c === h.c - k * dc;
    // trim k cells: the cells up to the new neck must run straight, and enough must be left
    const waiters = arrows.filter((w) => deps[w.id].includes(a.id));
    // try the longer trim first (chosen at random), then the shorter one
    for (let k = rng() < 0.5 ? 2 : 1; k > 0; k--) {
      if (!(straight(k + 1) && a.path.length - k >= MIN_LEN && !onRing(level, a.path[k].r, a.path[k].c))) continue;
      const cut = a.path.slice(0, k);
      for (const p of cut) occ[p.r * level.cols + p.c] = -1;
      if (waiters.some((w) => !rayArrows(occ, level, w).length)) {
        for (const p of cut) occ[p.r * level.cols + p.c] = a.id;
        continue;
      }
      a.path = a.path.slice(k);
      for (const w of waiters) deps[w.id] = rayArrows(occ, level, w);
      changed++;
      break;
    }
  }
  const waiting = arrows.map(() => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  // free arrows on the ring are turned first; hidden ones only while more than `limit` are free
  const free = () => arrows.filter((x) => !deps[x.id].length);
  const order = free().sort((x, y) => ring(y) - ring(x));
  // too many free arrows, or too many of them on the ring
  const tooMany = () => {
    const f = free();
    return f.length > limit || f.filter(ring).length > maxEdge * f.length;
  };
  for (const a of order) {
    const left = free();
    if (left.length < 2 || !tooMany()) break;
    if (!ring(a) && left.length <= limit) continue;
    const turned = { id: a.id, dir: turnedDir(a), path: [...a.path].reverse() };
    const next = rayArrows(occ, level, turned);
    if (!next.length || crossesItself(occ, level, turned) || waitsFor(waiting, a.id, next)) continue;
    for (const b of next) waiting[b].push(a.id);
    deps[a.id] = next;
    a.dir = turned.dir;
    a.path = turned.path;
    changed++;
  }
  // still too many: drop free arrows on the ring (their cells stay empty) while no waiting arrow gets free
  for (const a of free().filter(ring)) {
    if (!tooMany() || a.path.length > budget) break;
    for (const p of a.path) occ[p.r * level.cols + p.c] = -1;
    const fresh = waiting[a.id].map((w) => rayArrows(occ, level, arrows[w]));
    // arrows freed by the drop are fine only if they sit inside the board and the count stays in limit
    const freed = waiting[a.id].filter((w, i) => !fresh[i].length);
    const after = free().length - 1 + freed.length;
    if (freed.some((w) => ring(arrows[w])) || (freed.length && after > limit)) {
      for (const p of a.path) occ[p.r * level.cols + p.c] = a.id;
      continue;
    }
    waiting[a.id].forEach((w, i) => (deps[w] = fresh[i]));
    budget -= a.path.length;
    a.path = [];
    deps[a.id] = [null]; // gone: no longer counted as free
    changed++;
  }
  return changed;
}
