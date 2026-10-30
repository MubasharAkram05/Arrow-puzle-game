/**
 * No maximum level anywhere: save, unlock, rewards, chapters, achievements and difficulty all work far past
 * any level a player could reach. (Levels 1-500 plus 200 random levels up to 1,000,000 are generated and
 * timed in generator.test.js.)
 */
import { describe, expect, it } from 'vitest';
import { getLevelConfig, isShapeLevel } from '../src/engine/index.js';
import { achievementStatus } from '../src/game/achievements.js';
import { chapterLevels, chapterOf, levelReward } from '../src/game/economy.js';
import { newStats } from '../src/game/stats.js';
import { isPlayable } from '../src/game/unlock.js';
import { sanitize } from '../src/storage/schema.js';

const HUGE = [1_000_000, 2_500_000, 5_000_000];

describe('unlimited levels', () => {
  it('the save keeps huge level numbers', () => {
    for (const n of HUGE) {
      const d = sanitize({ progress: { current: n, unlocked: n + 1, completed: [1, 2, n] } });
      expect(d.progress).toMatchObject({ current: n, unlocked: n + 1 });
      expect(d.progress.completed).toContain(n);
    }
  });

  it('unlock, chapters and rewards keep going', () => {
    for (const n of HUGE) {
      expect(isPlayable(n, { unlocked: n }, false)).toBe(true);
      expect(isPlayable(n + 1, { unlocked: n }, false)).toBe(false);
      expect(chapterLevels(chapterOf(n))).toContain(n);
      const r = levelReward({ level: n, difficulty: 'Expert', heartsLeft: 2, maxHearts: 3, arrows: 300 });
      expect(Number.isFinite(r.coins) && r.coins > 0).toBe(true);
    }
  });

  it('level configs exist for any number', () => {
    for (const n of HUGE) {
      const plain = isShapeLevel(n) ? n + 1 : n; // a plain level needs no shape library
      const c = getLevelConfig(plain);
      expect(c.rows).toBeGreaterThan(0);
      expect(c.difficulty).toBe('Expert');
    }
  });

  it('achievements handle huge progress', () => {
    const ctx = {
      completed: new Set([1, 1_000_000]),
      perfect: new Set(),
      masks: new Set(),
      unlocked: 5_000_000,
      stats: newStats(),
      dailyBest: 0,
    };
    const climber = achievementStatus(ctx, new Set()).filter((a) => a.def.group === 'level-climber');
    expect(climber.every((a) => a.done)).toBe(true);
  });
});
