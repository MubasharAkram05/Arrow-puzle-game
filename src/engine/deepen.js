import { DIRS } from './directions.js';
import { buildOccupancy, rayArrows } from './board.js';

/**
 * Deepen a finished board by turning arrows around (the tail becomes the head, cells stay the same).
 *
 * Turning arrow A only changes A's own way out: every other arrow's way out crosses the same cells as
 * before. So the board stays solvable as long as nothing in A's new way out waits for A (directly or
 * through a chain). A turn is kept when A then leaves later in the solve (more solve rounds, fewer free
 * arrows per round), or leaves at the same round with exactly one arrow in front (a decoy).
 * Free arrows are never turned, so the hidden first moves stay where the generator put them.
 * firstMoves.js and reshape.js hold the other passes that make a finished board harder.
 */

/**
 * Solve round of every arrow: 1 when nothing is in front, else 1 + the latest round in front.
 * @param {number[][]} deps
 * @returns {Int32Array}
 */
export function roundsOf(deps) {
  const round = new Int32Array(deps.length);
  const visit = (id) => {
    if (round[id]) return round[id];
    round[id] = -1; // cycle guard (never happens: only acyclic turns are kept)
    let r = 1;
    for (const b of deps[id]) r = Math.max(r, visit(b) + 1);
    round[id] = r;
    return r;
  };
  for (let id = 0; id < deps.length; id++) visit(id);
  return round;
}

/** Does any of `ids` wait for arrow `a` (directly or through a chain)? */
export function waitsFor(waiting, a, ids) {
  const want = new Set(ids);
  const seen = new Uint8Array(waiting.length);
  const stack = [a];
  while (stack.length) {
    const x = stack.pop();
    for (const w of waiting[x]) {
      if (seen[w]) continue;
      if (want.has(w)) return true;
      seen[w] = 1;
      stack.push(w);
    }
  }
  return false;
}

/**
 * Turn arrows around where it makes the board harder. Mutates the arrows.
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {{passes?: number, decoys?: boolean}} [opts]
 * @returns {number} arrows turned
 */
export function deepenLevel(level, opts = {}) {
  const { arrows } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  const waiting = arrows.map(() => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const round = roundsOf(deps);
  let turned = 0;
  for (let pass = 0; pass < (opts.passes ?? 2); pass++) {
    let changed = false;
    // latest arrows first: turning them pushes the end of the solve further out
    const order = arrows.map((a) => a.id).sort((x, y) => round[y] - round[x] || x - y);
    for (const id of order) {
      const a = arrows[id];
      if (!deps[id].length) continue;
      const dir = turnedDir(a);
      const flipped = { id, dir, path: [...a.path].reverse() };
      const next = rayArrows(occ, level, flipped);
      if (!next.length || crossesItself(occ, level, flipped)) continue;
      const r = 1 + Math.max(...next.map((b) => round[b]));
      const later = r > round[id];
      const decoy = opts.decoys && r === round[id] && next.length === 1 && deps[id].length > 1;
      if (!later && !decoy) continue;
      if (waitsFor(waiting, id, next)) continue;
      for (const b of deps[id]) waiting[b].splice(waiting[b].indexOf(id), 1);
      for (const b of next) waiting[b].push(id);
      deps[id] = next;
      a.dir = dir;
      a.path = flipped.path;
      // a never leaves earlier than before: push the rounds of everything waiting for it up
      round[id] = r;
      const queue = [id];
      while (queue.length) {
        const x = queue.pop();
        for (const w of waiting[x]) {
          if (round[w] > round[x]) continue;
          round[w] = round[x] + 1;
          queue.push(w);
        }
      }
      turned++;
      changed = true;
    }
    if (!changed) break;
  }
  return turned;
}

/** Does an arrow's way out cross its own body? Then it could never leave. */
export function crossesItself(occ, level, a) {
  const { dr, dc } = DIRS[a.dir];
  for (
    let r = a.path[0].r + dr, c = a.path[0].c + dc;
    r >= 0 && r < level.rows && c >= 0 && c < level.cols;
    r += dr, c += dc
  )
    if (occ[r * level.cols + c] === a.id) return true;
  return false;
}

/** Head direction of an arrow turned around (from its last two cells). */
export function turnedDir(a) {
  const n = a.path.length;
  const head = a.path[n - 1];
  const neck = a.path[n - 2];
  return DIRS.findIndex((d) => d.dr === head.r - neck.r && d.dc === head.c - neck.c);
}

/** Number of arrows that must leave before arrow id (its blockers through any chain). */
function closureSize(deps, id) {
  const seen = new Uint8Array(deps.length);
  const stack = [id];
  let n = 0;
  while (stack.length)
    for (const b of deps[stack.pop()])
      if (!seen[b]) {
        seen[b] = 1;
        n++;
        stack.push(b);
      }
  return n;
}

/**
 * Repair pass for a board whose average depth is just under its floor: turn arrows around when more
 * arrows must then leave before them and they leave no earlier in the solve. Same safety rules as
 * deepenLevel. Mutates the arrows.
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {number} want stop once the summed depth reaches this
 * @returns {number} arrows turned
 */
export function deepenDepth(level, want) {
  const { arrows } = level;
  const occ = buildOccupancy(level);
  const deps = arrows.map((a) => rayArrows(occ, level, a));
  const waiting = arrows.map(() => []);
  deps.forEach((d, id) => d.forEach((b) => waiting[b].push(id)));
  const round = roundsOf(deps);
  // depth of every arrow, and the sum the floor asks for
  let total = arrows.reduce((s, a) => s + closureSize(deps, a.id), 0);
  let turned = 0;
  for (const a of [...arrows].sort((x, y) => round[x.id] - round[y.id] || x.id - y.id)) {
    if (total >= want) break;
    const id = a.id;
    if (!deps[id].length) continue;
    const t = { id, dir: turnedDir(a), path: [...a.path].reverse() };
    const next = rayArrows(occ, level, t);
    if (!next.length || crossesItself(occ, level, t)) continue;
    if (1 + Math.max(...next.map((b) => round[b])) < round[id] || waitsFor(waiting, id, next)) continue;
    const before = closureSize(deps, id);
    const old = deps[id];
    deps[id] = next;
    const after = closureSize(deps, id);
    if (after <= before) {
      deps[id] = old;
      continue;
    }
    for (const b of old) waiting[b].splice(waiting[b].indexOf(id), 1);
    for (const b of next) waiting[b].push(id);
    a.dir = t.dir;
    a.path = t.path;
    // a and everything waiting for it now have bigger depths
    total = arrows.reduce((s, x) => s + closureSize(deps, x.id), 0);
    turned++;
  }
  return turned;
}
