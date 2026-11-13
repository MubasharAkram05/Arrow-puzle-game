/**
 * Ads (3.26.0): test IDs unless RELEASE_ADS in a release build, rewards only on the reward event, the daily cap,
 * the interstitial rules and where the banner may show.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADS, RELEASE_ADS } from '../src/config.js';
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
} from '../src/ads/policy.js';
import { adsRealAllowed, adsSimulated } from '../scripts/build-flags.mjs';

const TEST = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};
const REAL = {
  appId: 'ca-app-pub-1234567890123456~1111111111',
  banner: 'ca-app-pub-1234567890123456/2222222222',
  interstitial: 'ca-app-pub-1234567890123456/3333333333',
  rewarded: 'ca-app-pub-1234567890123456/4444444444',
};
const at = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();
const NOW = at(2026, 10, 13);
const MIN = 60 * 1000;

describe('ad IDs', () => {
  it("ships with RELEASE_ADS false and Google's official test IDs", () => {
    expect(RELEASE_ADS).toBe(false);
    expect(ADS.ids.test).toEqual(TEST);
    for (const k of ['appId', 'banner', 'interstitial', 'rewarded']) expect(ADS.ids.real[k]).toMatch(/^REAL_/);
  });

  it('test IDs whenever RELEASE_ADS is false, in every build', () => {
    const ids = { releaseAds: false, test: TEST, real: REAL };
    for (const realAllowed of [true, false]) expect(adUnitIds(ids, realAllowed)).toEqual({ mode: 'test', ...TEST });
  });

  it('real IDs only with RELEASE_ADS in a release build; never in dev, preview or debug builds', () => {
    const ids = { releaseAds: true, test: TEST, real: REAL };
    expect(adUnitIds(ids, true)).toEqual({ mode: 'real', ...REAL });
    expect(adUnitIds(ids, false)).toEqual({ mode: 'test', ...TEST });
    expect(adsRealAllowed({ mode: 'release', env: {} })).toBe(true);
    for (const mode of ['development', 'production', 'test']) expect(adsRealAllowed({ mode, env: {} })).toBe(false);
    expect(adsRealAllowed({ mode: 'release', env: { ARROW_TEST_ADS: '1' } })).toBe(false); // debug APK
  });

  it('a release build with a placeholder left shows no ads at all', () => {
    const ids = { releaseAds: true, test: TEST, real: { ...REAL, rewarded: 'REAL_REWARDED_ID' } };
    expect(adUnitIds(ids, true)).toEqual({ mode: 'off' });
  });

  it('simulated ads only on the dev server; other web builds show none', () => {
    expect(adsSimulated({ mode: 'development' })).toBe(true);
    for (const mode of ['production', 'release', 'test']) expect(adsSimulated({ mode })).toBe(false);
  });

  it('Gradle uses the test App ID for debug builds and real only for release with RELEASE_ADS', () => {
    const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
    expect(gradle).toContain("parse(file('../../src/ads.config.json'))");
    expect(gradle).toMatch(/debug \{[\s\S]*?admobAppId: ads\.test\.appId/);
    const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
    expect(manifest).toContain('android:name="com.google.android.gms.ads.APPLICATION_ID"');
    expect(manifest).toContain('android:value="${admobAppId}"');
    expect(manifest).toContain('com.google.android.gms.permission.AD_ID');
    const wf = readFileSync(new URL('../.github/workflows/android-release.yml', import.meta.url), 'utf8');
    expect(wf).toContain('export ARROW_TEST_ADS=1'); // the debug APK keeps the test IDs
  });
});

describe('rewarded ads: a reward only on the reward event', () => {
  /** A fake ad that reports these events in order, each a tick apart. */
  const fake = (events) => (emit) => events.forEach((e, i) => setTimeout(() => emit(e), i * 5));

  it('watched to the end: rewarded', async () => {
    expect(await runRewarded(fake(['rewarded', 'dismissed']))).toEqual({ rewarded: true, reason: null });
  });

  it('closed early: no reward', async () => {
    expect(await runRewarded(fake(['dismissed']))).toEqual({ rewarded: false, reason: 'closed' });
  });

  it('failed to load or show: no reward', async () => {
    expect(await runRewarded(fake(['failed']))).toEqual({ rewarded: false, reason: 'failed' });
    expect(
      await runRewarded(() => {
        throw new Error('plugin missing');
      }),
    ).toEqual({ rewarded: false, reason: 'failed' });
  });

  it('a reward reported just after the ad closed still counts (grace period)', async () => {
    const late = (emit) => {
      emit('dismissed');
      setTimeout(() => emit('rewarded'), 10);
    };
    expect(await runRewarded(late, 50)).toEqual({ rewarded: true, reason: null });
    expect(await runRewarded(late, 0)).toEqual({ rewarded: false, reason: 'closed' });
  });
});

