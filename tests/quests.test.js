/**
 * Weekly Quests (3.22.0): week seeding, progress, points bar and chests, Monday reset, clock tampering, and
 * the v6 -> v7 save migration.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { QUESTS } from '../src/config.js';
import {
  addProgress,
  chestRows,
  claimQuest,
  isoWeekOf,
  newWeek,
  nextReset,
  openChest,
  questLeftText,
  questReadyCount,
  questRows,
  resetCountdown,
  rollWeek,
  weekPoints,
  weekQuests,
  weekStart,
} from '../src/game/quests.js';
import { claimQuestPoints, openQuestChest, questEvent, syncQuests } from '../src/game/questState.js';
import { applyWin, buyHints, claimDailyReward } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { applySave, snapshot } from '../src/storage/save.js';
import {
  BACKUP_KEY,
  V6_BACKUP_KEY,
  V6_KEY,
  V7_KEY,
  defaultSave,
  migrateV6,
  readSave,
  sanitize,
} from '../src/storage/schema.js';

const at = (y, m, d, h = 12, min = 0) => new Date(y, m, d, h, min).getTime();
const MON = at(2026, 10, 9, 0); // Monday 9 Nov 2026, 00:00 local
const WED = at(2026, 10, 11, 15);
const DAY = 86400000;

/** A record for the week of `t` with every quest's counter at its goal. */
function full(t = WED) {
  let rec = rollWeek(newWeek(), t).rec;
  for (const q of questRows(rec)) rec = addProgress(rec, t, { [q.counter]: q.goal });
  return rec;
}

describe('weeks', () => {
  it('a week starts on Monday 00:00 local time and resets 7 calendar days later', () => {
    expect(weekStart(WED)).toBe(MON);
    expect(weekStart(MON)).toBe(MON);
    expect(weekStart(MON - 1)).toBe(at(2026, 10, 2, 0));
    expect(weekStart(at(2026, 10, 15, 23, 59))).toBe(MON); // Sunday night is still this week
    expect(nextReset(MON)).toBe(at(2026, 10, 16, 0));
    expect(isoWeekOf(MON)).toEqual({ year: 2026, week: 46 });
    expect(isoWeekOf(at(2026, 0, 1))).toEqual({ year: 2026, week: 1 }); // a Thursday
    expect(isoWeekOf(at(2027, 0, 1))).toEqual({ year: 2026, week: 53 }); // a Friday: still 2026's last week
  });

  it('the countdown shows days and hours to the next Monday', () => {
    const rec = rollWeek(newWeek(), WED).rec;
    expect(resetCountdown(rec, at(2026, 10, 10, 1))).toBe('5d 23h');
    expect(resetCountdown(rec, at(2026, 10, 15, 16, 55))).toBe('7h 05m');
    expect(resetCountdown(rec, at(2026, 10, 15, 23, 48))).toBe('12m');
  });
});

