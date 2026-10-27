import { freeArrows } from '../engine/index.js';
import { saveProgress } from '../storage/save.js';
import { renderHintButton } from '../render/hud.js';
import { hidePointer, showPointer } from '../render/pointer.js';
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
  const m = state.metrics;
  const glow = a.shaft.cloneNode();
  glow.setAttribute('class', 'glow');
  glow.setAttribute('stroke-width', m.sw * 2.8);
  const glowHead = a.headEl.cloneNode();
  glowHead.setAttribute('class', 'glow-head');
  glowHead.setAttribute('stroke-width', m.sw * 1.4);
  a.el.insertBefore(glowHead, a.shaft);
  a.el.insertBefore(glow, glowHead);
  a.el.classList.add('hint');
  showPointer(a.id, false);
}

/** Remove the hint glow and hand. */
export function clearHint() {
  if (state.hintId === -1) return;
  const a = state.arrows[state.hintId];
  if (a && a.el) {
    a.el.classList.remove('hint');
    a.el.querySelectorAll('.glow, .glow-head').forEach((n) => n.remove());
  }
  state.hintId = -1;
  hidePointer();
}

/** Spend one hint to highlight a free arrow. */
export function useHint() {
  if (state.locked || state.hintId !== -1 || state.hints <= 0) return;
  const free = currentFreeArrows();
  if (!free.length) return;
  state.hints--;
  saveProgress();
  showHint(state.arrows[free[0]]);
  renderHintButton();
}

/** Level 1 tutorial: point the hand with a tooltip at a free arrow. */
export function updateTutorial() {
  if (state.levelNum !== 1 || state.remaining === 0 || state.hintId !== -1) return;
  const free = currentFreeArrows();
  if (free.length) showPointer(free[0], true);
}
