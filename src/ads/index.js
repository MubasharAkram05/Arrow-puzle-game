/**
 * Ads (3.26.0): Google AdMob on Android (test IDs unless RELEASE_ADS, see src/config.js ADS), simulated ads on
 * the dev server, none on the web. This module decides when ads may show; the rules live in policy.js.
 *  - rewarded: free hint, refill a heart, +1 heart after game over, 2x coins, and the Shop "Watch ad" rewards
 *    (+1 diamond, +1 hint, +40 coins, each with its own daily limit in ADS.earn); a reward only on the reward
 *    event, at most ADS.rewardedPerDay a day in all
 *  - interstitial: only when the player leaves a victory screen (policy.js interstitialDue)
 *  - banner: off (BANNER_ENABLED false): never loaded or shown, and no space is reserved for it
 * The per-device ad record (daily count, last interstitial, launches) is kept in localStorage.
 */
import { Capacitor } from '@capacitor/core';
import { ADS } from '../config.js';
import { toast } from '../ui/components/toast.js';
import {
  adUiVisible,
  adUnitIds,
  bannerAllowed,
  countRewarded,
  earnOffer,
  interstitialDue,
  newAdRecord,
  noteInterstitial,
  noteLaunch,
  noteWin,
  rewardedLeft,
  runRewarded,
  sanitizeAdRecord,
} from './policy.js';
import { admobProvider, noneProvider, simProvider } from './providers.js';
import { adLog, setAdStatus } from './status.js';

const KEY = 'arrowEscape:ads';
let provider = noneProvider();
let rec = newAdRecord();
let rewardedThisLevel = false;
let busy = false;
const listeners = new Set();

function load() {
  try {
    return sanitizeAdRecord(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return newAdRecord();
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec));
  } catch {
    // storage blocked: the daily count only lasts this session
  }
}
const changed = () => listeners.forEach((fn) => fn());

/** Re-render ad buttons when an ad becomes ready or is used. @param {() => void} fn */
export function onAdsChange(fn) {
  listeners.add(fn);
}

/** Bottom margin (dp ~ CSS px) that puts the banner just above the bottom navigation, with a gap. */
function bannerMargin() {
  const nav = document.getElementById('bottom-nav');
  return Math.round((nav ? nav.getBoundingClientRect().height : 64) + ADS.bannerGap);
}

/**
 * Start ads once, at boot (after the bottom nav exists). Decides the provider and the banner slot for the whole
 * session, so the layout never changes when an ad loads late, fails or the phone is offline.
 */
export async function initAds() {
  rec = noteLaunch(load());
  save();
  const ids = adUnitIds(ADS.ids, __ADS_REAL_ALLOWED__, ADS.bannerEnabled);
  adLog(`init: native=${Capacitor.isNativePlatform()} ids=${ids.mode} app=${ids.appId || '-'}`);
  if (Capacitor.isNativePlatform() && ids.mode !== 'off')
    provider = admobProvider(ids, changed, ADS.retry, ADS.bannerEnabled);
  else if (__ADS_SIMULATED__) provider = simProvider(changed, ADS.bannerEnabled);
  else setAdStatus('provider', ids.mode === 'off' ? 'none (real IDs not filled in)' : 'none (web build)');
  if (provider.bannerSlot) {
    document.body.classList.add('ad-slot');
    document.documentElement.style.setProperty('--ad-slot', `${ADS.bannerHeight + ADS.bannerGap}px`);
  }
  try {
    await provider.init();
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    adLog(`init failed, no ads this session: ${msg}`);
    setAdStatus('provider', `none (init failed: ${msg})`);
    provider = { ...noneProvider(), bannerSlot: provider.bannerSlot }; // the slot stays, so nothing moves
  }
  syncBanner();
  changed();
}

/** Can a rewarded ad be offered right now (loaded, and under today's cap)? */
export function rewardedAvailable() {
  return !busy && provider.rewardedReady() && rewardedLeft(rec, Date.now(), ADS.rewardedPerDay) > 0;
}

