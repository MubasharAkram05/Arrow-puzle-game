import { Capacitor } from '@capacitor/core';
import { $ } from '../ui/dom.js';
import { closeModals, modalBack, openModal } from '../ui/modals/modal.js';
import { goBack } from '../ui/navigation.js';

const GUARD = { arrowEscape: 'guard' };
let exitApp = exitBrowser;
let exiting = false;

/**
 * One back press: close the open modal, else go back one screen,
 * else (on Home) ask to exit.
 */
export function handleBack() {
  if (modalBack()) return;
  if (goBack()) return;
  openModal('modal-exit');
}

/** Browser fallback for "exit": leave the page through history (no-op if it was opened directly). */
function exitBrowser() {
  exiting = true;
  closeModals();
  history.go(-2);
  setTimeout(() => {
    exiting = false;
  }, 500);
}

/**
 * Browser fallback: keep one guard entry on the history stack so the
 * system/browser back button fires popstate instead of leaving the page.
 */
function bindHistoryBack() {
  history.replaceState({ arrowEscape: 'root' }, '');
  history.pushState(GUARD, '');
  window.addEventListener('popstate', () => {
    if (exiting) return;
    handleBack();
    history.pushState(GUARD, '');
  });
}

/**
 * Hook the Android back button. Uses @capacitor/app on a native build,
 * and history/popstate in the browser.
 * @returns {Promise<void>}
 */
export async function initBackButton() {
  $('btn-exit').addEventListener('click', () => exitApp());
  if (Capacitor.isNativePlatform()) {
    try {
      const { App } = await import('@capacitor/app');
      await App.addListener('backButton', handleBack);
      exitApp = () => App.exitApp();
      return;
    } catch {
      // plugin missing in this build: fall back to history
    }
  }
  bindHistoryBack();
}
