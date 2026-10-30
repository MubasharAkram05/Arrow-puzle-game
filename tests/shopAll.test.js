import { describe, expect, it, vi } from 'vitest';

// The real tabs draw previews with the DOM; stand-ins keep this a pure test of how "All" combines them.
const stub = (id) => ({
  keys: () => [`${id}:a`, `${id}:b`],
  render: () => `<div class="body-${id}"><button class="shop-card" data-kind="${id}"></button></div>`,
  onCard: vi.fn(),
});
const mods = {};
for (const id of ['offers', 'boosters', 'styles', 'effects', 'profile']) mods[id] = stub(id);
vi.mock('../src/ui/screens/shop/offersTab.js', () => mods.offers);
vi.mock('../src/ui/screens/shop/boostersTab.js', () => mods.boosters);
vi.mock('../src/ui/screens/shop/stylesTab.js', () => mods.styles);
vi.mock('../src/ui/screens/shop/effectsTab.js', () => mods.effects);
vi.mock('../src/ui/screens/shop/profileTab.js', () => mods.profile);

const all = await import('../src/ui/screens/shop/allTab.js');

describe('shop "All" tab', () => {
  it('shows every section in order, each under its heading with its own content', () => {
    const html = all.render();
    const heads = [...html.matchAll(/<h2 class="shop-part-head">.*?<\/svg>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(heads).toEqual(['Offers', 'Boosters', 'Styles', 'Effects', 'Profile items']);
    const order = [...html.matchAll(/class="body-(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['offers', 'boosters', 'styles', 'effects', 'profile']);
    expect(html.match(/data-part="(\w+)"/g)).toHaveLength(5);
  });

  it('carries the "New" keys of every section', () => {
    expect(all.keys()).toEqual(Object.values(mods).flatMap((m) => m.keys()));
  });

  it('sends a card tap to the section it belongs to', () => {
    const card = { closest: () => ({ dataset: { part: 'effects' } }) };
    all.onCard(card, { type: 'click' });
    expect(mods.effects.onCard).toHaveBeenCalledWith(card, { type: 'click' });
    expect(mods.offers.onCard).not.toHaveBeenCalled();
  });
});

describe('shop tab order', () => {
  it('"All" is the first tab and the default', async () => {
    const src = await import('node:fs').then((fs) => fs.readFileSync('src/ui/screens/shop/index.js', 'utf8'));
    const ids = [...src.slice(src.indexOf('export const TABS')).matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]);
    expect(ids.slice(0, 6)).toEqual(['all', 'offers', 'boosters', 'styles', 'effects', 'profile']);
    expect(src).toMatch(/\? t : 'all';/);
  });
});
