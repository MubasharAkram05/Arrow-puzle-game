/**
 * Settings section: equip owned cosmetics (one row of chips per category).
 * Buying happens in the Shop; this only switches between items the player owns.
 */
import { COSMETICS } from '../../config.js';
import { playSound } from '../../audio/sound.js';
import { CATEGORIES, isOwned } from '../../game/cosmetics.js';
import { equipCosmeticItem } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { applyTheme } from '../theme.js';

/** Section titles per category. */
export const CATEGORY_NAMES = {
  effect: 'Escape effect',
  board: 'Board',
  head: 'Arrowhead',
  confetti: 'Confetti',
  sound: 'Sound pack',
  frame: 'Avatar frame',
};

/** Draw the chips of owned items for every category. */
export function renderCosmeticChips() {
  $('cosmetic-equip').innerHTML = CATEGORIES.map((cat) => {
    const chips = COSMETICS[cat]
      .filter((i) => isOwned(state.cosmetics, cat, i.id))
      .map((i) => {
        const on = state.cosmetics.equipped[cat] === i.id;
        return `<button class="chip" role="radio" aria-checked="${on}" data-cat="${cat}" data-id="${i.id}">${i.name}</button>`;
      })
      .join('');
    return `<div class="chip-row"><span class="chip-label">${CATEGORY_NAMES[cat]}</span><div class="chips" role="radiogroup" aria-label="${CATEGORY_NAMES[cat]}">${chips}</div></div>`;
  }).join('');
}

/** Wire chip taps once. */
export function bindCosmeticChips() {
  $('cosmetic-equip').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b || !equipCosmeticItem(b.dataset.cat, b.dataset.id)) return;
    if (b.dataset.cat === 'sound') playSound('pop');
    applyTheme();
    saveProgress();
    renderCosmeticChips();
  });
}
