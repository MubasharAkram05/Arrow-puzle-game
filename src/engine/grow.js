/**
 * Growing one arrow body, filling leftover cells, and choosing normal arrow lengths.
 */
import { DIRS, opposite } from './directions.js';
import { randInt } from './rng.js';
import { makePlan } from './shapes.js';

/** Grow an arrow body away from its head following a shape plan. */
export function growArrow(grid, cfg, rng, id, head, dir, targetLen, style) {
  const { isFree, degree, take } = grid;
  const neck = { r: head.r - DIRS[dir].dr, c: head.c - DIRS[dir].dc };
  const path = [head, neck];
  take(head.r, head.c, id);
  take(neck.r, neck.c, id);
  const plan = makePlan(style, targetLen, rng);
  let heading = opposite(dir);
  let step = 1;
  while (path.length < targetLen) {
    const cur = path[path.length - 1];
    const opts = [];
    for (let k = 0; k < 4; k++) if (isFree(cur.r + DIRS[k].dr, cur.c + DIRS[k].dc)) opts.push(k);
    if (!opts.length) break;
    // a neighbour that would be left alone forever is absorbed right away
    const orphan = opts.find((k) => degree(cur.r + DIRS[k].dr, cur.c + DIRS[k].dc) === 0);
    const want = (heading + plan[Math.min(step, plan.length - 1)]) % 4;
    step++;
    let next;
    if (orphan !== undefined && path.length >= cfg.lenMin) next = orphan;
    else if (opts.indexOf(want) !== -1) next = want;
    else {
      if (style !== 'snake' && path.length >= Math.max(3, cfg.lenMin) && rng() < 0.3) break;
      let best = Infinity;
      for (const k of opts) {
        const s = degree(cur.r + DIRS[k].dr, cur.c + DIRS[k].dc) + (k === heading ? -0.4 : 0) + rng() * 0.6;
        if (s < best) {
          best = s;
          next = k;
        }
      }
    }
    const nr = cur.r + DIRS[next].dr;
    const nc = cur.c + DIRS[next].dc;
    take(nr, nc, id);
    path.push({ r: nr, c: nc });
    heading = next;
  }
  return { id, dir, path };
}

/** Leftover cells join a neighbouring tail. They sit in no arrow's way out, so solvability holds. */
export function absorbLeftovers(grid, cfg, arrows) {
  const { rows, cols, free, owner, inB, take } = grid;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < rows * cols; i++) {
      if (!free[i]) continue;
      const r = Math.floor(i / cols);
      const c = i % cols;
      for (const d of DIRS) {
        const rr = r + d.dr;
        const cc = c + d.dc;
        if (!inB(rr, cc)) continue;
        const a = arrows[owner[rr * cols + cc]];
        if (!a || a.path.length >= cfg.lenMax) continue;
        const tail = a.path[a.path.length - 1];
        if (tail.r === rr && tail.c === cc) {
          a.path.push({ r, c });
          take(r, c, a.id);
          changed = true;
          break;
        }
      }
    }
  }
}

/**
 * Target length for the next normal arrow: mostly short (2-6), some medium (7-12).
 * Long arrows are planned separately (longArrows.js).
 * @param {object} cfg
 * @param {() => number} rng
 * @returns {number}
 */
export function pickLength(cfg, rng) {
  const { short, medium } = cfg.lengths;
  return rng() < medium.share ? randInt(rng, medium.min, medium.max) : randInt(rng, short.min, short.max);
}
