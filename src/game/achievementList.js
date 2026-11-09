/**
 * The Achievements list on the Profile tab: one row per achievement group, showing only its current step.
 * Pure. Order: ready to claim first, then in progress, then completed (every step claimed); inside each
 * block the groups keep their config order.
 */
import { ACHIEVEMENT_DEFS } from '../config.js';
import { visibleAchievements } from './achievements.js';

/**
 * @typedef {{id: string, group: string, title: string, desc: string, icon: string, value: number, goal: number,
 *   step: number, steps: number, reward: number, state: 'ready'|'progress'|'done'}} AchievementRow
 */

const ORDER = { ready: 0, progress: 1, done: 2 };

/**
 * Sort rows: ready, then in progress, then done; stable inside each block.
 * @param {AchievementRow[]} rows
 * @returns {AchievementRow[]}
 */
export function sortRows(rows) {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => ORDER[a.r.state] - ORDER[b.r.state] || a.i - b.i)
    .map((x) => x.r);
}

/**
 * Rows for the list.
 * @param {import('./achievements.js').AchievementContext} ctx
 * @param {Set<string>} claimed
 * @returns {AchievementRow[]}
 */
export function achievementRows(ctx, claimed) {
  const titles = new Map(ACHIEVEMENT_DEFS.map((g) => [g.id, g.title]));
  const rows = visibleAchievements(ctx, claimed).map((a) => ({
    id: a.def.id,
    group: a.def.group,
    title: titles.get(a.def.group),
    desc: a.def.desc,
    icon: a.def.icon,
    value: a.value,
    goal: a.def.goal,
    step: a.def.step,
    steps: a.def.steps,
    reward: a.def.reward,
    state: a.claimed ? 'done' : a.claimable ? 'ready' : 'progress',
  }));
  return sortRows(rows);
}

/**
 * How many rows are ready to claim (for the Profile tab's red dot).
 * @param {AchievementRow[]} rows
 * @returns {number}
 */
export const readyCount = (rows) => rows.filter((r) => r.state === 'ready').length;

/** What is left to do per group: [singular, plural], {n} is the remaining count. */
const LEFT = {
  'first-escape': ['Finish level 1', 'Finish level 1'],
  perfectionist: ['Finish {n} more level without losing a heart', 'Finish {n} more levels without losing a heart'],
  'chapter-master': ['Finish {n} more level of chapter 1', 'Finish {n} more levels of chapter 1'],
  'arrow-hunter': ['Clear {n} more arrow', 'Clear {n} more arrows'],
  'no-mistakes': [
    'Finish {n} more level in a row without losing a heart',
    'Finish {n} more levels in a row without losing a heart',
  ],
  'shape-solver': ['Finish {n} more shape level', 'Finish {n} more shape levels'],
  'big-spender': ['Spend {n} more coin', 'Spend {n} more coins'],
  'level-climber': ['Finish {n} more level', 'Finish {n} more levels'],
  'brain-power': ['Complete {n} more level with no hint', 'Complete {n} more levels with no hint'],
  comeback: ['Win {n} more level with 1 heart left', 'Win {n} more levels with 1 heart left'],
  'daily-player': ['Keep your daily streak {n} more day', 'Keep your daily streak {n} more days'],
  'hard-worker': ['Finish {n} more Hard+ level', 'Finish {n} more Hard+ levels'],
};

/**
 * Toast for a tap on a Claim button that is not ready yet, from the remaining progress.
 * @param {AchievementRow} row
 * @returns {string} e.g. "Finish 5 more levels first"
 */
export function notReadyText(row) {
  const n = Math.max(1, row.goal - row.value);
  const [one, many] = LEFT[row.group] ?? ['{n} more to go', '{n} more to go'];
  return `${(n === 1 ? one : many).replace('{n}', n.toLocaleString('en-US'))} first`;
}
