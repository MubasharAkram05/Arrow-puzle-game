/**
 * Release mode (3.25.0): TEST_UNLOCK_ALL comes from the build. It is on only in the dev server, tests and
 * Vercel preview builds, and always off in release (Android) and Vercel production builds.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { testUnlockAll } from '../scripts/build-flags.mjs';

describe('TEST_UNLOCK_ALL per build', () => {
  it('on in dev, tests and Vercel previews; off in release, Vercel production and plain builds', () => {
    expect(testUnlockAll({ mode: 'development', env: {} })).toBe(true);
    expect(testUnlockAll({ mode: 'test', env: {} })).toBe(true);
    expect(testUnlockAll({ mode: 'production', env: { VERCEL_ENV: 'preview' } })).toBe(true);
    expect(testUnlockAll({ mode: 'production', env: { VERCEL_ENV: 'production' } })).toBe(false);
    expect(testUnlockAll({ mode: 'production', env: {} })).toBe(false);
    expect(testUnlockAll({ mode: 'release', env: {} })).toBe(false);
  });

  it('nothing turns it on in a release build', () => {
    for (const env of [
      { VERCEL_ENV: 'preview' },
      { ARROW_TEST_UNLOCK: '1' },
      { VERCEL_ENV: 'preview', ARROW_TEST_UNLOCK: '1' },
    ])
      expect(testUnlockAll({ mode: 'release', env })).toBe(false);
    expect(testUnlockAll({ mode: 'production', env: { VERCEL_ENV: 'production', ARROW_TEST_UNLOCK: '1' } })).toBe(
      false,
    );
    // the store screenshots switch it off on the dev server
    expect(testUnlockAll({ mode: 'development', env: { ARROW_TEST_UNLOCK: '0' } })).toBe(false);
  });

  it('the release build has it false (and the TEST MODE badge can never show)', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'arrow-release-'));
    const before = process.env.ARROW_TEST_UNLOCK;
    process.env.ARROW_TEST_UNLOCK = '1'; // even when asked for, a release build stays off
    try {
      await build({ mode: 'release', logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
    } finally {
      if (before === undefined) delete process.env.ARROW_TEST_UNLOCK;
      else process.env.ARROW_TEST_UNLOCK = before;
    }
    try {
      const html = readFileSync(path.join(out, 'index.html'), 'utf8');
      expect(html).toContain('<meta name="arrow-build" content="test-unlock=false">');
      const js = readdirSync(path.join(out, 'assets'))
        .filter((f) => f.endsWith('.js'))
        .map((f) => readFileSync(path.join(out, 'assets', f), 'utf8'))
        .join('\n');
      expect(js).not.toContain('__TEST_UNLOCK_ALL__'); // replaced at build time
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 60000);
});
