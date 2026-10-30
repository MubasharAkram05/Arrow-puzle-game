import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFS } from '../src/config.js';
import {
  ACHIEVEMENTS,
  achievementStatus,
  claimAchievement,
  claimableCount,
  visibleAchievements,
} from '../src/game/achievements.js';
import { newStats, recordLoss, recordWin } from '../src/game/stats.js';
import { tierLabel } from '../src/engine/index.js';

/** Context with optional overrides. */
const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
  unlocked: 1,
  stats: newStats(),
  dailyBest: 0,
  ...over,
});
const range = (a, b) => new Set(Array.from({ length: b - a + 1 }, (_, i) => a + i));
const byId = (c, claimed = new Set()) => Object.fromEntries(achievementStatus(c, claimed).map((a) => [a.def.id, a]));
/** Claim every claimable step until nothing is left; returns the diamonds paid. */
function claimAll(c, claimed) {
  let diamonds = 0;
  for (;;) {
    const next = achievementStatus(c, claimed).find((a) => a.claimable);
    if (!next) return { diamonds, claimed };
    const res = claimAchievement(next.def.id, c, claimed);
    diamonds += res.diamonds;
    claimed = res.claimed;
  }
}

describe('achievement list', () => {
  it('keeps the old ones with their ids and adds the five tiered groups', () => {
    expect(ACHIEVEMENT_DEFS.map((g) => g.id)).toEqual([
      'first-escape',
      'perfectionist',
      'chapter-master',
      'arrow-hunter',
      'no-mistakes',
      'shape-solver',
      'big-spender',
      'level-climber',
      'brain-power',
      'comeback',
      'daily-player',
      'hard-worker',
    ]);
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const gone of ['collector', 'alphabet', 'zoo-keeper']) expect(ids).not.toContain(gone);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('steps and rewards match the design', () => {
    const steps = (g) => ACHIEVEMENTS.filter((a) => a.group === g).map((a) => [a.goal, a.reward]);
    expect(steps('level-climber')).toEqual([
      [25, 2],
      [50, 4],
      [100, 8],
      [250, 15],
    ]);
    expect(steps('brain-power')).toEqual([
      [10, 3],
      [30, 8],
    ]);
    expect(steps('comeback')).toEqual([
      [1, 1],
      [10, 4],
    ]);
    expect(steps('daily-player')).toEqual([
      [3, 1],
      [7, 3],
      [30, 10],
    ]);
    expect(steps('hard-worker')).toEqual([
      [10, 3],
      [50, 8],
    ]);
    expect(ACHIEVEMENTS.find((a) => a.id === 'level-climber-3').desc).toBe('Reach level 100');
  });
});

describe('achievement progress', () => {
  it('starts at zero for a new player (Level Climber counts the unlocked level)', () => {
    const s = achievementStatus(ctx(), new Set());
    expect(s).toHaveLength(ACHIEVEMENTS.length);
    expect(s.every((a) => !a.done)).toBe(true);
    // level 1 is unlocked from the start: every Level Climber step shows 1 / goal
    expect(s.filter((a) => a.value > 0).map((a) => a.def.group)).toEqual(Array(4).fill('level-climber'));
  });

  it('tracks the original goals and caps the value at the goal', () => {
    const c = ctx({
      completed: range(1, 40),
      perfect: range(1, 4),
      masks: new Set([10, 20]),
      stats: { ...newStats(), arrowsCleared: 1500, bestPerfectStreak: 2, coinsSpent: 300 },
    });
    const s = byId(c);
    expect(s['first-escape'].done).toBe(true);
    expect(s.perfectionist.value).toBe(4);
    expect(s['chapter-master'].done).toBe(true);
    expect(s['arrow-hunter'].value).toBe(1000);
    expect(s['no-mistakes'].value).toBe(2);
    expect(s['shape-solver'].value).toBe(2);
    expect(s['big-spender'].value).toBe(300);
  });

  it('measures each new group from the right number', () => {
    const hardLevels = [...range(1, 200)].filter((l) => ['Hard', 'Super Hard', 'Expert'].includes(tierLabel(l)));
    const s = byId(
      ctx({
        unlocked: 60,
        completed: range(1, 200),
        stats: { ...newStats(), cleanLevels: 12, comebacks: 3 },
        dailyBest: 8,
      }),
    );
    expect(s['level-climber-2'].done).toBe(true);
    expect(s['level-climber-3'].value).toBe(60);
    expect(s['brain-power-1'].done).toBe(true);
    expect(s['brain-power-2'].value).toBe(12);
    expect(s['comeback-1'].done).toBe(true);
    expect(s['comeback-2'].value).toBe(3);
    expect(s['daily-player-2'].done).toBe(true);
    expect(s['daily-player-3'].value).toBe(8);
    expect(s['hard-worker-2'].value).toBe(Math.min(50, hardLevels.length));
  });

  it('records clean levels (first clear, no hint or booster) and comebacks (1 heart left)', () => {
    let s = newStats();
    s = recordWin(s, true, { firstClear: true, assisted: false, heartsLeft: 3 });
    s = recordWin(s, false, { firstClear: true, assisted: true, heartsLeft: 1 });
    s = recordWin(s, false, { firstClear: false, assisted: false, heartsLeft: 1 });
    expect(s.cleanLevels).toBe(1);
    expect(s.comebacks).toBe(2);
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

describe('tiered steps', () => {
  const far = ctx({ unlocked: 300 });

  it('shows only the next unclaimed step of each group, with its progress', () => {
    let v = visibleAchievements(far, new Set()).find((a) => a.def.group === 'level-climber');
    expect(v.def.id).toBe('level-climber-1');
    expect(v.claimable).toBe(true);
    v = visibleAchievements(far, new Set(['level-climber-1', 'level-climber-2'])).find(
      (a) => a.def.group === 'level-climber',
    );
    expect(v.def.id).toBe('level-climber-3');
    const all = new Set(['level-climber-1', 'level-climber-2', 'level-climber-3', 'level-climber-4']);
    v = visibleAchievements(far, all).find((a) => a.def.group === 'level-climber');
    expect(v).toMatchObject({ claimed: true, def: { id: 'level-climber-4' } });
    expect(visibleAchievements(far, new Set())).toHaveLength(ACHIEVEMENT_DEFS.length);
  });

  it('steps are claimed in order and each pays once', () => {
    expect(claimAchievement('level-climber-2', far, new Set())).toMatchObject({ ok: false, reason: 'order' });
    const first = claimAchievement('level-climber-1', far, new Set());
    expect(first).toMatchObject({ ok: true, diamonds: 2 });
    expect(claimAchievement('level-climber-1', far, first.claimed).reason).toBe('claimed');
    expect(claimAchievement('level-climber-2', far, first.claimed)).toMatchObject({ ok: true, diamonds: 4 });
  });

  it('old progress that already meets several steps makes them claimable one after another, no double rewards', () => {
    const { diamonds, claimed } = claimAll(far, new Set());
    expect(diamonds).toBe(2 + 4 + 8 + 15);
    expect(claimAll(far, claimed).diamonds).toBe(0);
  });

  it('claims of removed achievements stay (no diamonds taken back) and do not count as anything', () => {
    const claimed = new Set(['collector', 'alphabet', 'first-escape']);
    const c = ctx({ completed: new Set([1]) });
    expect(byId(c, claimed)['first-escape'].claimed).toBe(true);
    expect(claimableCount(c, claimed)).toBe(0);
    expect(claimAchievement('collector', c, claimed).reason).toBe('unknown');
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
  it('progress stays capped at the goal and nothing breaks with huge stats', () => {
    const big = new Set(Array.from({ length: 50_000 }, (_, i) => i + 1));
    const c = ctx({
      completed: big,
      perfect: big,
      masks: big,
      unlocked: 1e6,
      dailyBest: 5000,
      stats: {
        ...newStats(),
        arrowsCleared: 1e9,
        wins: 50_000,
        streak: 50_000,
        bestStreak: 50_000,
        coinsSpent: 1e9,
        perfectStreak: 5e4,
        bestPerfectStreak: 5e4,
        cleanLevels: 5e4,
        comebacks: 5e4,
      },
    });
    for (const s of achievementStatus(c, new Set())) {
      expect(s.value).toBe(s.def.goal);
      expect(s.done).toBe(true);
    }
    // only the first step of each group is claimable before the earlier ones are claimed
    expect(claimableCount(c, new Set())).toBe(ACHIEVEMENT_DEFS.length);
  });
});
