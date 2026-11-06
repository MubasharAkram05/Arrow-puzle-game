import { hashSeed, mulberry32, randInt, weightedPick } from './rng.js';
import { makeMask } from './masks.js';
import { absorbLeftovers, growArrow, pickLength } from './grow.js';
import { LEVEL_ONE, MAX_LEN, MIN_FILL, MIN_LEN, getLevelConfig, shapeOf } from './levels.js';
import { analyzeLevel } from './difficulty.js';
import { joinLongArrows } from './longArrows.js';
import { bestHeads, createGrid } from './heads.js';
import { carveCorridor, hardenBoard, repairBoard } from './hardBoard.js';

const MAX_ATTEMPTS = 500;

/**
 * Target length and style of the next arrow. A free arrow on a hard board starts straight (hideFreeMoves can
 * then pull its head in from the edge); a straight arrow is at least 4 cells long.
 * @returns {[number, string]}
 */
function shapeFor(cfg, rng, hide, deep, done = 0.5) {
  // from level 4: some blocked arrows start long (snakes, spirals, U-turns). They are blocked, so they leave
  // late: walls around the arrows placed after them. Snake boards (3.18.0) draw them more often as the board
  // fills (same chance on average), so long arrows leave later than average
  const long = cfg.lengths.long;
  const chance = cfg.snake ? cfg.arrowShape.nativeLong * (0.2 + 1.6 * done) : cfg.arrowShape?.nativeLong;
  if (cfg.shapeRules && deep && rng() < chance)
    return [randInt(rng, long.min, long.max), weightedPick(rng, cfg.longStyles)];
  // length first, then style: the same random draws as before 3.17.0 (the tutorial stays identical)
  const len = pickLength(cfg, rng);
  const style = hide ? 'straight' : weightedPick(rng, cfg.styles);
  // a hidden first move may lose 2 head cells later (hideFreeMoves): start it at 6 so it keeps 4
  return [style === 'straight' && cfg.shapeRules ? Math.max(hide ? 6 : 4, len) : len, style];
}

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
    if (
      cfg.deepen &&
      startFree >= freeLimit &&
      !deep.length &&
      grid.left <= (1 - (cfg.minFill ?? MIN_FILL)) * total * 0.5
    )
      break;
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
      ...shapeFor(cfg, rng, hide, pick.depth > 0, 1 - grid.left / total),
    );
    arrows.push(a);
    grid.dirOf[a.id] = a.dir;
    grid.dirCount[a.dir]++;
    grid.headDir[pick.r * cols + pick.c] = a.dir;
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
  if (level.fill < (cfg.minFill ?? MIN_FILL)) return false;
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
    report.edgeFreeRatio <= (goals.maxEdgeFreeRatio ?? Infinity) &&
    // arrow shapes and blocking (3.17.0)
    (goals.minBlockersAhead === undefined || report.blockersAhead >= goals.minBlockersAhead) &&
    (goals.minBlockedShare === undefined || report.blockedShare >= goals.minBlockedShare) &&
    (goals.maxStraightShare === undefined || report.straightShare <= goals.maxStraightShare) &&
    (goals.maxShortShare === undefined || report.shortShare <= goals.maxShortShare) &&
    (goals.maxStraightStubs === undefined || report.straightStubs <= goals.maxStraightStubs) &&
    // snake arrows (3.18.0)
    (goals.minAvgTurns === undefined || report.avgTurns >= goals.minAvgTurns) &&
    (goals.minHugRatio === undefined || report.hugRatio >= goals.minHugRatio)
  );
}

/**
 * How far a report is over the direction mix targets (3.19.0): 0 when it meets them, else the overshoot of
 * sameDirBlock and queueMoves, each as a share of its target.
 * @param {import('./difficulty.js').DifficultyReport} report
 * @param {{maxSameDirBlock: number, maxQueueMoves: number}|null|undefined} dirGoals
 * @returns {number}
 */
export function dirExcess(report, dirGoals) {
  if (!dirGoals) return 0;
  const over = (v, max) => Math.max(0, v - max) / max;
  return over(report.sameDirBlock, dirGoals.maxSameDirBlock) + over(report.queueMoves, dirGoals.maxQueueMoves);
}

/** The floors a floor fallback may relax, and which way each one is checked. */
const RELAXABLE = { maxFreePerRound: 1, minDecoyRatio: -1, minLongestChain: -1 };
const REPORT_KEY = { maxFreePerRound: 'freePerRound', minDecoyRatio: 'decoyRatio', minLongestChain: 'longestChain' };

/**
 * Goals with some floors relaxed by a floor fallback's slack (only floors of RELAXABLE; depth and solve
 * rounds never change).
 * @param {object} goals
 * @param {object} fb floorFallback ({maxFreePerRound, minDecoyRatio, minLongestChain} slacks)
 * @param {string[]} [keys] floors to relax (default: all of RELAXABLE)
 * @returns {object}
 */
export function relaxGoals(goals, fb, keys = Object.keys(RELAXABLE)) {
  const out = { ...goals };
  for (const k of keys) if (RELAXABLE[k] && fb[k] && out[k] !== undefined) out[k] += RELAXABLE[k] * fb[k];
  return out;
}

