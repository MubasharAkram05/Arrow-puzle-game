import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  V2_BACKUP_KEY,
  V2_KEY,
  V3_BACKUP_KEY,
  V3_KEY,
  V4_BACKUP_KEY,
  V4_KEY,
  V5_KEY,
  defaultSave,
  migrateV2,
  migrateV3,
  migrateV4,
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

describe('v2 migration', () => {
  it('keeps all progress, coins, diamonds, items, achievements, profile and settings', () => {
    const d = migrateV2(V2);
    expect(d.version).toBe(5);
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
    expect(d.boosters).toEqual({ shield: 0, extraHeart: 0 });
    expect(d.cosmetics).toEqual(defaultSave().cosmetics);
    expect(d.offers).toEqual({ starterBought: false, giftLast: 0 });
    expect(d.seenNew).toEqual([]);
    expect(d.stats).toMatchObject({ boostersUsed: 0, hintsUsed: 0 });
  });

  it('keeps new fields a v2 save already had, after validation', () => {
    const d = migrateV2({
      ...V2,
      bogus: 9,
      boosters: { shield: 2, reveal: 5, autoClear: 2, bogus: 9 },
      cosmetics: { owned: { effect: ['spark', 'fake'] }, equipped: { effect: 'spark', board: 'stars' } },
      offers: { starterBought: true, giftLast: 1_700_000_000_000 },
      seenNew: ['effect:spark', 42, 'bad key!'],
    });
    // Reveal and Auto-Clear were removed: their counts are dropped, everything else is kept
    expect(d.boosters).toEqual({ shield: 2, extraHeart: 0 });
    expect(d.cosmetics.owned.effect).toEqual(['default', 'spark']);
    expect(d.cosmetics.equipped).toMatchObject({ effect: 'spark', board: 'plain' });
    expect(d.offers).toEqual({ starterBought: true, giftLast: 1_700_000_000_000 });
    expect(d.seenNew).toEqual(['effect:spark']);
    expect(d).not.toHaveProperty('bogus');
  });

  it('migrates on load, writes v5 and its backup, then removes the v2 keys', () => {
    const s = memoryStorage({ [V2_KEY]: JSON.stringify(V2), [V2_BACKUP_KEY]: JSON.stringify(V2) });
    const res = readSave(s);
    expect(res.source).toBe('v2');
    expect(res.data.wallet.coins).toBe(1234);
    expect(s.has(V2_KEY)).toBe(false);
    expect(s.has(V2_BACKUP_KEY)).toBe(false);
    expect(s.getItem(BACKUP_KEY)).toBe(s.getItem(V5_KEY));
    expect(readSave(s)).toEqual({ data: res.data, source: 'v5' });
  });

  it('falls back to the v2 backup when the v2 main key is corrupted', () => {
    const s = memoryStorage({ [V2_KEY]: '{oops', [V2_BACKUP_KEY]: JSON.stringify(V2) });
    expect(readSave(s).data.wallet.diamonds).toBe(17);
  });

  it('keeps the v2 keys when the v5 write fails, so nothing is lost', () => {
    const s = memoryStorage({ [V2_KEY]: JSON.stringify(V2) });
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(readSave(s).data.wallet.coins).toBe(1234);
    expect(s.has(V2_KEY)).toBe(true);
  });

  it('prefers an existing v3 save over leftover v2 data', () => {
    const v3 = { ...sanitize({ wallet: { coins: 5 } }), version: 3 };
    const s = memoryStorage({ [V3_KEY]: JSON.stringify(v3), [V2_KEY]: JSON.stringify(V2) });
    expect(readSave(s)).toMatchObject({ source: 'v3', data: { wallet: { coins: 5 } } });
  });
});

