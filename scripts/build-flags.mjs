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
