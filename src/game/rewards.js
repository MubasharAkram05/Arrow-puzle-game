/**
 * Applies economy results to the shared game state. No DOM: screens read the returned summaries.
 */
import { BOOSTERS, BOOSTER_PACK, MAX_REFILLS_PER_LEVEL, PRICES } from '../config.js';
import { addBoosters, useBooster } from './boosters.js';
import { achievementUnlocks, buyCosmetic, equipCosmetic, grantCosmetic } from './cosmetics.js';
import { claimAchievement } from './achievements.js';
import { isShapeLevel, shapeOf } from '../engine/index.js';
import { chapterLevels, chapterOf, grant, levelReward, spend } from './economy.js';
import { claimDaily, touchDaily } from './daily.js';
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
 * @param {number} [arrows] arrows on the board (size bonus)
 * @returns {{reward: ReturnType<typeof levelReward>, xp: number, before: {coins: number, diamonds: number}, newShape: string|null}}
 */
export function applyWin(n, difficulty, heartsLeft, maxHearts, arrows = 0) {
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
    assisted: state.levelBoost.assisted,
    arrows,
  });
  if (reward.perfect) p.perfect.add(n);
  if (reward.chapter) p.chaptersRewarded.add(chapter);
  let newShape = null;
  if (isShapeLevel(n)) {
    p.masks.add(n);
    // the shape joins the collection (the library is loaded: the level was just played)
    const id = shapeOf(n);
    if (!p.shapes.has(id)) newShape = id;
    p.shapes.add(id);
  }
  setWallet(grant(before, reward, 'level'));
  const xp = xpForWin(heartsLeft);
  state.xp += xp;
  state.stats = recordWin(state.stats, reward.perfect, {
    firstClear: !wasCompleted,
    assisted: state.levelBoost.assisted,
    heartsLeft,
  });
  return { reward, xp, before, newShape };
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
  return {
    completed: p.completed,
    perfect: p.perfect,
    masks: p.masks,
    unlocked: p.unlocked,
    stats: state.stats,
    dailyBest: state.daily.best,
  };
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
  for (const u of achievementUnlocks(id)) state.cosmetics = grantCosmetic(state.cosmetics, u.cat, u.id);
  return { ...res, unlocks: achievementUnlocks(id) };
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

/**
 * Buy one booster.
 * @param {string} id booster id
 * @returns {{ok: boolean, missing?: object}}
 */
export function buyBooster(id) {
  const res = pay(BOOSTERS[id].price);
  if (res.ok) state.boosters = addBoosters(state.boosters, { [id]: 1 });
  return res;
}

/**
 * Buy the booster pack.
 * @returns {{ok: boolean, missing?: object}}
 */
export function buyBoosterPack() {
  const res = pay(BOOSTER_PACK.price);
  if (res.ok) state.boosters = addBoosters(state.boosters, BOOSTER_PACK.contents);
  return res;
}

/**
 * Spend one booster in the current level and count it in stats.
 * @param {string} id
 * @returns {{ok: boolean, reason?: string}}
 */
export function spendBooster(id) {
  const res = useBooster(id, state.boosters, state.levelBoost);
  if (!res.ok) return res;
  state.boosters = res.inv;
  state.levelBoost = res.lvl;
  state.stats = { ...state.stats, boostersUsed: state.stats.boostersUsed + 1 };
  return { ok: true };
}

/** A hint was shown: the level is assisted and the hint is counted. */
export function noteHintUsed() {
  state.levelBoost = { ...state.levelBoost, assisted: true };
  state.stats = { ...state.stats, hintsUsed: state.stats.hintsUsed + 1 };
}

/**
 * Buy a cosmetic (optionally at a sale price) and track coins spent.
 * @param {string} cat
 * @param {string} id
 * @param {object} [price]
 * @returns {{ok: boolean, reason?: string, missing?: object}}
 */
export function buyCosmeticItem(cat, id, price) {
  const res = buyCosmetic(wallet(), state.cosmetics, cat, id, price);
  if (!res.ok) return res;
  const spent = state.coins - res.wallet.coins;
  setWallet(res.wallet);
  state.cosmetics = res.cos;
  state.stats = { ...state.stats, coinsSpent: state.stats.coinsSpent + spent };
  return { ok: true };
}

/**
 * Equip an owned cosmetic.
 * @param {string} cat
 * @param {string} id
 * @returns {boolean}
 */
export function equipCosmeticItem(cat, id) {
  const res = equipCosmetic(state.cosmetics, cat, id);
  if (res.ok) state.cosmetics = res.cos;
  return res.ok;
}

/**
 * The app was opened (or came back to the front): remember the time for the daily reward's clock checks.
 * @param {number} [now]
 */
export function noteDailyOpen(now = Date.now()) {
  state.daily = touchDaily(state.daily, now);
}

/**
 * Claim today's daily reward: coins, diamonds and hints go to the wallet.
 * @param {number} [now]
 * @returns {ReturnType<typeof claimDaily> & {before?: {coins: number, diamonds: number}}}
 */
export function claimDailyReward(now = Date.now()) {
  const res = claimDaily(state.daily, now);
  if (!res.ok) return res;
  const before = wallet();
  state.daily = res.rec;
  setWallet(grant(before, res.reward, 'daily'));
  state.hints += res.reward.hints || 0;
  return { ...res, before };
}
