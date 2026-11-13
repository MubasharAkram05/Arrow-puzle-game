/**
 * Ad status for the hidden "Ad debug" panel (Settings: tap the version 7 times, debug builds only) and the
 * "ArrowAds" log (adb logcat -s ArrowAds). The providers report every step here: SDK start, consent, and for
 * each format loading / loaded / failed (with Google's error code and message) / showing.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

/** Native logger (android/app/src/main/java/.../ArrowLogPlugin.java): writes to logcat with the tag "ArrowAds". */
const ArrowLog = registerPlugin('ArrowLog');

const fmt = () => ({ state: 'idle', code: null, message: '', attempts: 0, retryAt: 0 });

/** Live status (read by the debug panel). */
export const adStatus = {
  provider: 'none',
  mode: '',
  sdk: 'not started', // 'not started' | 'starting' | 'ready' | 'failed'
  sdkError: '',
  // the UMP answer (status, formAvailable, canRequestAds, privacy) and what the game decided (canRequest, npa)
  consent: {
    status: 'not checked',
    formAvailable: null,
    canRequestAds: null,
    privacy: '',
    canRequest: false,
    npa: false,
    error: '',
    attempt: 0,
    decision: '',
    geography: 'off',
  },
  banner: fmt(),
  interstitial: fmt(),
  rewarded: fmt(),
};

const listeners = new Set();
/** @param {() => void} fn called after every status change */
export const onAdStatus = (fn) => listeners.add(fn);

/** Write one line to the ArrowAds log (debug builds; logcat on Android, the console everywhere). */
export function adLog(msg) {
  if (!__AD_DEBUG__) return;
  console.info(`[ArrowAds] ${msg}`);
  if (Capacitor.isNativePlatform()) ArrowLog.log({ message: msg }).catch(() => {});
}

/**
 * Update the status and log the change.
 * @param {'sdk'|'consent'|'banner'|'interstitial'|'rewarded'|'provider'} part
 * @param {object|string} patch
 */
export function setAdStatus(part, patch) {
  if (typeof patch === 'string' || typeof adStatus[part] !== 'object') adStatus[part] = patch;
  else Object.assign(adStatus[part], patch);
  const v = adStatus[part];
  if (part === 'sdk') adLog(`sdk ${v}${adStatus.sdkError ? `: ${adStatus.sdkError}` : ''}`);
  else if (part === 'consent')
    adLog(`consent ${v.status} canRequest=${v.canRequest} npa=${v.npa}${v.error ? ` error: ${v.error}` : ''}`);
  else if (typeof v === 'object')
    adLog(
      `${part} ${v.state}${v.code !== null && v.state === 'failed' ? ` code=${v.code}` : ''}${v.message && v.state === 'failed' ? ` "${v.message}"` : ''}${v.retryAt ? ` retry in ${Math.round((v.retryAt - Date.now()) / 1000)}s` : ''}`,
    );
  else adLog(`${part} ${v}`);
  listeners.forEach((fn) => fn());
}

/**
 * Google's error code and message from a failed plugin call or a FailedToLoad event.
 * @param {any} e
 * @returns {{code: number|null, message: string}}
 */
export function adError(e) {
  if (!e) return { code: null, message: 'unknown error' };
  const code = Number.isFinite(e.code) ? e.code : Number.isFinite(Number(e.code)) ? Number(e.code) : null;
  return { code, message: String(e.message || e.errorMessage || e) };
}

const DEBUG_KEY = 'arrowEscape:adDebug';

/**
 * Ad debug settings (debug builds only): the UMP debug geography ('off' | 'eea' | 'not_eea') and the test device
 * hashed ID UMP needs before it applies a debug geography on a real phone (logcat tag UserMessagingPlatform).
 * @returns {{geography: 'off'|'eea'|'not_eea', deviceId: string}}
 */
export function adDebugSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(DEBUG_KEY)) || {};
    return {
      geography: ['eea', 'not_eea'].includes(v.geography) ? v.geography : 'off',
      deviceId: typeof v.deviceId === 'string' ? v.deviceId.trim() : '',
    };
  } catch {
    return { geography: 'off', deviceId: '' };
  }
}

/** @param {{geography?: string, deviceId?: string}} patch */
export function saveAdDebugSettings(patch) {
  try {
    localStorage.setItem(DEBUG_KEY, JSON.stringify({ ...adDebugSettings(), ...patch }));
  } catch {
    // storage blocked: the setting lasts until the panel closes
  }
}
