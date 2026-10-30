import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadShapeLibrary, shapeOf } from '../src/engine/index.js';
import { applyWin, pay, wallet } from '../src/game/rewards.js';
import { state } from '../src/game/state.js';
import { applySave, snapshot } from '../src/storage/save.js';
import { defaultSave, migrateV1, sanitize } from '../src/storage/schema.js';

/** Load a save into the shared state, like the app does at boot. */
const boot = (save) => applySave(save);
/** Save and load again, like a reload. */
const reload = () => applySave(sanitize(JSON.parse(JSON.stringify(snapshot()))));

describe('winning levels pays coins that are saved (regression: counters stuck at 0)', () => {
  beforeEach(() => boot(defaultSave()));

  it('fresh save: coins go up after each win and survive a reload', () => {
    expect(wallet()).toEqual({ coins: 0, diamonds: 0 });
    applyWin(1, 'Normal', 3, 3);
    expect(state.coins).toBe(45);
    applyWin(2, 'Normal', 2, 3);
    expect(state.coins).toBe(65);
    reload();
    expect(wallet()).toEqual({ coins: 65, diamonds: 0 });
  });

  it('migrated v1 save: progress kept and new wins still pay', () => {
    boot(migrateV1({ current: 3, unlocked: 3, completed: [1, 2], hints: 4, style: 'olive' }));
    expect(state.progress.current).toBe(3);
    expect(state.coins).toBe(0);
    applyWin(3, 'Normal', 3, 3);
    expect(state.coins).toBe(45);
    reload();
    expect(state.coins).toBe(45);
    expect(state.hints).toBe(4);
    expect(state.style).toBe('olive');
  });

  it('pays diamonds for a shape level and keeps them after a reload', () => {
    applyWin(10, 'Normal', 1, 3);
    expect(state.diamonds).toBe(1);
    reload();
    expect(state.diamonds).toBe(1);
  });

  it('spending lowers the saved wallet', () => {
    applyWin(1, 'Normal', 3, 3);
    expect(pay({ coins: 40 }).ok).toBe(true);
    reload();
    expect(state.coins).toBe(5);
    expect(state.stats.coinsSpent).toBe(40);
  });
});

describe('shape collection', () => {
  beforeAll(() => loadShapeLibrary());
  beforeEach(() => boot(defaultSave()));

  it('a won shape level unlocks its shape once, and it survives a reload', () => {
    expect(applyWin(5, 'Normal', 3, 3).newShape).toBeNull();
    const first = applyWin(6, 'Normal', 3, 3);
    expect(first.newShape).toBe(shapeOf(6));
    expect(state.progress.shapes.has(shapeOf(6))).toBe(true);
    expect(applyWin(6, 'Normal', 3, 3).newShape).toBeNull();
    applyWin(9, 'Normal', 3, 3);
    reload();
    expect([...state.progress.shapes]).toEqual([shapeOf(6), shapeOf(9)]);
  });
});
