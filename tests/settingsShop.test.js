import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COSMETICS, SHOP_STYLES, SHOP_THEMES } from '../src/config.js';
import { newCosmetics } from '../src/game/cosmetics.js';
import { SHOP_CATEGORIES, equipShopItem, isEquipped, ownsShopItem } from '../src/game/shopEquip.js';
import { card } from '../src/ui/screens/shop/cards.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const settings = html.slice(html.indexOf('id="modal-settings"'), html.indexOf('id="modal-credits"'));

/** A fresh state-like object (what a new save holds). */
const fresh = () => ({
  style: 'classic',
  accent: 'blue',
  avatar: 0,
  owned: { styles: ['classic'], themes: ['blue'] },
  cosmetics: newCosmetics(),
});

/** Every item the Shop sells or gives, per category. */
const itemsOf = (cat) => (cat === 'styles' ? SHOP_STYLES : cat === 'themes' ? SHOP_THEMES : COSMETICS[cat]);

/** Give the player an item (as a purchase would). */
function grant(st, cat, id) {
  if (cat === 'styles' || cat === 'themes') st.owned[cat].push(id);
  else st.cosmetics.owned[cat].push(id);
}

describe('Settings', () => {
  it('no longer shows the style, cosmetics or "More in the Shop" sections', () => {
    expect(settings).not.toMatch(/Switch Your Style/i);
    expect(settings).not.toMatch(/Cosmetics/);
    expect(settings).not.toContain('style-grid');
    expect(settings).not.toContain('cosmetic-equip');
    expect(settings).not.toContain('btn-more-styles');
    expect(settings).not.toMatch(/More in the Shop/);
  });

  it('keeps sound, vibration, theme, zoom tips, credits and reset', () => {
    for (const id of ['sw-sound', 'sw-vibration', 'theme-seg', 'btn-zoom-tips', 'btn-credits', 'btn-reset'])
      expect(settings, id).toContain(`id="${id}"`);
    for (const opt of ['light', 'dark', 'auto']) expect(settings).toContain(`data-theme-opt="${opt}"`);
  });
});

describe('equipping in the Shop', () => {
  it('covers every cosmetic category', () => {
    expect(SHOP_CATEGORIES).toEqual(
      expect.arrayContaining(['styles', 'themes', 'effect', 'board', 'head', 'confetti', 'sound', 'frame', 'avatar']),
    );
  });

  it('every item can be equipped once owned, free defaults right away', () => {
    for (const cat of SHOP_CATEGORIES) {
      for (const item of itemsOf(cat)) {
        const st = fresh();
        if (item.price) {
          expect(ownsShopItem(st, cat, item.id), `${cat}:${item.id} starts locked`).toBe(false);
          expect(equipShopItem(st, cat, item.id), `${cat}:${item.id} locked`).toBe(false);
          grant(st, cat, item.id);
        }
        expect(equipShopItem(st, cat, item.id), `${cat}:${item.id}`).toBe(true);
        expect(isEquipped(st, cat, item.id), `${cat}:${item.id} equipped`).toBe(true);
      }
    }
  });

  it('switching back to a free default works', () => {
    const st = fresh();
    grant(st, 'styles', 'slate');
    equipShopItem(st, 'styles', 'slate');
    expect(equipShopItem(st, 'styles', 'classic')).toBe(true);
    expect(st.style).toBe('classic');
  });

  it('owned cards show "Equip", the item in use shows "Equipped"', () => {
    const base = { kind: 'board', id: 'x', name: 'X', preview: '' };
    expect(card({ ...base, owned: true })).toContain('>Equip<');
    expect(card({ ...base, owned: true, equipped: true })).toContain('Equipped');
    expect(card({ ...base, owned: true })).not.toContain('Owned');
  });
});
