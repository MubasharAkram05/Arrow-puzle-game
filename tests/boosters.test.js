import { beforeEach, describe, expect, it } from 'vitest';
import {
  absorbWrongTap,
  addBoosters,
  blockedReason,
  isPerfect,
  newInventory,
  newLevelBoosts,
  useBooster,
} from '../src/game/boosters.js';
import { levelReward } from '../src/game/economy.js';
import { applyWin, buyBooster, buyBoosterPack, noteHintUsed, spendBooster } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { applySave } from '../src/storage/save.js';
import { defaultSave } from '../src/storage/schema.js';

const inv = (o = {}) => ({ ...newInventory(), ...o });

describe('booster effects (pure)', () => {
  it('shield: absorbs exactly one wrong tap, then breaks', () => {
    const used = useBooster('shield', inv({ shield: 2 }), newLevelBoosts());
    expect(used.ok).toBe(true);
    expect(used.inv.shield).toBe(1);
    expect(used.lvl.shield).toBe(true);
    const first = absorbWrongTap(used.lvl);
    expect(first.absorbed).toBe(true);
    expect(absorbWrongTap(first.lvl).absorbed).toBe(false);
  });

  it('shield does not stack', () => {
    const once = useBooster('shield', inv({ shield: 2 }), newLevelBoosts());
    const twice = useBooster('shield', once.inv, once.lvl);
    expect(twice.ok).toBe(false);
    expect(twice.reason).toMatch(/already active/);
    expect(twice.inv.shield).toBe(1);
  });

  it('auto-clear: max 1 per level', () => {
    const a = useBooster('autoClear', inv({ autoClear: 3 }), newLevelBoosts());
    expect(a.ok).toBe(true);
    const b = useBooster('autoClear', a.inv, a.lvl);
    expect(b.ok).toBe(false);
    expect(b.inv.autoClear).toBe(2);
    expect(useBooster('autoClear', b.inv, newLevelBoosts()).ok).toBe(true);
  });

  it('reveal: uses one and marks the level assisted', () => {
    const r = useBooster('reveal', inv({ reveal: 1 }), newLevelBoosts());
    expect(r).toMatchObject({ ok: true, inv: { reveal: 0 }, lvl: { assisted: true } });
  });

  it('extra heart: only before the first move', () => {
    expect(useBooster('extraHeart', inv({ extraHeart: 1 }), newLevelBoosts()).ok).toBe(true);
    expect(blockedReason('extraHeart', { ...newLevelBoosts(), moved: true })).toMatch(/first move/);
  });

  it('refuses with none left or an unknown id', () => {
    expect(useBooster('reveal', inv(), newLevelBoosts()).reason).toBe('none');
    expect(useBooster('nuke', inv({ nuke: 1 }), newLevelBoosts()).ok).toBe(false);
  });

  it('adds packs and ignores bad counts', () => {
    expect(addBoosters(inv({ shield: 1 }), { shield: 3, reveal: 3, autoClear: 2, bomb: 9, extraHeart: -1 })).toEqual({
      shield: 4,
      reveal: 3,
      autoClear: 2,
      extraHeart: 0,
    });
  });
});

describe('perfect needs no boosters or hints', () => {
  it('isPerfect is false when assisted, even with all hearts', () => {
    expect(isPerfect(3, 3, false)).toBe(true);
    expect(isPerfect(3, 3, true)).toBe(false);
    expect(isPerfect(2, 3, false)).toBe(false);
  });

  it('a shielded level with full hearts gets no perfect bonus', () => {
    const base = {
      level: 3,
      difficulty: 'Normal',
      heartsLeft: 3,
      maxHearts: 3,
      wasCompleted: false,
      wasPerfect: false,
    };
    expect(levelReward({ ...base, assisted: false }).coins).toBe(45);
    const r = levelReward({ ...base, assisted: true });
    expect(r.perfect).toBe(false);
    expect(r.coins).toBe(25);
  });
});

describe('boosters in the game state', () => {
  beforeEach(() => applySave(defaultSave()));

  it('buys with enough coins, refuses without', () => {
    state.coins = 100;
    expect(buyBooster('shield').ok).toBe(true);
    expect(state.coins).toBe(40);
    expect(state.boosters.shield).toBe(1);
    const res = buyBooster('autoClear');
    expect(res.ok).toBe(false);
    expect(res.missing).toEqual({ coins: 30, diamonds: 0 });
    expect(state.boosters.autoClear).toBe(0);
  });

  it('buys the pack: 3 shields, 3 reveals, 2 auto-clears', () => {
    state.coins = 400;
    expect(buyBoosterPack().ok).toBe(true);
    expect(state.coins).toBe(50);
    expect(state.boosters).toMatchObject({ shield: 3, reveal: 3, autoClear: 2 });
  });

  it('using a booster or a hint counts in stats and blocks the perfect win', () => {
    state.boosters = inv({ reveal: 1 });
    expect(spendBooster('reveal').ok).toBe(true);
    noteHintUsed();
    expect(state.stats).toMatchObject({ boostersUsed: 1, hintsUsed: 1 });
    const { reward } = applyWin(4, 'Normal', 3, 3);
    expect(reward.perfect).toBe(false);
    expect(state.progress.perfect.has(4)).toBe(false);
  });
});
