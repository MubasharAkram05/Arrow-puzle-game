/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Board cells stay compact like the reference: about 140px for tiny boards, at least this many px per cell. */
export const BASE_CELL_PX = 24;
/** Width a small board aims for (px), so 3x3 gets big cells and 8x8 stays at BASE_CELL_PX. */
export const SMALL_BOARD_PX = 140;
/** Pinch zoom on big boards. */
export const ZOOM = Object.freeze({
  targetCellPx: 46, // zoom in until a cell is about a fingertip wide
  maxScale: 5,
  dragPx: 10, // movement that turns a tap into a drag
  doubleTapMs: 350, // double tap on empty space resets the zoom
  hintKey: 'arrowEscape:zoomHint',
  hintMinCols: 14, // only on dense boards
  hintTimes: 3, // "Pinch to zoom" shows on the first 3 big boards
  hintMs: 3500,
});
/** Arrow line width and head size in screen px (constant across board sizes, as in the reference). */
export const STROKE_PX = 4.2;
export const HEAD_W_PX = 15;
export const HEAD_L_PX = 14;
/**
 * Testing only: every level on the Levels page is playable. Progress is never changed by it
 * (wins on levels that aren't really unlocked pay nothing). Home shows a TEST MODE badge.
 * Set to false before release.
 */
export const TEST_UNLOCK_ALL = true;

/** Hints given to a new player. */
export const START_HINTS = 3;
/** Earn one hint every N completed levels. */
export const HINT_EVERY = 3;
/** Theme options. */
export const THEMES = Object.freeze(['light', 'dark', 'auto']);

/** Coin and diamond rewards. */
export const REWARDS = Object.freeze({
  baseCoins: 10, // every level win
  coinsPerHeart: 5, // per heart left at the end
  arrowsPerSizeCoin: 10, // board size bonus: +1 coin per 10 arrows
  multiplier: Object.freeze({ Normal: 1, Hard: 1.5, 'Super Hard': 2 }),
  perfectBonus: 20, // no heart lost, first time per level
  replayRate: 0.25, // share of coins for a level already completed
  chapterSize: 40,
  chapterCoins: 200,
  chapterDiamonds: 4,
  milestoneEvery: 10, // every 10th level...
  milestoneDiamonds: 1, // ...gives a diamond on its first clear
});

/** Prices. Each price is { coins } or { diamonds }. */
export const PRICES = Object.freeze({
  hint: Object.freeze({ coins: 50 }),
  hintPack: Object.freeze({ coins: 200, count: 5 }), // 5 hints for the price of 4
  heartRefill: Object.freeze({ coins: 80 }),
  continueGame: Object.freeze({ diamonds: 2 }),
  skipLevel: Object.freeze({ diamonds: 5 }),
});
/** Heart refills allowed per level attempt. */
export const MAX_REFILLS_PER_LEVEL = 2;

/** XP per level win and per heart left. */
export const XP = Object.freeze({ perLevel: 10, perHeart: 5 });

/** Shop items: arrow styles and accent themes. The first of each kind is free and owned from the start. */
export const SHOP_STYLES = Object.freeze([
  { id: 'classic', name: 'Classic', price: null },
  { id: 'slate', name: 'Dark Slate', price: { coins: 300 } },
  { id: 'olive', name: 'Olive', price: { coins: 300 } },
  { id: 'mint', name: 'Soft Mint', price: { diamonds: 5 } },
]);
export const SHOP_THEMES = Object.freeze([
  { id: 'blue', name: 'Ocean Blue', price: null, color: '#1877F2' },
  { id: 'purple', name: 'Royal Purple', price: { coins: 400 }, color: '#7C4DFF' },
  { id: 'teal', name: 'Lagoon Teal', price: { coins: 400 }, color: '#0E9F8E' },
  { id: 'coral', name: 'Sunset Coral', price: { diamonds: 8 }, color: '#F0574A' },
]);

