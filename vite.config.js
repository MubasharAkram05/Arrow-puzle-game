import { defineConfig } from 'vite';

// Relative base so the build works from file:// and inside the Capacitor WebView.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
