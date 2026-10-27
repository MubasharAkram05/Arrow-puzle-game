import { state } from '../../game/state.js';
import { $ } from '../dom.js';

/** Back-button handlers per modal id; the default closes the modal. */
const backHandlers = {};

/**
 * Open a modal (closing any other) and lock board input.
 * @param {string} id
 */
export function openModal(id) {
  document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
  $(id).classList.add('open');
  state.locked = true;
}

/** Close all modals; unlock the board only if the level is still running. */
export function closeModals() {
  document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
  state.locked = state.hearts <= 0 || state.remaining === 0;
}

/**
 * Id of the open modal, or null.
 * @returns {string|null}
 */
export function openModalId() {
  const m = document.querySelector('.modal.open');
  return m ? m.id : null;
}

/**
 * Register what the back button does while a modal is open.
 * @param {string} id
 * @param {() => void} handler
 */
export function onModalBack(id, handler) {
  backHandlers[id] = handler;
}

/**
 * Handle back for the open modal.
 * @returns {boolean} false when no modal was open
 */
export function modalBack() {
  const id = openModalId();
  if (!id) return false;
  (backHandlers[id] || closeModals)();
  return true;
}

/** Close buttons marked with data-close. */
export function bindCloseButtons() {
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
}
