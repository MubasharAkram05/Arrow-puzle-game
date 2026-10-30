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
  const { skipLevel } = await import('../src/game/rewards.js');
  const unlock = await import('../src/game/unlock.js');
  applySave({
    ...defaultSave(),
    progress: { current: 4, unlocked: 4, completed: [1, 2, 3] },
    wallet: { diamonds: 50 },
  });
  return { state, snapshot, skipLevel, ...unlock };
}

describe('TEST_UNLOCK_ALL (game state)', () => {
  afterEach(() => {
    vi.doUnmock('../src/config.js');
    vi.resetModules();
  });

  it('flag on: locked levels open, but skipping one is refused and progress is untouched', async () => {
    const g = await withFlag(true);
    const before = JSON.stringify(g.snapshot());
    expect(g.isPlayable(30, g.state.progress)).toBe(true);
    expect(g.isTestPlay(30, g.state.progress)).toBe(true);
    expect(g.skipLevel(30)).toEqual({ ok: false, reason: 'test' });
    expect(JSON.stringify(g.snapshot())).toBe(before);
    expect(g.state.diamonds).toBe(50);
  });

  it('flag off: the normal lock state is back and skipping works as before', async () => {
    const g = await withFlag(false);
    expect(g.isPlayable(4, g.state.progress)).toBe(true);
    expect(g.isPlayable(30, g.state.progress)).toBe(false);
    expect(g.isTestPlay(30, g.state.progress)).toBe(false);
    expect(g.skipLevel(4).ok).toBe(true);
    expect(g.state.progress.unlocked).toBe(5);
  });
});
