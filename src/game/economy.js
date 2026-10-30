/**
 * Economy rules. Pure functions: no DOM, no storage, no shared state.
 * Wallets are plain objects { coins, diamonds } and are never mutated; functions return new ones.
 */
import { REWARDS } from '../config.js';
import { isPerfect } from './boosters.js';

/** @typedef {{coins: number, diamonds: number}} Wallet */
/** @typedef {{coins?: number, diamonds?: number}} Price */

/**
 * Chapter number (1-based) of a level.
 * @param {number} n
 * @returns {number}
 */
export function chapterOf(n) {
  return Math.ceil(n / REWARDS.chapterSize);
}

/**
 * Level numbers in a chapter.
 * @param {number} chapter
 * @returns {number[]}
 */
export function chapterLevels(chapter) {
  const first = (chapter - 1) * REWARDS.chapterSize + 1;
  return Array.from({ length: REWARDS.chapterSize }, (_, i) => first + i);
}

/**
 * Chapters to render first on the Levels page: a few around the current one (more load while scrolling,
 * up and down, with no end), so the page stays light with any number of unlocked levels.
 * @param {number} current chapter of the current level
 * @param {number} [radius] chapters before and after
 * @returns {[number, number]} first and last chapter, inclusive
 */
export function chapterWindow(current, radius = 2) {
  const c = Math.max(1, Math.floor(current) || 1);
  return [Math.max(1, c - radius), c + radius];
}

/**
 * Is level n a milestone (every 10th, worth a diamond on its first clear)?
 * @param {number} n
 * @returns {boolean}
 */
export function isMilestoneLevel(n) {
  return n % REWARDS.milestoneEvery === 0;
}

/**
 * @typedef {object} WinInfo
 * @property {number} level level number
 * @property {string} difficulty 'Normal' | 'Hard' | 'Super Hard'
 * @property {number} heartsLeft
 * @property {number} maxHearts
 * @property {boolean} wasCompleted level was already completed before this win (replay)
 * @property {boolean} wasPerfect level was already finished perfectly before
 * @property {boolean} chapterDone after this win every level of the chapter is completed
 * @property {boolean} chapterRewarded the chapter bonus was already paid
 * @property {boolean} [assisted] a booster or hint was used (the level can't be perfect)
 * @property {number} [arrows] arrows on the board (bigger boards pay more)
 */

/**
 * Coins and diamonds for a level win, with a line-by-line breakdown.
 * Coins: (base + hearts bonus + board size bonus) x difficulty, 25% of that on replays,
 * plus one-time perfect and chapter bonuses.
 * @param {WinInfo} win
 * @returns {{coins: number, diamonds: number, perfect: boolean, chapter: boolean, lines: {label: string, coins?: number, diamonds?: number}[]}}
 */
export function levelReward(win) {
  const lines = [];
  const perfect = isPerfect(win.heartsLeft, win.maxHearts, !!win.assisted);
  const mult = REWARDS.multiplier[win.difficulty] || 1;
  const base = REWARDS.baseCoins;
  const hearts = REWARDS.coinsPerHeart * Math.max(0, win.heartsLeft);
  const size = Math.floor(Math.max(0, win.arrows || 0) / REWARDS.arrowsPerSizeCoin);
  let earned = Math.round((base + hearts + size) * mult);
  lines.push({ label: 'Level complete', coins: base });
  if (hearts) lines.push({ label: `Hearts bonus (${win.heartsLeft})`, coins: hearts });
  if (size) lines.push({ label: `Board size (${win.arrows} arrows)`, coins: size });
  if (mult !== 1) lines.push({ label: `${win.difficulty} x${mult}`, coins: earned - base - hearts - size });
  if (win.wasCompleted) {
    const replay = Math.round(earned * REWARDS.replayRate);
    lines.push({ label: `Replay: 25% of ${earned}`, coins: replay - earned });
    earned = replay;
  }
  let coins = earned;
  let diamonds = 0;
  if (perfect && !win.wasPerfect) {
    // no heart lost and no hint or booster, first time on this level
    coins += REWARDS.perfectBonus;
    diamonds += REWARDS.perfectDiamonds;
    lines.push({ label: 'Perfect bonus', coins: REWARDS.perfectBonus });
    lines.push({ label: 'Perfect', diamonds: REWARDS.perfectDiamonds });
  }
  if (isMilestoneLevel(win.level) && !win.wasCompleted) {
    diamonds += REWARDS.milestoneDiamonds;
    lines.push({ label: `Level ${win.level} milestone`, diamonds: REWARDS.milestoneDiamonds });
  }
  const chapter = win.chapterDone && !win.chapterRewarded;
  if (chapter) {
    coins += REWARDS.chapterCoins;
    diamonds += REWARDS.chapterDiamonds;
    lines.push({
      label: `Chapter ${chapterOf(win.level)} complete`,
      coins: REWARDS.chapterCoins,
      diamonds: REWARDS.chapterDiamonds,
    });
  }
  return { coins, diamonds, perfect, chapter, lines };
}

/**
 * Can the wallet pay this price?
 * @param {Wallet} wallet
 * @param {Price} price
 * @returns {boolean}
 */
export function canAfford(wallet, price) {
  return wallet.coins >= (price.coins || 0) && wallet.diamonds >= (price.diamonds || 0);
}

/**
 * How much is missing to pay a price (0 when affordable).
 * @param {Wallet} wallet
 * @param {Price} price
 * @returns {{coins: number, diamonds: number}}
 */
export function shortfall(wallet, price) {
  return {
    coins: Math.max(0, (price.coins || 0) - wallet.coins),
    diamonds: Math.max(0, (price.diamonds || 0) - wallet.diamonds),
  };
}

/**
 * Pay a price.
 * @param {Wallet} wallet
 * @param {Price} price
 * @returns {{ok: true, wallet: Wallet} | {ok: false, wallet: Wallet, missing: {coins: number, diamonds: number}}}
 */
export function spend(wallet, price) {
  if (!canAfford(wallet, price)) return { ok: false, wallet, missing: shortfall(wallet, price) };
  return {
    ok: true,
    wallet: { coins: wallet.coins - (price.coins || 0), diamonds: wallet.diamonds - (price.diamonds || 0) },
  };
}

/** Allowed sources for currency entering the wallet. 'ad' and 'purchase' are reserved for later. */
export const CURRENCY_SOURCES = Object.freeze(['level', 'achievement', 'ad', 'purchase', 'gift', 'daily']);

/**
 * Add currency. This is the single entry point for currency from outside the game loop
 * (rewarded ads or in-app purchases later): validate the amount and the source, then credit.
 * @param {Wallet} wallet
 * @param {{coins?: number, diamonds?: number}} amount
 * @param {string} source one of CURRENCY_SOURCES
 * @returns {Wallet}
 */
export function grant(wallet, amount, source) {
  if (!CURRENCY_SOURCES.includes(source)) throw new Error(`Unknown currency source: ${source}`);
  const add = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return { coins: wallet.coins + add(amount.coins), diamonds: wallet.diamonds + add(amount.diamonds) };
}

/**
 * Short price label, e.g. "50 coins" or "2 diamonds".
 * @param {Price} price
 * @returns {string}
 */
export function priceLabel(price) {
  if (price.diamonds) return `${price.diamonds} diamond${price.diamonds === 1 ? '' : 's'}`;
  return `${price.coins || 0} coins`;
}
