import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  convertChapters,
  V1_KEY,
  V3_KEY,
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
    expect(d.version).toBe(3);
    expect(d.progress).toMatchObject({ current: 14, unlocked: 15 });
    expect(d.progress.completed).toEqual(V1.completed);
    expect(d.wallet.hints).toBe(6);
    expect(d.settings).toEqual({ theme: 'dark', sound: false, vibration: true, grid: true });
    expect(d.items.style).toBe('olive');
    expect(d.items.owned.styles).toEqual(['classic', 'olive']);
  });

  it('drops daily data and starts the new fields at zero', () => {
    const d = migrateV1(V1);
    expect(JSON.stringify(d)).not.toContain('daily');
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
    expect(JSON.parse(s.getItem(V3_KEY)).progress.completed).toHaveLength(14);
    expect(readSave(s).source).toBe('v3');
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
    const s = memoryStorage({ [V3_KEY]: '{not json', [BACKUP_KEY]: JSON.stringify(good) });
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
    expect(s.getItem(BACKUP_KEY)).toBe(s.getItem(V3_KEY));
  });
});

describe('40-level chapters', () => {
  it('maps old 20-level chapter rewards to new 40-level chapters', () => {
    expect(convertChapters([1, 2], 20)).toEqual([1]);
    expect(convertChapters([1, 2, 3, 4], 20)).toEqual([1, 2]);
    expect(convertChapters([1, 2, 3], 20)).toEqual([1]);
    expect(convertChapters([], 20)).toEqual([]);
  });

  it('does not mark a half-rewarded chapter, so its reward is not lost', () => {
    expect(convertChapters([1], 20)).toEqual([]);
    expect(convertChapters([2, 3], 20)).toEqual([]);
  });

  it('converts saves without a chapter size once and keeps new saves as they are', () => {
    const old = sanitize({ progress: { completed: [1, 2], chaptersRewarded: [1, 2, 3, 4] } });
    expect(old.progress.chaptersRewarded).toEqual([1, 2]);
    expect(old.progress.chapterSize).toBe(40);
    expect(sanitize(old).progress.chaptersRewarded).toEqual([1, 2]);
  });
});

describe('removed boosters', () => {
  it('drops Reveal and Auto-Clear counts from a saved v3 game and keeps everything else', () => {
    const old = {
      ...defaultSave(),
      wallet: { coins: 640, diamonds: 7, hints: 4 },
      boosters: { shield: 2, reveal: 5, autoClear: 3, extraHeart: 1 },
      progress: { current: 12, unlocked: 12, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    };
    const s = memoryStorage({ [V3_KEY]: JSON.stringify(old) });
    const { data, source } = readSave(s);
    expect(source).toBe('v3');
    expect(data.boosters).toEqual({ shield: 2, extraHeart: 1 });
    expect(data.wallet).toEqual({ coins: 640, diamonds: 7, hints: 4 });
    expect(data.progress).toMatchObject({ current: 12, unlocked: 12 });
    expect(data.progress.completed).toHaveLength(11);
  });
});
