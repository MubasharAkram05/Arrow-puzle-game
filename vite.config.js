import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { adDebug, adsRealAllowed, adsSimulated, testUnlockAll } from './scripts/build-flags.mjs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Relative base so the build works from file:// and inside the Capacitor WebView.
export default defineConfig(({ mode }) => {
  const unlock = testUnlockAll({ mode });
  return {
    base: './',
    define: {
      // read by src/config.js (TEST_UNLOCK_ALL); false in release and Vercel production builds
      __TEST_UNLOCK_ALL__: JSON.stringify(unlock),
      // AdMob (src/ads/): real IDs only in an Android release build; simulated ads only on the dev server
      __ADS_REAL_ALLOWED__: JSON.stringify(adsRealAllowed({ mode })),
      __ADS_SIMULATED__: JSON.stringify(adsSimulated({ mode })),
      // the hidden Ad debug panel and the ArrowAds log: debug APK, dev server and tests only
      __AD_DEBUG__: JSON.stringify(adDebug({ mode })),
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      {
        // the flag a build was made with, visible in dist/index.html (checked by tests/releaseFlag.test.js)
        name: 'build-flags',
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { name: 'arrow-build', content: `test-unlock=${unlock} ads-real=${adsRealAllowed({ mode })}` },
          },
        ],
      },
    ],
    build: {
      outDir: 'dist',
      target: 'es2020',
    },
    test: {
      include: ['tests/**/*.test.js'],
      environment: 'node',
    },
  };
});
