/**
 * Build-time flags (3.25.0), used by vite.config.js and tested in tests/releaseFlag.test.js.
 *
 * TEST_UNLOCK_ALL (every level playable, "TEST MODE" badge on Home):
 *   - release mode (`vite build --mode release`: Android builds) -> always false, nothing can turn it on
 *   - Vercel production (VERCEL_ENV=production)                  -> always false
 *   - ARROW_TEST_UNLOCK=0 / 1                                    -> forced off / on (store screenshots use 0)
 *   - dev server, tests, Vercel preview builds                   -> true
 *   - any other build (plain `npm run build`)                    -> false
 * @param {{mode: string, env?: Record<string, string|undefined>}} o
 * @returns {boolean}
 */
export function testUnlockAll({ mode, env = process.env }) {
  if (mode === 'release' || env.VERCEL_ENV === 'production') return false;
  if (env.ARROW_TEST_UNLOCK === '0') return false;
  if (env.ARROW_TEST_UNLOCK === '1') return true;
  if (mode === 'development' || mode === 'test') return true;
  return env.VERCEL_ENV === 'preview';
}

/**
 * May this build use the real AdMob IDs (3.26.0)? Only an Android release build (`vite build --mode release`),
 * and not when ARROW_TEST_ADS=1 (the debug APK in the android-release workflow). Even then the real IDs are used
 * only when RELEASE_ADS is true in src/ads.config.json (see src/ads/policy.js adUnitIds).
 * @param {{mode: string, env?: Record<string, string|undefined>}} o
 * @returns {boolean}
 */
export function adsRealAllowed({ mode, env = process.env }) {
  return mode === 'release' && env.ARROW_TEST_ADS !== '1';
}

/**
 * Simulated ads on the web (3.26.0): only on the dev server, so the rewarded / interstitial / banner flows can be
 * tried in a browser. Every other web build (Vercel preview and production) shows no ads.
 * @param {{mode: string}} o
 * @returns {boolean}
 */
export function adsSimulated({ mode }) {
  return mode === 'development';
}

/**
 * The hidden "Ad debug" panel and the ArrowAds log (3.26.0): the debug APK (ARROW_TEST_ADS=1), the dev server and
 * tests. Never in the release AAB, Vercel preview or production.
 * @param {{mode: string, env?: Record<string, string|undefined>}} o
 * @returns {boolean}
 */
export function adDebug({ mode, env = process.env }) {
  return env.ARROW_TEST_ADS === '1' || mode === 'development' || mode === 'test';
}

/**
 * Ad buttons and rows on the web (3.28.0). The web never has ads (only the Android app does), so production web
 * builds (Vercel production, or any plain web build) hide every "Watch ad" button and row. The dev server
 * (simulated ads), tests and Vercel previews keep them, so the flows can still be tried. The Android app shows
 * them whatever this flag says (src/ads/index.js adUiShown).
 * @param {{mode: string, env?: Record<string, string|undefined>}} o
 * @returns {boolean}
 */
export function webAdUi({ mode, env = process.env }) {
  if (mode === 'development' || mode === 'test') return true;
  return env.VERCEL_ENV === 'preview';
}
