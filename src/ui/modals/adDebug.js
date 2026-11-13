/**
 * Hidden "Ad debug" panel (3.26.0), debug builds only (__AD_DEBUG__: the debug APK, the dev server).
 * Settings > tap the version 7 times. Shows the live AdMob status from src/ads/status.js: SDK start, consent, and
 * for banner / interstitial / rewarded: loading / loaded / failed with Google's error code and message.
 */
import { recheckConsent, retryAdsNow } from '../../ads/index.js';
import { adDebugSettings, adStatus, onAdStatus, saveAdDebugSettings } from '../../ads/status.js';
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
    `<dt>Consent (UMP)</dt><dd data-state="${c.status === 'check failed' ? 'failed' : c.status === 'checking' ? 'loading' : ''}">${esc(c.status)}${c.attempt > 1 ? ` (try ${c.attempt})` : ''}<br><small>form available: ${esc(c.formAvailable)}, canRequestAds: ${esc(c.canRequestAds)}${c.privacy ? `, privacy options: ${esc(c.privacy)}` : ''}</small>${c.error ? `<br><small class="ad-debug-err">${esc(c.error)}</small>` : ''}</dd>`,
    `<dt>Ads</dt><dd data-state="${c.decision ? (c.canRequest ? 'loaded' : 'blocked') : 'loading'}">${c.decision ? `${c.canRequest ? 'allowed' : 'blocked'}${c.npa ? ', non-personalised' : ''}<br><small>${esc(c.decision)}</small>` : 'waiting for consent'}</dd>`,
    `<dt>Geography</dt><dd>${esc(c.geography)}</dd>`,
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
  const geo = () => {
    const g = adDebugSettings().geography;
    $('ad-geo')
      .querySelectorAll('[data-geo]')
      .forEach((x) => x.setAttribute('aria-checked', String(x.dataset.geo === g)));
  };
  $('ad-device-id').value = adDebugSettings().deviceId;
  geo();
  $('ad-geo').addEventListener('click', (e) => {
    const x = e.target.closest('[data-geo]');
    if (!x) return;
    saveAdDebugSettings({ geography: x.dataset.geo });
    geo();
    toast('Saved. Tap "Reset consent & show form" to apply');
  });
  $('ad-device-id').addEventListener('change', (e) => saveAdDebugSettings({ deviceId: e.target.value }));
  $('btn-ad-consent').addEventListener('click', () => recheckConsent(false));
  $('btn-ad-consent-reset').addEventListener('click', () => recheckConsent(true));
  $('btn-ad-retry').addEventListener('click', () => {
    retryAdsNow();
    toast('Retrying failed ad loads');
  });
  onAdStatus(render);
  setInterval(render, 1000); // the retry countdowns
  onModalBack('modal-addebug', closeModals);
}
