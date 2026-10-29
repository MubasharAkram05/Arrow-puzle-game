import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  V2_BACKUP_KEY,
  V2_KEY,
  V3_KEY,
  defaultSave,
  migrateV2,
  readSave,
  sanitize,
} from '../src/storage/schema.js';

/** In-memory localStorage stand-in. */
function memoryStorage(init = {}) {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
  };
}

/** A v2 save as written by the economy update (before boosters and cosmetics existed). */
const V2 = {
  version: 2,
  progress: {
    current: 23,
    unlocked: 24,
    completed: Array.from({ length: 22 }, (_, i) => i + 1),
    perfect: [2, 5],
    masks: [],
    chaptersRewarded: [1],
    chapterSize: 40,
  },
  wallet: { coins: 1234, diamonds: 17, hints: 4 },
  xp: 880,
  stats: { arrowsCleared: 410, wins: 22, streak: 3, bestStreak: 9, coinsSpent: 300, playSeconds: 4000 },
  achievements: { claimed: ['first-escape', 'chapter-master'], progress: {} },
  items: { owned: { styles: ['classic', 'slate'], themes: ['blue', 'teal'] }, style: 'slate', accent: 'teal' },
  profile: { avatar: 7, name: 'Mubashar' },
  settings: { theme: 'dark', sound: false, vibration: true, grid: true },
};

describe('v2 to v3 migration', () => {
  it('keeps all progress, coins, diamonds, items, achievements, profile and settings', () => {
    const d = migrateV2(V2);
    expect(d.version).toBe(3);
    expect(d.progress).toMatchObject({ current: 23, unlocked: 24, perfect: [2, 5], chaptersRewarded: [1] });
    expect(d.progress.completed).toHaveLength(22);
    expect(d.wallet).toEqual({ coins: 1234, diamonds: 17, hints: 4 });
    expect(d.xp).toBe(880);
    expect(d.stats).toMatchObject({ arrowsCleared: 410, wins: 22, bestStreak: 9, coinsSpent: 300 });
    expect(d.achievements.claimed).toEqual(['first-escape', 'chapter-master']);
    expect(d.items).toEqual(V2.items);
    expect(d.profile).toEqual({ avatar: 7, name: 'Mubashar' });
    expect(d.settings).toEqual(V2.settings);
  });

  it('adds the new fields with safe defaults', () => {
    const d = migrateV2(V2);
    expect(d.boosters).toEqual({ shield: 0, reveal: 0, autoClear: 0, extraHeart: 0 });
    expect(d.cosmetics).toEqual(defaultSave().cosmetics);
    expect(d.offers).toEqual({ starterBought: false, giftLast: 0 });
    expect(d.seenNew).toEqual([]);
    expect(d.stats).toMatchObject({ boostersUsed: 0, hintsUsed: 0 });
  });

  it('keeps new fields a v2 save already had, after validation', () => {
    const d = migrateV2({
      ...V2,
      bogus: 9,
      boosters: { shield: 2, reveal: -4, autoClear: 'x', bogus: 9 },
      cosmetics: { owned: { effect: ['spark', 'fake'] }, equipped: { effect: 'spark', board: 'stars' } },
      offers: { starterBought: true, giftLast: 1_700_000_000_000 },
      seenNew: ['effect:spark', 42, 'bad key!'],
    });
    expect(d.boosters).toEqual({ shield: 2, reveal: 0, autoClear: 0, extraHeart: 0 });
    expect(d.cosmetics.owned.effect).toEqual(['default', 'spark']);
    expect(d.cosmetics.equipped).toMatchObject({ effect: 'spark', board: 'plain' });
    expect(d.offers).toEqual({ starterBought: true, giftLast: 1_700_000_000_000 });
    expect(d.seenNew).toEqual(['effect:spark']);
    expect(d).not.toHaveProperty('bogus');
  });

  it('migrates on load, writes v3 and its backup, then removes the v2 keys', () => {
    const s = memoryStorage({ [V2_KEY]: JSON.stringify(V2), [V2_BACKUP_KEY]: JSON.stringify(V2) });
    const res = readSave(s);
    expect(res.source).toBe('v2');
    expect(res.data.wallet.coins).toBe(1234);
    expect(s.has(V2_KEY)).toBe(false);
    expect(s.has(V2_BACKUP_KEY)).toBe(false);
    expect(s.getItem(BACKUP_KEY)).toBe(s.getItem(V3_KEY));
    expect(readSave(s)).toEqual({ data: res.data, source: 'v3' });
  });

  it('falls back to the v2 backup when the v2 main key is corrupted', () => {
    const s = memoryStorage({ [V2_KEY]: '{oops', [V2_BACKUP_KEY]: JSON.stringify(V2) });
    expect(readSave(s).data.wallet.diamonds).toBe(17);
  });

  it('keeps the v2 keys when the v3 write fails, so nothing is lost', () => {
    const s = memoryStorage({ [V2_KEY]: JSON.stringify(V2) });
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(readSave(s).data.wallet.coins).toBe(1234);
    expect(s.has(V2_KEY)).toBe(true);
  });

  it('prefers an existing v3 save over leftover v2 data', () => {
    const v3 = sanitize({ wallet: { coins: 5 } });
    const s = memoryStorage({ [V3_KEY]: JSON.stringify(v3), [V2_KEY]: JSON.stringify(V2) });
    expect(readSave(s)).toMatchObject({ source: 'v3', data: { wallet: { coins: 5 } } });
  });
});
