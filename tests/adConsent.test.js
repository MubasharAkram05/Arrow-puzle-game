/**
 * Google UMP consent (3.26.0): what each answer means for ads in test and release builds, the timeout for a
 * request that never answers, and the AdMob provider's flow with a fake plugin (the Android 12 phone in Pakistan
 * whose requestConsentInfo never answered, a failed request, REQUIRED, release retries, the EEA debug switch).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADS } from '../src/config.js';
import { consentOutcome, withTimeout } from '../src/ads/policy.js';

const T = { testing: true, attempt: 1, attempts: 3 };
const R = (attempt) => ({ testing: false, attempt, attempts: 3 });

describe('consentOutcome', () => {
  it('OBTAINED or NOT_REQUIRED: ads allowed (test and release)', () => {
    for (const o of [T, R(1)]) {
      expect(consentOutcome({ status: 'OBTAINED', canRequestAds: true }, o)).toMatchObject({
        action: 'allow',
        npa: false,
      });
      expect(consentOutcome({ status: 'NOT_REQUIRED', canRequestAds: true }, o)).toMatchObject({
        action: 'allow',
        npa: false,
      });
    }
  });

  it('REQUIRED and not given: never any ads, in test or release builds', () => {
    for (const o of [T, R(1), R(3)])
      expect(consentOutcome({ status: 'REQUIRED', canRequestAds: false }, o).action).toBe('block');
  });

  it('test builds: UNKNOWN or a failed check still give non-personalised test ads at once', () => {
    expect(consentOutcome({ status: 'UNKNOWN', canRequestAds: false }, T)).toMatchObject({
      action: 'allow',
      npa: true,
    });
    expect(consentOutcome(null, T)).toMatchObject({ action: 'allow', npa: true });
  });

  it('release builds: a failed or UNKNOWN check is retried, then falls back to non-personalised ads', () => {
    expect(consentOutcome(null, R(1)).action).toBe('retry');
    expect(consentOutcome({ status: 'UNKNOWN' }, R(2)).action).toBe('retry');
    expect(consentOutcome(null, R(3))).toMatchObject({ action: 'allow', npa: true });
    expect(consentOutcome(null, R(3)).reason).toContain('after 3 tries');
  });
});

describe('withTimeout', () => {
  it('rejects a promise that never settles; passes answers and errors through', async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(withTimeout(Promise.resolve(7), 20)).resolves.toBe(7);
    await expect(withTimeout(Promise.reject(new Error('x')), 20)).rejects.toThrow('x');
  });
});

// ---------- the provider with a fake AdMob plugin ----------

const plugin = vi.hoisted(() => ({ AdMob: null }));
vi.mock('@capacitor-community/admob', () => ({
  get AdMob() {
    return plugin.AdMob;
  },
  AdmobConsentStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED', OBTAINED: 'OBTAINED', UNKNOWN: 'UNKNOWN' },
  PrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
  RewardAdPluginEvents: { FailedToLoad: 'rfail', Rewarded: 'r', Dismissed: 'rd', FailedToShow: 'rfs' },
  InterstitialAdPluginEvents: { FailedToLoad: 'ifail', Dismissed: 'id', FailedToShow: 'ifs' },
  BannerAdPluginEvents: { Loaded: 'bl', FailedToLoad: 'bfail' },
  BannerAdSize: { BANNER: 'BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

/** A fake AdMob plugin; consent answers come from `answers` (a value, an Error, or 'hang'). */
function fakeAdMob(answers) {
  const calls = [];
  let n = 0;
  const api = {
    calls,
    initialize: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove() {} })),
    requestConsentInfo: vi.fn((opts) => {
      calls.push(['consent', opts]);
      const a = answers[Math.min(n++, answers.length - 1)];
      if (a === 'hang') return new Promise(() => {});
      return a instanceof Error ? Promise.reject(a) : Promise.resolve(a);
    }),
    showConsentForm: vi.fn(async () => ({ status: 'OBTAINED', canRequestAds: true })),
    resetConsentInfo: vi.fn(async () => {}),
    prepareRewardVideoAd: vi.fn(async (o) => calls.push(['rewarded', o])),
    prepareInterstitial: vi.fn(async (o) => calls.push(['interstitial', o])),
    showBanner: vi.fn(async (o) => calls.push(['banner', o])),
    removeBanner: vi.fn(async () => {}),
    resumeBanner: vi.fn(async () => {}),
    hideBanner: vi.fn(async () => {}),
  };
  plugin.AdMob = api;
  return api;
}

