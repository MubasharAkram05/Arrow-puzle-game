/**
 * Shop "Watch ad" rewards and ad diagnostics (3.26.0): +1 diamond (5 a day), +1 hint (10), +40 coins (10), the
 * overall cap of 30, the retry backoff and the consent rule that keeps ads on when the consent check fails.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADS } from '../src/config.js';
import {
  consentDecision,
  countRewarded,
  earnOffer,
  earnedToday,
  newAdRecord,
  retryDelay,
  rewardedLeft,
  sanitizeAdRecord,
} from '../src/ads/policy.js';
import { adEarn } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { adDebug } from '../scripts/build-flags.mjs';

const at = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();
const NOW = at(2026, 10, 13);
const offer = (rec, kind, ready = true, now = NOW) => earnOffer(rec, { now, kind, ready }, ADS);
const watch = (rec, kind, n, now = NOW) => {
  for (let i = 0; i < n; i++) rec = countRewarded(rec, now, kind);
  return rec;
};

describe('config', () => {
  it('limits and amounts live in ADS', () => {
    expect(ADS.rewardedPerDay).toBe(30);
    expect(ADS.earn.diamond).toEqual({ amount: 1, perDay: 5 });
    expect(ADS.earn.hint).toEqual({ amount: 1, perDay: 10 });
    expect(ADS.earn.coins).toEqual({ amount: 40, perDay: 10 });
  });
});

describe('per-kind daily limits', () => {
  it('+1 diamond: 5 a day, then "limit"; x/5 counts up', () => {
    let rec = newAdRecord();
    expect(offer(rec, 'diamond')).toEqual({ state: 'ready', used: 0, cap: 5 });
    rec = watch(rec, 'diamond', 4);
    expect(offer(rec, 'diamond')).toEqual({ state: 'ready', used: 4, cap: 5 });
    rec = watch(rec, 'diamond', 1);
    expect(offer(rec, 'diamond')).toEqual({ state: 'limit', used: 5, cap: 5 });
    // other kinds are not affected
    expect(offer(rec, 'coins').state).toBe('ready');
    expect(offer(rec, 'hint').state).toBe('ready');
  });

  it('+1 hint and +40 coins: 10 a day each', () => {
    let rec = watch(newAdRecord(), 'hint', 10);
    expect(offer(rec, 'hint')).toMatchObject({ state: 'limit', used: 10, cap: 10 });
    rec = watch(rec, 'coins', 9);
    expect(offer(rec, 'coins')).toMatchObject({ state: 'ready', used: 9, cap: 10 });
  });

  it('no ad loaded: "noad" (the limit wins when both apply)', () => {
    const rec = newAdRecord();
    expect(offer(rec, 'coins', false).state).toBe('noad');
    expect(offer(watch(rec, 'diamond', 5), 'diamond', false).state).toBe('limit');
  });

  it('the overall cap of 30 a day also stops every kind', () => {
    let rec = watch(newAdRecord(), undefined, 29); // game ads: hints in levels, hearts, 2x coins
    expect(offer(rec, 'coins').state).toBe('ready');
    rec = watch(rec, undefined, 1);
    expect(rewardedLeft(rec, NOW, ADS.rewardedPerDay)).toBe(0);
    expect(offer(rec, 'coins')).toMatchObject({ state: 'limit', used: 0 });
  });

  it('a new local day starts every count again', () => {
    const rec = watch(watch(newAdRecord(), 'diamond', 5), 'coins', 10);
    const tomorrow = at(2026, 10, 14, 9);
    expect(earnedToday(rec, tomorrow, 'diamond')).toBe(0);
    expect(offer(rec, 'diamond', true, tomorrow)).toEqual({ state: 'ready', used: 0, cap: 5 });
    const next = countRewarded(rec, tomorrow, 'coins');
    expect(next).toMatchObject({ rewardedToday: 1, earnCoins: 1, earnDiamond: 0, earnHint: 0 });
  });

  it('counts survive a stored record; broken values become 0', () => {
    const rec = watch(newAdRecord(), 'hint', 3);
    expect(sanitizeAdRecord(JSON.parse(JSON.stringify(rec)))).toEqual(rec);
    expect(sanitizeAdRecord({ earnHint: -2, earnCoins: 'x' })).toMatchObject({ earnHint: 0, earnCoins: 0 });
  });
});

describe('rewards (only after the ad completed)', () => {
  beforeEach(() => Object.assign(state, { coins: 100, diamonds: 2, hints: 0 }));

  it('+1 diamond, +1 hint, +40 coins', () => {
    expect(adEarn('diamond')).toBe(1);
    expect(adEarn('hint')).toBe(1);
    expect(adEarn('coins')).toBe(40);
    expect(state).toMatchObject({ diamonds: 3, hints: 1, coins: 140 });
  });
});

describe('shop rows', () => {
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

  it('Offers has +1 diamond and +40 coins (no more "Coming soon"); Hints has +1 hint first', () => {
    const offers = src('ui/screens/shop/offersTab.js');
    expect(offers).toContain("earnRow('diamond')");
    expect(offers).toContain("earnRow('coins')");
    expect(offers).not.toContain('Coming soon');
    const hints = src('ui/screens/shop/hintsTab.js');
    expect(hints.indexOf("earnRow('hint')")).toBeLessThan(hints.indexOf("section('Buy hints'"));
  });

  it('the two messages', () => {
    const ads = src('ads/index.js');
    expect(ads).toContain("'No ad right now, try again in a moment'");
    expect(ads).toContain("'Daily limit reached, come back tomorrow'");
  });

  it('the hint ad is the main option in a level and counts as a hint ad', () => {
    const game = src('ui/screens/game.js');
    expect(game).toMatch(/kind: 'hint',\s*main: true/);
  });
});

describe('ad loading and diagnostics', () => {
  it('failed loads are retried with backoff: 5 s, 10 s, 20 s ... at most 5 minutes', () => {
    expect([1, 2, 3, 4].map((n) => retryDelay(n, ADS.retry))).toEqual([5000, 10000, 20000, 40000]);
    expect(retryDelay(10, ADS.retry)).toBe(5 * 60 * 1000);
    expect(retryDelay(1000, ADS.retry)).toBe(5 * 60 * 1000);
  });

  it('consent: only a REQUIRED consent that was not given blocks ads; a failed check still requests ads', () => {
    expect(consentDecision({ status: 'NOT_REQUIRED', canRequestAds: true })).toEqual({ canRequest: true, npa: false });
    expect(consentDecision({ status: 'OBTAINED', canRequestAds: true })).toEqual({ canRequest: true, npa: false });
    expect(consentDecision({ status: 'REQUIRED', canRequestAds: false })).toEqual({ canRequest: false, npa: false });
    expect(consentDecision(null)).toEqual({ canRequest: true, npa: true }); // e.g. the test App ID error
    expect(consentDecision({ status: 'UNKNOWN', canRequestAds: false })).toEqual({ canRequest: true, npa: true });
  });

  it('the Ad debug panel exists only in the debug APK, the dev server and tests', () => {
    expect(adDebug({ mode: 'release', env: { ARROW_TEST_ADS: '1' } })).toBe(true); // debug APK
    expect(adDebug({ mode: 'release', env: {} })).toBe(false); // release AAB
    expect(adDebug({ mode: 'production', env: {} })).toBe(false); // Vercel
    expect(adDebug({ mode: 'development', env: {} })).toBe(true);
  });

  it('the native ArrowAds logger is registered before the bridge starts', () => {
    const main = readFileSync(
      new URL('../android/app/src/main/java/com/sussal/arrowexpert/MainActivity.java', import.meta.url),
      'utf8',
    );
    expect(main.indexOf('registerPlugin(ArrowLogPlugin.class)')).toBeLessThan(main.indexOf('super.onCreate'));
    const plugin = readFileSync(
      new URL('../android/app/src/main/java/com/sussal/arrowexpert/ArrowLogPlugin.java', import.meta.url),
      'utf8',
    );
    expect(plugin).toContain('@CapacitorPlugin(name = "ArrowLog")');
    expect(plugin).toContain('Log.i("ArrowAds"');
  });

  it('CI checks that the debug APK carries the test AdMob App ID', () => {
    const NS = 'http://schemas.android.com/apk/res/android:';
    const dump = (value) => `N: android=http://schemas.android.com/apk/res/android (line=2)
  E: manifest (line=2)
    E: application (line=10)
      E: meta-data (line=12)
        A: ${NS}name(0x01010003)="com.google.android.gms.ads.APPLICATION_ID" (Raw: "com.google.android.gms.ads.APPLICATION_ID")
        A: ${NS}value(0x01010024)="${value}" (Raw: "${value}")
`;
    const run = (value) =>
      spawnSync(
        'python3',
        [
          new URL('../scripts/check-apk-manifest.py', import.meta.url).pathname,
          'com.google.android.gms.ads.APPLICATION_ID=ca-app-pub-3940256099942544~3347511713',
        ],
        { input: dump(value), encoding: 'utf8' },
      );
    expect(run('ca-app-pub-3940256099942544~3347511713').status).toBe(0);
    const bad = run('${admobAppId}');
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('expected');
    const wf = readFileSync(new URL('../.github/workflows/android-release.yml', import.meta.url), 'utf8');
    expect(wf).toContain('EXPECT_ADMOB_APP_ID: ca-app-pub-3940256099942544~3347511713');
  });
});
