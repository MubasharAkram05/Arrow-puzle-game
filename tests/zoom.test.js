import { beforeAll, describe, expect, it } from 'vitest';
import { ZOOM } from '../src/config.js';
import { maxScaleFor, startFocus, startScale, translateFor } from '../src/input/zoomMath.js';
import { buildOccupancy, freeArrows, generateLevel, loadShapeLibrary, shapeOf } from '../src/engine/index.js';

describe('default zoom', () => {
  it('uses the config values: zoom below 18px, open at about 22px', () => {
    expect(ZOOM.zoomBelowPx).toBe(18);
    expect(ZOOM.startCellPx).toBe(22);
  });

  it('boards with fitted cells of 18px or more start fully fitted', () => {
    for (const cell of [18, 20, 24, 28, 32, 48, 90]) expect(startScale(cell)).toBe(1);
  });

  it('dense boards (cells under 18px) start zoomed so a cell is about 22px', () => {
    for (const cell of [8, 10, 12.5, 15, 17, 17.9]) {
      const onScreen = cell * startScale(cell);
      expect(onScreen).toBeCloseTo(22, 5);
    }
  });

  it('never starts past the max zoom, and the max is never below the start', () => {
    expect(startScale(2)).toBe(ZOOM.maxScale);
    for (const cell of [2, 8, 15, 17, 27, 40]) expect(maxScaleFor(cell)).toBeGreaterThanOrEqual(startScale(cell));
    expect(maxScaleFor(60)).toBe(1);
  });

  it('bad sizes fall back to no zoom', () => {
    expect(startScale(0)).toBe(1);
    expect(startScale(NaN)).toBe(1);
    expect(maxScaleFor(-3)).toBe(1);
  });

  it('translateFor puts a board point under a screen point', () => {
    const t = translateFor({ x: 10, y: -20 }, { x: 200, y: 300 }, { x: 180, y: 320 }, 2);
    // screen = centre + translate + s * q
    expect(180 + t.x + 2 * 10).toBe(200);
    expect(320 + t.y + 2 * -20).toBe(300);
  });
});

describe('zoom guide', () => {
  it('shows on the first 3 zoomed levels, then only while the player never pinched', async () => {
    const { shouldShowGuide } = await import('../src/ui/zoomGuide.js');
    expect(shouldShowGuide({ shown: 0, pinched: true })).toBe(true);
    expect(shouldShowGuide({ shown: 2, pinched: true })).toBe(true);
    expect(shouldShowGuide({ shown: 3, pinched: true })).toBe(false);
    expect(shouldShowGuide({ shown: 3, pinched: false })).toBe(true);
    expect(shouldShowGuide({ shown: 50, pinched: false })).toBe(true);
  });
});

/** Share of arrow cells in the w x h window centred on a focus (as the view would show it). */
function coverAt(level, f, w, h) {
  const cells = new Set(level.arrows.flatMap((a) => a.path.map((p) => p.r * level.cols + p.c)));
  const r0 = Math.max(0, Math.min(level.rows - h, Math.round(f.fy * level.rows - h / 2)));
  const c0 = Math.max(0, Math.min(level.cols - w, Math.round(f.fx * level.cols - w / 2)));
  let n = 0;
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) n += cells.has(r * level.cols + c) ? 1 : 0;
  return { share: n / (w * h), r0, c0 };
}

/** A square board filled with 1-cell 'arrows' wherever keep(r, c) is true. */
function fakeBoard(n, keep) {
  const arrows = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (keep(r, c)) arrows.push({ id: arrows.length, path: [{ r, c }] });
  return { rows: n, cols: n, arrows };
}

describe('first view of a zoomed level', () => {
  beforeAll(() => loadShapeLibrary());

  it('a full board opens on its centre', () => {
    const f = startFocus(
      fakeBoard(40, () => true),
      [],
      16,
      20,
    );
    expect(f.fx).toBeCloseTo(0.5, 1);
    expect(f.fy).toBeCloseTo(0.5, 1);
  });

  it('a ring opens on the ring, not on the empty hole in the middle', () => {
    const ring = fakeBoard(60, (r, c) => Math.hypot(r - 29.5, c - 29.5) > 18 && Math.hypot(r - 29.5, c - 29.5) < 30);
    const f = startFocus(ring, [], 16, 20);
    expect(coverAt(ring, f, 16, 20).share).toBeGreaterThanOrEqual(0.75);
  });

  it('a big board opens on a window that holds a free arrow', () => {
    const board = fakeBoard(80, () => true);
    const free = board.arrows.find((a) => a.path[0].r === 5 && a.path[0].c === 70).id;
    const f = startFocus(board, [free], 16, 20);
    const { r0, c0 } = coverAt(board, f, 16, 20);
    expect(5).toBeGreaterThanOrEqual(r0);
    expect(5).toBeLessThan(r0 + 20);
    expect(70).toBeGreaterThanOrEqual(c0);
    expect(70).toBeLessThan(c0 + 16);
  });

  it('Watch, Donut, Ring and level 500 open on arrows (a 360px phone shows about 16 x 20 cells)', () => {
    // the first level of each ring shape (the cycle order moves when shapes are added or removed)
    const firstOf = (id) => {
      for (let n = 4; n < 2000; n++) if (shapeOf(n) === id) return n;
      throw new Error(`${id} not found`);
    };
    for (const n of [firstOf('watch'), firstOf('donut'), firstOf('ring'), 500]) {
      const level = generateLevel(n);
      const free = freeArrows(buildOccupancy(level), level);
      const f = startFocus(level, free, 16, 20);
      expect(coverAt(level, f, 16, 20).share, `level ${n}`).toBeGreaterThanOrEqual(0.75);
    }
  });
});
