import { layoutBoard } from '../render/board.js';
import { updateBottomNav } from './components/bottomNav.js';
import { syncCurrency } from './components/currencyBar.js';

/** Screen history; the first entry is the root (home). */
const stack = ['screen-home'];
/** Refresh callbacks run when a screen is shown again by going back. */
const returnHooks = {};

/** Show one screen and hide the others. */
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  updateBottomNav(id);
  syncCurrency(); // counters always show the real wallet on a new screen
  if (id === 'screen-game') requestAnimationFrame(layoutBoard);
}

/**
 * Go to a screen. If it is already in the history, history is cut back to it.
 * @param {string} id screen element id
 */
export function navigate(id) {
  const i = stack.indexOf(id);
  if (i === -1) stack.push(id);
  else stack.length = i + 1;
  show(id);
}

/**
 * Reset history to a single root screen.
 * @param {string} id
 */
export function resetTo(id) {
  stack.length = 0;
  stack.push(id);
  show(id);
}

/**
 * Open a tab screen: history becomes [home, tab] so back always returns to home.
 * @param {string} id
 */
export function openTab(id) {
  stack.length = 0;
  stack.push('screen-home');
  if (id !== 'screen-home') stack.push(id);
  show(id);
}

/**
 * Go back one screen.
 * @returns {boolean} false when already on the root screen
 */
export function goBack() {
  if (stack.length <= 1) return false;
  stack.pop();
  const id = stack[stack.length - 1];
  show(id);
  if (returnHooks[id]) returnHooks[id]();
  return true;
}

/**
 * Register a refresh callback for when a screen is shown again via goBack.
 * @param {string} id
 * @param {() => void} fn
 */
export function onReturn(id, fn) {
  returnHooks[id] = fn;
}

/**
 * Id of the visible screen.
 * @returns {string}
 */
export function currentScreen() {
  return stack[stack.length - 1];
}
