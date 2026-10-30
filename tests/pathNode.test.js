import { describe, expect, it } from 'vitest';
import { chestState, levelNodeState, nodeHTML, nodeOffset } from '../src/ui/screens/levels/pathNode.js';

/** Progress: levels 1-12 done (3 and 6 perfect), current 13, unlocked 13. */
const progress = (over = {}) => ({
  current: 13,
  unlocked: 13,
  completed: new Set(Array.from({ length: 12 }, (_, i) => i + 1)),
  perfect: new Set([3, 6]),
  chaptersRewarded: new Set(),
  ...over,
});
const status = (n, p = progress(), unlockAll = false) => levelNodeState(n, p, unlockAll).status;

describe('level node state', () => {
  it('completed, perfect, current and locked', () => {
    expect(status(1)).toBe('completed');
    expect(status(3)).toBe('perfect');
    expect(status(13)).toBe('current');
    expect(status(14)).toBe('locked');
    expect(status(500)).toBe('locked');
  });

  it('a replayed finished level that is the current one stays highlighted as current', () => {
    expect(status(5, progress({ current: 5 }))).toBe('current');
    // levels unlocked but not current and not finished (e.g. after replaying an earlier one) are open
    expect(status(13, progress({ current: 5 }))).toBe('open');
  });

  it('test mode opens locked levels without marking them completed', () => {
    expect(status(14, progress(), true)).toBe('open');
    expect(status(50_000, progress(), true)).toBe('open');
    expect(status(3, progress(), true)).toBe('perfect');
  });

  it('marks shape levels (every 3rd from 6) and every 10th level', () => {
    expect(levelNodeState(6, progress(), false)).toMatchObject({ shape: true, milestone: false });
    expect(levelNodeState(10, progress(), false)).toMatchObject({ shape: false, milestone: true });
    expect(levelNodeState(30, progress(), false)).toMatchObject({ shape: true, milestone: true });
    expect(levelNodeState(3, progress(), false)).toMatchObject({ shape: false, milestone: false });
  });

  it('renders the right icon and label per state', () => {
    expect(nodeHTML(levelNodeState(14, progress(), false), 0)).toContain('#i-lock');
    expect(nodeHTML(levelNodeState(13, progress(), false), 0)).toContain('START');
    expect(nodeHTML(levelNodeState(3, progress(), false), 0)).toContain('#i-crown');
    expect(nodeHTML(levelNodeState(1, progress(), false), 0)).toContain('#i-check');
    expect(nodeHTML(levelNodeState(10, progress(), false), 0)).toMatch(/pn-star[\s\S]*#i-shape-star/);
    expect(nodeHTML(levelNodeState(14, progress(), false), 0)).toContain('aria-label="Level 14, locked"');
  });
});

describe('chapter chest', () => {
  const ch1 = Array.from({ length: 20 }, (_, i) => i + 1);

  it('closed until every level is done, ready when done but not paid, opened once paid', () => {
    expect(chestState(ch1, 1, progress())).toEqual({ chapter: 1, status: 'closed' });
    const all = progress({ completed: new Set(ch1) });
    expect(chestState(ch1, 1, all).status).toBe('ready');
    expect(chestState(ch1, 1, { ...all, chaptersRewarded: new Set([1]) }).status).toBe('opened');
  });
});

describe('path wave', () => {
  it('nodes swing smoothly between left and right', () => {
    const xs = Array.from({ length: 9 }, (_, i) => nodeOffset(i));
    expect(xs).toEqual([0, 0.71, 1, 0.71, 0, -0.71, -1, -0.71, 0]);
    for (let i = 0; i < 40; i++) expect(Math.abs(nodeOffset(i))).toBeLessThanOrEqual(1);
  });
});
