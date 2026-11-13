/**
 * Ad providers (3.26.0): the real one (Google AdMob on Android, with UMP consent), a simulated one for the dev
 * server, and "none" for every other web build. They share one shape, used by src/ads/index.js:
 *   name, bannerSlot, init(), rewardedReady(), interstitialReady(), showRewarded(emit), afterRewarded(),
 *   showInterstitial(), showBanner(margin), hideBanner(), privacyOptionsRequired(), showPrivacyOptions()
 * showRewarded reports events with emit('rewarded' | 'dismissed' | 'failed'); the reward is decided from those
 * events only (policy.js runRewarded).
 */

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
 * @param {{mode: 'test'|'real', banner: string, interstitial: string, rewarded: string}} ids
 * @param {() => void} changed called when an ad becomes ready or is used
 */
export function admobProvider(ids, changed) {
  const isTesting = ids.mode === 'test';
  let AdMob;
  let M; // the plugin module (enums)
  let canRequest = false;
  let privacyRequired = false;
  let rewardedOk = false;
  let interOk = false;
  let bannerMade = false;
  let handles = [];
  const later = (fn) => setTimeout(fn, 60 * 1000); // retry a failed load after a minute (offline, no fill)

  async function loadRewarded() {
    if (!canRequest) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting });
      rewardedOk = true;
    } catch {
      rewardedOk = false;
      later(loadRewarded);
    }
    changed();
  }
  async function loadInterstitial() {
    if (!canRequest) return;
    try {
      await AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting });
      interOk = true;
    } catch {
      interOk = false;
      later(loadInterstitial);
    }
  }
  const listen = (event, fn) => AdMob.addListener(event, fn).then((h) => handles.push(h));
  const unlisten = () => {
    handles.forEach((h) => h.remove());
    handles = [];
  };

  return {
    name: 'admob',
    bannerSlot: true,
    async init() {
      M = await import('@capacitor-community/admob');
      AdMob = M.AdMob;
      await AdMob.initialize({ initializeForTesting: isTesting });
      // Google UMP: the consent form shows where it is required (EEA, UK); the choice is stored by Google's SDK,
      // which then serves personalised or non-personalised ads accordingly
      let info = await AdMob.requestConsentInfo();
      if (info.status === M.AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable)
        info = await AdMob.showConsentForm();
      canRequest = info.canRequestAds;
      privacyRequired = info.privacyOptionsRequirementStatus === M.PrivacyOptionsRequirementStatus.REQUIRED;
      changed();
      loadRewarded();
      loadInterstitial();
    },
    rewardedReady: () => rewardedOk,
    interstitialReady: () => interOk,
    showRewarded(emit) {
      rewardedOk = false;
      changed();
      Promise.all([
        listen(M.RewardAdPluginEvents.Rewarded, () => emit('rewarded')),
        listen(M.RewardAdPluginEvents.Dismissed, () => emit('dismissed')),
        listen(M.RewardAdPluginEvents.FailedToShow, () => emit('failed')),
      ])
        .then(() => AdMob.showRewardVideoAd())
        .catch(() => emit('failed'));
    },
    afterRewarded() {
      unlisten();
      loadRewarded();
    },
    async showInterstitial() {
      if (!interOk) return;
      interOk = false;
      await new Promise((resolve) => {
        Promise.all([
          listen(M.InterstitialAdPluginEvents.Dismissed, resolve),
          listen(M.InterstitialAdPluginEvents.FailedToShow, resolve),
        ])
          .then(() => AdMob.showInterstitial())
          .catch(resolve);
      });
      unlisten();
      loadInterstitial();
    },
    async showBanner(margin) {
      if (!canRequest) return;
      try {
        if (bannerMade) await AdMob.resumeBanner();
        else {
          bannerMade = true;
          await AdMob.showBanner({
            adId: ids.banner,
            adSize: M.BannerAdSize.BANNER,
            position: M.BannerAdPosition.BOTTOM_CENTER,
            margin,
            isTesting,
          });
        }
      } catch {
        bannerMade = false; // offline or no fill: the slot stays empty and is tried again next time
      }
    },
    async hideBanner() {
      if (bannerMade) await AdMob.hideBanner().catch(() => {});
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
  const reload = () =>
    setTimeout(() => {
      ready = true;
      interReady = true;
      changed();
    }, 800);

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
