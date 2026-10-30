import { SHOP_STYLES } from '../../config.js';
import { state } from '../../game/state.js';
import { vibrate } from '../../audio/haptics.js';
import { resetProgress, saveProgress } from '../../storage/save.js';
import { PREVIEW_SVG } from '../components/stylePreview.js';
import { bindCosmeticChips, renderCosmeticChips } from './cosmeticChips.js';
import { $ } from '../dom.js';
import { toast } from '../components/toast.js';
import { resetZoomGuide } from '../zoomGuide.js';
import { openShop } from '../screens/shop/index.js';
import { goHome } from '../screens/home.js';
import { applyTheme } from '../theme.js';
import { closeModals, onModalBack, openModal } from './modal.js';

/** Build the style cards once (only owned ones are shown). */
function buildStyleCards() {
  const grid = $('style-grid');
  for (const s of SHOP_STYLES) {
    const b = document.createElement('button');
    b.className = 'style-card';
    b.dataset.preview = s.id;
    b.dataset.styleOpt = s.id;
    b.setAttribute('role', 'radio');
    b.innerHTML = `${PREVIEW_SVG}<span>${s.name}</span><svg class="icon tick"><use href="#i-check"/></svg>`;
    grid.appendChild(b);
  }
}

/** Sync every settings control with the state. */
function renderSettings() {
  $('sw-sound').setAttribute('aria-checked', String(state.sound));
  $('sw-vibration').setAttribute('aria-checked', String(state.vibration));
  document
    .querySelectorAll('[data-theme-opt]')
    .forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeOpt === state.theme)));
  document.querySelectorAll('[data-style-opt]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.styleOpt === state.style));
    b.hidden = !state.owned.styles.includes(b.dataset.styleOpt);
  });
}

/** Open the settings sheet. */
export function openSettings() {
  renderSettings();
  renderCosmeticChips();
  openModal('modal-settings');
}

/** Save, re-apply theme and refresh controls after a change. */
function changed() {
  applyTheme();
  saveProgress();
  renderSettings();
}

/** Wire all settings controls and the reset confirmation. */
export function bindSettings() {
  buildStyleCards();
  bindCosmeticChips();
  $('sw-sound').addEventListener('click', () => {
    state.sound = !state.sound;
    changed();
  });
  $('sw-vibration').addEventListener('click', () => {
    state.vibration = !state.vibration;
    changed();
    vibrate(40);
  });
  $('theme-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-opt]');
    if (!b) return;
    state.theme = b.dataset.themeOpt;
    changed();
  });
  $('style-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-style-opt]');
    if (!b) return;
    state.style = b.dataset.styleOpt;
    changed();
  });
  $('btn-zoom-tips').addEventListener('click', () => {
    resetZoomGuide();
    toast('Zoom tips will show again');
  });
  $('btn-more-styles').addEventListener('click', () => {
    closeModals();
    openShop('styles');
  });
  $('btn-reset').addEventListener('click', () => openModal('modal-confirm'));
  $('btn-cancel-reset').addEventListener('click', openSettings);
  $('btn-confirm-reset').addEventListener('click', () => {
    resetProgress();
    applyTheme();
    goHome();
  });
  onModalBack('modal-confirm', openSettings);
}
