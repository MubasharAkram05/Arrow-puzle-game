/**
 * Shared shop card markup and the "New" badge bookkeeping.
 */
import { COSMETICS } from '../../../config.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { priceHTML } from '../../modals/ask.js';
import { wallet } from '../../../game/rewards.js';

/** Items added in the shop expansion; they carry a "New" badge until first seen. */
export const NEW_KEYS = Object.freeze([
  'offer:starter',
  'offer:gift',
  'offer:exchange',
  'offer:sale',
  ...Object.keys(COSMETICS).flatMap((cat) => COSMETICS[cat].filter((i) => i.price).map((i) => `${cat}:${i.id}`)),
]);

/** Keys shown during the current render (marked as seen afterwards). */
const shownNew = new Set();

/**
 * Is an item still "new" for this player? Records it as shown.
 * @param {string} key e.g. "effect:spark"
 * @returns {boolean}
 */
export function isNew(key) {
  const fresh = NEW_KEYS.includes(key) && !state.seenNew.has(key);
  if (fresh) shownNew.add(key);
  return fresh;
}

/**
 * Does a list of keys contain anything unseen? (for tab dots)
 * @param {string[]} keys
 * @returns {boolean}
 */
export function hasNew(keys) {
  return keys.some((k) => NEW_KEYS.includes(k) && !state.seenNew.has(k));
}

/**
 * Mark everything shown in the last render as seen.
 * @returns {boolean} true when something changed
 */
export function markShownSeen() {
  if (!shownNew.size) return false;
  state.seenNew = new Set([...state.seenNew, ...shownNew]);
  shownNew.clear();
  return true;
}

/**
 * What a card's button shows (3.26.0 shop redesign). Pure, tested in tests/shopCards.test.js.
 *  'equipped': in use (check badge, colored border)       'owned': bought, tap to equip
 *  'locked':   can't be bought yet (reason shown)          'buy':   price button
 *  'short':    price button greyed (not enough money; a tap says how much is missing)
 *  'free':     custom footer (gift, exchange...) decided by the card itself
 * @param {{owned?: boolean, equipped?: boolean, locked?: string, price?: object|null, sale?: object, foot?: string}} o
 * @param {{coins: number, diamonds: number}} w wallet
 * @returns {'equipped'|'owned'|'locked'|'buy'|'short'|'free'}
 */
export function cardMode(o, w) {
  if (o.foot) return 'free';
  if (o.equipped) return 'equipped';
  if (o.owned || !o.price) return 'owned';
  if (o.locked) return 'locked';
  const p = o.sale || o.price;
  return w.coins >= (p.coins || 0) && w.diamonds >= (p.diamonds || 0) ? 'buy' : 'short';
}

/** Old price crossed out next to the sale price. */
function saleHTML(price, sale) {
  return `<span class="old-price">${priceHTML(price)}</span>${priceHTML(sale)}`;
}

/** The button at the bottom of a card for its mode. */
function buttonHTML(mode, o) {
  if (mode === 'free') return o.foot;
  if (mode === 'equipped') return `<span class="price-btn is-equipped">${icon('check')}Equipped</span>`;
  if (mode === 'owned') return '<span class="price-btn is-owned">Equip</span>';
  if (mode === 'locked') return `<span class="price-btn is-locked">${icon('lock')}${o.locked}</span>`;
  const price = o.sale ? saleHTML(o.price, o.sale) : priceHTML(o.price);
  return `<span class="price-btn is-${mode}">${price}</span>`;
}

/**
 * One shop card: the same size everywhere, a large live preview on top, the name, then one button.
 * @param {object} o
 * @param {string} o.kind data-kind (what the click handler does)
 * @param {string} o.id item id
 * @param {string} o.name
 * @param {string} [o.note] small text under the name
 * @param {string} o.preview preview markup
 * @param {object|null} [o.price] price (omit for free / owned)
 * @param {object} [o.sale] sale price (shows the old price crossed out and a Sale badge)
 * @param {boolean} [o.owned]
 * @param {boolean} [o.equipped]
 * @param {string} [o.locked] reason the item can't be bought yet
 * @param {string} [o.newKey] key for the "New" badge
 * @param {string} [o.foot] custom button markup (gift, exchange...)
 * @param {string} [o.tag] extra badge text, e.g. "Save 20%"
 * @returns {string}
 */
export function card(o) {
  const mode = cardMode(o, wallet());
  const tags = [];
  if (o.sale && !o.owned) tags.push('<span class="tag sale">Sale</span>');
  if (o.tag) tags.push(`<span class="tag save">${o.tag}</span>`);
  if (o.newKey && isNew(o.newKey)) tags.push('<span class="tag new">New</span>');
  return `<button class="shop-card" data-kind="${o.kind}" data-id="${o.id}" data-mode="${mode}">
    ${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}
    ${mode === 'equipped' ? `<span class="eq-badge" aria-label="Equipped">${icon('check')}</span>` : ''}
    <span class="shop-preview">${o.preview}</span>
    <span class="card-name"><b>${o.name}</b>${o.note ? `<small>${o.note}</small>` : ''}</span>
    ${buttonHTML(mode, o)}
  </button>`;
}

/**
 * Section heading (icon, title, short subtitle) and a grid of cards.
 * @param {string} title
 * @param {string[]} cards
 * @param {string} [empty] text when there are no cards
 * @param {{icon?: string, sub?: string}} [head]
 * @returns {string}
 */
export function section(title, cards, empty, head = {}) {
  const body = cards.length ? `<div class="shop-grid">${cards.join('')}</div>` : `<p class="empty-note">${empty}</p>`;
  return `${sectionHead(title, head)}${body}`;
}

/** Section heading only. */
export function sectionHead(title, { icon: ic, sub } = {}) {
  return `<header class="sec-head">${ic ? `<span class="sec-icon">${icon(ic)}</span>` : ''}<div><h3 class="section-title">${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div></header>`;
}
