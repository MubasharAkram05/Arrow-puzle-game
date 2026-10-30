import { START_HINTS } from '../config.js';
import { newStats } from './stats.js';
import { newInventory, newLevelBoosts } from './boosters.js';
import { newCosmetics } from './cosmetics.js';

/**
 * Fresh progress record.
 * @returns {{current: number, unlocked: number, completed: Set<number>, perfect: Set<number>, masks: Set<number>, chaptersRewarded: Set<number>}}
 */
export function newProgress() {
  return {
    current: 1,
    unlocked: 1,
    completed: new Set(),
    perfect: new Set(), // finished without losing a heart
    masks: new Set(), // mask levels completed
    chaptersRewarded: new Set(),
  };
}

/**
 * Single mutable game state shared by all modules.
 * Live arrows: {id, dir, path, escaped, busy, el, shaft, headEl, geom}.
 */
export const state = {
  levelNum: 1,
  level: null, // generated level (read only)
  arrows: [],
  occ: null, // live occupancy: cell -> arrow id or -1
  metrics: null, // stroke sizes for the current board
  remaining: 0,
  hearts: 3,
  maxHearts: 3,
  locked: false, // blocks board input (modals, game over, win)
  hintId: -1, // arrow highlighted by a hint
  pointerId: -1, // arrow the hand points at
  hints: START_HINTS,
  progress: newProgress(),
  coins: 0,
  diamonds: 0,
  xp: 0,
  stats: newStats(),
  refillsUsed: 0, // heart refills bought in this attempt
  won: false, // the current attempt has been paid out
  boosters: newInventory(), // booster counts
  offers: { starterBought: false, giftLast: 0 }, // starter pack bought, free gift last claim (ms)
  seenNew: new Set(), // shop items whose "New" badge was already shown
  cosmetics: newCosmetics(), // owned/equipped effects, boards, heads, confetti, sounds, avatars, frames
  levelBoost: newLevelBoosts(), // shield, moved, assisted for this attempt
  owned: { styles: ['classic'], themes: ['blue'] },
  accent: 'blue', // equipped accent theme
  claimed: new Set(), // claimed achievement ids
  avatar: 0, // index into the built-in avatars
  name: 'Player',
  grid: false, // the reference shows no dot grid until the player turns it on
  sound: true,
  vibration: true,
  theme: 'auto',
  style: 'classic',
};
