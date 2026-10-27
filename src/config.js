/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Board cells stay compact like the reference: about 140px for tiny boards, at least this many px per cell. */
export const BASE_CELL_PX = 24;
/** Width a small board aims for (px), so 3x3 gets big cells and 8x8 stays at BASE_CELL_PX. */
export const SMALL_BOARD_PX = 140;
/** Arrow line width and head size in screen px (constant across board sizes, as in the reference). */
export const STROKE_PX = 4.2;
export const HEAD_W_PX = 15;
export const HEAD_L_PX = 14;
/** Hints given to a new player. */
export const START_HINTS = 3;
/** Earn one hint every N completed levels. */
export const HINT_EVERY = 3;
/** localStorage key for the save file. */
export const STORE_KEY = 'arrowEscape.save.v1';
/** Theme options. */
export const THEMES = Object.freeze(['light', 'dark', 'auto']);
/** Arrow style options shown in settings. */
export const STYLES = Object.freeze([
  { id: 'classic', name: 'Classic' },
  { id: 'slate', name: 'Dark Slate' },
  { id: 'olive', name: 'Olive' },
  { id: 'mint', name: 'Soft Mint' },
]);

/** Coin and diamond rewards. */
export const REWARDS = Object.freeze({
  baseCoins: 10, // every level win
  coinsPerHeart: 5, // per heart left at the end
  multiplier: Object.freeze({ Normal: 1, Hard: 1.5, 'Super Hard': 2 }),
  perfectBonus: 20, // no heart lost, first time per level
  replayRate: 0.25, // share of coins for a level already completed
  chapterSize: 20,
  chapterCoins: 100,
  chapterDiamonds: 2,
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
