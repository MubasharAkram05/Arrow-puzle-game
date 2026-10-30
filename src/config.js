/** SVG units per grid cell. */
export const CELL = 100;
/** Fallback hit radius around lines, in cells (used when no cell is hit exactly). */
export const HIT_FALLBACK = 0.3;
/** Board cells stay compact like the reference: about 140px for tiny boards, at least this many px per cell. */
export const BASE_CELL_PX = 30;
/** Width a small board aims for (px), so 3x3 gets big cells and 8x8 stays at BASE_CELL_PX. */
export const SMALL_BOARD_PX = 140;
/** Pinch zoom on big boards. */
export const ZOOM = Object.freeze({
  targetCellPx: 46, // zoom in until a cell is about a fingertip wide
  zoomBelowPx: 18, // a level starts zoomed in only when fitted cells would be smaller than this...
  startCellPx: 22, // ...and then opens so a cell is about this wide
  maxScale: 6,
  dragPx: 10, // movement that turns a tap into a drag
  doubleTapMs: 350, // double tap on empty space resets the zoom
  guideKey: 'arrowEscape:zoomGuide',
  guideTimes: 3, // the zoom guide shows on the first 3 zoomed levels, then only until the first pinch
  guideMs: 3000,
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
  multiplier: Object.freeze({ Normal: 1, Hard: 1.5, 'Super Hard': 2, Expert: 2.5 }), // capped: Expert is the top
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
 * Level generation (src/engine/difficulty.js difficultyFor reads this). Difficulty rises a little on
 * every level: fast early (square-root curve), then slower. The board grows until fullSizeLevel; after
 * that, deeper blocking, more solve rounds and more long arrows keep it rising (log curve up to lateLevel).
 * Every value moves one way only, so no level is easier than an earlier one.
 *
 * Goals checked on every generated board (see analyzeLevel):
 *   maxStartFree     arrows that can leave on the very first move
 *   minAvgDepth      mean number of arrows that must leave before each arrow (depthPerArrow x arrows)
 *   minSolveRounds   removal waves needed when every free arrow leaves at once (roundsPerArrow x arrows)
 * Pairs [a, b] go from a at the first curve level to b at fullSizeLevel; triples add c at lateLevel.
 */
export const LEVELS = Object.freeze({
  minLen: 2,
  maxLen: 30,
  minFill: 0.9, // share of usable cells covered by arrows
  curve: Object.freeze({
    firstLevel: 4, // levels 1-3 are the tutorial (below)
    fullSizeLevel: 200, // the board reaches its largest size here
    lateLevel: 20000, // the deep-chain ratios keep rising (log scale) until here
    growth: 0.5, // square-root ramp: fast early, slower later
    gridW: [16, 42],
    gridH: [21, 54], // portrait, like a phone
    arrowsPerCell: 0.12, // target arrows = cells x this
    minArrowsShare: 0.85, // a board must have at least this share of the target
    depthPerArrow: [0.2, 0.21, 0.225],
    roundsPerArrow: [0.16, 0.17, 0.18],
    longArrowShare: [0.1, 0.17, 0.2], // share of arrows that are long (13-30 cells)
    mediumShare: 0.4, // chance a normal arrow aims for 7-12 cells
    depthBias: [0.6, 1],
    shapeScale: [1, 1.25], // shape boards hold this x the plain board's cells (their edges cut rays short)
    // fewest arrows free on the first move, by level
    maxStartFree: Object.freeze([
      { from: 4, max: 3 },
      { from: 31, max: 2 },
      { from: 20000, max: 1 },
    ]),
    // display names only (the curve itself is smooth)
    tiers: Object.freeze([
      { from: 1, label: 'Normal' },
      { from: 31, label: 'Hard' },
      { from: 101, label: 'Super Hard' },
      { from: 1000, label: 'Expert' },
    ]),
  }),
  // levels 1-3 teach the game; level 1 is drawn by hand (src/engine/levels.js)
  tutorial: Object.freeze({
    2: { cols: 5, rows: 6, arrows: [6, 8], rounds: [2, 4] },
    3: { cols: 6, rows: 8, arrows: [12, 16], rounds: [2, 3] },
  }),
  shapeEvery: 3, // every 3rd level is a shape board...
  shapeFrom: 4, // ...after the tutorial (6, 9, 12, ...)
  // shape levels take turns between categories (first round in this order), easy shapes first
  shapeRotation: [
    'animals',
    'food',
    'letters',
    'transport',
    'nature',
    'objects',
    'fruits',
    'symbols',
    'others',
    'numbers',
  ],
  maskMaxCols: 90,
  // a shape's jagged edge (diagonal sides are staircases) lets more arrows out at the start, so shape
  // boards may start with the level's cap + maskExtraFree free arrows, or maskFreeShare of all arrows if higher
  maskExtraFree: 12,
  maskFreeShare: 0.14,
  hearts: 3,
  styles: Object.freeze({ straight: 2, L: 3, U: 2, zigzag: 2, spiral: 1, snake: 2 }),
  tutorialStyles: Object.freeze({ straight: 3, L: 3, U: 1 }),
  /** Long arrows: straights across a row/column, U-turns, square spirals, combs and snakes. */
  longStyles: Object.freeze({ straight: 3, U: 2, spiral: 2, snake: 3, zigzag: 1 }),
});
