import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  convertChapters,
  V1_KEY,
  V3_KEY,
  V6_KEY,
  defaultSave,
  migrateV1,
  readSave,
  sanitize,
  writeSave,
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

/** A typical v1 save from the single-file / 2.x versions. */
const V1 = {
  current: 14,
  unlocked: 15,
  completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  daily: { 20261020: true, 20261021: true },
  hints: 6,
  theme: 'dark',
  style: 'olive',
  sound: false,
  vibration: true,
  grid: true,
};

describe('v1 migration', () => {
  it('keeps level progress, hints, settings and the equipped style', () => {
    const d = migrateV1(V1);
    expect(d.version).toBe(6);
    expect(d.progress).toMatchObject({ current: 14, unlocked: 15 });
    expect(d.progress.completed).toEqual(V1.completed);
    expect(d.wallet.hints).toBe(6);
    expect(d.settings).toEqual({ theme: 'dark', sound: false, vibration: true, grid: true });
    expect(d.items.style).toBe('olive');
    expect(d.items.owned.styles).toEqual(['classic', 'olive']);
  });

  it('drops daily data and starts the new fields at zero', () => {
    const d = migrateV1(V1);
    // v1's old daily records are dropped: the daily reward starts fresh
    expect(d.daily).toEqual({ lastClaim: null, streak: 0, best: 0, lastSeen: 0, blockedDay: null });
    expect(d.wallet).toMatchObject({ coins: 0, diamonds: 0 });
    expect(d.xp).toBe(0);
    expect(d.achievements.claimed).toEqual([]);
  });

  it('migrates automatically on first load, then removes the v1 key', () => {
    const s = memoryStorage({ [V1_KEY]: JSON.stringify(V1) });
    const res = readSave(s);
    expect(res.source).toBe('v1');
    expect(res.data.progress.current).toBe(14);
    expect(s.has(V1_KEY)).toBe(false);
    expect(JSON.parse(s.getItem(V6_KEY)).progress.completed).toHaveLength(14);
    expect(readSave(s).source).toBe('v6');
  });

  it('keeps the v1 key when the v3 write fails, so nothing is lost', () => {
    const s = memoryStorage({ [V1_KEY]: JSON.stringify(V1) });
    s.setItem = () => {
      throw new Error('quota');
    };
    const res = readSave(s);
    expect(res.data.progress.current).toBe(14);
    expect(s.has(V1_KEY)).toBe(true);
  });
});

describe('corrupted data', () => {
  it('turns negative, NaN and non-number values into 0 and ignores unknown keys', () => {
    const d = sanitize({
      wallet: { coins: -50, diamonds: 'lots', hints: NaN },
      xp: Infinity,
      stats: { arrowsCleared: -1, playSeconds: '9', wins: 3.7, hacked: 99 },
      cheat: true,
      progress: { current: 0, unlocked: -4, completed: [1, 1, 'x', -2, 3.5, 2] },
    });
    expect(d.wallet).toEqual({ coins: 0, diamonds: 0, hints: 3 });
    expect(d.xp).toBe(0);
    expect(d.stats.arrowsCleared).toBe(0);
    expect(d.stats.playSeconds).toBe(0);
    expect(d.stats.wins).toBe(3);
    expect(d.stats).not.toHaveProperty('hacked');
    expect(d).not.toHaveProperty('cheat');
    expect(d.progress.completed).toEqual([1, 2]);
    expect(d.progress.unlocked).toBe(3);
    expect(d.progress.current).toBe(1);
  });

  it('never lets unlocked fall behind completed levels', () => {
    const d = sanitize({ progress: { unlocked: 2, current: 40, completed: [1, 2, 3, 4, 5] } });
    expect(d.progress.unlocked).toBe(6);
    expect(d.progress.current).toBe(6);
  });

  it('only equips owned items and ignores unknown ones', () => {
    const d = sanitize({ items: { owned: { styles: ['slate', 'gold'], themes: [] }, style: 'mint', accent: 'coral' } });
    expect(d.items.owned.styles).toEqual(['classic', 'slate']);
    expect(d.items.style).toBe('classic');
    expect(d.items.accent).toBe('blue');
  });

  it('falls back to defaults for garbage input', () => {
    for (const raw of [null, undefined, 42, 'text', [], { progress: 'x', wallet: [1] }]) {
      expect(sanitize(raw)).toEqual(defaultSave());
    }
  });

  it('rejects a bad name and an out-of-range avatar', () => {
    const d = sanitize({ profile: { name: ' x ', avatar: 27 } });
    expect(d.profile.name).toBe('Player');
    expect(d.profile.avatar).toBe(3);
  });

  it('uses the backup when the main save is unreadable', () => {
    const good = sanitize({ wallet: { coins: 120 } });
    const s = memoryStorage({ [V6_KEY]: '{not json', [BACKUP_KEY]: JSON.stringify(good) });
    const res = readSave(s);
    expect(res.source).toBe('backup');
    expect(res.data.wallet.coins).toBe(120);
  });

  it('starts fresh when storage is empty or throws', () => {
    expect(readSave(memoryStorage()).source).toBe('new');
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readSave(broken)).toEqual({ data: defaultSave(), source: 'new' });
  });

  it('writes the save and a backup copy', () => {
    const s = memoryStorage();
    expect(writeSave(s, defaultSave())).toBe(true);
    expect(s.getItem(BACKUP_KEY)).toBe(s.getItem(V6_KEY));
  });
});

