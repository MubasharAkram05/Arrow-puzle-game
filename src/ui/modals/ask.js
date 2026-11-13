/**
 * Generic purchase / confirm dialog with an optional price.
 * When the wallet can't pay, the confirm button is disabled and the dialog says how much is missing.
 */
import { canAfford, missingLabel, priceLabel, shortfall } from '../../game/economy.js';
import { wallet } from '../../game/rewards.js';
import { rewardedAvailable, watchRewardedAd } from '../../ads/index.js';
import { $ } from '../dom.js';
import { closeModals, openModal } from './modal.js';

let pending = null;

/**
 * Price as markup with the currency icon.
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {string}
 */
export function priceHTML(price) {
  const part = (kind, value) =>
    `<span class="price-part"><svg class="cur-icon" aria-hidden="true"><use href="#i-${kind}" /></svg>${value.toLocaleString('en-US')}</span>`;
  const parts = [];
  if (price.coins || !price.diamonds) parts.push(part('coin', price.coins || 0));
  if (price.diamonds) parts.push(part('gem', price.diamonds));
  // a combo price shows both icons: "[coin] 600 + [gem] 3"
  return `<span class="price${parts.length > 1 ? ' combo' : ''}" aria-label="${priceLabel(price)}">${parts.join('<span class="price-plus" aria-hidden="true">+</span>')}</span>`;
}

/**
 * Message for a missing amount, e.g. "Need 120 more coins and 1 more diamond".
 * @param {{coins?: number, diamonds?: number}} price
 * @returns {string} empty when affordable
 */
export function missingText(price) {
  return missingLabel(shortfall(wallet(), price));
}

/**
 * Open the dialog.
 * @param {{title: string, message: string, icon?: string, price?: object, blocked?: string, okLabel?: string, onOk: () => void, onCancel?: () => void, ad?: {label: string, onReward: () => void}}} opts
 *   blocked: reason the action is not possible right now (shown instead of the price check)
 *   ad: a "Watch ad" alternative (3.26.0), shown only while a rewarded ad is loaded; onReward runs only once the
 *   ad has reported its reward
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
  const ad = opts.ad && !opts.blocked && rewardedAvailable();
  $('btn-ask-ad').hidden = !ad;
  if (ad) $('ask-ad-label').textContent = opts.ad.label;
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
  $('btn-ask-ad').addEventListener('click', async () => {
    const p = pending;
    pending = null;
    closeModals();
    if (p && p.ad && (await watchRewardedAd())) p.ad.onReward();
  });
  $('btn-ask-cancel').addEventListener('click', () => {
    const p = pending;
    pending = null;
    closeModals();
    if (p && p.onCancel) p.onCancel();
  });
}
