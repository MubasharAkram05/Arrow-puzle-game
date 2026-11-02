import { describe, expect, it } from 'vitest';
import { DAILY } from '../src/config.js';
import { dailyCards, mainReward } from '../src/game/dailyCards.js';

const states = (s) => dailyCards(s).map((c) => c.state);

describe('Daily Reward cards', () => {
  it('earlier days are claimed, today is "today", later days are future', () => {
    expect(states({ state: 'available', day: 3 })).toEqual([
      'claimed',
      'claimed',
      'today',
      'future',
      'future',
      'future',
      'future',
    ]);
  });

  it('after claiming today, today counts as claimed and there is no "today" card', () => {
    const s = states({ state: 'claimed', day: 3 });
    expect(s.slice(0, 3)).toEqual(['claimed', 'claimed', 'claimed']);
    expect(s).not.toContain('today');
  });

  it('day 1 of a new cycle has nothing claimed; day 7 can be today', () => {
    expect(states({ state: 'available', day: 1 })[0]).toBe('today');
    expect(states({ state: 'available', day: 1 }).filter((x) => x === 'claimed')).toHaveLength(0);
    expect(states({ state: 'available', day: 7 })[6]).toBe('today');
  });

  it('a wrong clock shows no "today" card', () => {
    expect(states({ state: 'clock', day: 4 })).not.toContain('today');
  });

  it('cards carry the configured rewards, unchanged', () => {
    expect(dailyCards({ state: 'available', day: 1 }).map((c) => c.reward)).toEqual(DAILY.rewards);
  });

  it('the big icon shows diamonds over coins, and the bulb for hints alone', () => {
    expect(mainReward({ coins: 20 })).toEqual({ kind: 'coins', amount: 20 });
    expect(mainReward({ diamonds: 2, hints: 1 })).toEqual({ kind: 'diamonds', amount: 2 });
    expect(mainReward({ hints: 1 })).toEqual({ kind: 'hints', amount: 1 });
  });
});
