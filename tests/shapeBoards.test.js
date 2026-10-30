/**
 * Every library shape must make a solvable board that meets its level's floors, at the smallest shape board
 * (level 6), a medium one (level 102, Super Hard) and the largest (level 1002, Expert), each in under 150 ms.
 * Separate file: it builds about 1,900 boards and takes a minute.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  allShapes,
  generateFromConfig,
  getLevelConfig,
  loadShapeLibrary,
  meetsGoals,
  analyzeLevel,
  validateLevel,
} from '../src/engine/index.js';

const SIZES = { small: 6, medium: 102, large: 1002 };
const LIMIT_MS = process.env.CI ? 300 : 150;

await loadShapeLibrary();
const SHAPES = allShapes().map((s) => s.id);

beforeAll(() => loadShapeLibrary());

describe.each(Object.entries(SIZES))('every shape on a %s board (level %i)', (_size, level) => {
  it.each(SHAPES)('%s', (id) => {
    const cfg = getLevelConfig(level, id);
    const t0 = performance.now();
    const board = generateFromConfig(cfg);
    const ms = performance.now() - t0;
    expect(board.shape).toBe(id);
    expect(validateLevel(board)).toEqual([]);
    expect(meetsGoals(analyzeLevel(board), cfg.goals)).toBe(true);
    expect(board.arrows.length).toBeGreaterThanOrEqual(cfg.arrowsMin);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
