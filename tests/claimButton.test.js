/**
 * Claim button on the achievements list (3.21.0): always shown, in three states of one size.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { achievementRows, notReadyText } from '../src/game/achievementList.js';
import { newStats } from '../src/game/stats.js';
import { claimButtonHTML } from '../src/ui/screens/profile/claimButton.js';

const row = (over) => ({ id: 'x-1', group: 'level-climber', value: 0, goal: 25, state: 'progress', ...over });
const css = readFileSync(new URL('../src/styles/achievementsList.css', import.meta.url), 'utf8');

describe('claim button states', () => {
  it('ready: an enabled Claim button with the red dot', () => {
    const html = claimButtonHTML(row({ state: 'ready', value: 25 }));
    expect(html).toMatch(/^<button[^>]*class="ach-claim is-ready"[^>]*data-claim="x-1"/);
    expect(html).toContain('claim-dot');
    expect(html).not.toContain('aria-disabled');
  });

  it('not ready: a grey Claim button with aria-disabled, which does not claim', () => {
    const html = claimButtonHTML(row({ value: 20 }));
    expect(html).toContain('class="ach-claim is-locked"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('data-locked="x-1"');
    expect(html).not.toContain('data-claim');
    expect(html).not.toContain('claim-dot');
    expect(html).toContain('>Claim<');
  });

  it('claimed: a green Claimed pill with a check, no button', () => {
    const html = claimButtonHTML(row({ state: 'done', value: 25 }));
    expect(html).toMatch(/^<span class="ach-claim is-claimed">/);
    expect(html).toContain('Claimed');
    expect(html).toContain('<svg');
    expect(html).not.toContain('<button');
  });

  it('every row of a real list has a side button, all sharing the .ach-claim size', () => {
    const ctx = {
      completed: new Set([1]),
      perfect: new Set(),
      masks: new Set(),
      unlocked: 30,
      stats: newStats(),
      dailyBest: 0,
    };
    const rows = achievementRows(ctx, new Set(['level-climber-1']));
    expect(new Set(rows.map((r) => r.state))).toEqual(new Set(['ready', 'progress']));
    for (const r of rows) expect(claimButtonHTML(r)).toContain('class="ach-claim ');
    // the size is set once on .ach-claim, and no state rule changes it
    const base = css.slice(css.indexOf('.ach-claim {'), css.indexOf('}', css.indexOf('.ach-claim {')));
    expect(base).toMatch(/width: 96px/);
    expect(base).toMatch(/height: 44px/);
    const states = css
      .split('.ach-claim.')
      .slice(1)
      .map((b) => b.slice(0, b.indexOf('}')))
      // rules on the button itself (not on its icon or dot)
      .filter((b) => !/^[\w-]+(:[^{]*)?\s+\.[\w-]+\s*\{/.test(b) && !/^[\w-]+ [.\w-]+ \{/.test(b));
    for (const b of states) expect(b).not.toMatch(/(^|\s)(width|height|padding):/);
  });
});

describe('not ready toast', () => {
  it('says how much is left, from the remaining progress', () => {
    expect(notReadyText(row({ value: 20 }))).toBe('Finish 5 more levels first');
    expect(notReadyText(row({ value: 24 }))).toBe('Finish 1 more level first');
    expect(notReadyText(row({ group: 'arrow-hunter', value: 250, goal: 1000 }))).toBe('Clear 750 more arrows first');
    expect(notReadyText(row({ group: 'big-spender', value: 0, goal: 1000 }))).toBe('Spend 1,000 more coins first');
    expect(notReadyText(row({ group: 'daily-player', value: 2, goal: 3 }))).toBe(
      'Keep your daily streak 1 more day first',
    );
    expect(notReadyText(row({ group: 'first-escape', value: 0, goal: 1 }))).toBe('Finish level 1 first');
    expect(notReadyText(row({ group: 'shape-solver', value: 3, goal: 25 }))).toBe('Finish 22 more shape levels first');
  });

  it('has text for every achievement group', async () => {
    const { ACHIEVEMENT_DEFS } = await import('../src/config.js');
    for (const g of ACHIEVEMENT_DEFS) expect(notReadyText(row({ group: g.id }))).not.toContain('more to go');
  });
});
