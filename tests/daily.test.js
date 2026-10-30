import { beforeEach, describe, expect, it } from 'vitest';
import { DAILY } from '../src/config.js';
import {
  claimDaily,
  currentStreak,
  cycleDay,
  dailyStatus,
  dayNumber,
  newDaily,
  touchDaily,
} from '../src/game/daily.js';

/** Local time on day `d` of November 2026 (hour optional), so tests don't depend on the time zone. */
const at = (d, h = 10) => new Date(2026, 10, d, h, 0, 0).getTime();

/** Open the app and claim on each given day, returning the record and the rewards. */
function play(days, rec = newDaily()) {
  const got = [];
  for (const d of days) {
    rec = touchDaily(rec, at(d));
    const res = claimDaily(rec, at(d));
    got.push(res.ok ? res.reward : null);
    rec = res.rec;
  }
  return { rec, got };
}

describe('daily reward: days 1-7', () => {
  it('pays the 7 rewards in order on consecutive days', () => {
    const { rec, got } = play([1, 2, 3, 4, 5, 6, 7]);
    expect(got).toEqual([
      { coins: 20 },
      { coins: 30 },
      { coins: 40 },
      { coins: 50 },
      { diamonds: 1 },
      { coins: 70 },
      { diamonds: 2, hints: 1 },
    ]);
    expect(got).toEqual(DAILY.rewards);
    expect(rec).toMatchObject({ streak: 7, best: 7 });
  });

  it('after day 7 the cards start again at day 1, but the streak keeps counting', () => {
    const { rec, got } = play([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(got.slice(7)).toEqual([{ coins: 20 }, { coins: 30 }]);
    expect(rec.streak).toBe(9);
    expect(cycleDay(8)).toBe(1);
    expect(cycleDay(14)).toBe(7);
    expect(dailyStatus(rec, at(10))).toMatchObject({ state: 'available', streak: 10, day: 3 });
  });
});

describe('daily reward: missed days and same-day claims', () => {
  it('missing a full day resets the streak to day 1 (best streak stays)', () => {
    const { rec, got } = play([1, 2, 3, 5]);
    expect(got[3]).toEqual({ coins: 20 });
    expect(rec).toMatchObject({ streak: 1, best: 3 });
    expect(currentStreak(play([1, 2, 3]).rec, at(5))).toBe(0);
    expect(currentStreak(play([1, 2, 3]).rec, at(4))).toBe(3);
  });

  it('closing the popup and claiming later the same day works, once', () => {
    let rec = touchDaily(play([1]).rec, at(2, 7));
    expect(dailyStatus(rec, at(2, 7)).state).toBe('available');
    // not claimed in the morning; claimed in the evening of the same day
    rec = touchDaily(rec, at(2, 23));
    const res = claimDaily(rec, at(2, 23));
    expect(res).toMatchObject({ ok: true, day: 2, reward: { coins: 30 } });
    expect(claimDaily(res.rec, at(2, 23)).reason).toBe('claimed');
    expect(dailyStatus(res.rec, at(2, 23))).toMatchObject({ state: 'claimed', streak: 2 });
  });

  it('day boundaries follow the local calendar, not 24-hour gaps', () => {
    expect(dayNumber(at(3, 23)) + 1).toBe(dayNumber(at(4, 0)));
    const { rec } = play([3]);
    // claimed at 10:00, next claim allowed right after local midnight
    expect(dailyStatus(touchDaily(rec, at(4, 0)), at(4, 0)).state).toBe('available');
  });
});

describe('daily reward: clock checks', () => {
  let rec;
  beforeEach(() => {
    rec = play([10, 11, 12]).rec;
  });

  it('a clock moved backward pays nothing and keeps the save intact', () => {
    rec = touchDaily(rec, at(5));
    expect(dailyStatus(rec, at(5)).state).toBe('clock');
    const res = claimDaily(rec, at(5));
    expect(res).toMatchObject({ ok: false, reason: 'clock' });
    expect(res.rec).toEqual(rec);
    expect(rec).toMatchObject({ streak: 3, best: 3 });
    // once real time is past the last claim again, the next day pays normally
    expect(dailyStatus(touchDaily(rec, at(13)), at(13))).toMatchObject({ state: 'available', streak: 4 });
  });

  it('a small step back (time zone, DST) is fine', () => {
    const r = touchDaily(rec, at(13, 12));
    expect(dailyStatus(r, at(13, 12) - 30 * 60 * 1000).state).toBe('available');
  });

  it('a clock that jumped far ahead pays nothing that day; the next day starts a new streak', () => {
    const far = at(12) + (DAILY.maxJumpDays + 5) * 86_400_000;
    const r = touchDaily(rec, far);
    expect(dailyStatus(r, far).state).toBe('clock');
    expect(claimDaily(r, far).ok).toBe(false);
    const next = far + 86_400_000;
    const res = claimDaily(touchDaily(r, next), next);
    expect(res).toMatchObject({ ok: true, day: 1 });
    expect(res.rec.best).toBe(3);
  });
});

describe('daily reward: applying it to the game', () => {
  it('credits coins, diamonds and hints, and the claim is saved', async () => {
    const { state } = await import('../src/game/state.js');
    const { claimDailyReward } = await import('../src/game/rewards.js');
    const { applySave, snapshot } = await import('../src/storage/save.js');
    const { defaultSave, sanitize } = await import('../src/storage/schema.js');
    applySave(defaultSave());
    // six days already claimed: today is day 7 (2 diamonds + 1 hint)
    state.daily = play([1, 2, 3, 4, 5, 6]).rec;
    const hints = state.hints;
    const coins = state.coins;
    const res = claimDailyReward(at(7));
    expect(res.ok).toBe(true);
    expect(state.diamonds).toBe(2);
    expect(state.hints).toBe(hints + 1);
    expect(state.coins).toBe(coins);
    expect(claimDailyReward(at(7)).ok).toBe(false);
    applySave(sanitize(JSON.parse(JSON.stringify(snapshot()))));
    expect(state.daily).toMatchObject({ streak: 7, best: 7 });
  });
});
