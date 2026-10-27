/**
 * Applies economy results to the shared game state. No DOM: screens read the returned summaries.
 */
import { MAX_REFILLS_PER_LEVEL, PRICES } from '../config.js';
import { claimAchievement } from './achievements.js';
import { chapterLevels, chapterOf, grant, isMaskLevel, levelReward, spend } from './economy.js';
import { recordWin, xpForWin } from './stats.js';
import { state } from './state.js';

/**
 * Current wallet as a plain object.
 * @returns {{coins: number, diamonds: number}}
 */
export function wallet() {
  return { coins: state.coins, diamonds: state.diamonds };
}

/** Store a wallet back into the state. */
function setWallet(w) {
  state.coins = w.coins;
  state.diamonds = w.diamonds;
}

/**
 * Pay for something. Coin spending is tracked for the Big Spender achievement.
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {{ok: boolean, missing?: {coins: number, diamonds: number}}}
 */
export function pay(price) {
  const res = spend(wallet(), price);
  if (!res.ok) return { ok: false, missing: res.missing };
  setWallet(res.wallet);
  state.stats = { ...state.stats, coinsSpent: state.stats.coinsSpent + (price.coins || 0) };
  return { ok: true };
}

/**
 * Credit currency from outside the level loop (achievements now; rewarded ads or purchases later).
 * @param {{coins?: number, diamonds?: number}} amount
 * @param {string} source see CURRENCY_SOURCES in economy.js
 */
export function credit(amount, source) {
  setWallet(grant(wallet(), amount, source));
}

/**
 * Record a level win: progress, perfect set, chapter bonus, currency, XP and stats.
 * @param {number} n level number
 * @param {string} difficulty
 * @param {number} heartsLeft
 * @param {number} maxHearts
 * @returns {{reward: ReturnType<typeof levelReward>, xp: number, before: {coins: number, diamonds: number}}}
 */
export function applyWin(n, difficulty, heartsLeft, maxHearts) {
  const p = state.progress;
  const before = wallet();
  const wasCompleted = p.completed.has(n);
  const wasPerfect = p.perfect.has(n);
  p.completed.add(n);
  const chapter = chapterOf(n);
  const reward = levelReward({
    level: n,
    difficulty,
    heartsLeft,
    maxHearts,
    wasCompleted,
    wasPerfect,
    chapterDone: chapterLevels(chapter).every((l) => p.completed.has(l)),
    chapterRewarded: p.chaptersRewarded.has(chapter),
  });
  if (reward.perfect) p.perfect.add(n);
  if (reward.chapter) p.chaptersRewarded.add(chapter);
  if (isMaskLevel(n)) p.masks.add(n);
  setWallet(grant(before, reward, 'level'));
  const xp = xpForWin(heartsLeft);
  state.xp += xp;
  state.stats = recordWin(state.stats, reward.perfect);
  return { reward, xp, before };
}

/**
 * Buy a heart back during a level (limited per attempt).
 * @returns {{ok: boolean, reason?: 'limit'|'full'|'funds', missing?: object}}
 */
export function refillHeart() {
  if (state.refillsUsed >= MAX_REFILLS_PER_LEVEL) return { ok: false, reason: 'limit' };
  if (state.hearts >= state.maxHearts) return { ok: false, reason: 'full' };
  const res = pay(PRICES.heartRefill);
  if (!res.ok) return { ok: false, reason: 'funds', missing: res.missing };
  state.refillsUsed++;
  state.hearts++;
  return { ok: true };
}

/**
 * Continue after game over with full hearts.
 * @returns {{ok: boolean, missing?: object}}
 */
export function buyContinue() {
  const res = pay(PRICES.continueGame);
  if (res.ok) state.hearts = state.maxHearts;
  return res;
}

/**
 * Skip a level: mark it complete (not perfect, no coins, no XP) and unlock the next one.
 * @param {number} n
 * @returns {{ok: boolean, missing?: object}}
 */
export function skipLevel(n) {
  const res = pay(PRICES.skipLevel);
  if (!res.ok) return res;
  const p = state.progress;
  p.completed.add(n);
  p.unlocked = Math.max(p.unlocked, n + 1);
  p.current = n + 1;
  return { ok: true };
}

/**
 * Buy hints with coins (single or pack).
 * @param {{coins: number, count?: number}} price
 * @returns {{ok: boolean, missing?: object}}
 */
export function buyHints(price) {
  const res = pay(price);
  if (res.ok) state.hints += price.count || 1;
  return res;
}

/**
 * Data the achievements are measured on.
 * @returns {import('./achievements.js').AchievementContext}
 */
export function achievementContext() {
  const p = state.progress;
  return { completed: p.completed, perfect: p.perfect, masks: p.masks, stats: state.stats };
}

/**
 * Claim a finished achievement and credit its diamonds.
 * @param {string} id
 * @returns {{ok: boolean, diamonds: number, reason?: string}}
 */
export function claim(id) {
  const res = claimAchievement(id, achievementContext(), state.claimed);
  if (!res.ok) return res;
  state.claimed = res.claimed;
  credit({ diamonds: res.diamonds }, 'achievement');
  return res;
}

/**
 * Buy a shop item (arrow style or accent theme) unless already owned.
 * @param {'styles'|'themes'} kind
 * @param {{id: string, price: object|null}} item
 * @returns {{ok: boolean, missing?: object}}
 */
export function buyItem(kind, item) {
  if (state.owned[kind].includes(item.id)) return { ok: true };
  const res = item.price ? pay(item.price) : { ok: true };
  if (!res.ok) return res;
  state.owned = { ...state.owned, [kind]: [...state.owned[kind], item.id] };
  return { ok: true };
}
