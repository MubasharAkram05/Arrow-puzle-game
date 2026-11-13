/**
 * Ads (3.26.0): Google AdMob on Android (test IDs unless RELEASE_ADS, see src/config.js ADS), simulated ads on
 * the dev server, none on the web. This module decides when ads may show; the rules live in policy.js.
 *  - rewarded: free hint, refill a heart, continue after game over, 2x coins; a reward only on the reward event,
 *    at most ADS.rewardedPerDay a day; buttons only while an ad is loaded
 *  - interstitial: only when the player leaves a victory screen (policy.js interstitialDue)
 *  - banner: only on Home, Levels, Shop and Tasks, never with a popup open, in a slot reserved at startup
 * The per-device ad record (daily count, last interstitial, launches) is kept in localStorage.
 */
import { Capacitor } from '@capacitor/core';
import { ADS } from '../config.js';
import { toast } from '../ui/components/toast.js';
import {
  adUnitIds,
  bannerAllowed,
  countRewarded,
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
  const ids = adUnitIds(ADS.ids, __ADS_REAL_ALLOWED__);
  if (Capacitor.isNativePlatform() && ids.mode !== 'off') provider = admobProvider(ids, changed);
  else if (__ADS_SIMULATED__) provider = simProvider(changed);
  if (provider.bannerSlot) {
    document.body.classList.add('ad-slot');
    document.documentElement.style.setProperty('--ad-slot', `${ADS.bannerHeight + ADS.bannerGap}px`);
  }
  try {
    await provider.init();
  } catch {
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
 * Show a rewarded ad. Resolves true only when the ad reported its reward; otherwise the player gets a friendly
 * message and nothing else.
 * @returns {Promise<boolean>}
 */
export async function watchRewardedAd() {
  if (!rewardedAvailable()) {
    toast('No ad available right now. Please try again later.');
    return false;
  }
  busy = true;
  changed();
  const res = await runRewarded((emit) => provider.showRewarded(emit), ADS.rewardedGraceMs);
  provider.afterRewarded();
  busy = false;
  if (!res.rewarded) {
    toast(
      res.reason === 'failed'
        ? "The ad couldn't play. No reward this time."
        : 'Ad closed early, so no reward this time.',
    );
    changed();
    return false;
  }
  rec = countRewarded(rec, Date.now());
  rewardedThisLevel = true;
  save();
  changed();
  return true;
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
  if (!provider.bannerSlot) return;
  const screen = document.querySelector('.screen.active');
  const modal = !!document.querySelector('.modal.open') || !!document.querySelector('.sim-ad');
  if (screen && bannerAllowed(screen.id, modal, ADS.bannerScreens)) provider.showBanner(bannerMargin());
  else provider.hideBanner();
}

/** Google UMP: does this player need a "Privacy options" entry (EEA, UK)? */
export const privacyOptionsRequired = () => provider.privacyOptionsRequired();

/** Open Google's privacy options form. */
export const showPrivacyOptions = () => provider.showPrivacyOptions();
