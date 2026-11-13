/**
 * Every plugin enum the AdMob provider reads (M.Something in src/ads/providers.js) must really exist in
 * @capacitor-community/admob at runtime. 3.26.0 bug: the provider compared against M.PrivacyOptionsRequirementStatus,
 * which the plugin's JS does not export (only its .d.ts has it); the TypeError stopped the ad gate after a correct
 * NOT_REQUIRED answer, so no ad was ever requested.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as M from '@capacitor-community/admob';

describe('AdMob plugin exports used by the provider', () => {
  const src = readFileSync(new URL('../src/ads/providers.js', import.meta.url), 'utf8');
  const used = [...new Set([...src.matchAll(/\bM\.([A-Za-z]+)(?:\.([A-Za-z_]+))?/g)].map((m) => m[0].slice(2)))];

  it('finds the enums the provider uses', () => {
    expect(used.length).toBeGreaterThan(5);
  });

  it.each(used)('M.%s exists at runtime', (path) => {
    const value = path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), M);
    expect(value, `M.${path}`).toBeDefined();
  });

  it('the consent enum that is missing at runtime is not used', () => {
    expect(M.PrivacyOptionsRequirementStatus).toBeUndefined(); // documents the plugin gap
    expect(src).not.toMatch(/M\.PrivacyOptionsRequirementStatus/);
  });
});
