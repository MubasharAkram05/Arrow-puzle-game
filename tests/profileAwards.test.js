import { describe, expect, it } from 'vitest';
import { achievementRows, readyCount, sortRows } from '../src/game/achievementList.js';
import { awardBadges, latestIds, newCount } from '../src/game/awards.js';
import { dayNumber } from '../src/game/daily.js';
import { daysInMonth, isLeapYear, pastYears, yearTrophies } from '../src/game/trophies.js';
import { newStats } from '../src/game/stats.js';
import { sanitize } from '../src/storage/schema.js';

const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
  unlocked: 1,
  stats: newStats(),
  dailyBest: 0,
  ...over,
});
const day = (y, m, d) => dayNumber(new Date(y, m, d, 12).getTime());
const at = (y, m, d) => new Date(y, m, d, 12).getTime();

describe('achievements list', () => {
  it('ready rows first, then in progress, then completed; config order inside each block', () => {
    const rows = [
      { id: 'a', state: 'done' },
      { id: 'b', state: 'progress' },
      { id: 'c', state: 'ready' },
      { id: 'd', state: 'progress' },
      { id: 'e', state: 'ready' },
    ];
    expect(sortRows(rows).map((r) => r.id)).toEqual(['c', 'e', 'b', 'd', 'a']);
  });

  it('one row per group, tiered groups show only their current step', () => {
    // level 1 done (First Escape ready), reached level 30 (Level Climber I ready)
    const c = ctx({ completed: new Set([1]), unlocked: 30 });
    const rows = achievementRows(c, new Set(['level-climber-1']));
    const climber = rows.find((r) => r.group === 'level-climber');
    expect(climber).toMatchObject({ step: 2, steps: 4, state: 'progress' });
    expect(rows.filter((r) => r.group === 'level-climber')).toHaveLength(1);
    expect(rows[0]).toMatchObject({ group: 'first-escape', state: 'ready' });
    expect(readyCount(rows)).toBe(1);
  });

  it('a group with every step claimed is completed and sorts last', () => {
    const rows = achievementRows(ctx({ completed: new Set([1]) }), new Set(['first-escape']));
    expect(rows[rows.length - 1]).toMatchObject({ group: 'first-escape', state: 'done' });
  });
});

describe('award badges', () => {
  const find = (list, g) => list.find((a) => a.group === g);

  it('locked until a step is claimed (ready but unclaimed stays locked)', () => {
    const a = find(awardBadges(ctx({ completed: new Set([1]) }), new Set(), new Set()), 'first-escape');
    expect(a).toMatchObject({ state: 'locked', isNew: false, tierGoal: 0 });
  });

  it('earned once claimed, with the goal of the latest claimed step; new until seen', () => {
    const c = ctx({ unlocked: 60 });
    const claimed = new Set(['level-climber-1', 'level-climber-2']);
    const a = find(awardBadges(c, claimed, new Set()), 'level-climber');
    expect(a).toMatchObject({ state: 'earned', isNew: true, tierGoal: 50, earned: 2, latestId: 'level-climber-2' });
    expect(a.steps.map((s) => s.claimed)).toEqual([true, true, false, false]);
    const seen = find(awardBadges(c, claimed, new Set(['level-climber-2'])), 'level-climber');
    expect(seen.isNew).toBe(false);
  });

  it('latestIds marks what was shown; newCount counts the dots', () => {
    const list = awardBadges(ctx(), new Set(['first-escape', 'level-climber-1']), new Set(['first-escape']));
    expect(newCount(list)).toBe(1);
    expect(latestIds(list).sort()).toEqual(['first-escape', 'level-climber-1']);
  });
});

describe('monthly trophies', () => {
  it('month lengths, with leap years', () => {
    expect([2023, 2024, 1900, 2000].map(isLeapYear)).toEqual([false, true, false, true]);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2026, 0)).toBe(31);
    expect(daysInMonth(2026, 3)).toBe(30);
  });

  it('progress is the claimed days of each month; a full month is complete; later months are future', () => {
    const days = [];
    for (let d = 1; d <= 29; d++) days.push(day(2024, 1, d)); // every day of Feb 2024 (leap)
    days.push(day(2024, 2, 5), day(2024, 2, 5), day(2024, 2, 9)); // duplicates count once
    const t = yearTrophies(days, 2024, at(2024, 2, 20));
    expect(t[1]).toMatchObject({ name: 'February', days: 29, claimed: 29, state: 'complete' });
    expect(t[2]).toMatchObject({ days: 31, claimed: 2, state: 'progress', current: true });
    expect(t[0].state).toBe('empty');
    expect(t[3].state).toBe('future');
    expect(t).toHaveLength(12);
  });

  it('28 days fill February in a common year', () => {
    const days = Array.from({ length: 28 }, (_, i) => day(2025, 1, i + 1));
    expect(yearTrophies(days, 2025, at(2025, 5, 1))[1].state).toBe('complete');
  });

  it('earlier years appear only when they have data', () => {
    expect(pastYears([day(2026, 0, 3)], at(2026, 4, 1))).toEqual([]);
    expect(pastYears([day(2024, 6, 1), day(2025, 1, 2), day(2026, 0, 3)], at(2026, 4, 1))).toEqual([2025, 2024]);
  });
});

describe('save migration for the new fields', () => {
  it('rebuilds the claim days from the streak (consecutive days ending at the last claim)', () => {
    const last = day(2026, 2, 10);
    const d = sanitize({ daily: { lastClaim: last, streak: 3, best: 5 } });
    expect(d.dailyDays).toEqual([last - 2, last - 1, last]);
    expect(sanitize({}).dailyDays).toEqual([]);
  });

  it('keeps a stored list (sorted, unique, plausible) and old claims count as seen', () => {
    const d = sanitize({ dailyDays: [30, 10, 10, -1, 'x', 20], achievements: { claimed: ['first-escape'] } });
    expect(d.dailyDays).toEqual([10, 20, 30]);
    expect(d.seenBadges).toEqual(['first-escape']);
    const e = sanitize({ seenBadges: ['first-escape', 'gone'], achievements: { claimed: ['first-escape'] } });
    expect(e.seenBadges).toEqual(['first-escape']);
  });
});
