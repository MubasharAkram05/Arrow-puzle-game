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
