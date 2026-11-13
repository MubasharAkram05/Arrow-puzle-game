/**
 * Ad providers (3.26.0): the real one (Google AdMob on Android, with UMP consent), a simulated one for the dev
 * server, and "none" for every other web build. They share one shape, used by src/ads/index.js:
 *   name, bannerSlot, init(), rewardedReady(), interstitialReady(), showRewarded(emit), afterRewarded(),
 *   showInterstitial(), showBanner(margin), hideBanner(), privacyOptionsRequired(), showPrivacyOptions()
 * showRewarded reports events with emit('rewarded' | 'dismissed' | 'failed'); the reward is decided from those
 * events only (policy.js runRewarded). retryNow() (optional) tries failed ad loads again at once.
 */
import { consentDecision, retryDelay } from './policy.js';
import { adError, adStatus, setAdStatus } from './status.js';

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
 * load is tried again with backoff (ADS.retry); the consent check never blocks ads unless consent is REQUIRED and
 * was not given (policy.js consentDecision).
 * @param {{mode: 'test'|'real', banner: string, interstitial: string, rewarded: string}} ids
 * @param {() => void} changed called when an ad becomes ready or is used
 * @param {{baseMs: number, maxMs: number}} retry ADS.retry
 */
export function admobProvider(ids, changed, retry) {
  const isTesting = ids.mode === 'test';
  let AdMob;
  let M; // the plugin module (enums)
  let canRequest = false;
  let npa = false;
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
    if (!canRequest || !banner.want) return;
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

  const listenShow = (event, fn) => AdMob.addListener(event, fn).then((h) => showHandles.push(h));
  const unlistenShow = () => {
    showHandles.forEach((h) => h.remove());
    showHandles = [];
  };

  return {
    name: 'admob',
    bannerSlot: true,
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
      AdMob.addListener(M.BannerAdPluginEvents.Loaded, () => loaded('banner'));
      AdMob.addListener(M.BannerAdPluginEvents.FailedToLoad, (e) => failed('banner', e, retryBanner));
      // Google UMP: the form shows only where consent is required (EEA, UK). If the check fails (offline, or
      // the test App ID), ads are still requested, non-personalised (policy.js consentDecision).
      let info = null;
      let error = '';
      try {
        info = await AdMob.requestConsentInfo();
        if (info.status === M.AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable)
          info = await AdMob.showConsentForm();
      } catch (e) {
        error = adError(e).message;
      }
      ({ canRequest, npa } = consentDecision(info));
      privacyRequired = !!info && info.privacyOptionsRequirementStatus === M.PrivacyOptionsRequirementStatus.REQUIRED;
      setAdStatus('consent', { status: info ? info.status : 'check failed', canRequest, npa, error });
      if (!canRequest) {
        for (const f of ['banner', 'interstitial', 'rewarded'])
          setAdStatus(f, { state: 'blocked', message: 'consent required and not given' });
      }
      changed();
      loadRewarded();
      loadInterstitial();
      placeBanner();
    },
    rewardedReady: () => ready.rewarded,
    interstitialReady: () => ready.interstitial,
    /** Try the loads that failed now (a player tapped a "Watch ad" button while no ad was ready). */
    retryNow() {
      if (!canRequest) return;
      for (const [fmt, load] of [
        ['rewarded', loadRewarded],
        ['interstitial', loadInterstitial],
      ]) {
        if (!ready[fmt] && !loading[fmt]) {
          clearTimeout(timers[fmt]);
          load();
        }
      }
      if (banner.want && !banner.made) {
        clearTimeout(timers.banner);
        retryBanner();
      }
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
      banner = { ...banner, want: true, margin };
      await placeBanner();
    },
    async hideBanner() {
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
export function simProvider(changed) {
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
    bannerSlot: true,
    async init() {
      setAdStatus('provider', 'simulated (dev server)');
      setAdStatus('sdk', 'ready');
      setAdStatus('consent', { status: 'NOT_REQUIRED', canRequest: true, npa: false, error: '' });
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
