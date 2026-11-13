/**
 * Hints tab (3.26.0 redesign): how many hints the player has, "+1 hint" for an ad as the first highlighted row,
 * then the hint and the hint pack (with a "Save 20%" tag).
 */
import { PRICES } from '../../../config.js';
import { buyHints } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { buyFlow } from './actions.js';
import { card, section, sectionHead } from './cards.js';
import { earnRow, onEarn } from './adEarn.js';

/** @returns {string[]} keys for the tab's "New" dot (hints are never new) */
export const keys = () => [];

/** How many hints the player has right now. */
const inventory = () =>
  `<div class="inventory" aria-label="Your hints"><span class="inv-icon">${icon('bulb')}</span><span class="inv-text"><small>You have</small><b>${state.hints} hint${state.hints === 1 ? '' : 's'}</b></span></div>`;

/**
 * @param {{inAll?: boolean}} [o] inAll: the All tab already has the +1 hint row in its Free rewards card
 * @returns {string} tab content
 */
export function render(o = {}) {
  const hints = [
    card({
      kind: 'hint',
      id: 'hint',
      name: 'Hint',
      note: 'Shows an arrow that can escape',
      preview: `${icon('bulb')}<em>x1</em>`,
      price: PRICES.hint,
    }),
    card({
      kind: 'hint',
      id: 'pack',
      name: `${PRICES.hintPack.count} Hints`,
      note: 'Best value',
      preview: `${icon('bulb')}<em>x${PRICES.hintPack.count}</em>`,
      price: PRICES.hintPack,
      tag: 'Save 20%',
    }),
  ];
  return [
    inventory(),
    o.inAll
      ? ''
      : sectionHead('Free hint', { icon: 'ad', sub: 'Watch a short ad' }) + earnRow('hint', { featured: true }),
    section('Buy hints', hints, '', { icon: 'bulb', sub: 'Each hint shows an arrow that can escape' }),
  ].join('');
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
  if (kind === 'adearn') return onEarn(el);
  if (kind !== 'hint') return;
  const price = id === 'pack' ? PRICES.hintPack : PRICES.hint;
  const n = price.count || 1;
  buyFlow({
    kind,
    id,
    title: `Buy ${n} hint${n > 1 ? 's' : ''}?`,
    message: 'Hints show an arrow that can escape.',
    icon: 'bulb',
    price,
    buy: () => buyHints({ ...price, count: n }),
    success: `+${n} hint${n > 1 ? 's' : ''}`,
  });
}
