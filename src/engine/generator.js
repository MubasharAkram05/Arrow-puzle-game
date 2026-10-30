import { DIRS } from './directions.js';
import { hashSeed, mulberry32, weightedPick } from './rng.js';
import { makeMask } from './masks.js';
import { absorbLeftovers, growArrow, pickLength } from './grow.js';
import { MAX_LEN, MIN_FILL, MIN_LEN, getLevelConfig } from './levels.js';
import { analyzeLevel } from './difficulty.js';
import { joinLongArrows } from './longArrows.js';

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
 * Each line is swept once from the far end per direction, so a pass costs O(cells), not O(cells x ray).
 */
function headCandidates(grid, cfg, rng) {
  const { rows, cols, free, owner, isFree, degree } = grid;
  const cands = [];
  for (let d = 0; d < 4; d++) {
    const { dr, dc } = DIRS[d];
    const lines = dc ? rows : cols;
    const len = dc ? cols : rows;
    for (let line = 0; line < lines; line++) {
      let blocked = false; // a free cell lies ahead
      let depth = 0; // taken cells ahead
      for (let k = 0; k < len; k++) {
        // walk against the direction, starting at the far edge the arrow would leave through
        const step = (dc || dr) > 0 ? len - 1 - k : k;
        const r = dc ? line : step;
        const c = dc ? step : line;
        const i = r * cols + c;
        if (free[i]) {
          if (!blocked && isFree(r - dr, c - dc)) {
            const score = degree(r, c) - depth * cfg.depthBias + rng() * 1.2;
            cands.push({ r, c, d, depth, score });
          }
          blocked = true;
        } else if (owner[i] !== -1) depth++;
      }
    }
  }
  return cands;
}

/** The three lowest-score candidates in order (a full sort per arrow is the slow part on big boards). */
function lowest3(cands) {
  const top = [];
  for (const k of cands) {
    if (top.length === 3 && k.score >= top[2].score) continue;
    let i = Math.min(top.length, 2);
    if (top.length < 3) top.push(k);
    else top[2] = k;
    while (i > 0 && top[i].score < top[i - 1].score) {
      [top[i], top[i - 1]] = [top[i - 1], top[i]];
      i--;
    }
  }
  return top;
}

/**
 * Build one candidate board with reverse peeling (not yet verified).
 * @param {object} cfg level config from getLevelConfig
 * @param {() => number} rng
 * @returns {object} level
 */
export function buildLevel(cfg, rng) {
  const { rows, cols } = cfg;
  const usable = makeMask(cfg.mask, rows, cols);
  const grid = createGrid(rows, cols, usable);
  const arrows = [];
  const total = usable.reduce((n, u) => n + u, 0);
  let startFree = 0;
  const g = cfg.goals;
  const freeLimit = g
    ? Math.max(g.maxStartFree, Math.ceil((g.maxStartFreeShare || 0) * (cfg.arrowsMin || 0)))
    : Infinity;
  for (;;) {
    const all = headCandidates(grid, cfg, rng);
    // a head with nothing in front stays free at the start: once the tier's limit is used up,
    // only take one when nothing else can be placed
    let cands = startFree >= freeLimit ? all.filter((k) => k.depth > 0) : all;
    if (!cands.length) {
      if (!all.length) break;
      cands = all;
    }
    const pick = lowest3(cands)[Math.floor(rng() * Math.min(3, cands.length))];
    if (!pick.depth) startFree++;
    const a = growArrow(
      grid,
      cfg,
      rng,
      arrows.length,
      pick,
      pick.d,
      pickLength(cfg, rng),
      weightedPick(rng, cfg.styles),
    );
    arrows.push(a);
  }
  absorbLeftovers(grid, cfg, arrows);
  const joined = joinLongArrows({ rows, cols, arrows }, cfg, rng);
  let used = 0;
  for (let i = 0; i < rows * cols; i++) if (grid.owner[i] !== -1) used++;
  return {
    rows,
    cols,
    mask: cfg.mask ? usable : null,
    shape: cfg.mask,
    difficulty: cfg.difficulty,
    hearts: cfg.hearts,
    fill: used / total,
    arrows: joined,
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
  const freeCap = Math.max(goals.maxStartFree, Math.ceil((goals.maxStartFreeShare || 0) * report.depths.length));
  return (
    report.startFree <= freeCap &&
    report.startFree >= (goals.minStartFree || 0) &&
    report.avgDepth >= goals.minAvgDepth &&
    report.rounds >= goals.minRounds
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
