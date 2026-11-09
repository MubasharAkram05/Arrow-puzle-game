/**
 * Tasks screen (3.23.0): Weekly | Achievements tabs, their red dots, and the achievements list moved there
 * from Profile.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { achievementRows } from '../src/game/achievementList.js';
import { newWeek, questRows, rollWeek, addProgress } from '../src/game/quests.js';
import { taskDots } from '../src/game/taskDots.js';
import { newStats } from '../src/game/stats.js';
import { tabState } from '../src/ui/tabState.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const ctx = (over = {}) => ({
  completed: new Set(),
  perfect: new Set(),
  masks: new Set(),
  unlocked: 1,
  stats: newStats(),
  dailyBest: 0,
  ...over,
});
const NOW = new Date(2026, 10, 11, 12).getTime();

describe('tab switching', () => {
  it('starts on the first tab, switches with a slide direction, and remembers the last tab', () => {
    const store = memory();
    const t = tabState(['weekly', 'achievements'], 'k', store);
    expect(t.active()).toBe('weekly');
    expect(t.select('achievements')).toBe(1); // slides in from the right
    expect(t.active()).toBe('achievements');
    expect(t.select('achievements')).toBe(0); // already there: nothing changes
    expect(t.select('nope')).toBe(0);
    expect(t.select('weekly')).toBe(-1);
    t.select('achievements');
    // a new screen (or app start) comes back to the remembered tab
    expect(tabState(['weekly', 'achievements'], 'k', store).active()).toBe('achievements');
  });

  it('works without storage (blocked) and ignores junk stored values', () => {
    const t = tabState(['weekly', 'achievements'], 'k', null);
    expect(t.select('achievements')).toBe(1);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const b = tabState(['weekly', 'achievements'], 'k', broken);
    expect(b.active()).toBe('weekly');
    expect(b.select('achievements')).toBe(1);
    const store = memory();
    store.setItem('k', 'awards');
    expect(tabState(['weekly', 'achievements'], 'k', store).active()).toBe('weekly');
  });
});

describe('red dots', () => {
  const week = () => rollWeek(newWeek(), NOW).rec;
  const readyQuest = () => {
    const rec = week();
    const q = questRows(rec)[0];
    return addProgress(rec, NOW, { [q.counter]: q.goal });
  };

  it('nothing to claim: no dots', () => {
    expect(taskDots(week(), NOW, achievementRows(ctx(), new Set()))).toEqual({
      weekly: false,
      achievements: false,
      nav: false,
    });
  });

  it('a ready quest: Weekly dot and the nav dot', () => {
    expect(taskDots(readyQuest(), NOW, achievementRows(ctx(), new Set()))).toEqual({
      weekly: true,
      achievements: false,
      nav: true,
    });
  });

  it('a ready achievement: Achievements dot and the nav dot', () => {
    const rows = achievementRows(ctx({ completed: new Set([1]) }), new Set()); // First Escape ready
    expect(taskDots(week(), NOW, rows)).toEqual({ weekly: false, achievements: true, nav: true });
    expect(taskDots(readyQuest(), NOW, rows)).toEqual({ weekly: true, achievements: true, nav: true });
  });
});

describe('achievements live in Tasks', () => {
  it('the Tasks screen holds both tabs and the achievements list; Profile only links to it', () => {
    const tasks = src('src/ui/screens/tasks/index.js');
    expect(tasks).toMatch(/{ id: 'weekly', label: 'Weekly' }/);
    expect(tasks).toMatch(/{ id: 'achievements', label: 'Achievements' }/);
    expect(tasks).toContain('achievementsSkeleton()');
    const profile = src('src/ui/screens/profileScreen.js');
    expect(profile).not.toContain('achievementsSkeleton');
    expect(profile).not.toContain('renderAchievements');
    expect(profile).toContain("openTasks('achievements')");
    expect(profile).toContain('View achievements');
  });

  it('the nav tab and the screen are called Tasks, with the clipboard icon; the banner stays "Weekly Quests"', () => {
    expect(src('src/ui/components/bottomNav.js')).toContain(
      "{ screen: 'screen-tasks', label: 'Tasks', icon: 'clipboard' }",
    );
    const html = src('index.html');
    expect(html).toContain('<section id="screen-tasks" class="screen tab-screen" aria-label="Tasks">');
    expect(html).toContain('<h2>Tasks</h2>');
    expect(html).not.toContain('screen-quests');
    expect(src('src/ui/screens/tasks/weekly.js')).toContain('<b>Weekly Quests</b>');
  });

  it('the achievements list keeps its order: ready, then in progress, then claimed', () => {
    const rows = achievementRows(ctx({ completed: new Set([1]), unlocked: 30 }), new Set(['first-escape']));
    const order = { ready: 0, progress: 1, done: 2 };
    const states = rows.map((r) => order[r.state]);
    expect(states).toEqual([...states].sort((a, b) => a - b));
    expect(rows[rows.length - 1]).toMatchObject({ group: 'first-escape', state: 'done' });
  });
});
