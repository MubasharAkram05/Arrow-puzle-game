/**
 * 3.28.1: a quick tap counts even when the page is busy. The tap's length comes from the pointer events' own
 * timeStamps, not from when the handlers ran (a busy Android 16 emulator dropped a level-1 tap this way).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isTapRelease } from '../src/input/tapRule.js';
import { TAP } from '../src/config.js';

describe('isTapRelease', () => {
  const down = { t: 1000, x: 100, y: 200 };

  it('a quick release in place is a tap', () => {
    expect(isTapRelease(down, { t: 1040, x: 101, y: 199 }, TAP)).toBe(true);
    expect(isTapRelease(down, { t: 1000 + TAP.maxMs - 1, x: 100, y: 200 }, TAP)).toBe(true);
  });

  it('a long press or a drag is not', () => {
    expect(isTapRelease(down, { t: 1000 + TAP.maxMs, x: 100, y: 200 }, TAP)).toBe(false);
    expect(isTapRelease(down, { t: 1040, x: 100 + TAP.movePx, y: 200 }, TAP)).toBe(false);
  });

  it('the board uses the events’ timeStamps, never the time the handler ran', () => {
    const src = readFileSync(new URL('../src/input/board-input.js', import.meta.url), 'utf8');
    expect(src).toContain('t: e.timeStamp };');
    expect(src).toContain('isTapRelease(p, { t: e.timeStamp, x: e.clientX, y: e.clientY }, TAP)');
    expect(src).not.toMatch(/performance\.now\(\)/);
  });
});
