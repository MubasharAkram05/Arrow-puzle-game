import { describe, expect, it } from 'vitest';
import { state } from '../src/game/state.js';
import { applySave, snapshot } from '../src/storage/save.js';
import { defaultSave, sanitize } from '../src/storage/schema.js';
import { statsModel } from '../src/ui/screens/profile/statsView.js';

const save = () => ({
  ...defaultSave(),
  progress: { current: 31, unlocked: 31, completed: Array.from({ length: 30 }, (_, i) => i + 1), perfect: [2, 5, 9] },
  wallet: { coins: 777, diamonds: 13, hints: 4 },
  stats: {
    ...defaultSave().stats,
    arrowsCleared: 4321,
    streak: 6,
    bestStreak: 11,
    playSeconds: 3725,
    hintsUsed: 17,
  },
  daily: { lastClaim: 20000, streak: 3, best: 8, lastSeen: 0, blockedDay: null },
});

describe('profile stats', () => {
  it('shows the 3 hero tiles and the 4-item list, nothing else', () => {
    applySave(save());
    const m = statsModel(state, Date.now());
    expect(m.hero.map((t) => [t.id, t.value])).toEqual([
      ['daily', 0], // the last claim was long ago: the streak shown is 0
      ['levels', 30],
      ['perfect', 3],
    ]);
    expect(m.list.map((t) => [t.label, t.value])).toEqual([
      ['Arrows cleared', 4321],
      ['Win streak', 6],
      ['Best streak', 11],
      ['Play time', '1h 02m'],
    ]);
    const shown = JSON.stringify(m);
    for (const gone of ['Coins', 'Diamonds', 'Best daily', 'Boosters used', 'Hints used'])
      expect(shown).not.toContain(gone);
  });

  it('the hidden stats are still saved and come back after a reload', () => {
    applySave(save());
    const back = sanitize(JSON.parse(JSON.stringify(snapshot())));
    expect(back.wallet).toEqual({ coins: 777, diamonds: 13, hints: 4 });
    expect(back.daily.best).toBe(8);
    expect(back.stats).toMatchObject({ hintsUsed: 17 });
  });
});
