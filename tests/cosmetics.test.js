import { beforeEach, describe, expect, it } from 'vitest';
import { COSMETICS } from '../src/config.js';
import {
  achievementUnlocks,
  buyCosmetic,
  equipCosmetic,
  grantCosmetic,
  isOwned,
  newCosmetics,
} from '../src/game/cosmetics.js';
import { buyCosmeticItem, claim } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { applySave } from '../src/storage/save.js';
import { defaultSave, sanitize, sanitizeCosmetics } from '../src/storage/schema.js';

describe('cosmetics (pure)', () => {
  it('every category starts with its free default owned and equipped', () => {
    const c = newCosmetics();
    for (const cat of ['effect', 'board', 'head', 'confetti', 'sound', 'frame']) {
      expect(c.equipped[cat]).toBe(COSMETICS[cat][0].id);
      expect(isOwned(c, cat, COSMETICS[cat][0].id)).toBe(true);
    }
    expect(c.owned.avatar).toEqual([]);
  });

  it('buys with enough coins or diamonds, refuses without', () => {
    const c = newCosmetics();
    const ok = buyCosmetic({ coins: 300, diamonds: 0 }, c, 'effect', 'spark');
    expect(ok.ok).toBe(true);
    expect(ok.wallet).toEqual({ coins: 50, diamonds: 0 });
    expect(isOwned(ok.cos, 'effect', 'spark')).toBe(true);
    const no = buyCosmetic({ coins: 0, diamonds: 2 }, c, 'board', 'chalk');
    expect(no).toMatchObject({ ok: false, reason: 'funds', missing: { coins: 0, diamonds: 2 } });
    expect(buyCosmetic({ coins: 999, diamonds: 9 }, ok.cos, 'effect', 'spark').reason).toBe('owned');
    expect(buyCosmetic({ coins: 999, diamonds: 9 }, c, 'effect', 'laser').reason).toBe('unknown');
  });

  it('honours a sale price', () => {
    const res = buyCosmetic({ coins: 300, diamonds: 0 }, newCosmetics(), 'effect', 'comet', { coins: 280 });
    expect(res.wallet.coins).toBe(20);
  });

  it('equips only owned items', () => {
    const c = newCosmetics();
    expect(equipCosmetic(c, 'head', 'feather').ok).toBe(false);
    const owned = grantCosmetic(c, 'head', 'feather');
    const res = equipCosmetic(owned, 'head', 'feather');
    expect(res.ok).toBe(true);
    expect(res.cos.equipped.head).toBe('feather');
  });

  it('lists frames unlocked by achievements', () => {
    expect(achievementUnlocks('chapter-master')).toEqual([{ cat: 'frame', id: 'gold' }]);
    expect(achievementUnlocks('perfectionist')).toEqual([{ cat: 'frame', id: 'silver' }]);
    expect(achievementUnlocks('first-escape')).toEqual([]);
  });
});

describe('cosmetics in the game state', () => {
  beforeEach(() => applySave(defaultSave()));

  it('claiming Chapter Master grants the Gold frame for free', () => {
    for (let n = 1; n <= 40; n++) state.progress.completed.add(n);
    const res = claim('chapter-master');
    expect(res.ok).toBe(true);
    expect(isOwned(state.cosmetics, 'frame', 'gold')).toBe(true);
    expect(state.diamonds).toBe(2);
  });

  it('tracks coins spent on cosmetics', () => {
    state.coins = 500;
    expect(buyCosmeticItem('confetti', 'hearts').ok).toBe(true);
    expect(state.stats.coinsSpent).toBe(150);
    expect(buyCosmeticItem('frame', 'diamond').ok).toBe(false);
  });
});

describe('saved cosmetics are validated', () => {
  it('drops unknown items and un-equips what is not owned', () => {
    const c = sanitizeCosmetics({
      owned: { effect: ['spark', 'laser'], board: 'oops', avatar: ['p2', 'p99'] },
      equipped: { effect: 'spark', board: 'stars', head: 42 },
    });
    expect(c.owned.effect).toEqual(['default', 'spark']);
    expect(c.owned.board).toEqual(['plain']);
    expect(c.owned.avatar).toEqual(['p2']);
    expect(c.equipped).toMatchObject({ effect: 'spark', board: 'plain', head: 'triangle' });
  });

  it('allows a premium avatar only when it is owned', () => {
    expect(sanitize({ profile: { avatar: 13 } }).profile.avatar).toBe(0);
    expect(sanitize({ profile: { avatar: 13 }, cosmetics: { owned: { avatar: ['p2'] } } }).profile.avatar).toBe(13);
  });
});