/** In-level boosters: price for one. */
export const BOOSTERS = Object.freeze({
  shield: Object.freeze({ name: 'Shield', price: { coins: 60 }, desc: 'Your next wrong tap costs no heart' }),
  extraHeart: Object.freeze({ name: 'Extra Heart', price: { diamonds: 1 }, desc: 'Start the level with +1 heart' }),
});
/** Booster pack contents and price. */
export const BOOSTER_PACK = Object.freeze({
  name: 'Booster Pack',
  price: Object.freeze({ coins: 200 }),
  contents: Object.freeze({ shield: 4 }),
});

/**
 * Cosmetics by category. The first item of each category is the free default.
 * `achievement`: the item is also unlocked for free by claiming that achievement.
 */
export const COSMETICS = Object.freeze({
  effect: [
    { id: 'default', name: 'Classic Slide', price: null },
    { id: 'spark', name: 'Spark Trail', price: { coins: 250 } },
    { id: 'comet', name: 'Comet Glow', price: { coins: 400 } },
    { id: 'burst', name: 'Burst', price: { diamonds: 3 } },
    { id: 'rocket', name: 'Rocket Flame', price: { diamonds: 6 } },
  ],
  board: [
    { id: 'plain', name: 'Plain', price: null },
    { id: 'paper', name: 'Soft Paper', price: { coins: 200 } },
    { id: 'sky', name: 'Gradient Sky', price: { coins: 300 } },
    { id: 'chalk', name: 'Chalkboard', price: { diamonds: 4 } },
    { id: 'stars', name: 'Night Stars', price: { diamonds: 6 } },
  ],
  head: [
    { id: 'triangle', name: 'Triangle', price: null },
    { id: 'chevron', name: 'Chevron', price: { coins: 200 } },
    { id: 'round', name: 'Round', price: { coins: 250 } },
    { id: 'feather', name: 'Feather', price: { diamonds: 3 } },
  ],
  confetti: [
    { id: 'classic', name: 'Classic', price: null },
    { id: 'hearts', name: 'Hearts', price: { coins: 150 } },
    { id: 'coins', name: 'Coins', price: { coins: 200 } },
    { id: 'stars', name: 'Stars', price: { coins: 250 } },
  ],
  sound: [
    { id: 'soft', name: 'Soft', price: null },
    { id: 'retro', name: 'Retro 8-bit', price: { coins: 300 } },
    { id: 'nature', name: 'Nature', price: { diamonds: 3 } },
  ],
  avatar: [
    { id: 'p1', name: 'King', price: { diamonds: 2 } },
    { id: 'p2', name: 'Cool Cat', price: { diamonds: 2 } },
    { id: 'p3', name: 'Star Eyes', price: { diamonds: 2 } },
    { id: 'p4', name: 'Astronaut', price: { diamonds: 2 } },
    { id: 'p5', name: 'Wizard', price: { diamonds: 2 } },
    { id: 'p6', name: 'Ninja', price: { diamonds: 2 } },
  ],
  frame: [
    { id: 'none', name: 'No Frame', price: null },
    { id: 'silver', name: 'Silver', price: { coins: 500 }, achievement: 'perfectionist' },
    { id: 'gold', name: 'Gold', price: { coins: 1000 }, achievement: 'chapter-master' },
    { id: 'diamond', name: 'Diamond', price: { diamonds: 10 } },
  ],
});

/** Shop offers. */
export const OFFERS = Object.freeze({
  starterPack: Object.freeze({
    name: 'Starter Pack',
    minLevel: 5, // shown once this level is unlocked
    price: Object.freeze({ diamonds: 3 }),
    contents: Object.freeze({ hints: 5, boosters: { shield: 3 }, style: 'slate' }),
  }),
  freeGift: Object.freeze({ coins: 30, intervalMs: 4 * 60 * 60 * 1000 }),
  exchange: Object.freeze({ coins: 500, diamonds: 1, bulk: 5 }),
  weeklySale: Object.freeze({ discount: 0.3 }),
});

