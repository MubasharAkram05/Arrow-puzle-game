/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Board cells stay compact like the reference: about 140px for tiny boards, at least this many px per cell. */
export const BASE_CELL_PX = 24;
/** Width a small board aims for (px), so 3x3 gets big cells and 8x8 stays at BASE_CELL_PX. */
export const SMALL_BOARD_PX = 140;
/** Arrow line width and head size in screen px (constant across board sizes, as in the reference). */
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
export const STROKE_PX = 4.2;
export const HEAD_W_PX = 15;
export const HEAD_L_PX = 14;
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
  multiplier: Object.freeze({ Normal: 1, Hard: 1.5, 'Super Hard': 2 }),
  perfectBonus: 20, // no heart lost, first time per level
  replayRate: 0.25, // share of coins for a level already completed
  chapterSize: 40,
  chapterCoins: 200,
  chapterDiamonds: 4,
  maskEvery: 10, // every 10th level is a mask level
  maskDiamonds: 1, // first clear of a mask level
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

/** In-level boosters: price for one, and their limits. */
export const BOOSTERS = Object.freeze({
  shield: Object.freeze({ name: 'Shield', price: { coins: 60 }, desc: 'Your next wrong tap costs no heart' }),
  reveal: Object.freeze({
    name: 'Reveal',
    price: { coins: 40 },
    desc: 'Shows every arrow that can escape',
    durationMs: 3000,
  }),
  autoClear: Object.freeze({
    name: 'Auto-Clear',
    price: { coins: 70 },
    desc: 'Removes one free arrow for you',
    maxPerLevel: 1,
  }),
  extraHeart: Object.freeze({ name: 'Extra Heart', price: { diamonds: 1 }, desc: 'Start the level with +1 heart' }),
});
/** Booster pack contents and price. */
export const BOOSTER_PACK = Object.freeze({
  name: 'Booster Pack',
  price: Object.freeze({ coins: 350 }),
  contents: Object.freeze({ shield: 3, reveal: 3, autoClear: 2 }),
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
    contents: Object.freeze({ hints: 5, boosters: { shield: 3, reveal: 3 }, style: 'slate' }),
  }),
  freeGift: Object.freeze({ coins: 30, intervalMs: 4 * 60 * 60 * 1000 }),
  exchange: Object.freeze({ coins: 500, diamonds: 1, bulk: 5 }),
  weeklySale: Object.freeze({ discount: 0.3 }),
});
