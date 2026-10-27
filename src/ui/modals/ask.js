/**
 * Generic purchase / confirm dialog with an optional price.
 * When the wallet can't pay, the confirm button is disabled and the dialog says how much is missing.
 */
import { canAfford, shortfall } from '../../game/economy.js';
import { wallet } from '../../game/rewards.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from './modal.js';

let pending = null;

/**
 * Price as markup with the currency icon.
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {string}
 */
export function priceHTML(price) {
  const kind = price.diamonds ? 'gem' : 'coin';
  const value = price.diamonds || price.coins || 0;
  return `<span class="price"><svg class="cur-icon" aria-hidden="true"><use href="#i-${kind}" /></svg>${value}</span>`;
}

/**
 * Message for a missing amount, e.g. "You need 30 more coins."
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {string} empty when affordable
 */
export function missingText(price) {
  const m = shortfall(wallet(), price);
  if (m.coins) return `You need ${m.coins} more coins.`;
  if (m.diamonds) return `You need ${m.diamonds} more diamond${m.diamonds === 1 ? '' : 's'}.`;
  return '';
}

/**
 * Open the dialog.
 * @param {{title: string, message: string, icon?: string, price?: object, blocked?: string, okLabel?: string, onOk: () => void, onCancel?: () => void}} opts
 *   blocked: reason the action is not possible right now (shown instead of the price check)
 */
export function ask(opts) {
  pending = opts;
  $('ask-icon').innerHTML = `<use href="#i-${opts.icon || 'check'}" />`;
  $('ask-title').textContent = opts.title;
  $('ask-message').textContent = opts.message;
  $('ask-price').innerHTML = opts.price ? priceHTML(opts.price) : '';
  const missing = opts.blocked || (opts.price && !canAfford(wallet(), opts.price) ? missingText(opts.price) : '');
  $('ask-error').textContent = missing;
  $('btn-ask-ok').textContent = opts.okLabel || 'Confirm';
  $('btn-ask-ok').disabled = !!missing;
  openModal('modal-ask');
}

/** Wire the dialog buttons once. */
export function bindAsk() {
  $('btn-ask-ok').addEventListener('click', () => {
    const p = pending;
    pending = null;
    closeModals();
    if (p) p.onOk();
  });
  $('btn-ask-cancel').addEventListener('click', () => {
    const p = pending;
    pending = null;
    closeModals();
    if (p && p.onCancel) p.onCancel();
  });
}
