import { DIRS, opposite } from './directions.js';
import { hashSeed, mulberry32, weightedPick } from './rng.js';
import { makeMask } from './masks.js';
import { makePlan } from './shapes.js';
import { MAX_LEN, MIN_FILL, MIN_LEN, getDailyConfig, getLevelConfig } from './levels.js';
import { analyzeLevel } from './difficulty.js';

const MAX_ATTEMPTS = 500;

/**
 * Mutable grid used while building one candidate board.
 * free[i] = 1 when the cell is usable and not taken yet.
 */
function createGrid(rows, cols, usable) {
  const free = Uint8Array.from(usable);
  const owner = new Int16Array(rows * cols).fill(-1);
  const inB = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isFree = (r, c) => inB(r, c) && free[r * cols + c] === 1;
  const degree = (r, c) => DIRS.reduce((n, d) => n + (isFree(r + d.dr, c + d.dc) ? 1 : 0), 0);
  const take = (r, c, id) => {
    free[r * cols + c] = 0;
    owner[r * cols + c] = id;
  };
  return { rows, cols, free, owner, inB, isFree, degree, take };
}

/**
 * Every free cell whose way out only crosses taken or unused cells can be a head.
 * Reverse peeling: such an arrow is only blocked by arrows placed before it.
 */
function headCandidates(grid, cfg, rng) {
  const { rows, cols, free, owner, inB, isFree, degree } = grid;
  const cands = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!free[r * cols + c]) continue;
      for (let d = 0; d < 4; d++) {
        if (!isFree(r - DIRS[d].dr, c - DIRS[d].dc)) continue;
        let rr = r + DIRS[d].dr;
        let cc = c + DIRS[d].dc;
        let depth = 0;
        let ok = true;
        while (inB(rr, cc)) {
          const i = rr * cols + cc;
          if (free[i]) {
            ok = false;
            break;
          }
          if (owner[i] !== -1) depth++;
          rr += DIRS[d].dr;
          cc += DIRS[d].dc;
        }
        if (!ok) continue;
        const score = degree(r, c) - depth * cfg.depthBias + rng() * 1.2;
        cands.push({ r, c, d, score });
      }
    }
  }
  return cands;
}

/** Grow an arrow body away from its head following a shape plan. */
function growArrow(grid, cfg, rng, id, head, dir, targetLen, style) {
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
function absorbLeftovers(grid, cfg, arrows) {
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
 * Build one candidate board with reverse peeling (not yet verified).
 * @param {object} cfg level config from getLevelConfig / getDailyConfig
 * @param {() => number} rng
 * @returns {object} level
 */
export function buildLevel(cfg, rng) {
  const { rows, cols } = cfg;
  const usable = makeMask(cfg.mask, rows, cols);
  const grid = createGrid(rows, cols, usable);
  const arrows = [];
  for (;;) {
    const cands = headCandidates(grid, cfg, rng);
    if (!cands.length) break;
    cands.sort((a, b) => a.score - b.score);
    const pick = cands[Math.floor(rng() * Math.min(3, cands.length))];
    const span = cfg.lenMax - cfg.lenMin;
    const targetLen = cfg.lenMin + Math.round(span * (0.25 + 0.75 * rng()) * (0.5 + 0.5 * rng()));
    const style = weightedPick(rng, cfg.styles);
    arrows.push(
      growArrow(grid, cfg, rng, arrows.length, { r: pick.r, c: pick.c }, pick.d, Math.max(2, targetLen), style),
    );
  }
  absorbLeftovers(grid, cfg, arrows);
  let used = 0;
  let total = 0;
  for (let i = 0; i < rows * cols; i++) {
    total += usable[i];
    if (grid.owner[i] !== -1) used++;
  }
  return {
    rows,
    cols,
    mask: cfg.mask ? usable : null,
    shape: cfg.mask,
    difficulty: cfg.difficulty,
    hearts: cfg.hearts,
    fill: used / total,
    arrows,
  };
}

/**
 * Does a level meet the tier's size rules (fill, arrow count, lengths)?
 * @param {object} level
 * @param {object} cfg
 * @returns {boolean}
 */
export function meetsConstraints(level, cfg) {
  if (level.fill < MIN_FILL) return false;
  if (cfg.arrowsMin && level.arrows.length < cfg.arrowsMin) return false;
  if (cfg.arrowsMax && level.arrows.length > cfg.arrowsMax) return false;
  return level.arrows.every((a) => a.path.length >= MIN_LEN && a.path.length <= MAX_LEN);
}

/**
 * Does a measured level reach the tier's difficulty goals?
 * @param {import('./difficulty.js').DifficultyReport} report
 * @param {object|null} goals
 * @returns {boolean}
 */
export function meetsGoals(report, goals) {
  if (!report.solvable) return false;
  if (!goals) return true;
  return (
    report.startFree <= goals.maxStartFree && report.avgDepth >= goals.minAvgDepth && report.rounds >= goals.minRounds
  );
}

/**
 * Generate a verified level. Failed attempts retry with the next derived seed.
 * @param {object} cfg
 * @returns {object} level with seed and attempt
 */
export function generateFromConfig(cfg) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32(hashSeed(cfg.seed, attempt));
    const level = buildLevel(cfg, rng);
    if (!meetsConstraints(level, cfg)) continue;
    const report = analyzeLevel(level);
    if (!meetsGoals(report, cfg.goals)) continue;
    level.seed = cfg.seed;
    level.stats = { startFree: report.startFree, avgDepth: report.avgDepth, rounds: report.rounds };
    level.attempt = attempt;
    return level;
  }
  throw new Error(`Could not generate level for seed ${cfg.seed}`);
}

/**
 * Level n; always identical for the same n.
 * @param {number} n
 * @returns {object}
 */
export function generateLevel(n) {
  const level = generateFromConfig(getLevelConfig(n));
  level.number = n;
  return level;
}

/**
 * Daily challenge for a YYYYMMDD key.
 * @param {number} key
 * @returns {object}
 */
export function generateDaily(key) {
  const level = generateFromConfig(getDailyConfig(key));
  level.daily = key;
  return level;
}
