import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPlayable, isTestPlay, testPlaySummary } from '../src/game/unlock.js';

const progress = { unlocked: 7 };

describe('TEST_UNLOCK_ALL (pure checks)', () => {
  it('flag off: only unlocked levels are playable, nothing is a test play', () => {
    expect(isPlayable(1, progress, false)).toBe(true);
    expect(isPlayable(7, progress, false)).toBe(true);
    expect(isPlayable(8, progress, false)).toBe(false);
    expect(isPlayable(500, progress, false)).toBe(false);
    expect(isTestPlay(500, progress, false)).toBe(false);
  });

  it('flag on: every level is playable; only levels past the real unlock are test plays', () => {
    expect(isPlayable(8, progress, true)).toBe(true);
    expect(isPlayable(500, progress, true)).toBe(true);
    expect(isTestPlay(7, progress, true)).toBe(false);
    expect(isTestPlay(8, progress, true)).toBe(true);
  });

  it('a test play pays nothing and keeps the wallet', () => {
    const s = testPlaySummary({ coins: 120, diamonds: 3 });
    expect(s.reward).toMatchObject({ coins: 0, diamonds: 0, perfect: false, chapter: false });
    expect(s.xp).toBe(0);
    expect(s.before).toEqual({ coins: 120, diamonds: 3 });
  });
});

/** Load the game modules with the flag set to `on` (fresh module graph each time). */
async function withFlag(on) {
  vi.resetModules();
  vi.doMock('../src/config.js', async (orig) => ({ ...(await orig()), TEST_UNLOCK_ALL: on }));
  const { state } = await import('../src/game/state.js');
  const { applySave, snapshot } = await import('../src/storage/save.js');
  const { defaultSave } = await import('../src/storage/schema.js');
  const rewards = await import('../src/game/rewards.js');
  const unlock = await import('../src/game/unlock.js');
  applySave({
    ...defaultSave(),
    progress: { current: 4, unlocked: 4, completed: [1, 2, 3] },
    wallet: { diamonds: 50 },
  });
  return { state, snapshot, rewards, ...unlock };
}

describe('TEST_UNLOCK_ALL (game state)', () => {
  afterEach(() => {
    vi.doUnmock('../src/config.js');
    vi.resetModules();
  });

  it('flag on: locked levels open as test plays and progress is untouched', async () => {
    const g = await withFlag(true);
    const before = JSON.stringify(g.snapshot());
    expect(g.isPlayable(30, g.state.progress)).toBe(true);
    expect(g.isTestPlay(30, g.state.progress)).toBe(true);
    expect(JSON.stringify(g.snapshot())).toBe(before);
    expect(g.state.diamonds).toBe(50);
  });

  it('flag off: the normal lock state is back', async () => {
    const g = await withFlag(false);
    expect(g.isPlayable(4, g.state.progress)).toBe(true);
    expect(g.isPlayable(5, g.state.progress)).toBe(false);
    expect(g.isPlayable(30, g.state.progress)).toBe(false);
    expect(g.isTestPlay(30, g.state.progress)).toBe(false);
  });

  it('nothing you can buy unlocks a level: only winning the current level does', async () => {
    const g = await withFlag(false);
    g.state.coins = 10_000;
    g.state.diamonds = 10_000;
    g.state.hearts = 0;
    g.state.maxHearts = 3;
    g.state.refillsUsed = 0;
    expect(g.rewards.skipLevel).toBeUndefined();
    g.rewards.refillHeart();
    g.rewards.buyContinue();
    g.rewards.buyHints({ coins: 50 });
    expect(g.state.progress.unlocked).toBe(4);
    expect(g.isPlayable(5, g.state.progress)).toBe(false);
  });
});

describe('skip level is gone', () => {
  const files = (dir) =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  const src = files('src').filter((f) => f.endsWith('.js'));

  it('no price, button, icon or function for skipping', async () => {
    const { PRICES } = await import('../src/config.js');
    expect(PRICES).not.toHaveProperty('skipLevel');
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/btn-skip|i-skip|Skip level/);
    for (const f of src) expect(readFileSync(f, 'utf8'), f).not.toMatch(/skipLevel|btn-skip|i-skip/);
  });

  it('the unlocked level is only raised where a level is won', () => {
    const writers = src.filter((f) => /\.unlocked\s*=[^=]/.test(readFileSync(f, 'utf8')));
    expect(writers.map((f) => f.replace(/\\/g, '/'))).toEqual(['src/game/game.js']);
    const game = readFileSync('src/game/game.js', 'utf8');
    const at = game.indexOf('.unlocked =');
    // the only write sits in onLevelWon, after the win is recorded
    expect(game.lastIndexOf('function ', at)).toBe(game.lastIndexOf('function onLevelWon', at));
  });

  it('levels skipped in an old save stay completed', async () => {
    const { sanitize } = await import('../src/storage/schema.js');
    // a skipped level was saved as completed (not perfect) with the next level unlocked
    const d = sanitize({ version: 4, progress: { current: 6, unlocked: 6, completed: [1, 2, 3, 4, 5] } });
    expect(d.progress.completed).toEqual([1, 2, 3, 4, 5]);
    expect(d.progress.unlocked).toBe(6);
  });
});
