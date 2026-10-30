import { describe, expect, it } from 'vitest';
import { ZOOM } from '../src/config.js';
import { maxScaleFor, startScale, translateFor } from '../src/input/zoomMath.js';

describe('default zoom', () => {
  it('small boards (cells already 28px+) start fully fitted', () => {
    for (const cell of [28, 32, 48, 90]) expect(startScale(cell)).toBe(1);
  });

  it('dense boards start zoomed so a cell is about 28-32px', () => {
    for (const cell of [8, 10, 12.5, 17, 21, 27.9]) {
      const onScreen = cell * startScale(cell);
      expect(onScreen).toBeGreaterThanOrEqual(28);
      expect(onScreen).toBeLessThanOrEqual(32);
    }
  });

  it('never starts past the max zoom, and the max is never below the start', () => {
    expect(startScale(2)).toBe(ZOOM.maxScale);
    for (const cell of [2, 8, 15, 27, 40]) expect(maxScaleFor(cell)).toBeGreaterThanOrEqual(startScale(cell));
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