describe('20-level chapters (back from 40)', () => {
  it('a rewarded 40-level chapter marks both of its 20-level halves as rewarded', () => {
    expect(convertChapters([1], 40)).toEqual([1, 2]);
    expect(convertChapters([1, 2], 40)).toEqual([1, 2, 3, 4]);
    expect(convertChapters([2], 40)).toEqual([3, 4]);
    expect(convertChapters([1, 3], 40)).toEqual([1, 2, 5, 6]);
    expect(convertChapters([], 40)).toEqual([]);
  });

  it('saves made with 20-level chapters (or without a size) stay as they are', () => {
    expect(convertChapters([1, 2, 5], 20)).toEqual([1, 2, 5]);
    const old = sanitize({ progress: { completed: [1, 2], chaptersRewarded: [1, 3] } });
    expect(old.progress.chaptersRewarded).toEqual([1, 3]);
    expect(old.progress.chapterSize).toBe(20);
  });

  it('a 40-level save keeps all progress and converts once', () => {
    const completed = Array.from({ length: 85 }, (_, i) => i + 1);
    const d = sanitize({
      progress: { current: 86, unlocked: 86, completed, perfect: [4, 50], chaptersRewarded: [1, 2], chapterSize: 40 },
      wallet: { coins: 900, diamonds: 14, hints: 3 },
    });
    expect(d.progress).toMatchObject({ current: 86, unlocked: 86, perfect: [4, 50], chapterSize: 20 });
    expect(d.progress.completed).toEqual(completed);
    expect(d.progress.chaptersRewarded).toEqual([1, 2, 3, 4]);
    expect(d.wallet).toEqual({ coins: 900, diamonds: 14, hints: 3 });
    // loading the converted save again changes nothing
    expect(sanitize(d).progress.chaptersRewarded).toEqual([1, 2, 3, 4]);
  });

  it('no chapter reward is paid twice after the switch', async () => {
    const { chapterLevels, levelReward } = await import('../src/game/economy.js');
    // a 40-level save: chapter 1 (levels 1-40) was rewarded, levels 41-60 done but chapter 2 not rewarded
    const d = sanitize({
      progress: {
        completed: Array.from({ length: 60 }, (_, i) => i + 1),
        chaptersRewarded: [1],
        chapterSize: 40,
      },
    });
    const rewarded = new Set(d.progress.chaptersRewarded);
    const done = new Set(d.progress.completed);
    const pays = (level, ch) =>
      levelReward({
        level,
        difficulty: 'Normal',
        heartsLeft: 2,
        maxHearts: 3,
        wasCompleted: true,
        wasPerfect: true,
        chapterDone: chapterLevels(ch).every((l) => done.has(l)),
        chapterRewarded: rewarded.has(ch),
      }).chapter;
    // replaying a level of the old rewarded chapter (now chapters 1 and 2) pays nothing
    expect(pays(10, 1)).toBe(false);
    expect(pays(30, 2)).toBe(false);
    // levels 41-60 (new chapter 3) were never rewarded as a chapter: it may pay once
    expect(pays(50, 3)).toBe(true);
  });
});

describe('removed boosters', () => {
  it('a saved v3 game: Reveal and Auto-Clear counts are dropped, Shields and Extra Hearts paid back', () => {
    const old = {
      ...defaultSave(),
      wallet: { coins: 640, diamonds: 7, hints: 4 },
      boosters: { shield: 2, reveal: 5, autoClear: 3, extraHeart: 1 },
      progress: { current: 12, unlocked: 12, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    };
    const s = memoryStorage({ [V3_KEY]: JSON.stringify(old) });
    const { data, source } = readSave(s);
    expect(source).toBe('v3');
    expect(data).not.toHaveProperty('boosters');
    expect(data.wallet).toEqual({ coins: 640 + 120, diamonds: 7 + 1, hints: 4 });
    expect(data.pendingRefund).toEqual({ coins: 120, diamonds: 1 });
    expect(data.progress).toMatchObject({ current: 12, unlocked: 12 });
    expect(data.progress.completed).toHaveLength(11);
  });
});
