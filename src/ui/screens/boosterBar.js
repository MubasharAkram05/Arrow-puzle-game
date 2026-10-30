/**
 * In-game booster bar: icon + count badge per booster, next to the hint button.
 * Tapping a booster with 0 left offers to buy one, then uses it.
 */
import { BOOSTERS } from '../../config.js';
import { BOOSTER_IDS, blockedReason } from '../../game/boosters.js';
import { buyBooster, spendBooster } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { renderHearts } from '../../render/hud.js';
import { saveProgress } from '../../storage/save.js';
import { playSound } from '../../audio/sound.js';
import { renderCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { ask } from '../modals/ask.js';

const ICONS = { shield: 'shield', extraHeart: 'heart-plus' };

/** Draw the bar from the inventory and the level state. */
export function renderBoosterBar() {
  $('booster-bar').innerHTML = BOOSTER_IDS.map((id) => {
    const n = state.boosters[id] || 0;
    const off = !!blockedReason(id, state.levelBoost);
    const active = id === 'shield' && state.levelBoost.shield;
    const cls = ['boost', active ? 'active' : '', off && !active ? 'off' : ''].join(' ');
    return `<button class="${cls}" data-boost="${id}" aria-label="${BOOSTERS[id].name}, ${n} left">${icon(ICONS[id])}<span class="badge${n ? '' : ' zero'}">${n || '+'}</span></button>`;
  }).join('');
}

/** Run a booster's effect. Returns false when it could not run (nothing changes). */
function applyEffect(id) {
  if (!spendBooster(id).ok) return false;
  if (id === 'extraHeart') {
    state.maxHearts++;
    state.hearts++;
  }
  playSound('pop');
  renderHearts(-1);
  return true;
}

/** Use a booster now (inventory already has one). */
function use(id) {
  if (applyEffect(id)) {
    saveProgress();
    renderBoosterBar();
  }
}

/** Tap on a booster button. */
function onBoost(btn) {
  if (state.locked) return;
  const id = btn.dataset.boost;
  const blocked = blockedReason(id, state.levelBoost);
  if (blocked) return toast(blocked);
  if ((state.boosters[id] || 0) > 0) return use(id);
  const b = BOOSTERS[id];
  ask({
    title: `Buy ${b.name}?`,
    message: `${b.desc}. It is used right away.`,
    icon: ICONS[id],
    price: b.price,
    okLabel: 'Buy and use',
    onOk: () => {
      if (!buyBooster(id).ok) return;
      renderCurrency();
      use(id);
    },
  });
}

/** Wire the bar once. */
export function bindBoosterBar() {
  $('booster-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-boost]');
    if (b) onBoost(b);
  });
}
