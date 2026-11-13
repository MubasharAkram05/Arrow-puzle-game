/**
 * Hidden "Ad debug" panel (3.26.0), debug builds only (__AD_DEBUG__: the debug APK, the dev server).
 * Settings > tap the version 7 times. Shows the live AdMob status from src/ads/status.js: SDK start, consent, and
 * for banner / interstitial / rewarded: loading / loaded / failed with Google's error code and message.
 */
import { retryAdsNow } from '../../ads/index.js';
import { adStatus, onAdStatus } from '../../ads/status.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { onModalBack, closeModals, openModal } from './modal.js';

const TAPS = 7;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** One format line: state, error code and message, next retry. */
function fmtRow(name, f) {
  const err = f.state === 'failed' ? ` code ${f.code ?? '?'}: ${f.message}` : f.message ? ` (${f.message})` : '';
  const retry = f.retryAt > Date.now() ? `, retry in ${Math.ceil((f.retryAt - Date.now()) / 1000)} s` : '';
  return `<dt>${name}</dt><dd data-state="${esc(f.state)}">${esc(f.state + err + retry)}${f.attempts ? ` <small>(${f.attempts} failed)</small>` : ''}</dd>`;
}

/** Fill the panel from the live status. */
function render() {
  if (!$('modal-addebug').classList.contains('open')) return;
  const c = adStatus.consent;
  $('ad-debug').innerHTML = [
    `<dt>Provider</dt><dd>${esc(adStatus.provider)}</dd>`,
    `<dt>SDK initialized</dt><dd data-state="${adStatus.sdk === 'ready' ? 'loaded' : adStatus.sdk === 'failed' ? 'failed' : 'loading'}">${adStatus.sdk === 'ready' ? 'yes' : esc(adStatus.sdk)}${adStatus.sdkError ? `: ${esc(adStatus.sdkError)}` : ''}</dd>`,
    `<dt>Consent</dt><dd>${esc(c.status)}, ads ${c.canRequest ? 'allowed' : 'blocked'}${c.npa ? ' (non-personalised)' : ''}${c.error ? `<br><small>${esc(c.error)}</small>` : ''}</dd>`,
    fmtRow('Banner', adStatus.banner),
    fmtRow('Interstitial', adStatus.interstitial),
    fmtRow('Rewarded', adStatus.rewarded),
  ].join('');
}

/** Wire the 7 taps on the version line (debug builds only) and the panel. */
export function bindAdDebug() {
  $('app-version').textContent = `Version ${__APP_VERSION__}`;
  if (!__AD_DEBUG__) return;
  let taps = 0;
  let last = 0;
  $('app-version').addEventListener('click', () => {
    const now = Date.now();
    taps = now - last < 1500 ? taps + 1 : 1;
    last = now;
    if (taps >= TAPS) {
      taps = 0;
      closeModals();
      openModal('modal-addebug');
      render();
    } else if (taps >= 4) {
      const left = TAPS - taps;
      toast(`${left} more tap${left === 1 ? '' : 's'} for Ad debug`);
    }
  });
  $('btn-ad-retry').addEventListener('click', () => {
    retryAdsNow();
    toast('Retrying failed ad loads');
  });
  onAdStatus(render);
  setInterval(render, 1000); // the retry countdowns
  onModalBack('modal-addebug', closeModals);
}
