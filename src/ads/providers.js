/**
 * Ad providers (3.26.0): the real one (Google AdMob on Android, with UMP consent), a simulated one for the dev
 * server, and "none" for every other web build. They share one shape, used by src/ads/index.js:
 *   name, bannerSlot, init(), rewardedReady(), interstitialReady(), showRewarded(emit), afterRewarded(),
 *   showInterstitial(), showBanner(margin), hideBanner(), privacyOptionsRequired(), showPrivacyOptions()
 * showRewarded reports events with emit('rewarded' | 'dismissed' | 'failed'); the reward is decided from those
 * events only (policy.js runRewarded). retryNow() (optional) tries failed ad loads again at once.
 */
import { ADS } from '../config.js';
import { DEBUG_GEOGRAPHY, consentOutcome, retryDelay, withTimeout } from './policy.js';
import { adDebugSettings, adError, adLog, adStatus, setAdStatus } from './status.js';

/** No ads (web and Vercel builds, or ads switched off). */
export function noneProvider() {
  return {
    name: 'none',
    bannerSlot: false,
    init: async () => {},
    rewardedReady: () => false,
    interstitialReady: () => false,
    showRewarded: (emit) => emit('failed'),
    afterRewarded: () => {},
    showInterstitial: async () => {},
    showBanner: async () => {},
    hideBanner: async () => {},
    privacyOptionsRequired: () => false,
    showPrivacyOptions: async () => {},
  };
}

/**
 * Google AdMob through @capacitor-community/admob (Android).
 * Every step is reported to the ad status (src/ads/status.js: the debug panel and the ArrowAds log). A failed
 * load is tried again with backoff (ADS.retry). Consent (Google UMP) follows policy.js consentOutcome: only a
 * REQUIRED consent that was not given blocks ads; a check that fails or never answers (timeout) does not block
 * test builds, and is tried again in release builds before falling back to non-personalised ads.
 * @param {{mode: 'test'|'real', banner: string, interstitial: string, rewarded: string}} ids
 * @param {() => void} changed called when an ad becomes ready or is used
 * @param {{baseMs: number, maxMs: number}} retry ADS.retry
 * @param {boolean} [bannerOn] BANNER_ENABLED: off by default, so no banner is ever requested
 */