/** A v3 save from before the shape collection: shape levels 6, 9 and 66 finished (heart, arrow, heart again). */
const V3 = {
  version: 3,
  progress: {
    current: 70,
    unlocked: 70,
    completed: Array.from({ length: 69 }, (_, i) => i + 1),
    perfect: [6, 9],
    masks: [6, 9, 66],
    chaptersRewarded: [1],
    chapterSize: 40,
  },
  wallet: { coins: 900, diamonds: 12, hints: 2 },
  boosters: { shield: 2, extraHeart: 1 },
  xp: 3000,
  stats: { arrowsCleared: 5000, wins: 69 },
  achievements: { claimed: ['first-escape', 'shape-solver'], progress: {} },
  items: { owned: { styles: ['classic'], themes: ['blue', 'teal'] }, style: 'classic', accent: 'teal' },
  profile: { avatar: 3, name: 'Tester' },
  settings: { theme: 'light', sound: true, vibration: false, grid: false },
};

describe('v3 migration (shape collection)', () => {
  it('keeps everything and collects the shapes of finished shape levels (old order)', () => {
    const d = migrateV3(V3);
    expect(d.version).toBe(5);
    expect(d.progress).toMatchObject({ current: 70, unlocked: 70, perfect: [6, 9], masks: [6, 9, 66] });
    expect(d.progress.completed).toHaveLength(69);
    expect(d.wallet).toEqual({ coins: 900, diamonds: 12, hints: 2 });
    expect(d.boosters).toEqual({ shield: 2, extraHeart: 1 });
    expect(d.achievements.claimed).toEqual(['first-escape', 'shape-solver']);
    expect(d.settings).toEqual(V3.settings);
    // levels 6..69 step 3 = 22 shape levels: the 20 originals once, then heart and arrow again
    expect(new Set(d.progress.shapes)).toEqual(
      new Set([
        'heart',
        'arrow',
        'mushroom',
        'circle',
        'plane',
        'whale',
        'diamond',
        'cat',
        'letterA',
        'donut',
        'star',
        'dog',
        'house',
        'fish',
        'hourglass',
        'bird',
        'apple',
        'plus',
        'tree',
        'letterZ',
      ]),
    );
  });

  it('a fresh player starts with an empty collection', () => {
    expect(defaultSave().progress.shapes).toEqual([]);
    expect(migrateV3({ version: 3, progress: { completed: [1, 2, 3] } }).progress.shapes).toEqual([]);
  });

  it('a v4 save keeps its own list (cleaned), even when empty', () => {
    const v4 = sanitize({
      version: 4,
      progress: { completed: [6, 9], shapes: ['cat', 'cat', 7, 'bad id!', 'letterQ'] },
    });
    expect(v4.progress.shapes).toEqual(['cat', 'letterQ']);
    expect(sanitize({ version: 4, progress: { completed: [6, 9], shapes: [] } }).progress.shapes).toEqual([]);
  });

  it('migrates on load from v3 or its backup, writes v5, then removes the old keys', () => {
    const s = memoryStorage({ [V3_KEY]: '{broken', [V3_BACKUP_KEY]: JSON.stringify(V3), [V2_KEY]: JSON.stringify(V2) });
    const res = readSave(s);
    expect(res.source).toBe('v3');
    expect(res.data.wallet.coins).toBe(900);
    expect(res.data.progress.shapes).toContain('heart');
    for (const k of [V3_KEY, V3_BACKUP_KEY, V2_KEY]) expect(s.has(k), k).toBe(false);
    expect(readSave(s)).toEqual({ data: res.data, source: 'v5' });
  });

  it('keeps the v3 keys when the v5 write fails', () => {
    const s = memoryStorage({ [V3_KEY]: JSON.stringify(V3) });
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(readSave(s).data.progress.shapes).toContain('arrow');
    expect(s.has(V3_KEY)).toBe(true);
  });
});

/** A v4 save from 3.7.0: skipped level 5, claimed achievements that no longer exist, far progress. */
const V4 = {
  version: 4,
  progress: {
    current: 120,
    unlocked: 120,
    completed: Array.from({ length: 119 }, (_, i) => i + 1),
    perfect: [3, 6, 9],
    masks: [6, 9, 12],
    shapes: ['heart', 'cat', 'letterB'],
    chaptersRewarded: [1, 2],
    chapterSize: 40,
  },
  wallet: { coins: 4321, diamonds: 33, hints: 7 },
  boosters: { shield: 3, extraHeart: 2 },
  cosmetics: { owned: { effect: ['default', 'spark'] }, equipped: { effect: 'spark' } },
  xp: 9000,
  stats: { arrowsCleared: 20000, wins: 130, bestPerfectStreak: 6, coinsSpent: 1500 },
  achievements: { claimed: ['first-escape', 'collector', 'alphabet', 'big-spender'], progress: {} },
  items: { owned: { styles: ['classic', 'slate'], themes: ['blue'] }, style: 'slate', accent: 'blue' },
  profile: { avatar: 2, name: 'Old Player' },
  settings: { theme: 'dark', sound: true, vibration: true, grid: false },
};