describe('week seeding', () => {
  it('6 quests from 6 different groups, the same for everyone in a week, different between weeks', () => {
    const seen = new Set();
    for (let y = 2026; y <= 2030; y++)
      for (let w = 1; w <= 52; w++) {
        const qs = weekQuests({ year: y, week: w });
        expect(qs).toHaveLength(QUESTS.perWeek);
        expect(new Set(qs.map((q) => q.group)).size).toBe(6);
        expect(weekQuests({ year: y, week: w })).toEqual(qs);
        // enough points that 100 is reachable without every quest
        const total = qs.reduce((s, q) => s + q.points, 0);
        expect(total).toBeGreaterThanOrEqual(QUESTS.weekPoints.min);
        expect(total).toBeLessThanOrEqual(QUESTS.weekPoints.max);
        seen.add(qs.map((q) => q.id).join());
      }
    expect(seen.size).toBeGreaterThan(250); // nearly every week differs
    const a = weekQuests({ year: 2026, week: 46 }).map((q) => q.id);
    const b = weekQuests({ year: 2026, week: 47 }).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it('never two quests that track the same thing in one week (52 weeks)', () => {
    // quests in one group count the same thing: one win would move both
    const same = [
      ['wins', 'newLevels'],
      ['perfect', 'clean'],
      ['hard', 'superHard'],
    ];
    for (const [a, b] of same) {
      const ga = QUESTS.pool.find((q) => q.counter === a).group;
      expect(QUESTS.pool.find((q) => q.counter === b).group, `${a} / ${b}`).toBe(ga);
    }
    for (let w = 1; w <= 52; w++) {
      const qs = weekQuests({ year: 2026, week: w });
      const counters = qs.map((q) => q.counter);
      expect(new Set(counters).size, `week ${w}`).toBe(6);
      expect(new Set(qs.map((q) => q.group)).size, `week ${w}`).toBe(6);
      for (const [a, b] of same)
        expect(counters.includes(a) && counters.includes(b), `week ${w}: ${a} + ${b}`).toBe(false);
    }
    // the example from the request: "Complete 30 levels" and "Finish 10 new levels" never share a week
    for (let y = 2026; y <= 2030; y++)
      for (let w = 1; w <= 52; w++) {
        const ids = weekQuests({ year: y, week: w }).map((q) => q.id);
        expect(ids.includes('wins-30') && ids.includes('new-10')).toBe(false);
      }
  });

  it('every quest gives 10-40 points, and none asks for hints to be used', () => {
    for (const q of QUESTS.pool) {
      expect(q.points, q.id).toBeGreaterThanOrEqual(10);
      expect(q.points, q.id).toBeLessThanOrEqual(40);
      expect(q.counter).not.toMatch(/hint/i);
      expect(q.title).not.toMatch(/\buse\b.*hint|hints? used/i);
    }
  });
});

describe('quest progress', () => {
  it('counts only known counters, from the week start', () => {
    let rec = addProgress(newWeek(), WED, { wins: 3, arrows: 120, hints: 5, bogus: 9, perfect: -2 });
    expect(rec.week).toBe(MON);
    expect(rec.counts).toEqual({ wins: 3, arrows: 120 });
    rec = addProgress(rec, WED + DAY, { wins: 2 });
    expect(rec.counts.wins).toBe(5);
  });

  it('a quest is ready at its goal, then claimed once; points fill the bar', () => {
    let rec = rollWeek(newWeek(), WED).rec;
    const q = questRows(rec)[0];
    expect(claimQuest(rec, WED, q.id)).toMatchObject({ ok: false, reason: 'progress' });
    rec = addProgress(rec, WED, { [q.counter]: q.goal - 1 });
    expect(questRows(rec)[0]).toMatchObject({ state: 'progress', value: q.goal - 1 });
    rec = addProgress(rec, WED, { [q.counter]: 5 });
    expect(questRows(rec)[0]).toMatchObject({ state: 'ready', value: q.goal }); // capped at the goal
    const res = claimQuest(rec, WED, q.id);
    expect(res).toMatchObject({ ok: true, points: q.points });
    expect(questRows(res.rec)[0].state).toBe('done');
    expect(weekPoints(res.rec)).toBe(q.points);
    expect(claimQuest(res.rec, WED, q.id)).toMatchObject({ ok: false, reason: 'claimed' });
    expect(claimQuest(res.rec, WED, 'not-this-week')).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('a toast says what is left', () => {
    expect(questLeftText({ counter: 'wins', goal: 20, value: 15 })).toBe('Complete 5 more levels first');
    expect(questLeftText({ counter: 'daily', goal: 3, value: 2 })).toBe('Claim the daily reward on 1 more day first');
    expect(questLeftText({ counter: 'arrows', goal: 3000, value: 500 })).toBe('Clear 2,500 more arrows first');
    for (const c of new Set(QUESTS.pool.map((q) => q.counter)))
      expect(questLeftText({ counter: c, goal: 2, value: 0 })).not.toContain('more to go');
  });
});

describe('points bar and chests', () => {
  it('chests at 30, 60 and 100 points open once each, with their rewards', () => {
    expect(QUESTS.chests.map((c) => [c.at, c.reward])).toEqual([
      [30, { coins: 150 }],
      [60, { coins: 300, hints: 1 }],
      [100, { coins: 500, diamonds: 3 }],
    ]);
    let rec = full();
    expect(chestRows(rec).map((c) => c.state)).toEqual(['locked', 'locked', 'locked']);
    expect(openChest(rec, WED, 30)).toMatchObject({ ok: false, reason: 'points' });
    for (const q of questRows(rec)) rec = claimQuest(rec, WED, q.id).rec;
    expect(weekPoints(rec)).toBe(100); // capped at 100
    expect(chestRows(rec).map((c) => c.state)).toEqual(['ready', 'ready', 'ready']);
    expect(questReadyCount(rec, WED)).toBe(3);
    const res = openChest(rec, WED, 60);
    expect(res).toMatchObject({ ok: true, reward: { coins: 300, hints: 1 } });
    expect(chestRows(res.rec).map((c) => c.state)).toEqual(['ready', 'open', 'ready']);
    expect(openChest(res.rec, WED, 60)).toMatchObject({ ok: false, reason: 'open' });
    expect(openChest(res.rec, WED, 45)).toMatchObject({ ok: false, reason: 'unknown' });
  });

  it('chests pay into the wallet (coins, diamonds and hints)', () => {
    applySave(defaultSave());
    state.quests = full();
    for (const q of questRows(state.quests)) claimQuestPoints(q.id, WED);
    const before = [state.coins, state.diamonds, state.hints];
    expect(openQuestChest(30, WED).ok).toBe(true);
    expect(openQuestChest(60, WED).ok).toBe(true);
    expect(openQuestChest(100, WED).ok).toBe(true);
    expect([state.coins, state.diamonds, state.hints]).toEqual([before[0] + 950, before[1] + 3, before[2] + 1]);
    expect(openQuestChest(100, WED).ok).toBe(false);
  });
});

describe('Monday reset', () => {
  it('unclaimed quests and chests are lost at the reset, and progress starts again', () => {
    let rec = full();
    rec = claimQuest(rec, WED, questRows(rec)[0].id).rec;
    const next = at(2026, 10, 16, 0, 1); // next Monday 00:01
    const { rec: r, reset } = rollWeek(rec, next);
    expect(reset).toBe(true);
    expect(r).toEqual({ week: at(2026, 10, 16, 0), counts: {}, claimed: [], chests: [] });
    // Sunday 23:59 is still the old week
    expect(rollWeek(rec, at(2026, 10, 15, 23, 59)).reset).toBe(false);
  });

  it('permanent achievements do not reset', () => {
    applySave(defaultSave());
    state.claimed = new Set(['first-escape']);
    state.stats = { ...state.stats, arrowsCleared: 999 };
    questEvent({ wins: 1 }, WED);
    syncQuests(WED + 7 * DAY);
    expect([...state.claimed]).toEqual(['first-escape']);
    expect(state.stats.arrowsCleared).toBe(999);
  });
});

describe('clock tampering', () => {
  it('clock moved backward: no reset, no old week back, progress stays in the current week', () => {
    let rec = full();
    for (const q of questRows(rec)) rec = claimQuest(rec, WED, q.id).rec;
    rec = openChest(rec, WED, 30).rec;
    const back = WED - 10 * DAY; // the week before
    const { rec: r, reset } = rollWeek(rec, back);
    expect(reset).toBe(false);
    expect(r).toBe(rec);
    // the opened chest can't be opened again and claimed quests can't be claimed again
    expect(openChest(r, back, 30)).toMatchObject({ ok: false, reason: 'open' });
    expect(claimQuest(r, back, questRows(r)[0].id)).toMatchObject({ ok: false, reason: 'claimed' });
    expect(addProgress(r, back, { wins: 1 }).week).toBe(MON);
    // the countdown never shows a sooner reset
    expect(resetCountdown(r, back)).toBe('14d 9h');
  });

  it('clock jumped forward: one early week, then no reset until real time passes that week', () => {
    const rec = rollWeek(newWeek(), WED).rec;
    const ahead = WED + 14 * DAY;
    const jumped = rollWeek(rec, ahead);
    expect(jumped.reset).toBe(true);
    let r = jumped.rec;
    // back to the real time: nothing resets for this week or the next one
    for (const t of [WED, WED + 7 * DAY, WED + 14 * DAY]) {
      const step = rollWeek(r, t);
      expect(step.reset, new Date(t).toDateString()).toBe(false);
      r = step.rec;
    }
    expect(rollWeek(r, WED + 21 * DAY).reset).toBe(true);
    // counted resets over the 4 real weeks: 2 (the jump and week 4), never more than real weeks
  });

  it('progress counted while the clock is wrong never doubles up', () => {
    let rec = addProgress(newWeek(), WED, { wins: 4 });
    rec = addProgress(rec, WED - 3 * DAY, { wins: 1 });
    rec = addProgress(rec, WED - 30 * DAY, { wins: 1 });
    expect(rec.counts.wins).toBe(6);
    expect(rec.week).toBe(MON);
  });
});

describe('game events count toward quests', () => {
  beforeEach(() => {
    applySave(defaultSave());
    state.levelAssist = { assisted: false };
  });

  it('wins, spending and daily claims', () => {
    const now = Date.now();
    applyWin(31, 'Hard', 1, 3, 40); // Hard, comeback, new level, clean
    applyWin(5, 'Normal', 3, 3, 20); // perfect, new
    state.coins = 1000;
    buyHints({ coins: 90 });
    claimDailyReward(now);
    const c = state.quests.counts;
    expect(c).toMatchObject({ wins: 2, hard: 1, comeback: 1, newLevels: 2, clean: 2, perfect: 1, spend: 90, daily: 1 });
    expect(c.superHard || 0).toBe(0);
    expect(state.quests.week).toBe(weekStart(now));
  });
});

describe('save', () => {
  it('the quest record is saved, validated and loaded', () => {
    applySave(defaultSave());
    state.quests = { week: MON, counts: { wins: 4 }, claimed: [weekQuests(isoWeekOf(MON))[0].id], chests: [30] };
    const snap = snapshot();
    expect(snap.version).toBe(7);
    expect(sanitize(snap).quests).toEqual(state.quests);
    const bad = sanitize({
      quests: { week: -5, counts: { wins: -3, hax: 9, arrows: 12 }, claimed: ['x', 7], chests: [30, 45, 30] },
    });
    expect(bad.quests).toEqual({ week: 0, counts: { wins: 0, arrows: 12 }, claimed: [], chests: [30] });
  });

  it('a v6 save migrates to v7 with nothing lost and an empty quest record', () => {
    const v6 = {
      ...defaultSave(),
      version: 6,
      wallet: { coins: 1234, diamonds: 7, hints: 4 },
      progress: { current: 12, unlocked: 12, completed: Array.from({ length: 11 }, (_, i) => i + 1) },
      achievements: { claimed: ['first-escape'], progress: {} },
      items: { owned: { styles: ['classic', 'slate'], themes: ['blue'] }, style: 'slate', accent: 'blue' },
    };
    delete v6.quests;
    const d = migrateV6(v6);
    expect(d.version).toBe(7);
    expect(d.wallet).toEqual({ coins: 1234, diamonds: 7, hints: 4 });
    expect(d.progress).toMatchObject({ current: 12, unlocked: 12 });
    expect(d.achievements.claimed).toEqual(['first-escape']);
    expect(d.items.style).toBe('slate');
    expect(d.quests).toEqual({ week: 0, counts: {}, claimed: [], chests: [] });

    const store = new Map([
      [V6_KEY, '{broken'],
      [V6_BACKUP_KEY, JSON.stringify(v6)],
    ]);
    const s = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    const res = readSave(s);
    expect(res.source).toBe('v6');
    expect(res.data.wallet.coins).toBe(1234);
    expect(store.has(V6_KEY) || store.has(V6_BACKUP_KEY)).toBe(false);
    expect(store.get(BACKUP_KEY)).toBe(store.get(V7_KEY));
    expect(readSave(s).source).toBe('v7');
  });
});
