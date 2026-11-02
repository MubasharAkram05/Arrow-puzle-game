import { state } from '../../game/state.js';
import { vibrate } from '../../audio/haptics.js';
import { resetProgress, saveProgress } from '../../storage/save.js';
import { $ } from '../dom.js';
import { toast } from '../components/toast.js';
import { resetZoomGuide } from '../zoomGuide.js';
import { goHome } from '../screens/home.js';
import { applyTheme } from '../theme.js';
import { onModalBack, openModal } from './modal.js';
import { openCredits } from './credits.js';

/** Sync every settings control with the state. */
function renderSettings() {
  $('sw-sound').setAttribute('aria-checked', String(state.sound));
  $('sw-vibration').setAttribute('aria-checked', String(state.vibration));
  document
    .querySelectorAll('[data-theme-opt]')
    .forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeOpt === state.theme)));
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

/** Wire all settings controls and the reset confirmation. Styles and cosmetics are equipped in the Shop. */
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
  $('theme-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-opt]');
    if (!b) return;
    state.theme = b.dataset.themeOpt;
    changed();
  });
  $('btn-zoom-tips').addEventListener('click', () => {
    resetZoomGuide();
    toast('Zoom tips will show again');
  });
  $('btn-credits').addEventListener('click', openCredits);
  $('btn-credits-back').addEventListener('click', openSettings);
  onModalBack('modal-credits', openSettings);
  $('btn-reset').addEventListener('click', () => openModal('modal-confirm'));
  $('btn-cancel-reset').addEventListener('click', openSettings);
  $('btn-confirm-reset').addEventListener('click', () => {
    resetProgress();
    applyTheme();
    goHome();
  });
  onModalBack('modal-confirm', openSettings);
}