/**
 * State of a "Watch ad" button with its own daily limit (ADS.earn): 'ready', 'noad' or 'limit', and x of y today.
 * @param {'diamond'|'hint'|'coins'} kind
 * @returns {{state: 'ready'|'noad'|'limit', used: number, cap: number}}
 */
export function earnState(kind) {
  return earnOffer(rec, { now: Date.now(), kind, ready: !busy && provider.rewardedReady() }, ADS);
}

/** Show "Watch ad" buttons and rows? The app always; the production web never (it has no ads). */
export const adUiShown = () => adUiVisible({ native: Capacitor.isNativePlatform(), webAdUi: __WEB_AD_UI__ });

export const NO_AD_MSG = 'No ad right now, try again in a moment';
export const LIMIT_MSG = 'Daily limit reached, come back tomorrow';

/**
 * Show a rewarded ad. Resolves true only when the ad reported its reward; otherwise the player gets a friendly
 * message and nothing else.
 * @param {'diamond'|'hint'|'coins'} [kind] a reward with its own daily limit (ADS.earn)
 * @returns {Promise<boolean>}
 */
export async function watchRewardedAd(kind) {
  const offer = earnOffer(rec, { now: Date.now(), kind, ready: !busy && provider.rewardedReady() }, ADS);
  if (offer.state !== 'ready') {
    toast(offer.state === 'limit' ? LIMIT_MSG : NO_AD_MSG);
    if (offer.state === 'noad' && provider.retryNow) provider.retryNow();
    return false;
  }
  busy = true;
  changed();
  const res = await runRewarded((emit) => provider.showRewarded(emit), ADS.rewardedGraceMs);
  provider.afterRewarded();
  busy = false;
  if (!res.rewarded) {
    adLog(`rewarded${kind ? ` (${kind})` : ''}: no reward, ${res.reason}`);
    toast(
      res.reason === 'failed'
        ? "The ad couldn't play. No reward this time."
        : 'Ad closed early, so no reward this time.',
    );
    changed();
    return false;
  }
  rec = countRewarded(rec, Date.now(), kind);
  adLog(`rewarded${kind ? ` (${kind})` : ''}: reward earned, ${rec.rewardedToday}/${ADS.rewardedPerDay} today`);
  rewardedThisLevel = true;
  save();
  changed();
  return true;
}

/**
 * Ad debug panel: run the consent check again (after the EEA switch changed). reset: forget the stored consent
 * first, so the form shows again where it is required.
 * @param {boolean} [reset]
 */
export async function recheckConsent(reset = false) {
  if (provider.recheckConsent) await provider.recheckConsent(reset);
}

/** Try failed ad loads again now (Ad debug panel). */
export function retryAdsNow() {
  if (provider.retryNow) provider.retryNow();
}

/** A level started (the "rewarded ad during this level" mark is cleared). */
export function noteLevelStart() {
  rewardedThisLevel = false;
}

/** A level was won. */
export function noteLevelWin() {
  rec = noteWin(rec);
  save();
}

/**
 * The player leaves the victory screen: show an interstitial when the rules allow it, and wait until it closes.
 * @param {number} level the level just won
 */
export async function maybeInterstitial(level) {
  if (!provider.interstitialReady()) return;
  if (!interstitialDue(rec, { level, now: Date.now(), rewardedThisLevel }, ADS.interstitial)) return;
  rec = noteInterstitial(rec, Date.now());
  save();
  await provider.showInterstitial();
}

/** Show or hide the banner for the visible screen and popups (called on every screen change and popup). */
export function syncBanner() {
  if (!ADS.bannerEnabled || !provider.bannerSlot) return;
  const screen = document.querySelector('.screen.active');
  const modal = !!document.querySelector('.modal.open') || !!document.querySelector('.sim-ad');
  if (screen && bannerAllowed(screen.id, modal, ADS.bannerScreens)) provider.showBanner(bannerMargin());
  else provider.hideBanner();
}

/** Google UMP: does this player need a "Privacy options" entry (EEA, UK)? */
export const privacyOptionsRequired = () => provider.privacyOptionsRequired();

/** Open Google's privacy options form. */
export const showPrivacyOptions = () => provider.showPrivacyOptions();
