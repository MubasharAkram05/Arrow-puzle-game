import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'android/', 'ios/', 'legacy/', 'node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // __TEST_UNLOCK_ALL__ is replaced at build time (vite.config.js define)
      globals: {
        ...globals.browser,
        __TEST_UNLOCK_ALL__: 'readonly',
        __ADS_REAL_ALLOWED__: 'readonly',
        __ADS_SIMULATED__: 'readonly',
        __AD_DEBUG__: 'readonly',
        __WEB_AD_UI__: 'readonly',
        __APP_VERSION__: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['src/engine/**/*.js'],
    languageOptions: { globals: {} },
    rules: {
      // engine must stay pure: no DOM access
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
    },
  },
  {
    // store screenshots (Playwright, CommonJS): Node code, plus callbacks that run in the page
    files: ['scripts/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**/*.js', '*.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
];
