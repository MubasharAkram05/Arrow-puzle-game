/**
 * Hints tab: single hints and the hint pack, plus how many hints the player has.
 */
import { PRICES } from '../../../config.js';
import { buyHints } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { buyFlow } from './actions.js';
import { card, section } from './cards.js';

/** @returns {string[]} keys for the tab's "New" dot (hints are never new) */
export const keys = () => [];

/** Inventory line: hints the player has right now. */
const inventory = () =>
  `<div class="inventory" aria-label="Your hints"><span>${icon('bulb')}<b>${state.hints}</b></span></div>`;

/** @returns {string} tab content */
export function render() {
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
      note: 'Save 20%',
      preview: `${icon('bulb')}<em>x${PRICES.hintPack.count}</em>`,
      price: PRICES.hintPack,
    }),
  ];
  return inventory() + section('Hints', hints);
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
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
