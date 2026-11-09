/**
 * Weekly Quests on the shared game state (rules: quests.js). Counting, claiming quests and opening chests.
 */
import { grant } from './economy.js';
import { addProgress, claimQuest, openChest, rollWeek } from './quests.js';
import { state } from './state.js';

/**
 * Count quest progress now (the record moves to the current week first).
 * @param {Partial<Record<string, number|boolean>>} deltas counter -> amount
 * @param {number} [now]
 */
export function questEvent(deltas, now = Date.now()) {
  const d = Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, typeof v === 'boolean' ? Number(v) : v]));
  state.quests = addProgress(state.quests, now, d);
}

/**
 * Bring the record to the current week (call before showing the Quests screen or its dot).
 * @param {number} [now]
 * @returns {boolean} true when a new week started (last week's unclaimed quests and chests are gone)
 */
export function syncQuests(now = Date.now()) {
  const { rec, reset } = rollWeek(state.quests, now);
  state.quests = rec;
  return reset;
}

/**
 * Claim a finished quest.
 * @param {string} id
 * @param {number} [now]
 * @returns {ReturnType<typeof claimQuest>}
 */
export function claimQuestPoints(id, now = Date.now()) {
  const res = claimQuest(state.quests, now, id);
  state.quests = res.rec;
  return res;
}

/**
 * Open a chest: its coins, diamonds and hints go to the wallet.
 * @param {number} at threshold
 * @param {number} [now]
 * @returns {ReturnType<typeof openChest> & {before?: {coins: number, diamonds: number}}}
 */
export function openQuestChest(at, now = Date.now()) {
  const res = openChest(state.quests, now, at);
  state.quests = res.rec;
  if (!res.ok) return res;
  const before = { coins: state.coins, diamonds: state.diamonds };
  const w = grant(before, res.reward, 'quest');
  state.coins = w.coins;
  state.diamonds = w.diamonds;
  state.hints += res.reward.hints || 0;
  return { ...res, before };
}