export function admobProvider(ids, changed, retry, bannerOn = false) {
  const isTesting = ids.mode === 'test';
  let AdMob;
  let M; // the plugin module (enums)
  let canRequest = false;
  let npa = false;
  let gate = 'pending'; // the ad gate: 'pending' (consent not settled) | 'allowed' | 'blocked'
  let privacyRequired = false;
  const ready = { rewarded: false, interstitial: false };
  const loading = { rewarded: false, interstitial: false };
  const timers = {};
  const attempts = { rewarded: 0, interstitial: 0, banner: 0 };
  let banner = { want: false, made: false, margin: 0 };
  let showHandles = [];

  /** A load failed: report it and try again after the backoff. */
  function failed(fmt, e, again) {
    const err = adError(e);
    attempts[fmt]++;
    const wait = retryDelay(attempts[fmt], retry);
    clearTimeout(timers[fmt]);
    timers[fmt] = setTimeout(again, wait);
    setAdStatus(fmt, { state: 'failed', ...err, attempts: attempts[fmt], retryAt: Date.now() + wait });
  }
  /** A load worked: reset the backoff. */
  function loaded(fmt) {
    attempts[fmt] = 0;
    setAdStatus(fmt, { state: 'loaded', code: null, message: '', retryAt: 0 });
  }

  async function loadRewarded() {
    if (!canRequest || loading.rewarded || ready.rewarded) return;
    loading.rewarded = true;
    setAdStatus('rewarded', { state: 'loading', retryAt: 0 });
    try {
      await AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting, npa });
      ready.rewarded = true;
      loaded('rewarded');
    } catch (e) {
      ready.rewarded = false;
      failed('rewarded', e, loadRewarded);
    }
    loading.rewarded = false;
    changed();
  }
  async function loadInterstitial() {
    if (!canRequest || loading.interstitial || ready.interstitial) return;
    loading.interstitial = true;
    setAdStatus('interstitial', { state: 'loading', retryAt: 0 });
    try {
      await AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting, npa });
      ready.interstitial = true;
      loaded('interstitial');
    } catch (e) {
      ready.interstitial = false;
      failed('interstitial', e, loadInterstitial);
    }
    loading.interstitial = false;
  }
  async function placeBanner() {
    if (!bannerOn || !canRequest || !banner.want) return;
    try {
      if (banner.made) await AdMob.resumeBanner();
      else {
        banner.made = true;
        setAdStatus('banner', { state: 'loading', retryAt: 0 });
        await AdMob.showBanner({
          adId: ids.banner,
          adSize: M.BannerAdSize.BANNER,
          position: M.BannerAdPosition.BOTTOM_CENTER,
          margin: banner.margin,
          isTesting,
          npa,
        });
      }
    } catch (e) {
      banner.made = false;
      failed('banner', e, retryBanner);
    }
  }
  async function retryBanner() {
    banner.made = false;
    await AdMob.removeBanner().catch(() => {});
    placeBanner();
  }

  /** One UMP request (with the debug geography in debug builds), then the form where it is required. */
  async function askConsent() {
    const opts = {};
    const dbg = __AD_DEBUG__ && isTesting ? adDebugSettings() : null;
    if (dbg && dbg.geography !== 'off') {
      opts.debugGeography = DEBUG_GEOGRAPHY[dbg.geography];
      if (dbg.deviceId) opts.testDeviceIdentifiers = [dbg.deviceId];
    }
    let info = await withTimeout(AdMob.requestConsentInfo(opts), ADS.consent.timeoutMs);
    setAdStatus('consent', consentFields(info));
    // plain strings: the plugin's JS does not export every consent enum (PrivacyOptionsRequirementStatus is
    // missing at runtime), so comparing against M.<Enum> can throw
    if (info.status === 'REQUIRED' && info.isConsentFormAvailable) {
      adLog('consent form: showing');
      info = await AdMob.showConsentForm();
      setAdStatus('consent', consentFields(info));
    }
    return info;
  }
  const consentFields = (info) => ({
    status: info.status,
    formAvailable: info.isConsentFormAvailable ?? null,
    canRequestAds: info.canRequestAds ?? null,
    privacy: info.privacyOptionsRequirementStatus || '',
    error: '',
  });

  /**
   * The ad gate: check consent (retrying in release builds), decide, then load every format that is allowed.
   * One run at a time; whatever happens, the gate ends 'allowed' or 'blocked' with a reason (never stuck).
   */
  let gateRun = null;
  function resolveConsent() {
    if (!gateRun) gateRun = runGate().finally(() => (gateRun = null));
    return gateRun;
  }
  async function runGate() {
    const geography = __AD_DEBUG__ && isTesting ? adDebugSettings().geography : 'off';
    gate = 'pending';
    let out;
    let info;
    for (let attempt = 1; ; attempt++) {
      setAdStatus('consent', { status: 'checking', attempt, geography, decision: '', error: '' });
      info = null;
      try {
        info = await askConsent();
      } catch (e) {
        const err = adError(e);
        setAdStatus('consent', {
          status: 'check failed',
          formAvailable: null,
          canRequestAds: null,
          error: `${err.code !== null ? `code ${err.code}: ` : e && e.code === 'TIMEOUT' ? 'timeout: ' : ''}${err.message}`,
        });
      }
      out = consentOutcome(info, { testing: isTesting, attempt, attempts: ADS.consent.attempts });
      if (out.action !== 'retry') break;
      await new Promise((r) => setTimeout(r, retryDelay(attempt, { baseMs: ADS.consent.retryBaseMs, maxMs: 60000 })));
    }
    // decide first, so the gate and the panel always agree
    gate = out.action === 'allow' ? 'allowed' : 'blocked';
    canRequest = gate === 'allowed';
    npa = out.npa;
    privacyRequired = !!info && info.privacyOptionsRequirementStatus === 'REQUIRED';
    setAdStatus('consent', { canRequest, npa, decision: out.reason });
    try {
      if (!canRequest) {
        banner.made = false;
        ready.rewarded = ready.interstitial = false;
        for (const f of bannerOn ? ['banner', 'interstitial', 'rewarded'] : ['interstitial', 'rewarded'])
          setAdStatus(f, { state: 'blocked', message: out.reason, retryAt: 0 });
        if (bannerOn) await AdMob.removeBanner().catch(() => {});
      }
      changed();
    } finally {
      // consent settled: load every allowed format now
      loadAll();
    }
  }

  /** Load whatever is not loaded or loading yet (each load returns at once when ads are not allowed). */
  function loadAll() {
    for (const fmt of ['rewarded', 'interstitial']) clearTimeout(timers[fmt]);
    loadRewarded();
    loadInterstitial();
    if (banner.want && !banner.made) {
      clearTimeout(timers.banner);
      placeBanner();
    }
  }

  const listenShow = (event, fn) => AdMob.addListener(event, fn).then((h) => showHandles.push(h));
  const unlistenShow = () => {
    showHandles.forEach((h) => h.remove());
    showHandles = [];
  };

  return {
    name: 'admob',
    bannerSlot: bannerOn,
    async init() {
      setAdStatus('provider', `admob (${ids.mode} ids)`);
      setAdStatus('sdk', 'starting');
      M = await import('@capacitor-community/admob');
      AdMob = M.AdMob;
      try {
        await AdMob.initialize({ initializeForTesting: isTesting });
      } catch (e) {
        adStatus.sdkError = adError(e).message;
        setAdStatus('sdk', 'failed');
        throw e;
      }
      setAdStatus('sdk', 'ready');
      // load results and errors come as events too (they carry Google's error code and message)
      AdMob.addListener(M.RewardAdPluginEvents.FailedToLoad, (e) =>
        setAdStatus('rewarded', { state: 'failed', ...adError(e) }),
      );
      AdMob.addListener(M.InterstitialAdPluginEvents.FailedToLoad, (e) =>
        setAdStatus('interstitial', { state: 'failed', ...adError(e) }),
      );
      if (bannerOn) {
        AdMob.addListener(M.BannerAdPluginEvents.Loaded, () => loaded('banner'));
        AdMob.addListener(M.BannerAdPluginEvents.FailedToLoad, (e) => failed('banner', e, retryBanner));
      } else setAdStatus('banner', { state: 'off', message: 'BANNER_ENABLED is false' });
      await resolveConsent();
    },
    /** Ad debug panel: check consent again (after changing the EEA switch); reset first to see the form again. */
    async recheckConsent(reset) {
      if (!AdMob) return;
      if (reset) await AdMob.resetConsentInfo().catch((e) => adLog(`resetConsentInfo failed: ${adError(e).message}`));
      await resolveConsent();
    },
    rewardedReady: () => ready.rewarded,
    interstitialReady: () => ready.interstitial,
    /** "Retry failed loads now" / a "Watch ad" tap with no ad ready: settle the gate if needed, then load. */
    retryNow() {
      if (!AdMob) return;
      if (gate === 'pending') resolveConsent();
      else loadAll();
    },
    showRewarded(emit) {
      ready.rewarded = false;
      setAdStatus('rewarded', { state: 'showing' });
      changed();
      Promise.all([
        listenShow(M.RewardAdPluginEvents.Rewarded, () => emit('rewarded')),
        listenShow(M.RewardAdPluginEvents.Dismissed, () => emit('dismissed')),
        listenShow(M.RewardAdPluginEvents.FailedToShow, (e) => {
          setAdStatus('rewarded', { state: 'failed', ...adError(e) });
          emit('failed');
        }),
      ])
        .then(() => AdMob.showRewardVideoAd())
        .catch((e) => {
          setAdStatus('rewarded', { state: 'failed', ...adError(e) });
          emit('failed');
        });
    },
    afterRewarded() {
      unlistenShow();
      setAdStatus('rewarded', { state: 'idle' });
      loadRewarded();
    },
    async showInterstitial() {
      if (!ready.interstitial) return;
      ready.interstitial = false;
      setAdStatus('interstitial', { state: 'showing' });
      await new Promise((resolve) => {
        Promise.all([
          listenShow(M.InterstitialAdPluginEvents.Dismissed, resolve),
          listenShow(M.InterstitialAdPluginEvents.FailedToShow, resolve),
        ])
          .then(() => AdMob.showInterstitial())
          .catch(resolve);
      });
      unlistenShow();
      setAdStatus('interstitial', { state: 'idle' });
      loadInterstitial();
    },
    async showBanner(margin) {
      if (!bannerOn) return;
      banner = { ...banner, want: true, margin };
      await placeBanner();
    },
    async hideBanner() {
      if (!bannerOn) return;
      banner.want = false;
      if (banner.made) await AdMob.hideBanner().catch(() => {});
    },
    privacyOptionsRequired: () => privacyRequired,
    async showPrivacyOptions() {
      await AdMob.showPrivacyOptionsForm().catch(() => {});
    },
  };
}

