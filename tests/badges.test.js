import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFS } from '../src/config.js';
import { ACHIEVEMENTS } from '../src/game/achievements.js';
import { badgeTier, badges, newestBadges, stepLabel } from '../src/game/badges.js';
import { newStats } from '../src/game/stats.js';

const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
  unlocked: 1,
  stats: newStats(),
  dailyBest: 0,
  ...over,
});
const step = (id) => ACHIEVEMENTS.find((a) => a.id === id);
const badge = (group, c, claimed = new Set()) => badges(c, claimed).find((b) => b.group === group);

describe('badge tiers', () => {
  it('steps 1-4 are bronze, silver, gold, diamond; single-step achievements are gold', () => {
    expect(
      ['level-climber-1', 'level-climber-2', 'level-climber-3', 'level-climber-4'].map((id) => badgeTier(step(id))),
    ).toEqual(['bronze', 'silver', 'gold', 'diamond']);
    expect(badgeTier(step('first-escape'))).toBe('gold');
    expect(badgeTier(step('daily-player-3'))).toBe('gold');
    expect(stepLabel(step('level-climber-2'))).toBe('II');
    expect(stepLabel(step('first-escape'))).toBe('');
  });
});

describe('badge states', () => {
  it('one badge per group, in order', () => {
    expect(badges(ctx(), new Set()).map((b) => b.group)).toEqual(ACHIEVEMENT_DEFS.map((g) => g.id));
  });

  it('locked: nothing earned, progress toward the first step', () => {
    const b = badge('perfectionist', ctx({ perfect: new Set([1, 2, 3, 4, 5, 6, 7]) }));
    expect(b).toMatchObject({ state: 'locked', tier: 'gold', value: 7, goal: 10, earned: 0 });
  });

  it('ready: a step can be claimed (shows that step tier and numeral)', () => {
    const b = badge('level-climber', ctx({ unlocked: 60 }), new Set(['level-climber-1']));
    expect(b).toMatchObject({ state: 'ready', tier: 'silver', label: 'II', earned: 1 });
    expect(b.next.id).toBe('level-climber-2');
  });

  it('earned: shows the latest claimed step and the progress toward the next', () => {
    const b = badge('level-climber', ctx({ unlocked: 70 }), new Set(['level-climber-1', 'level-climber-2']));
    expect(b).toMatchObject({ state: 'earned', tier: 'silver', label: 'II', value: 70, goal: 100 });
  });

  it('every step claimed: earned at the top tier with nothing next', () => {
    const all = new Set(['level-climber-1', 'level-climber-2', 'level-climber-3', 'level-climber-4']);
    const b = badge('level-climber', ctx({ unlocked: 400 }), all);
    expect(b).toMatchObject({ state: 'earned', tier: 'diamond', label: 'IV', next: null, earned: 4 });
    const one = badge('first-escape', ctx({ completed: new Set([1]) }), new Set(['first-escape']));
    expect(one).toMatchObject({ state: 'earned', tier: 'gold', label: '', next: null });
  });
});

describe('newest badges', () => {
  it('latest claims first, one per group, at most 3, skipping removed achievements', () => {
    const claimed = ['first-escape', 'level-climber-1', 'collector', 'comeback-1', 'level-climber-2', 'zoo-keeper'];
    expect(newestBadges(claimed).map((b) => b.def.id)).toEqual(['level-climber-2', 'comeback-1', 'first-escape']);
    expect(newestBadges([])).toEqual([]);
    expect(newestBadges(new Set(['brain-power-1']), 3)).toHaveLength(1);
  });
});
