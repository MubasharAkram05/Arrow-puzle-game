/**
 * 3.28.0 health-check fixes: daily reward after the tutorial, no ad UI on the production web, Escape closes the
 * top popup, release docs.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TUTORIAL_LAST, tutorialDone } from '../src/game/daily.js';
import { adUiVisible } from '../src/ads/policy.js';
import { webAdUi } from '../scripts/build-flags.mjs';
import { escapeKey } from '../src/input/escapeKey.js';

const text = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('daily reward waits for the end of the tutorial', () => {
  it('the tutorial is done once level 3 (or any later level) is completed', () => {
    expect(TUTORIAL_LAST).toBe(3);
    expect(tutorialDone({ completed: new Set() })).toBe(false);
    expect(tutorialDone({ completed: new Set([1, 2]) })).toBe(false);
    expect(tutorialDone({ completed: new Set([1, 2, 3]) })).toBe(true);
    expect(tutorialDone({ completed: [1, 2, 3, 4, 5] })).toBe(true);
    expect(tutorialDone({ completed: new Set([7]) })).toBe(true); // e.g. a test-mode play of a later level
  });

  it('the popup and the Home button both check it', () => {
    const src = text('src/ui/modals/daily.js');
    expect(src).toMatch(/export function maybeShowDaily\(\) \{\s*if \(!tutorialDone\(state\.progress\)\) return;/);
    expect(src).toMatch(/export const dailyAvailable = \(\) =>\s*tutorialDone\(state\.progress\) &&/);
  });
});

describe('no ad buttons or rows on the production web', () => {
  it('web builds that show ad UI: dev server, tests and Vercel previews only', () => {
    expect(webAdUi({ mode: 'development', env: {} })).toBe(true);
    expect(webAdUi({ mode: 'test', env: {} })).toBe(true);
    expect(webAdUi({ mode: 'production', env: { VERCEL_ENV: 'preview' } })).toBe(true);
    expect(webAdUi({ mode: 'production', env: { VERCEL_ENV: 'production' } })).toBe(false);
    expect(webAdUi({ mode: 'production', env: {} })).toBe(false);
    expect(webAdUi({ mode: 'release', env: {} })).toBe(false);
  });

  it('the Android app always shows them; the web only when its build allows', () => {
    expect(adUiVisible({ native: true, webAdUi: false })).toBe(true);
    expect(adUiVisible({ native: true, webAdUi: true })).toBe(true);
    expect(adUiVisible({ native: false, webAdUi: true })).toBe(true);
    expect(adUiVisible({ native: false, webAdUi: false })).toBe(false);
  });

  it('every ad button and row is behind adUiShown()', () => {
    expect(text('src/ui/modals/ask.js')).toMatch(/const adOk = !!opts\.ad && !opts\.blocked && adUiShown\(\);/);
    expect(text('src/ui/modals/gameover.js')).toContain('ad.hidden = !adUiShown();');
    expect(text('src/ui/modals/victory.js')).toContain('btn.hidden = !adUiShown() ||');
    const earn = text('src/ui/screens/shop/adEarn.js');
    expect(earn).toContain('const ads = adUiShown();');
    expect(earn).toContain("${ads ? EARN_ORDER.map((k) => earnRow(k)).join('') : ''}${giftRow()}");
    expect(text('src/ui/screens/shop/hintsTab.js')).toContain('o.inAll || !adUiShown()');
    expect(text('vite.config.js')).toContain('__WEB_AD_UI__: JSON.stringify(webAdUi({ mode })),');
  });
});

describe('Escape closes the top popup (desktop web), like Android back', () => {
  const ev = (key, tagName = 'BODY') => {
    const e = { key, target: { tagName }, defaultPrevented: false, prevented: 0 };
    e.preventDefault = () => {
      e.prevented++;
    };
    return e;
  };

  it('closes the open popup and stops the key there', () => {
    let closed = 0;
    const e = ev('Escape');
    expect(escapeKey(e, () => ++closed > 0)).toBe(true);
    expect(closed).toBe(1);
    expect(e.prevented).toBe(1);
  });

  it('does nothing with no popup open (no screen change, no exit dialog)', () => {
    const e = ev('Escape');
    expect(escapeKey(e, () => false)).toBe(false);
    expect(e.prevented).toBe(0);
  });

  it('ignores other keys and typing in a text field', () => {
    let calls = 0;
    const back = () => ++calls > 0;
    expect(escapeKey(ev('Enter'), back)).toBe(false);
    expect(escapeKey(ev('Escape', 'INPUT'), back)).toBe(false);
    expect(escapeKey(ev('Escape', 'TEXTAREA'), back)).toBe(false);
    expect(calls).toBe(0);
  });

  it('is wired on every platform', () => {
    expect(text('src/input/back-button.js')).toContain(
      "document.addEventListener('keydown', (e) => escapeKey(e, modalBack));",
    );
  });
});

describe('release docs', () => {
  it('no CONTACT_EMAIL step any more (the privacy page already has the real email)', () => {
    expect(text('docs/RELEASE.md')).not.toContain('CONTACT_EMAIL');
    expect(text('public/privacy.html')).not.toContain('CONTACT_EMAIL');
  });
});
