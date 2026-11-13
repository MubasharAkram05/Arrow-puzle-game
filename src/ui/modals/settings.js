import { state } from '../../game/state.js';
import { vibrate } from '../../audio/haptics.js';
import { saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { applyTheme } from '../theme.js';
import { privacyOptionsRequired, showPrivacyOptions } from '../../ads/index.js';
import { openModal } from './modal.js';

/** Sync every settings control with the state. */
function renderSettings() {
  $('sw-sound').setAttribute('aria-checked', String(state.sound));
  $('sw-vibration').setAttribute('aria-checked', String(state.vibration));
  document
    .querySelectorAll('[data-theme-opt]')
    .forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeOpt === state.theme)));
  // Google UMP: shown only where a privacy options entry is required (EEA, UK)
  $('btn-privacy-options').hidden = !privacyOptionsRequired();
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

/**
 * Wire the settings controls: sound, vibration and theme. Styles and cosmetics are equipped in the Shop; Credits
 * is a link at the bottom of the Profile tab.
 */
export function bindSettings() {
  $('sw-sound').addEventListener('click', () => {
    state.sound = !state.sound;
    changed();
  });
  $('sw-vibration').addEventListener('click', () => {
    state.vibration = !state.vibration;
    changed();
    vibrate(40);
  });
  $('btn-privacy-options').addEventListener('click', () => showPrivacyOptions());
  $('theme-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-opt]');
    if (!b) return;
    state.theme = b.dataset.themeOpt;
    changed();
  });
}
