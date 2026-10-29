import { DIRS } from './directions.js';
import { randInt } from './rng.js';

/**
 * Long arrows (13-30 cells) made by joining neighbours onto a deep arrow's tail.
 *
 * Arrow A keeps its head and direction, so it is blocked by the same arrows as before and still
 * leaves late. A neighbour B is joined only when B is not one of A's blockers (direct or through a
 * chain): then the arrows B used to block are now blocked by A, and no cycle can appear, so the
 * board stays solvable. Joined arrows act as walls: long straights, U-turns, combs and snakes.
 */

/** Owner grid (arrow id per cell, -1 = empty). */
function ownerGrid(rows, cols, arrows) {
  const occ = new Int16Array(rows * cols).fill(-1);
  for (const a of arrows) for (const p of a.path) occ[p.r * cols + p.c] = a.id;
  return occ;
}

/** Arrows in front of a head. */
function blockers(occ, rows, cols, a) {
  const d = DIRS[a.dir];
  const out = new Set();
  let r = a.path[0].r + d.dr;
  let c = a.path[0].c + d.dc;
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    const id = occ[r * cols + c];
    if (id !== -1) out.add(id);
    r += d.dr;
    c += d.dc;
  }
  return out;
}

/** Every arrow that must leave before arrow id (iterative DFS over the current board). */
function closure(occ, rows, cols, byId, id) {
  const seen = new Set();
  const stack = [id];
  while (stack.length) {
    const x = stack.pop();
    for (const b of blockers(occ, rows, cols, byId.get(x))) {
      if (!seen.has(b)) {
        seen.add(b);
        stack.push(b);
      }
    }
  }
  return seen;
}

/**
 * Solve round of every arrow: 1 = free at the start, else 1 + the latest round among its blockers.
 * @returns {Map<number, number>}
 */
function solveRounds(occ, rows, cols, arrows, byId) {
  const round = new Map();
  const visit = (id) => {
    if (round.has(id)) return round.get(id);
    round.set(id, 0); // guards against a cycle (never happens on a generated board)
    let r = 1;
    for (const b of blockers(occ, rows, cols, byId.get(id))) r = Math.max(r, visit(b) + 1);
    round.set(id, r);
    return r;
  };
  for (const a of arrows) visit(a.id);
  return round;
}

/**
 * Try to grow arrow a past `target` cells by joining neighbours at its tail.
 * @returns {object[]|null} joined arrows (in order), or null when it can't reach the target
 */
function growLong(occ, rows, cols, byId, a, target, maxLen) {
  const banned = closure(occ, rows, cols, byId, a.id);
  const joined = [];
  const used = new Set([a.id]);
  let path = a.path;
  while (path.length < target) {
    const tail = path[path.length - 1];
    const prev = path[path.length - 2];
    let best = null;
    for (let k = 0; k < 4; k++) {
      const r = tail.r + DIRS[k].dr;
      const c = tail.c + DIRS[k].dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const id = occ[r * cols + c];
      if (id === -1 || used.has(id) || banned.has(id)) continue;
      const b = byId.get(id);
      const end = b.path[0].r === r && b.path[0].c === c ? 'head' : 'tail';
      const last = b.path[b.path.length - 1];
      if (end === 'tail' && (last.r !== r || last.c !== c)) continue; // touches its middle
      if (path.length + b.path.length > maxLen) continue;
      // prefer keeping a straight line, then longer pieces
      const straight = tail.r - prev.r === DIRS[k].dr && tail.c - prev.c === DIRS[k].dc;
      const score = (straight ? 100 : 0) + b.path.length;
      if (!best || score > best.score) best = { b, end, score };
    }
    if (!best) return null;
    const piece = best.end === 'head' ? best.b.path : [...best.b.path].reverse();
    path = path.concat(piece);
    joined.push(best.b);
    used.add(best.b.id);
  }
  return joined.length ? { path, joined } : null;
}

/**
 * Turn some deep arrows into long ones. Mutates and returns the arrow list (ids renumbered).
 * @param {object} level built level ({rows, cols, arrows})
 * @param {object} cfg level config (cfg.lengths.long)
 * @param {() => number} rng
 * @returns {object[]}
 */
export function joinLongArrows(level, cfg, rng) {
  const long = cfg.lengths.long;
  const { rows, cols } = level;
  let arrows = level.arrows;
  if (!long.share || arrows.length < 8) return arrows;
  const byId = new Map(arrows.map((a) => [a.id, a]));
  const occ = ownerGrid(rows, cols, arrows);
  // latest to leave first (highest solve round), with a little shuffle
  const round = solveRounds(occ, rows, cols, arrows, byId);
  const order = [...arrows].sort((x, y) => round.get(y.id) - round.get(x.id) + (rng() - 0.5) * 2);
  const want = Math.round(arrows.length * long.share);
  let made = 0;
  for (const a of order) {
    if (made >= want) break;
    if (!byId.has(a.id) || a.path.length >= long.min) continue;
    const res = growLong(occ, rows, cols, byId, a, randInt(rng, long.min, long.max), long.max);
    if (!res) continue;
    a.path = res.path;
    for (const b of res.joined) {
      byId.delete(b.id);
      for (const p of b.path) occ[p.r * cols + p.c] = a.id;
    }
    made++;
  }
  arrows = arrows.filter((a) => byId.has(a.id));
  arrows.forEach((a, i) => (a.id = i));
  return arrows;
}
