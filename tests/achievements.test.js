import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementStatus, claimAchievement, claimableCount } from '../src/game/achievements.js';
import { newStats, recordLoss, recordWin } from '../src/game/stats.js';

/** Context with optional overrides. */
const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
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
      completed: range(1, 20),
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
