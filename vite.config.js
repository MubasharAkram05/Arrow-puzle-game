import { defineConfig } from 'vite';
import { testUnlockAll } from './scripts/build-flags.mjs';

// Relative base so the build works from file:// and inside the Capacitor WebView.
export default defineConfig(({ mode }) => {
  const unlock = testUnlockAll({ mode });
  return {
    base: './',
    define: {
      // read by src/config.js (TEST_UNLOCK_ALL); false in release and Vercel production builds
      __TEST_UNLOCK_ALL__: JSON.stringify(unlock),
    },
    plugins: [
      {
        // the flag a build was made with, visible in dist/index.html (checked by tests/releaseFlag.test.js)
        name: 'build-flags',
        transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'arrow-build', content: `test-unlock=${unlock}` } }],
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
