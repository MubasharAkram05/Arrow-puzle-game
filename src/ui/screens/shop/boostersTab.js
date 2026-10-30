/**
 * Boosters tab: hints and in-level boosters, single or in packs, plus the current inventory.
 */
import { BOOSTERS, BOOSTER_PACK, PRICES } from '../../../config.js';
import { BOOSTER_IDS } from '../../../game/boosters.js';
import { buyBooster, buyBoosterPack, buyHints } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { buyFlow } from './actions.js';
import { card, section } from './cards.js';

const ICONS = {
  hint: 'bulb',
  pack: 'bulb',
  shield: 'shield',
  extraHeart: 'heart-plus',
};

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => [...BOOSTER_IDS.map((id) => `booster:${id}`), 'booster:pack'];

/** Inventory line: what the player has right now. */
function inventory() {
  const items = [
    `${icon('bulb')}<b>${state.hints}</b>`,
    ...BOOSTER_IDS.map((id) => `${icon(ICONS[id])}<b>${state.boosters[id] || 0}</b>`),
  ];
  return `<div class="inventory" aria-label="Your boosters">${items.map((i) => `<span>${i}</span>`).join('')}</div>`;
}

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
  const boosters = BOOSTER_IDS.map((id) =>
    card({
      kind: 'booster',
      id,
      name: BOOSTERS[id].name,
      note: BOOSTERS[id].desc,
      preview: `${icon(ICONS[id])}<em>x1</em>`,
      price: BOOSTERS[id].price,
      newKey: `booster:${id}`,
    }),
  );
  const c = BOOSTER_PACK.contents;
  boosters.push(
    card({
      kind: 'booster',
      id: 'pack',
      name: BOOSTER_PACK.name,
      note: `${c.shield} Shields`,
      preview: `${icon('shield')}<em>x${c.shield}</em>`,
      price: BOOSTER_PACK.price,
      newKey: 'booster:pack',
    }),
  );
  return inventory() + section('Hints', hints) + section('Boosters', boosters);
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
  if (kind === 'hint') {
    const price = id === 'pack' ? PRICES.hintPack : PRICES.hint;
    const n = price.count || 1;
    return buyFlow({
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
  if (kind === 'booster' && id === 'pack') {
    return buyFlow({
      kind,
      id,
      title: 'Buy the Booster Pack?',
      message: el.querySelector('small').textContent,
      icon: 'shield',
      price: BOOSTER_PACK.price,
      buy: buyBoosterPack,
      success: 'Booster Pack added',
    });
  }
  if (kind === 'booster') {
    const b = BOOSTERS[id];
    return buyFlow({
      kind,
      id,
      title: `Buy ${b.name}?`,
      message: b.desc,
      icon: ICONS[id],
      price: b.price,
      buy: () => buyBooster(id),
      success: `+1 ${b.name}`,
    });
  }
}
