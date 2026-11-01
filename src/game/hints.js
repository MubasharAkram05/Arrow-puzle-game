import { freeArrows } from '../engine/index.js';
import { ensureVisible } from '../input/zoom.js';
import { saveProgress } from '../storage/save.js';
import { renderHintButton } from '../render/hud.js';
import { hidePointer, showPointer } from '../render/pointer.js';
import { headClientPoint, setHintArrow } from '../render/canvasBoard.js';
import { noteHintUsed } from './rewards.js';
import { state } from './state.js';

/**
 * Ids of live arrows that can escape right now and are not mid-animation.
 * @returns {number[]}
 */
export function currentFreeArrows() {
  const removed = state.arrows.map((a) => (a.escaped ? 1 : 0));
  return freeArrows(state.occ, state.level, removed).filter((id) => !state.arrows[id].busy);
}

/**
 * Glow an arrow and point the hand at it.
 * @param {object} a live arrow
 */
export function showHint(a) {
  clearHint();
  state.hintId = a.id;
  setHintArrow(a.id);
  // when zoomed, pan (keeping the zoom) so the hinted arrow is on screen
  const head = headClientPoint(a);
  ensureVisible(head.x, head.y);
  showPointer(a.id, false);
}

/** Remove the hint glow and hand. */
export function clearHint() {
  if (state.hintId === -1) return;
  state.hintId = -1;
  setHintArrow(-1);
  hidePointer();
}

/**
 * Spend one hint to highlight a free arrow.
 * @returns {boolean} false when nothing was shown (no free hint, input locked, no free arrow)
 */
export function useHint() {
  if (state.locked || state.hintId !== -1 || state.hints <= 0) return false;
  const free = currentFreeArrows();
  if (!free.length) return false;
  state.hints--;
  noteHintUsed();
  saveProgress();
  showHint(state.arrows[free[0]]);
  renderHintButton();
  return true;
}

/** Level 1 tutorial: point the hand with a tooltip at a free arrow. */
export function updateTutorial() {
  if (state.levelNum !== 1 || state.remaining === 0 || state.hintId !== -1) return;
  const free = currentFreeArrows();
  if (free.length) showPointer(free[0], true);
}
