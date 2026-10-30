import { hashSeed, mulberry32, weightedPick } from './rng.js';
import { makeMask } from './masks.js';
import { absorbLeftovers, growArrow, pickLength } from './grow.js';
import { LEVEL_ONE, MAX_LEN, MIN_FILL, MIN_LEN, getLevelConfig } from './levels.js';
import { analyzeLevel } from './difficulty.js';
import { joinLongArrows } from './longArrows.js';
import { bestHeads, createGrid } from './heads.js';
import { carveCorridor, hardenBoard, repairBoard } from './hardBoard.js';

const MAX_ATTEMPTS = 500;

/**
 * Build one candidate board with reverse peeling (not yet verified).
 * @param {object} cfg level config from getLevelConfig
 * @param {() => number} rng
 * @returns {object} level, or {rejected: true} when its first moves already miss the floors
 */
export function buildLevel(cfg, rng) {
  const { rows, cols } = cfg;
  const usable = makeMask(cfg.mask, rows, cols);
  // hard plain boards: one short empty corridor from an edge, so the first free arrow sits inside
  const corridor = cfg.deepen && !cfg.mask ? carveCorridor(rows, cols, rng) : null;
  const grid = createGrid(rows, cols, corridor ? usable.map((u, i) => (corridor.cells.includes(i) ? 0 : u)) : usable);
  grid.hidden = corridor ? corridor.head : -1;
  const arrows = [];
  const total = usable.reduce((n, u) => n + u, 0);
  let startFree = 0;
  const g = cfg.goals;
  // hard plain boards choose one free arrow on purpose (the corridor's end); others only appear where
  // nothing else fits and are joined, turned or dropped later
  const freeLimit = !g
    ? Infinity
    : cfg.deepen && !g.maxStartFreeShare
      ? 1
      : Math.max(g.maxStartFree, Math.ceil((g.maxStartFreeShare || 0) * (cfg.arrowsMin || 0)));
  for (;;) {
    const { any, deep } = bestHeads(grid, cfg, rng, startFree === 0 ? cfg.sidePenalty || 0 : 0);
    if (!any.length) break;
    // hard boards leave the last few pockets to neighbouring tails (or empty) instead of adding free
    // arrows there: no arrow's way out crosses a cell that is still free, so no arrow gets freed by it
    if (cfg.deepen && startFree >= freeLimit && !deep.length && grid.left <= (1 - MIN_FILL) * total * 0.5) break;
    // a head with nothing in front stays free at the start: once the tier's limit is used up,
    // only take one when nothing else can be placed
    const top3 = startFree >= freeLimit && deep.length ? deep : any;
    // pick at random among the best heads (only those close to the best one, when pickWindow is set)
    const cands = cfg.pickWindow === undefined ? top3 : top3.filter((k) => k.score <= top3[0].score + cfg.pickWindow);
    const pick = cands[Math.floor(rng() * cands.length)];
    if (!pick.depth) startFree++;
    grid.round[arrows.length] = pick.depth ? pick.top + 1 : 1;
    if (grid.round[arrows.length] > grid.maxRound) grid.maxRound = grid.round[arrows.length];
    // a free arrow starts straight, so hideFreeMoves can pull its head in from the edge
    const hide = !pick.depth && cfg.deepen;
    const a = growArrow(
      grid,
      cfg,
      rng,
      arrows.length,
      { r: pick.r, c: pick.c },
      pick.d,
      hide ? Math.max(4, pickLength(cfg, rng)) : pickLength(cfg, rng),
      hide ? 'straight' : weightedPick(rng, cfg.styles),
    );
    arrows.push(a);
  }
  absorbLeftovers(grid, cfg, arrows);
  let joined = joinLongArrows({ rows, cols, arrows }, { ...cfg, freeLimit }, rng);
  if (cfg.deepen) {
    const board = { rows, cols, mask: cfg.mask ? usable : null, arrows: joined };
    if (!hardenBoard(board, cfg, rng, total)) return { rejected: true };
    joined = board.arrows;
  }
  const used = joined.reduce((n, a) => n + a.path.length, 0);
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
    report.rounds <= (goals.maxRounds ?? Infinity) &&
    report.freePerRound <= (goals.maxFreePerRound ?? Infinity) &&
    report.longestChain >= (goals.minLongestChain || 0) &&
    report.decoyRatio >= (goals.minDecoyRatio || 0) &&
    report.edgeFreeRatio <= (goals.maxEdgeFreeRatio ?? Infinity)
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
    if (level.rejected || !meetsConstraints(level, cfg)) continue;
    let report = analyzeLevel(level);
    // a hard board just under a floor is repaired instead of thrown away
    if (cfg.deepen && !meetsGoals(report, cfg.goals)) report = repairBoard(level, report, cfg);
    if (!meetsConstraints(level, cfg) || !meetsGoals(report, cfg.goals)) continue;
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
