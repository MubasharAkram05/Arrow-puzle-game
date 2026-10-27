import { STYLES } from '../../config.js';
import { state } from '../../game/state.js';
import { vibrate } from '../../audio/haptics.js';
import { resetProgress, saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { goHome } from '../screens/home.js';
import { applyTheme } from '../theme.js';
import { onModalBack, openModal } from './modal.js';

/** Small preview drawing used on each style card (colours come from CSS variables). */
const PREVIEW_SVG =
  '<svg class="prev" viewBox="0 0 120 72" aria-hidden="true">' +
  '<rect width="120" height="72" rx="10" fill="var(--board-bg)"/>' +
  '<circle cx="24" cy="18" r="2" fill="var(--dot)"/><circle cx="96" cy="54" r="2" fill="var(--dot)"/>' +
  '<path d="M22 56V36h40V22h22" fill="none" stroke="var(--arrow)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M84 13l12 9-12 9z" fill="var(--arrow)" stroke="var(--arrow)" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M48 56h30" fill="none" stroke="var(--arrow)" stroke-width="6" stroke-linecap="round"/>' +
  '<path d="M48 49l-10 7 10 7z" fill="var(--arrow)" stroke="var(--arrow)" stroke-width="3" stroke-linejoin="round"/>' +
  '</svg>';

/** Build the four style cards once. */
function buildStyleCards() {
  const grid = $('style-grid');
  for (const s of STYLES) {
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
  document
    .querySelectorAll('[data-style-opt]')
    .forEach((b) => b.setAttribute('aria-checked', String(b.dataset.styleOpt === state.style)));
}

/** Open the settings sheet. */
export function openSettings() {
  renderSettings();
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
  $('btn-reset').addEventListener('click', () => openModal('modal-confirm'));
  $('btn-cancel-reset').addEventListener('click', openSettings);
  $('btn-confirm-reset').addEventListener('click', () => {
    resetProgress();
    goHome();
  });
  onModalBack('modal-confirm', openSettings);
}
