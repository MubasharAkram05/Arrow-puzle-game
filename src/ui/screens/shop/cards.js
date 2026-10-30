/**
 * Shared shop card markup and the "New" badge bookkeeping.
 */
import { COSMETICS } from '../../../config.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { priceHTML } from '../../modals/ask.js';

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

/** Old price crossed out next to the sale price. */
function saleHTML(price, sale) {
  return `<span class="old-price">${priceHTML(price)}</span>${priceHTML(sale)}`;
}

/**
 * One shop card.
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
 * @param {string} [o.foot] custom footer markup
 * @returns {string}
 */
export function card(o) {
  const tags = [];
  if (o.sale && !o.owned) tags.push('<span class="tag sale">Sale</span>');
  if (o.newKey && isNew(o.newKey)) tags.push('<span class="tag new">New</span>');
  let foot = o.foot;
  if (!foot) {
    if (o.equipped) foot = `<span class="owned-tag on">${icon('check')}Equipped</span>`;
    else if (o.owned) foot = `<span class="owned-tag">${icon('check')}Owned</span>`;
    else if (o.locked) foot = `<span class="locked-tag">${icon('lock')}${o.locked}</span>`;
    else if (o.sale) foot = saleHTML(o.price, o.sale);
    else if (o.price) foot = priceHTML(o.price);
    else foot = '<span class="owned-tag">Free</span>';
  }
  const cls = ['shop-card', o.equipped ? 'equipped' : '', o.locked ? 'is-locked' : ''].join(' ');
  return `<button class="${cls}" data-kind="${o.kind}" data-id="${o.id}">
    ${tags.length ? `<span class="tags">${tags.join('')}</span>` : ''}
    <span class="shop-preview">${o.preview}</span>
    <b>${o.name}</b>${o.note ? `<small>${o.note}</small>` : ''}
    <span class="shop-foot">${foot}</span>
  </button>`;
}

/**
 * Section title + grid of cards.
 * @param {string} title
 * @param {string[]} cards
 * @param {string} [empty] text when there are no cards
 * @returns {string}
 */
export function section(title, cards, empty) {
  const body = cards.length ? `<div class="shop-grid">${cards.join('')}</div>` : `<p class="empty-note">${empty}</p>`;
  return `<h3 class="section-title">${title}</h3>${body}`;
}
