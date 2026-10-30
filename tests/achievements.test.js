import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementStatus, claimAchievement, claimableCount } from '../src/game/achievements.js';
import { newStats, recordLoss, recordWin } from '../src/game/stats.js';
import { SHAPE_CATEGORIES, shapesIn } from '../src/engine/index.js';

const ALL_SHAPES = new Set(SHAPE_CATEGORIES.flatMap((c) => shapesIn(c.id)));

/** Context with optional overrides. */
const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
  shapes: new Set(),
  stats: newStats(),
  ...over,
});
const range = (a, b) => new Set(Array.from({ length: b - a + 1 }, (_, i) => a + i));

describe('achievement progress', () => {
  it('starts at zero for a new player', () => {
    const s = achievementStatus(ctx(), new Set());
    expect(s).toHaveLength(ACHIEVEMENTS.length);
    expect(s.every((a) => a.value === 0 && !a.done)).toBe(true);
  });

  it('tracks each goal and caps the value at the goal', () => {
    const c = ctx({
      completed: range(1, 40),
      perfect: range(1, 4),
      masks: new Set([10, 20]),
      stats: { ...newStats(), arrowsCleared: 1500, bestPerfectStreak: 2, coinsSpent: 300 },
    });
    const byId = Object.fromEntries(achievementStatus(c, new Set()).map((a) => [a.def.id, a]));
    expect(byId['first-escape'].done).toBe(true);
    expect(byId['perfectionist'].value).toBe(4);
    expect(byId['chapter-master'].done).toBe(true);
    expect(byId['arrow-hunter'].value).toBe(1000);
    expect(byId['no-mistakes'].value).toBe(2);
    expect(byId['shape-solver'].value).toBe(2);
    expect(byId['big-spender'].value).toBe(300);
  });

  it('counts collected shapes: Collector (50), Alphabet (all letters), Zoo Keeper (all animals)', () => {
    const animals = shapesIn('animals');
    const letters = shapesIn('letters');
    const objects = shapesIn('objects');
    const status = (shapes) =>
      Object.fromEntries(achievementStatus(ctx({ shapes: new Set(shapes) }), new Set()).map((a) => [a.def.id, a]));
    let s = status([...letters.slice(0, 25), ...animals.slice(0, 10), ...objects.slice(0, 14)]);
    expect(s.collector).toMatchObject({ value: 49, done: false });
    expect(s.alphabet).toMatchObject({ value: 25, done: false });
    expect(s['zoo-keeper']).toMatchObject({ value: 10, done: false });
    s = status([...letters, ...animals, 'not-a-shape']);
    expect(s.collector.done).toBe(true);
    expect(s.alphabet).toMatchObject({ value: 26, done: true });
    expect(s['zoo-keeper'].done).toBe(true);
    expect(s['zoo-keeper'].def.goal).toBe(animals.length);
    const rewards = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.reward]));
    expect(rewards).toMatchObject({ collector: 3, 'zoo-keeper': 10, alphabet: 5 });
  });

  it('counts a perfect streak and resets it on a loss or a lost heart', () => {
    let s = newStats();
    for (let i = 0; i < 4; i++) s = recordWin(s, true);
    s = recordWin(s, false);
    expect(s.perfectStreak).toBe(0);
    expect(s.bestPerfectStreak).toBe(4);
    s = recordWin(recordWin(s, true), true);
    s = recordLoss(s);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(7);
  });
});

describe('claiming', () => {
  const done = ctx({ completed: new Set([1]) });

  it('pays the reward once', () => {
    const first = claimAchievement('first-escape', done, new Set());
    expect(first).toMatchObject({ ok: true, diamonds: 1 });
    expect(first.claimed.has('first-escape')).toBe(true);
    const again = claimAchievement('first-escape', done, first.claimed);
    expect(again).toMatchObject({ ok: false, reason: 'claimed', diamonds: 0 });
  });

  it('refuses unfinished and unknown achievements', () => {
    expect(claimAchievement('perfectionist', done, new Set()).reason).toBe('not-done');
    expect(claimAchievement('nope', done, new Set()).reason).toBe('unknown');
  });

  it('counts claimable achievements for the profile badge', () => {
    expect(claimableCount(done, new Set())).toBe(1);
    expect(claimableCount(done, new Set(['first-escape']))).toBe(0);
  });
});

describe('very large numbers', () => {
  it('progress stays capped at the goal and nothing breaks with huge stats', async () => {
    const { achievementStatus } = await import('../src/game/achievements.js');
    const big = new Set(Array.from({ length: 50_000 }, (_, i) => i + 1));
    const ctx = {
      completed: big,
      perfect: big,
      masks: big,
      shapes: ALL_SHAPES,
      stats: {
        arrowsCleared: 1e9,
        wins: 50_000,
        streak: 50_000,
        bestStreak: 50_000,
        coinsSpent: 1e9,
        perfectStreak: 5e4,
        bestPerfectStreak: 5e4,
      },
    };
    for (const s of achievementStatus(ctx, new Set())) {
      expect(s.value).toBe(s.def.goal);
      expect(s.claimable).toBe(true);
    }
  });
});
