import { describe, expect, it, vi } from 'vitest';

// board-input.js wires DOM handlers on import of its dependencies; only the pure hit test is used here
vi.mock('../src/game/game.js', () => ({ tapArrow: () => {} }));
vi.mock('../src/render/canvasBoard.js', () => ({
  notePress: () => {},
  requestFrame: () => {},
  startMoving: () => {},
  stopMoving: () => {},
}));
vi.mock('../src/input/zoom.js', () => ({ bindZoom: () => {}, releaseIsTap: () => true }));

const { arrowAt } = await import('../src/input/board-input.js');
const { arrowGeometry, strokeMetrics } = await import('../src/render/board.js');
const { buildOccupancy, generateLevel, loadShapeLibrary } = await import('../src/engine/index.js');
await loadShapeLibrary();
const { CELL, HIT_FALLBACK, TAP } = await import('../src/config.js');

globalThis.window ??= { innerWidth: 390 };
const level = generateLevel(5);
const arrows = level.arrows.map((a) => ({ ...a, geom: arrowGeometry(a, strokeMetrics(30), level.rows, level.cols) }));
const occ = buildOccupancy(level);

describe('tap hit test', () => {
  it('the cell under the finger gives its arrow straight from the grid', () => {
    for (const a of arrows)
      for (const p of a.path) expect(arrowAt(level, occ, arrows, (p.c + 0.5) * CELL, (p.r + 0.3) * CELL)).toBe(a);
  });

  it('a point just past an arrowhead (empty cell) still finds that arrow, within 0.45 cell', () => {
    expect(HIT_FALLBACK).toBe(0.45);
    const a = arrows.find((x) => {
      const h = x.path[0];
      const [r, c] = [h.r + x.geom.dy, h.c + x.geom.dx];
      return r >= 0 && r < level.rows && c >= 0 && c < level.cols && occ[r * level.cols + c] === -1;
    });
    if (!a) return;
    const g = a.geom;
    expect(arrowAt(level, occ, arrows, g.hx + g.dx * CELL * 0.4, g.hy + g.dy * CELL * 0.4)).toBe(a);
  });

  it('far from every arrow nothing is hit', () => {
    expect(arrowAt(level, occ, arrows, -5 * CELL, -5 * CELL)).toBe(null);
  });

  it('a tap is under 10 px of movement and under 350 ms', () => {
    expect(TAP).toEqual({ movePx: 10, maxMs: 350 });
  });

  it('is fast on a big board: a lookup costs the same whatever the arrow count', () => {
    const big = generateLevel(600);
    const bigArrows = big.arrows.map((a) => ({ ...a, geom: arrowGeometry(a, strokeMetrics(30), big.rows, big.cols) }));
    const bigOcc = buildOccupancy(big);
    const t0 = performance.now();
    for (let i = 0; i < 20000; i++)
      arrowAt(big, bigOcc, bigArrows, ((i * 37) % (big.cols * CELL)) + 0.5, ((i * 53) % (big.rows * CELL)) + 0.5);
    expect((performance.now() - t0) / 20000).toBeLessThan(0.05); // under 50 microseconds per tap
  });
});