const TEST_IDS = { mode: 'test', banner: 'b', interstitial: 'i', rewarded: 'r' };
const REAL_IDS = { ...TEST_IDS, mode: 'real' };

async function start(ids, answers) {
  vi.resetModules();
  const api = fakeAdMob(answers);
  const { admobProvider } = await import('../src/ads/providers.js');
  const { adStatus } = await import('../src/ads/status.js');
  const p = admobProvider(ids, () => {}, ADS.retry);
  await p.showBanner(66); // the screen wants a banner (before consent: nothing is placed yet)
  const done = p.init();
  return { api, p, adStatus, done };
}
const loads = (api) => api.calls.filter((c) => c[0] !== 'consent').map((c) => `${c[0]}${c[1].npa ? ':npa' : ''}`);

describe('AdMob provider consent flow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('test build, consent request never answers: times out, then loads all three as non-personalised', async () => {
    const { api, adStatus, done } = await start(TEST_IDS, ['hang']);
    await vi.advanceTimersByTimeAsync(ADS.consent.timeoutMs + 10);
    await done;
    expect(adStatus.consent).toMatchObject({ status: 'check failed', canRequest: true, npa: true });
    expect(adStatus.consent.error).toContain('timeout');
    expect(loads(api).sort()).toEqual(['banner:npa', 'interstitial:npa', 'rewarded:npa']);
  });

  it('test build, request fails: the error is kept and test ads load at once', async () => {
    const { api, adStatus, done } = await start(TEST_IDS, [new Error('Publisher misconfiguration')]);
    await done;
    expect(adStatus.consent.error).toContain('Publisher misconfiguration');
    expect(adStatus.consent.canRequest).toBe(true);
    expect(loads(api)).toHaveLength(3);
  });

  it('NOT_REQUIRED (Pakistan): personalised ads load right after consent', async () => {
    const answer = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true };
    const { api, adStatus, done } = await start(TEST_IDS, [answer]);
    await done;
    expect(adStatus.consent).toMatchObject({ status: 'NOT_REQUIRED', formAvailable: false, canRequestAds: true });
    expect(loads(api).sort()).toEqual(['banner', 'interstitial', 'rewarded']);
  });

  it('REQUIRED: the form shows; if consent is still not given, nothing loads', async () => {
    const { api, adStatus, done } = await start(TEST_IDS, [
      { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false },
    ]);
    api.showConsentForm.mockResolvedValueOnce({ status: 'REQUIRED', canRequestAds: false });
    await done;
    expect(api.showConsentForm).toHaveBeenCalled();
    expect(adStatus.consent.canRequest).toBe(false);
    expect(adStatus.rewarded.state).toBe('blocked');
    expect(loads(api)).toEqual([]);
  });

  it('release build: retries a failed check with backoff, then falls back to non-personalised ads', async () => {
    const { api, adStatus, done } = await start(REAL_IDS, [new Error('offline')]);
    await vi.advanceTimersByTimeAsync(60_000);
    await done;
    expect(api.requestConsentInfo).toHaveBeenCalledTimes(ADS.consent.attempts);
    expect(adStatus.consent).toMatchObject({ canRequest: true, npa: true, attempt: ADS.consent.attempts });
    expect(loads(api)).toHaveLength(3);
  });

  it('release build: a retry that succeeds gives normal ads', async () => {
    const ok = { status: 'OBTAINED', canRequestAds: true };
    const { api, adStatus, done } = await start(REAL_IDS, [new Error('offline'), ok]);
    await vi.advanceTimersByTimeAsync(60_000);
    await done;
    expect(api.requestConsentInfo).toHaveBeenCalledTimes(2);
    expect(adStatus.consent).toMatchObject({ canRequest: true, npa: false });
  });

  it('the EEA switch sends UMP debugGeography and the test device ID (test builds only)', async () => {
    const mem = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    });
    localStorage.setItem('arrowEscape:adDebug', JSON.stringify({ geography: 'eea', deviceId: 'ABC123' }));
    const { api, done } = await start(TEST_IDS, [{ status: 'NOT_REQUIRED', canRequestAds: true }]);
    await done;
    expect(api.calls[0]).toEqual(['consent', { debugGeography: 1, testDeviceIdentifiers: ['ABC123'] }]);
    localStorage.removeItem('arrowEscape:adDebug');
    const rel = await start(REAL_IDS, [{ status: 'NOT_REQUIRED', canRequestAds: true }]);
    await rel.done;
    expect(rel.api.calls[0]).toEqual(['consent', {}]);
    vi.unstubAllGlobals();
  });
});