describe('daily cap', () => {
  it(`at most ${ADS.rewardedPerDay} rewarded ads a day, fresh the next local day`, () => {
    expect(ADS.rewardedPerDay).toBe(10);
    let rec = newAdRecord();
    expect(rewardedLeft(rec, NOW, 10)).toBe(10);
    for (let i = 0; i < 10; i++) rec = countRewarded(rec, NOW + i * MIN);
    expect(rewardedLeft(rec, NOW + 20 * MIN, 10)).toBe(0);
    expect(rewardedLeft(rec, at(2026, 10, 14, 0), 10)).toBe(10); // midnight: a new day
    rec = countRewarded(rec, at(2026, 10, 14, 9));
    expect(rewardedLeft(rec, at(2026, 10, 14, 10), 10)).toBe(9);
  });

  it('moving the clock back gives no extra ads', () => {
    let rec = newAdRecord();
    for (let i = 0; i < 10; i++) rec = countRewarded(rec, NOW);
    expect(rewardedLeft(rec, at(2026, 10, 10), 10)).toBe(0);
  });

  it('a broken stored record falls back to the defaults', () => {
    expect(sanitizeAdRecord({ rewardedToday: -4, day: 'x', launches: 3 })).toEqual({ ...newAdRecord(), launches: 3 });
    expect(sanitizeAdRecord(null)).toEqual(newAdRecord());
  });
});

describe('interstitial rules', () => {
  const cfg = ADS.interstitial;
  const ready = () => {
    let rec = noteLaunch(noteLaunch(newAdRecord())); // second app session
    for (let i = 0; i < 3; i++) rec = noteWin(rec);
    return rec;
  };

  it('config: from level 10, every 3 levels, 6 minutes apart', () => {
    expect(cfg).toEqual({ fromLevel: 10, everyLevels: 3, minGapMs: 6 * MIN });
  });

  it('only from level 10', () => {
    expect(interstitialDue(ready(), { level: 9, now: NOW, rewardedThisLevel: false }, cfg)).toBe(false);
    expect(interstitialDue(ready(), { level: 10, now: NOW, rewardedThisLevel: false }, cfg)).toBe(true);
  });

  it('at most every 3 level wins and 6 minutes apart', () => {
    let rec = noteInterstitial(ready(), NOW);
    rec = noteWin(noteWin(rec));
    expect(interstitialDue(rec, { level: 30, now: NOW + 10 * MIN, rewardedThisLevel: false }, cfg)).toBe(false); // 2 wins
    rec = noteWin(rec);
    expect(interstitialDue(rec, { level: 31, now: NOW + 5 * MIN, rewardedThisLevel: false }, cfg)).toBe(false); // 5 min
    expect(interstitialDue(rec, { level: 31, now: NOW + 6 * MIN, rewardedThisLevel: false }, cfg)).toBe(true);
    expect(interstitialDue(rec, { level: 31, now: NOW - MIN, rewardedThisLevel: false }, cfg)).toBe(false); // clock back
  });

  it('never right after a rewarded ad, never in the first app session', () => {
    expect(interstitialDue(ready(), { level: 40, now: NOW, rewardedThisLevel: true }, cfg)).toBe(false);
    let first = noteLaunch(newAdRecord());
    for (let i = 0; i < 9; i++) first = noteWin(first);
    expect(interstitialDue(first, { level: 40, now: NOW, rewardedThisLevel: false }, cfg)).toBe(false);
  });

  it('never during gameplay: only shown when the victory screen is left', () => {
    const victory = readFileSync(new URL('../src/ui/modals/victory.js', import.meta.url), 'utf8');
    expect(victory).toContain('await maybeInterstitial(wonLevel);');
    const callers = ['src/game/game.js', 'src/ui/screens/game.js', 'src/ui/modals/gameover.js'].map((f) =>
      readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'),
    );
    for (const c of callers) expect(c).not.toContain('maybeInterstitial');
  });
});

describe('banner', () => {
  const screens = ADS.bannerScreens;

  it('only on Home, Levels, Shop and Tasks', () => {
    expect([...screens]).toEqual(['screen-home', 'screen-levels', 'screen-shop', 'screen-tasks']);
    for (const s of screens) expect(bannerAllowed(s, false, screens), s).toBe(true);
  });

  it('never on the game screen, Profile, a popup or the victory screen', () => {
    expect(bannerAllowed('screen-game', false, screens)).toBe(false);
    expect(bannerAllowed('screen-profile', false, screens)).toBe(false);
    for (const s of screens) expect(bannerAllowed(s, true, screens), `${s} with a popup`).toBe(false);
  });

  it('a fixed slot (BANNER 320 x 50) with a gap above the bottom nav', () => {
    expect(ADS.bannerHeight).toBe(50);
    expect(ADS.bannerGap).toBeGreaterThanOrEqual(8);
    expect(readFileSync(new URL('../src/ads/providers.js', import.meta.url), 'utf8')).toContain(
      'M.BannerAdSize.BANNER',
    );
  });
});

describe('Out of Hearts popup (3.26.0)', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const popup = html.slice(html.indexOf('id="modal-gameover"'), html.indexOf('<!-- Victory -->'));

  it('three options in order: +1 heart for diamonds, watch ad for +1 heart, try again', () => {
    const ids = [...popup.matchAll(/<button[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(['btn-heart-gems', 'btn-heart-ad', 'btn-tryagain']);
    expect(popup).toContain('+1 heart');
    expect(popup).toContain('Watch ad: +1 heart');
    expect(popup).not.toContain('Refill heart');
    expect(popup).not.toContain('Continue');
  });
});
