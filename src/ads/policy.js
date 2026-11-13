/**
 * Ad rules (3.26.0). Pure: no DOM, no plugin, no storage. Tested in tests/ads.test.js.
 */
import { dayNumber } from '../game/daily.js';

const PLACEHOLDER = /^REAL_/;
const UNITS = ['appId', 'banner', 'interstitial', 'rewarded'];

/**
 * Which ad IDs to use.
 * - test IDs whenever RELEASE_ADS is false, or the build is not an Android release build
 * - real IDs only when RELEASE_ADS is true AND this is a release build AND every real ID is filled in
 * - 'off' (no ads) for a release build with RELEASE_ADS true but a placeholder left: never real units by mistake,
 *   and never test ads in the store build
 * @param {{releaseAds: boolean, test: object, real: object}} ids src/ads.config.json
 * @param {boolean} realAllowed this is an Android release build (see scripts/build-flags.mjs)
 * @returns {{mode: 'test'|'real'|'off', appId?: string, banner?: string, interstitial?: string, rewarded?: string}}
 */
export function adUnitIds(ids, realAllowed) {
  if (!ids.releaseAds || !realAllowed) return { mode: 'test', ...pick(ids.test) };
  const filled = UNITS.every(
    (k) => typeof ids.real[k] === 'string' && /^ca-app-pub-/.test(ids.real[k]) && !PLACEHOLDER.test(ids.real[k]),
  );
  return filled ? { mode: 'real', ...pick(ids.real) } : { mode: 'off' };
}

const pick = (o) => Object.fromEntries(UNITS.map((k) => [k, o[k]]));

/** Per-device ad record (localStorage, see src/ads/index.js). */
export const newAdRecord = () => ({
  day: 0,
  rewardedToday: 0,
  lastInterstitialAt: 0,
  winsSinceInterstitial: 0,
  launches: 0,
});

/** Bring a stored record into shape (anything unexpected becomes the default). */
export function sanitizeAdRecord(raw) {
  const d = newAdRecord();
  const r = raw && typeof raw === 'object' ? raw : {};
  const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return { ...d, ...Object.fromEntries(Object.keys(d).map((k) => [k, n(r[k])])) };
}

/**
 * Rewarded ads left today. A new local day starts a fresh count; a clock moved back never does.
 * @param {ReturnType<typeof newAdRecord>} rec
 * @param {number} now
 * @param {number} cap ADS.rewardedPerDay
 * @returns {number}
 */
export function rewardedLeft(rec, now, cap) {
  return dayNumber(now) > rec.day ? cap : Math.max(0, cap - rec.rewardedToday);
}

/** Count one finished rewarded ad. */
export function countRewarded(rec, now) {
  const today = dayNumber(now);
  if (today > rec.day) return { ...rec, day: today, rewardedToday: 1 };
  return { ...rec, rewardedToday: rec.rewardedToday + 1 };
}

/** The app started (interstitials never show in the first session). */
export const noteLaunch = (rec) => ({ ...rec, launches: rec.launches + 1 });

/** A level was won. */
export const noteWin = (rec) => ({ ...rec, winsSinceInterstitial: rec.winsSinceInterstitial + 1 });

/**
 * May an interstitial show now (after a level win, when the player leaves the victory screen)?
 * Only from level `fromLevel`, after `everyLevels` wins since the last one, `minGapMs` after it, never in the
 * first app session, and never when a rewarded ad was watched during this level or on its victory screen.
 * @param {ReturnType<typeof newAdRecord>} rec
 * @param {{level: number, now: number, rewardedThisLevel: boolean}} o
 * @param {{fromLevel: number, everyLevels: number, minGapMs: number}} cfg ADS.interstitial
 * @returns {boolean}
 */
export function interstitialDue(rec, o, cfg) {
  if (o.level < cfg.fromLevel || o.rewardedThisLevel || rec.launches < 2) return false;
  if (rec.winsSinceInterstitial < cfg.everyLevels) return false;
  if (o.now < rec.lastInterstitialAt) return false; // clock moved back: wait for real time
  return o.now - rec.lastInterstitialAt >= cfg.minGapMs;
}

/** An interstitial was shown. */
export const noteInterstitial = (rec, now) => ({ ...rec, lastInterstitialAt: now, winsSinceInterstitial: 0 });

/**
 * May the banner show? Only on the listed tab screens and never while a popup is open.
 * @param {string} screenId the visible screen
 * @param {boolean} modalOpen
 * @param {readonly string[]} screens ADS.bannerScreens
 * @returns {boolean}
 */
export const bannerAllowed = (screenId, modalOpen, screens) => !modalOpen && screens.includes(screenId);

/**
 * Run one rewarded ad and decide the outcome from its events only: a reward is earned only by the 'rewarded'
 * event. Closing early, failing to load or show, or a show that never reports a reward gives nothing.
 * @param {(emit: (e: 'rewarded'|'dismissed'|'failed') => void) => void} show starts the ad and reports events
 * @param {number} [graceMs] after 'dismissed', how long to wait for a late 'rewarded'
 * @returns {Promise<{rewarded: boolean, reason: null|'closed'|'failed'}>}
 */
export function runRewarded(show, graceMs = 0) {
  return new Promise((resolve) => {
    let rewarded = false;
    let done = false;
    const finish = (reason) => {
      if (done) return;
      done = true;
      resolve({ rewarded, reason: rewarded ? null : reason });
    };
    try {
      show((e) => {
        if (e === 'rewarded') rewarded = true;
        else if (e === 'failed') finish('failed');
        else if (e === 'dismissed') setTimeout(() => finish('closed'), graceMs);
      });
    } catch {
      finish('failed');
    }
  });
}
