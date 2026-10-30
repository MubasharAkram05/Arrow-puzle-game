import { DIRS } from './directions.js';
import { hashSeed, mulberry32, weightedPick } from './rng.js';
import { makeMask } from './masks.js';
import { absorbLeftovers, growArrow, pickLength } from './grow.js';
import { LEVEL_ONE, MAX_LEN, MIN_FILL, MIN_LEN, getLevelConfig } from './levels.js';
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
  // lines whose first free cell may have moved (see bestHeads)
  const dirtyRows = new Uint8Array(rows).fill(1);
  const dirtyCols = new Uint8Array(cols).fill(1);
  const take = (r, c, id) => {
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
  return { rows, cols, free, owner, inB, isFree, degree, take, skip, first, ahead, dirtyRows, dirtyCols };
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

/** Re-scan one line: its first free cell from the far edge and the taken cells in front of it. */
function scanLine(grid, d, line) {
  const { cols, rows, free, owner, skip, first, ahead } = grid;
  const { dr, dc } = DIRS[d];
  const len = dc ? cols : rows;
  let depth = 0;
  // cells outside a shape at the start of the line can never matter: skip them
  for (let k = skip[d][line]; k < len; k++) {
    // walk against the direction, starting at the far edge the arrow would leave through
    const step = (dc || dr) > 0 ? len - 1 - k : k;
    const i = dc ? line * cols + step : step * cols + line;
    if (free[i]) {
      first[d][line] = step;
      ahead[d][line] = depth;
      return;
    }
    if (owner[i] !== -1) depth++;
  }
  first[d][line] = -1;
}

/**
 * Best heads for the next arrow. Every free cell whose way out only crosses taken or unused cells can
 * be a head (reverse peeling: such an arrow is only blocked by arrows placed before it). Only the first
 * free cell of a line can qualify (every cell behind it has a free cell ahead), so each line keeps that
 * cell cached and is re-scanned only after a cell in it was taken.
 * @returns {{any: object[], deep: object[]}} three best heads overall, and three best with arrows in front
 */
function bestHeads(grid, cfg, rng) {
  const { rows, cols, isFree, degree, first, ahead, dirtyRows, dirtyCols } = grid;
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
      const cand = { r, c, d, depth, score: degree(r, c) - depth * cfg.depthBias + rng() * 1.2 };
      keep3(any, cand);
      if (depth) keep3(deep, cand);
    }
  }
  return { any, deep };
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
    const { any, deep } = bestHeads(grid, cfg, rng);
    if (!any.length) break;
    // a head with nothing in front stays free at the start: once the tier's limit is used up,
    // only take one when nothing else can be placed
    const cands = startFree >= freeLimit && deep.length ? deep : any;
    const pick = cands[Math.floor(rng() * cands.length)];
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
  const joined = joinLongArrows({ rows, cols, arrows }, { ...cfg, freeLimit }, rng);
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
    report.rounds >= goals.minRounds &&
    report.rounds <= (goals.maxRounds ?? Infinity)
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

/** Level 1, drawn by hand (three straight arrows), in the same shape as a generated level. */
function levelOne() {
  const level = {
    rows: LEVEL_ONE.rows,
    cols: LEVEL_ONE.cols,
    mask: null,
    shape: null,
    difficulty: 'Normal',
    hearts: 3,
    fill: 1,
    arrows: LEVEL_ONE.arrows.map((a) => ({ id: a.id, dir: a.dir, path: a.path.map((p) => ({ ...p })) })),
    seed: 1,
    attempt: 0,
    number: 1,
  };
  const r = analyzeLevel(level);
  level.stats = { startFree: r.startFree, avgDepth: r.avgDepth, rounds: r.rounds };
  return level;
}

/**
 * Level n; always identical for the same n.
 * @param {number} n
 * @returns {object}
 */
export function generateLevel(n) {
  if (n === 1) return levelOne();
  const level = generateFromConfig(getLevelConfig(n));
  level.number = n;
  return level;
}
