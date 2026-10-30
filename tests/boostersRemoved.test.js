import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as config from '../src/config.js';
import { isPerfect, newLevelAssist } from '../src/game/assist.js';
import { newStats } from '../src/game/stats.js';
import { boosterRefund } from '../src/storage/validators.js';

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });

describe('Shield and Extra Heart boosters are gone', () => {
  it('no booster prices, pack or starter-pack Shields in the config', () => {
    expect(config).not.toHaveProperty('BOOSTERS');
    expect(config).not.toHaveProperty('BOOSTER_PACK');
    expect(config.OFFERS.starterPack.contents).toEqual({ hints: 5, style: 'slate' });
    expect(config.OFFERS.starterPack.price).toEqual({ diamonds: 3 });
  });

  it('the game screen keeps only the hint and grid buttons', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/booster-bar|data-boost/);
    expect(html).toMatch(/id="btn-hint"/);
    expect(html).toMatch(/id="btn-grid"/);
  });

  it('no booster code is left in the game', () => {
    for (const f of files('src').filter((x) => x.endsWith('.js')))
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/useBooster|buyBooster|spendBooster|absorbWrongTap|BOOSTER_IDS/);
    expect(newStats()).not.toHaveProperty('boostersUsed');
  });

  it('perfect (and Brain Power) only look at hints now', () => {
    expect(newLevelAssist()).toEqual({ assisted: false });
    expect(isPerfect(3, 3, false)).toBe(true);
    expect(isPerfect(3, 3, true)).toBe(false);
    expect(isPerfect(2, 3, false)).toBe(false);
  });

  it('refund: 60 coins per Shield, 1 diamond per Extra Heart', () => {
    expect(boosterRefund({ shield: 2, extraHeart: 3 })).toEqual({ coins: 120, diamonds: 3 });
    expect(boosterRefund(undefined)).toEqual({ coins: 0, diamonds: 0 });
    expect(boosterRefund({ shield: -1, extraHeart: 'x', reveal: 9 })).toEqual({ coins: 0, diamonds: 0 });
  });
});
