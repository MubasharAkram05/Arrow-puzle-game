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
  // per-kind counts for today (shop rewards, ADS.earn), reset with rewardedToday
  earnDiamond: 0,
  earnHint: 0,
  earnCoins: 0,
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

/** Record field for a reward kind's daily count. */
const EARN_FIELD = { diamond: 'earnDiamond', hint: 'earnHint', coins: 'earnCoins' };

/**
 * Count one finished rewarded ad (and its kind, for the per-kind limits). A new local day starts every count again.
 * @param {ReturnType<typeof newAdRecord>} rec
 * @param {number} now
 * @param {'diamond'|'hint'|'coins'} [kind] a kind with its own daily limit (ADS.earn)
 */
export function countRewarded(rec, now, kind) {
  const today = dayNumber(now);
  const fresh = today > rec.day;
  const base = fresh ? { ...rec, day: today, rewardedToday: 0, earnDiamond: 0, earnHint: 0, earnCoins: 0 } : rec;
  const out = { ...base, rewardedToday: base.rewardedToday + 1 };
  if (kind && EARN_FIELD[kind]) out[EARN_FIELD[kind]] = base[EARN_FIELD[kind]] + 1;
  return out;
}

/**
 * Ads of one kind watched today (0 on a new day).
 * @param {ReturnType<typeof newAdRecord>} rec
 * @param {number} now
 * @param {'diamond'|'hint'|'coins'} kind
 */
export function earnedToday(rec, now, kind) {
  return dayNumber(now) > rec.day ? 0 : rec[EARN_FIELD[kind]] || 0;
}

/**
 * What a "Watch ad" button for a reward kind should do right now.
 *  'limit': this kind's daily limit, or the overall daily cap, is reached ("Daily limit reached")
 *  'noad':  no ad is loaded yet ("No ad right now")
 *  'ready': tap plays the ad
 * @param {ReturnType<typeof newAdRecord>} rec
 * @param {{now: number, kind?: 'diamond'|'hint'|'coins', ready: boolean}} o ready: an ad is loaded and not playing
 * @param {{rewardedPerDay: number, earn: object}} cfg ADS
 * @returns {{state: 'ready'|'noad'|'limit', used: number, cap: number}}
 */
export function earnOffer(rec, o, cfg) {
  const cap = o.kind ? cfg.earn[o.kind].perDay : cfg.rewardedPerDay;
  const used = o.kind
    ? earnedToday(rec, o.now, o.kind)
    : cfg.rewardedPerDay - rewardedLeft(rec, o.now, cfg.rewardedPerDay);
  const overall = rewardedLeft(rec, o.now, cfg.rewardedPerDay);
  const state = used >= cap || overall <= 0 ? 'limit' : o.ready ? 'ready' : 'noad';
  return { state, used, cap };
}

/**
 * Wait before trying a failed ad load again: base, 2x base, 4x base ... capped at maxMs.
 * @param {number} attempt 1 for the first retry
 * @param {{baseMs: number, maxMs: number}} cfg ADS.retry
 * @returns {number} ms
 */
export function retryDelay(attempt, cfg) {
  const n = Math.max(1, Math.floor(attempt));
  return Math.min(cfg.maxMs, cfg.baseMs * 2 ** Math.min(n - 1, 20));
}

/**
 * What to do after a Google UMP consent check.
 *  - OBTAINED or NOT_REQUIRED (or UMP says ads may be requested): ads allowed, personalised as UMP decides
 *  - REQUIRED and not given: never any ads (EEA, UK)
 *  - UNKNOWN, or the check failed or timed out (info null):
 *      test builds (RELEASE_ADS false): non-personalised test ads at once, so testing is never blocked
 *      release builds: try the check again (attempt < attempts); after the last try, non-personalised ads
 * @param {{status?: string, canRequestAds?: boolean}|null} info the UMP answer, null when the request failed
 * @param {{testing: boolean, attempt: number, attempts: number}} o attempt: tries made so far (1 after the first)
 * @returns {{action: 'allow'|'block'|'retry', npa: boolean, reason: string}}
 */
export function consentOutcome(info, o) {
  if (info && (info.status === 'OBTAINED' || info.status === 'NOT_REQUIRED' || info.canRequestAds))
    return { action: 'allow', npa: false, reason: `consent ${info.status}` };
  if (info && info.status === 'REQUIRED') return { action: 'block', npa: false, reason: 'consent required, not given' };
  const why = info ? `consent ${info.status || 'UNKNOWN'}` : 'consent check failed';
  if (o.testing) return { action: 'allow', npa: true, reason: `${why}: test build, non-personalised ads` };
  if (o.attempt < o.attempts) return { action: 'retry', npa: false, reason: `${why}: trying again` };
  return { action: 'allow', npa: true, reason: `${why} after ${o.attempts} tries: non-personalised ads` };
}

/**
 * Reject a promise that does not settle in time (the UMP request can stay silent forever).
 * @template T
 * @param {Promise<T>} p
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject({ code: 'TIMEOUT', message: `no answer within ${ms / 1000} s` }), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** UMP debug geography values (AdmobConsentDebugGeography), for the Ad debug panel's EEA switch. */
export const DEBUG_GEOGRAPHY = Object.freeze({ off: 0, eea: 1, not_eea: 2 });

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
