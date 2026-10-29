import { describe, expect, it } from 'vitest';
import {
  canAfford,
  chapterLevels,
  chapterOf,
  grant,
  isMaskLevel,
  levelReward,
  priceLabel,
  shortfall,
  spend,
} from '../src/game/economy.js';

/** A first win of a Normal level with default flags. */
const win = (over = {}) => ({
  level: 3,
  difficulty: 'Normal',
  heartsLeft: 3,
  maxHearts: 3,
  wasCompleted: false,
  wasPerfect: false,
  chapterDone: false,
  chapterRewarded: false,
  ...over,
});

describe('levelReward: coins', () => {
  it('pays 10 base + 5 per heart left', () => {
    expect(levelReward(win({ heartsLeft: 2 })).coins).toBe(20);
    expect(levelReward(win({ heartsLeft: 0, maxHearts: 3 })).coins).toBe(10);
  });

  it('adds +1 coin per 10 arrows on the board, before the difficulty multiplier', () => {
    expect(levelReward(win({ heartsLeft: 0, arrows: 9 })).coins).toBe(10);
    const big = levelReward(win({ heartsLeft: 0, arrows: 145 }));
    expect(big.coins).toBe(24);
    expect(big.lines).toContainEqual({ label: 'Board size (145 arrows)', coins: 14 });
    expect(levelReward(win({ difficulty: 'Super Hard', heartsLeft: 0, wasPerfect: true, arrows: 160 })).coins).toBe(52);
  });

  it('applies Hard x1.5 and Super Hard x2 to base + hearts', () => {
    expect(levelReward(win({ difficulty: 'Hard', heartsLeft: 2, maxHearts: 4 })).coins).toBe(30);
    expect(levelReward(win({ difficulty: 'Super Hard', heartsLeft: 1, maxHearts: 4 })).coins).toBe(30);
  });

  it('adds +20 for a perfect level the first time only', () => {
    const first = levelReward(win());
    expect(first.perfect).toBe(true);
    expect(first.coins).toBe(25 + 20);
    expect(levelReward(win({ wasCompleted: true, wasPerfect: true })).coins).toBe(Math.round(25 * 0.25));
  });

  it('pays 25% on replays but still gives a first perfect bonus', () => {
    expect(levelReward(win({ wasCompleted: true, heartsLeft: 1 })).coins).toBe(Math.round(15 * 0.25));
    expect(levelReward(win({ wasCompleted: true, heartsLeft: 3 })).coins).toBe(6 + 20);
  });

  it('adds the chapter bonus (200 coins) once', () => {
    const r = levelReward(win({ level: 40, heartsLeft: 1, chapterDone: true }));
    expect(r.chapter).toBe(true);
    expect(r.coins).toBe(15 + 200);
    expect(levelReward(win({ level: 40, heartsLeft: 1, chapterDone: true, chapterRewarded: true })).coins).toBe(15);
  });

  it('lists a breakdown that sums to the total', () => {
    const r = levelReward(win({ difficulty: 'Hard', heartsLeft: 4, maxHearts: 4, chapterDone: true }));
    const sum = r.lines.reduce((s, l) => s + (l.coins || 0), 0);
    expect(sum).toBe(r.coins);
  });
});

describe('levelReward: diamonds', () => {
  it('gives +1 for the first clear of every 10th level', () => {
    expect(levelReward(win({ level: 10, heartsLeft: 1 })).diamonds).toBe(1);
    expect(levelReward(win({ level: 10, heartsLeft: 1, wasCompleted: true })).diamonds).toBe(0);
    expect(levelReward(win({ level: 11 })).diamonds).toBe(0);
  });

  it('gives +4 on chapter completion', () => {
    expect(levelReward(win({ level: 40, chapterDone: true })).diamonds).toBe(1 + 4);
    expect(levelReward(win({ level: 39, chapterDone: true })).diamonds).toBe(4);
  });
});

describe('chapters and mask levels', () => {
  it('groups levels in chapters of 40', () => {
    expect(chapterOf(1)).toBe(1);
    expect(chapterOf(40)).toBe(1);
    expect(chapterOf(41)).toBe(2);
    expect(chapterLevels(2)[0]).toBe(41);
    expect(chapterLevels(2)).toHaveLength(40);
    expect(isMaskLevel(30)).toBe(true);
    expect(isMaskLevel(31)).toBe(false);
  });
});

describe('purchases', () => {
  const w = { coins: 100, diamonds: 3 };

  it('spends when there is enough currency', () => {
    expect(canAfford(w, { coins: 80 })).toBe(true);
    expect(spend(w, { coins: 80 })).toEqual({ ok: true, wallet: { coins: 20, diamonds: 3 } });
    expect(spend(w, { diamonds: 2 }).wallet).toEqual({ coins: 100, diamonds: 1 });
    expect(w).toEqual({ coins: 100, diamonds: 3 });
  });

  it('refuses and reports what is missing when there is not enough', () => {
    expect(canAfford(w, { diamonds: 5 })).toBe(false);
    const res = spend(w, { coins: 150 });
    expect(res.ok).toBe(false);
    expect(res.wallet).toBe(w);
    expect(res.missing).toEqual({ coins: 50, diamonds: 0 });
    expect(shortfall(w, { diamonds: 5 })).toEqual({ coins: 0, diamonds: 2 });
  });

  it('grants currency only from known sources and ignores bad amounts', () => {
    expect(grant(w, { coins: 25, diamonds: 1 }, 'ad')).toEqual({ coins: 125, diamonds: 4 });
    expect(grant(w, { coins: -50, diamonds: NaN }, 'purchase')).toEqual(w);
    expect(() => grant(w, { coins: 10 }, 'cheat')).toThrow();
  });

  it('labels prices', () => {
    expect(priceLabel({ coins: 50 })).toBe('50 coins');
    expect(priceLabel({ diamonds: 1 })).toBe('1 diamond');
    expect(priceLabel({ diamonds: 2 })).toBe('2 diamonds');
  });
});
