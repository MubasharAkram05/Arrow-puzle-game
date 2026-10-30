import { DIRS } from './directions.js';
import { buildOccupancy, rayArrows } from './board.js';
import { MAX_LEN, MIN_FILL } from './levels.js';
import { onRing } from './metrics.js';
import { deepenDepth, deepenLevel, roundsOf } from './deepen.js';
import { analyzeLevel } from './difficulty.js';
import { hideFreeMoves } from './firstMoves.js';
import { joinLate, makeDecoys } from './reshape.js';

/**
 * Hard boards (from level 4): after reverse peeling, a few passes make the structure harder without
 * changing the board's size (see README "Difficulty").
 */

/**
 * A straight run of 1-2 cells in from the middle part of one edge, left empty. The cell behind it becomes a
 * free head that is not on the outer ring. No arrow's way out can rely on these cells (they are never
 * taken), so emptying them frees nothing.
 * @returns {{cells: number[], head: number}}
 */
export function carveCorridor(rows, cols, rng) {
  const d = Math.floor(rng() * 4);
  const { dr, dc } = DIRS[d];
  const lines = dc ? rows : cols;
  const len = dc ? cols : rows;
  const line = 3 + Math.floor(rng() * (lines - 6));
  const L = rng() < 0.5 ? 1 : 2;
  // k-th cell counted from the edge the head points to
  const at = (k) => {
    const step = (dc || dr) > 0 ? len - 1 - k : k;
    return dc ? line * cols + step : step * cols + line;
  };
  return { cells: Array.from({ length: L }, (_, k) => at(k)), head: at(L) };
}

/** Do a board's free arrows meet the start-free and edge floors? */
function firstMovesOk(board, goals) {
  const occ = buildOccupancy(board);
  const free = board.arrows.filter((a) => !rayArrows(occ, board, a).length);
  const ring = free.filter((a) => onRing(board, a.path[0].r, a.path[0].c)).length;
  return free.length <= goals.maxStartFree && ring <= (goals.maxEdgeFreeRatio ?? 1) * free.length;
}

/** Remove arrows that a pass emptied and number the rest again. */
function compact(board) {
  board.arrows = board.arrows.filter((a) => a.path.length);
  board.arrows.forEach((a, i) => (a.id = i));
}

/**
 * Run the hard-board passes on a built board: hide the first moves, deepen, join late walls, deepen again,
 * then cut decoys. Mutates board.arrows.
 * @param {{rows: number, cols: number, mask: number[]|null, arrows: object[]}} board
 * @param {object} cfg level config (cfg.goals, cfg.deepen, cfg.arrowsMin)
 * @param {() => number} rng
 * @param {number} total usable cells
 * @returns {boolean} false when the first moves already miss the floors (the attempt is thrown away)
 */
export function hardenBoard(board, cfg, rng, total) {
  const g = cfg.goals;
  // spare cells above the fill floor, shared by the passes that empty cells
  const spare = () => Math.floor(board.arrows.reduce((n, a) => n + a.path.length, 0) - MIN_FILL * total);
  hideFreeMoves(board, rng, g ? g.maxStartFree : Infinity, Math.floor(spare() / 2), g?.maxEdgeFreeRatio ?? 1);
  compact(board);
  // the first moves are settled now (later passes never free an arrow): give up early if they miss
  if (g && !g.maxStartFreeShare && !firstMovesOk(board, g)) return false;
  deepenLevel(board, cfg.deepen);
  // join just enough arrows to keep the free arrows per round under the floor (joins never lower the
  // solve rounds, but every join lowers the average depth a little). Each pass opens new tails.
  const occ = buildOccupancy(board);
  const rounds = Math.max(...roundsOf(board.arrows.map((a) => rayArrows(occ, board, a))));
  const min = cfg.arrowsMin || 0;
  const keep = Math.floor(rounds * (g?.maxFreePerRound ?? Infinity) * (cfg.deepen.joinMargin ?? 0.95));
  let joins = board.arrows.length - Math.max(min + 2, keep);
  for (let pass = 0; pass < 4 && joins > 0; pass++) {
    const done = joinLate(board, joins, MAX_LEN);
    compact(board);
    if (!done) break;
    joins -= done;
  }
  deepenLevel(board, cfg.deepen);
  makeDecoys(board, Math.floor(spare() * (cfg.deepen.decoyCells ?? 0)), {
    maxCut: cfg.deepen.maxCut,
    // a few more decoys than the floor asks for, then stop (each cut costs some depth)
    want: g?.minDecoyRatio ? Math.ceil((g.minDecoyRatio + 0.03) * board.arrows.length) : Infinity,
  });
  return true;
}

/**
 * Repair a built board that only has a few too many free arrows per round: join more short arrows onto
 * late ones (see joinLate), down to the level's minimum arrow count, then deepen. Mutates level.arrows.
 * @param {{rows: number, cols: number, arrows: object[]}} level
 * @param {number} rounds solve rounds of the board
 * @param {number} maxFreePerRound
 * @param {number} arrowsMin
 * @returns {boolean} true when any arrow was joined
 */
function repairFreePerRound(level, rounds, maxFreePerRound, arrowsMin) {
  let joins = level.arrows.length - Math.max(arrowsMin, Math.floor(rounds * maxFreePerRound * 0.9));
  let any = false;
  for (let pass = 0; pass < 4 && joins > 0; pass++) {
    const done = joinLate(level, joins, MAX_LEN);
    compact(level);
    if (!done) break;
    any = true;
    joins -= done;
  }
  // the joins open new turns that make arrows leave later
  if (any) deepenLevel(level, { passes: 2 });
  return any;
}

/**
 * Repair a built board with a few too few decoys: cut more tails (see makeDecoys) within the cells the
 * fill floor leaves spare. Mutates level.arrows (and level.fill).
 * @param {{rows: number, cols: number, arrows: object[], fill: number}} level
 * @param {number} minDecoyRatio
 * @param {number} maxCut
 * @returns {boolean} true when any cell was cut
 */
function repairDecoys(level, minDecoyRatio, maxCut) {
  const used = level.arrows.reduce((n, a) => n + a.path.length, 0);
  const total = used / level.fill;
  const cut = makeDecoys(level, Math.floor(used - MIN_FILL * total), {
    maxCut,
    want: Math.ceil((minDecoyRatio + 0.02) * level.arrows.length),
  });
  level.fill = (used - cut) / total;
  return cut > 0;
}

/**
 * Repair a built hard board that misses its depth, free-per-round or decoy floor by a little.
 * @param {object} level built level (mutated)
 * @param {import('./difficulty.js').DifficultyReport} report its analysis
 * @param {object} cfg level config
 * @returns {import('./difficulty.js').DifficultyReport} the analysis after the repairs
 */
export function repairBoard(level, report, cfg) {
  const g = cfg.goals;
  if (report.avgDepth < g.minAvgDepth && deepenDepth(level, g.minAvgDepth * level.arrows.length))
    report = analyzeLevel(level);
  if (
    report.freePerRound > g.maxFreePerRound &&
    repairFreePerRound(level, report.rounds, g.maxFreePerRound, cfg.arrowsMin)
  )
    report = analyzeLevel(level);
  if (report.decoyRatio < g.minDecoyRatio && repairDecoys(level, g.minDecoyRatio, cfg.deepen.maxCut))
    report = analyzeLevel(level);
  return report;
}