/**
 * Level generation. Every number that shapes a board lives here (src/engine/levels.js reads it).
 *
 * Tier goals (checked by the generator on every board, see analyzeLevel):
 *   maxStartFree / minStartFree  arrows that can leave on the very first move
 *   minAvgDepth                  mean number of arrows that must leave before each arrow
 *   minRounds                    solve rounds: removal waves needed when every free arrow leaves at once
 * size: board width = from + floor((n - firstLevel) / every), capped at max; rows = width + tall (+0-1).
 * arrows: allowed arrow count (shape boards too).
 */
const SHORT_ONLY = Object.freeze({
  short: { min: 2, max: 6 },
  medium: { min: 7, max: 12, share: 0 },
  long: { min: 13, max: 30, share: 0 },
});
/**
 * About 70% short, 20% medium and 10-15% long arrows.
 * medium.share: chance a normal arrow aims for 7-12 cells.
 * long.share: share of arrows turned into long ones (13-30 cells) by joining neighbours onto deep
 * arrows (src/engine/longArrows.js), so long arrows are blocked deep and leave late.
 */
const MIXED = Object.freeze({
  short: { min: 2, max: 6 },
  medium: { min: 7, max: 12, share: 0.4 },
  long: { min: 13, max: 30, share: 0.13 },
});
const BASE_STYLES = Object.freeze({ straight: 2, L: 3, U: 2, zigzag: 2, spiral: 1, snake: 2 });
/** Long arrows: straights across a row/column, U-turns, square spirals, combs and snakes. */
const LONG_STYLES = Object.freeze({ straight: 3, U: 2, spiral: 2, snake: 3, zigzag: 1 });

export const LEVELS = Object.freeze({
  minLen: 2,
  maxLen: 30,
  minFill: 0.9, // share of usable cells covered by arrows
  maxCols: 34,
  shapeEvery: 3, // every 3rd level is a shape board...
  shapeFrom: 4, // ...after the tutorial (6, 9, 12, ...)
  // shape boards are square and grow until the shape holds as many cells as the tier's plain board,
  // so small shapes (arrow, letters) still reach the tier's arrow count and difficulty floors
  maskAreaScale: 0.9,
  maskMaxCols: 52,
  // a shape's jagged edge (diagonal sides are staircases) lets more arrows out at the start, so shape
  // boards may start with the tier's cap + maskExtraFree free arrows, or maskFreeShare of all arrows if higher
  maskExtraFree: 12,
  maskFreeShare: 0.14,
  tiers: Object.freeze({
    tutorial: {
      difficulty: 'Normal',
      levels: [1, 3],
      size: { from: 5, every: 1, max: 7, tall: 1 },
      hearts: 3,
      depthBias: 0,
      arrows: [6, 15],
      goals: { minStartFree: 2, maxStartFree: 3, minAvgDepth: 0, minRounds: 2 },
      lengths: SHORT_ONLY,
      styles: { straight: 3, L: 3, U: 1 },
    },
    normal: {
      difficulty: 'Normal',
      levels: [4, 20],
      size: { from: 16, every: 3, max: 21, tall: 4 },
      arrows: [40, 80],
      hearts: 3,
      depthBias: 0.6,
      goals: { maxStartFree: 3, minAvgDepth: 9, minRounds: 12 },
      lengths: MIXED,
    },
    hard: {
      difficulty: 'Hard',
      levels: [21, 60],
      size: { from: 22, every: 8, max: 27, tall: 5 },
      arrows: [80, 140],
      hearts: 3,
      depthBias: 0.8,
      goals: { maxStartFree: 3, minAvgDepth: 20, minRounds: 20 },
      lengths: MIXED,
    },
    superHard: {
      difficulty: 'Super Hard',
      levels: [61, Infinity],
      size: { from: 30, every: 20, max: 34, tall: 8 },
      arrows: [140, Infinity],
      hearts: 3,
      depthBias: 1,
      goals: { maxStartFree: 2, minAvgDepth: 26, minRounds: 28 },
      lengths: MIXED,
    },
  }),
  styles: BASE_STYLES,
  longStyles: LONG_STYLES,
});