/** Floors (of RELAXABLE) a report misses on the strict goals. */
function missedFloors(report, goals) {
  return Object.keys(RELAXABLE).filter((k) => {
    const v = report[REPORT_KEY[k]];
    return RELAXABLE[k] > 0 ? v > (goals[k] ?? Infinity) : v < (goals[k] || 0);
  });
}

/**
 * Generate a verified level. Failed attempts retry with the next derived seed. With cfg.floorFallback
 * (Expert), once floorFallback.after attempts are done, the best attempt that met every floor except a
 * few of RELAXABLE, each missed by at most its slack, is used: fewest missed floors, then fewest free
 * arrows per round. It is count-based, so still deterministic; level.relaxed names the floors it missed.
 * @param {object} cfg
 * @returns {object} level with seed and attempt
 */
export function generateFromConfig(cfg, maxAttempts = MAX_ATTEMPTS) {
  const fb = cfg.goals && cfg.floorFallback;
  const relaxed = fb ? relaxGoals(cfg.goals, fb) : null;
  let best = null;
  const aim = cfg.goals && cfg.depthAim ? cfg.goals.minAvgDepth * cfg.depthAim : 0;
  // boards that meet every floor are compared: closest to the direction mix targets first, then deepest
  let pick = null;
  let passed = 0;
  const picks = Math.max(cfg.depthPicks || 1, cfg.dirGoals ? cfg.dirPicks || 1 : 1);
  const better = (r, than) => {
    const [a, b] = [dirExcess(r, cfg.dirGoals), dirExcess(than, cfg.dirGoals)];
    return a !== b ? a < b : r.avgDepth > than.avgDepth;
  };
  const done = (level, report, attempt) => {
    level.seed = cfg.seed;
    level.stats = { startFree: report.startFree, avgDepth: report.avgDepth, rounds: report.rounds };
    level.attempt = attempt;
    return level;
  };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = mulberry32(hashSeed(cfg.seed, attempt));
    const level = buildLevel(cfg, rng);
    if (level.rejected || !meetsConstraints(level, cfg)) continue;
    let report = analyzeLevel(level);
    // a hard board just under a floor is repaired instead of thrown away
    if (cfg.deepen && !meetsGoals(report, cfg.goals)) report = repairBoard(level, report, cfg);
    if (!meetsConstraints(level, cfg)) continue;
    if (meetsGoals(report, cfg.goals)) {
      // a board that meets every floor but is shallower than the depth aim (Normal, Hard) or over the
      // direction mix targets (3.19.0) is kept and the next attempts are tried too: the first one at both
      // wins, else the best of `picks` boards (closest to the direction targets, then deepest)
      if ((!aim || report.avgDepth >= aim) && !dirExcess(report, cfg.dirGoals)) return done(level, report, attempt);
      if (!pick || better(report, pick.report)) pick = { level, report, attempt };
      // without a depth aim the extra boards stop at attempt `picks` (a level that needed many attempts for
      // its floors pays nothing more for the direction targets)
      if (++passed >= picks || (!aim && attempt + 1 >= picks)) return done(pick.level, pick.report, pick.attempt);
      continue;
    }
    if (relaxed && meetsGoals(report, relaxed)) {
      const missed = missedFloors(report, cfg.goals);
      const better =
        !best ||
        missed.length < best.missed.length ||
        (missed.length === best.missed.length && report.freePerRound < best.report.freePerRound);
      if (better) best = { level, report, attempt, missed };
    }
    // a board that met every floor is kept once `picks` attempts are done (failed attempts count too)
    if (pick && !aim && attempt + 1 >= picks) return done(pick.level, pick.report, pick.attempt);
    // a board that met every floor (only short of the aims above) beats one that missed a floor
    if (pick && fb && attempt + 1 >= fb.after) return done(pick.level, pick.report, pick.attempt);
    if (best && attempt + 1 >= fb.after) {
      best.level.relaxed = best.missed;
      return done(best.level, best.report, best.attempt);
    }
  }
  if (pick) return done(pick.level, pick.report, pick.attempt);
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
  const level = shapeFallbacks(n).reduce((found, [shape, grow, tries]) => {
    if (found) return found;
    try {
      const lv = generateFromConfig(getLevelConfig(n, shape, grow), tries);
      if (shape) console.warn(`Level ${n}: shape ${shapeOf(n)} missed its floors, used ${shape} +${grow}`);
      return lv;
    } catch {
      return null;
    }
  }, null);
  if (!level) throw new Error(`Could not generate level ${n}`);
  level.number = n;
  return level;
}

/**
 * What generateLevel tries, in order: the level's own board; for a shape level that keeps missing its
 * floors, the same shape on two bigger boards, then the next shapes of its cycle. Never a plain board.
 * @param {number} n
 * @returns {[string|undefined, number, number][]} [shape (undefined = the level's own), extra cells, attempts]
 */
function shapeFallbacks(n) {
  const own = shapeOf(n);
  if (!own) return [[undefined, 0, MAX_ATTEMPTS]];
  return [[undefined, 0, 80], [own, 4, 40], [own, 8, 40], ...[1, 2, 3].map((i) => [shapeOf(n + i), 0, 80])];
}