describe('v4 to v5 migration (daily reward, tiered achievements)', () => {
  it('keeps progress, coins, diamonds, hints, items, shapes and claims; adds a fresh daily record', () => {
    const d = migrateV4(V4);
    expect(d.version).toBe(5);
    expect(d.progress).toMatchObject({ current: 120, unlocked: 120, perfect: [3, 6, 9], masks: [6, 9, 12] });
    expect(d.progress.completed).toHaveLength(119);
    expect(d.progress.shapes).toEqual(['heart', 'cat', 'letterB']);
    expect(d.wallet).toEqual({ coins: 4321, diamonds: 33, hints: 7 });
    expect(d.boosters).toEqual({ shield: 3, extraHeart: 2 });
    expect(d.cosmetics.equipped.effect).toBe('spark');
    expect(d.items).toEqual(V4.items);
    expect(d.profile).toEqual(V4.profile);
    // claims of removed achievements stay (their diamonds are kept), nothing is taken back
    expect(d.achievements.claimed).toEqual(['first-escape', 'collector', 'alphabet', 'big-spender']);
    expect(d.daily).toEqual({ lastClaim: null, streak: 0, best: 0, lastSeen: 0, blockedDay: null });
    expect(d.stats).toMatchObject({ cleanLevels: 0, comebacks: 0, arrowsCleared: 20000 });
  });

  it('old progress already meeting new steps makes them claimable (Level Climber, Hard Worker)', async () => {
    const { achievementStatus } = await import('../src/game/achievements.js');
    const d = migrateV4(V4);
    const ctx = {
      completed: new Set(d.progress.completed),
      perfect: new Set(d.progress.perfect),
      masks: new Set(d.progress.masks),
      unlocked: d.progress.unlocked,
      stats: d.stats,
      dailyBest: d.daily.best,
    };
    const s = Object.fromEntries(achievementStatus(ctx, new Set(d.achievements.claimed)).map((a) => [a.def.id, a]));
    expect(s['level-climber-1'].claimable).toBe(true);
    expect(s['level-climber-3'].done).toBe(true);
    expect(s['hard-worker-1'].claimable).toBe(true);
    expect(s['big-spender'].claimed).toBe(true);
  });

  it('migrates on load from v4 or its backup, writes v5, then removes the v4 keys', () => {
    const s = memoryStorage({ [V4_KEY]: '{broken', [V4_BACKUP_KEY]: JSON.stringify(V4) });
    const res = readSave(s);
    expect(res.source).toBe('v4');
    expect(res.data.wallet.diamonds).toBe(33);
    for (const k of [V4_KEY, V4_BACKUP_KEY]) expect(s.has(k), k).toBe(false);
    expect(readSave(s)).toEqual({ data: res.data, source: 'v5' });
  });

  it('keeps the v4 keys when the v5 write fails', () => {
    const s = memoryStorage({ [V4_KEY]: JSON.stringify(V4) });
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(readSave(s).data.wallet.coins).toBe(4321);
    expect(s.has(V4_KEY)).toBe(true);
  });

  it('a broken daily record is cleaned, never breaks the save', () => {
    const d = sanitize({
      version: 5,
      daily: { lastClaim: 'x', streak: -4, best: 'many', lastSeen: 1e20, blockedDay: 3.5 },
    });
    expect(d.daily).toEqual({ lastClaim: null, streak: 0, best: 0, lastSeen: 0, blockedDay: null });
    const ok = sanitize({ version: 5, daily: { lastClaim: 20000, streak: 9, best: 4, lastSeen: 1.7e12 } });
    expect(ok.daily).toMatchObject({ lastClaim: 20000, streak: 9, best: 9 });
  });
});
