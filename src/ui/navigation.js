import { layoutBoard } from '../render/board.js';

/** Screen history; the first entry is the root (home). */
const stack = ['screen-home'];

/** Show one screen and hide the others. */
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
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
 * Go back one screen.
 * @returns {boolean} false when already on the root screen
 */
export function goBack() {
  if (stack.length <= 1) return false;
  stack.pop();
  show(stack[stack.length - 1]);
  return true;
}

/**
 * Id of the visible screen.
 * @returns {string}
 */
export function currentScreen() {
  return stack[stack.length - 1];
}
