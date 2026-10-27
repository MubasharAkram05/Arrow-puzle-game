import { START_HINTS } from '../config.js';

/**
 * Fresh progress record.
 * @returns {{current: number, unlocked: number, completed: Set<number>, daily: Record<string, boolean>}}
 */
export function newProgress() {
  return { current: 1, unlocked: 1, completed: new Set(), daily: {} };
}

/**
 * Single mutable game state shared by all modules.
 * Live arrows: {id, dir, path, escaped, busy, el, shaft, headEl, geom}.
 */
export const state = {
  levelNum: 1,
  daily: null, // YYYYMMDD key while playing the daily challenge
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
  grid: true,
  sound: true,
  vibration: true,
  theme: 'auto',
  style: 'classic',
};