/**
 * Simulated ads for the dev server: grey test ads drawn in the page, so every flow (reward, closing early, a
 * failed ad, interstitial, banner) can be tried in a browser. Never used in a Vercel or Android build.
 * @param {() => void} changed
 */
export function simProvider(changed, bannerOn = false) {
  let ready = false;
  let interReady = false;
  let banner = null;
  const reload = () => {
    setAdStatus('rewarded', { state: 'loading' });
    setAdStatus('interstitial', { state: 'loading' });
    setTimeout(() => {
      ready = true;
      interReady = true;
      setAdStatus('rewarded', { state: 'loaded' });
      setAdStatus('interstitial', { state: 'loaded' });
      changed();
    }, 800);
  };

  function overlay(html) {
    const el = document.createElement('div');
    el.className = 'sim-ad';
    el.innerHTML = `<div class="sim-ad-card"><small>TEST AD (simulated)</small>${html}</div>`;
    document.body.appendChild(el);
    return el;
  }

  return {
    name: 'simulated',
    bannerSlot: bannerOn,
    async init() {
      setAdStatus('provider', 'simulated (dev server)');
      setAdStatus('sdk', 'ready');
      setAdStatus('consent', {
        status: 'NOT_REQUIRED',
        formAvailable: false,
        canRequestAds: true,
        canRequest: true,
        npa: false,
        error: '',
        attempt: 1,
        decision: 'simulated ads',
      });
      if (!bannerOn) setAdStatus('banner', { state: 'off', message: 'BANNER_ENABLED is false' });
      reload();
    },
    rewardedReady: () => ready,
    interstitialReady: () => interReady,
    showRewarded(emit) {
      ready = false;
      changed();
      const el = overlay(`<b>Rewarded ad</b><p class="sim-ad-count">Reward in <span>3</span> s</p>
        <div class="sim-ad-actions"><button class="btn" data-sim="close">Close early</button>
        <button class="btn" data-sim="fail">Simulate a failure</button></div>`);
      let n = 3;
      const timer = setInterval(() => {
        n--;
        el.querySelector('.sim-ad-count span').textContent = String(n);
        if (n > 0) return;
        clearInterval(timer);
        el.querySelector('.sim-ad-count').textContent = 'Reward earned';
        emit('rewarded');
        el.querySelector('.sim-ad-actions').innerHTML = '<button class="btn primary" data-sim="close">Close</button>';
      }, 1000);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sim]');
        if (!b) return;
        clearInterval(timer);
        el.remove();
        emit(b.dataset.sim === 'fail' ? 'failed' : 'dismissed');
      });
    },
    afterRewarded: reload,
    async showInterstitial() {
      if (!interReady) return;
      interReady = false;
      await new Promise((resolve) => {
        const el = overlay(
          '<b>Interstitial ad</b><div class="sim-ad-actions"><button class="btn primary">Close</button></div>',
        );
        el.querySelector('button').addEventListener('click', () => {
          el.remove();
          resolve();
        });
      });
      reload();
    },
    async showBanner(margin) {
      if (!bannerOn) return;
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'sim-banner';
        banner.textContent = 'Test banner (simulated)';
        document.body.appendChild(banner);
        setAdStatus('banner', { state: 'loaded' });
      }
      banner.style.bottom = `${margin}px`;
      banner.hidden = false;
    },
    async hideBanner() {
      if (banner) banner.hidden = true;
    },
    privacyOptionsRequired: () => true, // so the Settings button can be seen on the dev server
    async showPrivacyOptions() {
      const el = overlay(
        '<b>Privacy options</b><p>Google\'s consent form shows here on a phone.</p><div class="sim-ad-actions"><button class="btn primary">Close</button></div>',
      );
      el.querySelector('button').addEventListener('click', () => el.remove());
    },
  };
}
