/**
 * Arrow colors, boards and arrowheads (3.27.0): an arrow style only sets the arrow color, boards set the
 * background, low contrast pairs get an outline, previews are mini boards, new head prices, and the save v8
 * migration (an old style becomes its arrow color + its board).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { BOARD_LOOKS, COSMETICS, OFFERS, SHOP_STYLES } from '../src/config.js';
import { MIN_CONTRAST, arrowColorOn, contrast, lookFor, lookVars } from '../src/game/looks.js';
import { state } from '../src/game/state.js';
import { STYLE_UPGRADE, migrateV7, sanitize } from '../src/storage/schema.js';
import { drawArrow } from '../src/render/canvasDraw.js';
import { headShape } from '../src/render/board.js';
import { boardPreview, headPreview, stylePreview } from '../src/ui/screens/shop/previews.js';

const THEMES = ['light', 'dark'];
const BOARDS = COSMETICS.board.map((b) => b.id);
const item = (cat, id) => (cat === 'styles' ? SHOP_STYLES : COSMETICS[cat]).find((i) => i.id === id);

describe('arrow colors', () => {
  it('ten-plus colors named by color, Classic Navy free', () => {
    expect(SHOP_STYLES.map((s) => s.name)).toEqual([
      'Classic Navy',
      'Charcoal',
      'Forest Green',
      'Ocean Teal',
      'Pearl White',
      'Crimson',
      'Deep Purple',
      'Sunset Orange',
      'Electric Cyan',
      'Rose Pink',
      'Gold',
    ]);
    expect(SHOP_STYLES[0].price).toBeNull();
    for (const s of SHOP_STYLES) expect(s.color, s.id).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('coins for normal colors, diamonds or coins + diamonds for bright ones', () => {
    for (const id of ['charcoal', 'forest', 'teal', 'pearl', 'crimson'])
      expect(item('styles', id).price).toHaveProperty('coins');
    for (const id of ['purple', 'orange', 'cyan', 'rose', 'gold'])
      expect(item('styles', id).price.diamonds).toBeGreaterThan(0);
  });

  it('a style is only the arrow color: the same color on every board (Classic Navy picks navy or light)', () => {
    for (const b of BOARDS)
      for (const t of THEMES) expect(lookFor('crimson', b, t).arrow).toBe(item('styles', 'crimson').color);
    expect(arrowColorOn('classic', '#ffffff')).toBe('#0b1442');
    expect(arrowColorOn('classic', '#0d1321')).toBe('#e3eaf8');
  });

  it('Classic Navy never needs the outline, on any board, in light or dark mode', () => {
    for (const b of BOARDS) for (const t of THEMES) expect(lookFor('classic', b, t).outline, `${b} ${t}`).toBeNull();
  });
});

describe('contrast safety', () => {
  it('WCAG contrast', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('below 3:1 the arrows get an outline that stands out from the board', () => {
    const dark = lookFor('charcoal', 'slate', 'light'); // Charcoal on Dark Slate
    expect(dark.ratio).toBeLessThan(MIN_CONTRAST);
    expect(dark.outline).toBe('#ffffff');
    const light = lookFor('pearl', 'plain', 'light'); // Pearl White on a white board
    expect(light.ratio).toBeLessThan(MIN_CONTRAST);
    expect(light.outline).toBe('#0b1020');
    expect(lookFor('crimson', 'plain', 'light').outline).toBeNull();
  });

  it('with the outline, arrows are never invisible: outline vs board is at least 3:1 everywhere', () => {
    for (const s of SHOP_STYLES)
      for (const b of BOARDS)
        for (const t of THEMES) {
          const l = lookFor(s.id, b, t);
          const seen = l.outline ? contrast(l.outline, l.base) : l.ratio;
          expect(seen, `${s.id} on ${b} (${t})`).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
  });

  it('the game board draws an outline pass under low-contrast arrows only', () => {
    const calls = [];
    const ctx = new Proxy(
      {},
      {
        get: (o, k) => (k in o ? o[k] : (...a) => calls.push([k, ...a]) && undefined),
        set: (o, k, v) => {
          o[k] = v;
          if (k === 'strokeStyle') calls.push(['strokeStyle', v]);
          return true;
        },
      },
    );
    const a = {
      geom: {
        pts: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        cum: [0, 10],
        dashLen: 10,
        hx: 10,
        hy: 0,
        dx: 1,
        dy: 0,
        rot: 90,
      },
    };
    const m = { sw: 4, hw: 6, back: 3, tip: 5, head: 'triangle' };
    drawArrow(ctx, a, {
      m,
      hintId: -1,
      colors: { arrow: '#2f3640', outline: '#ffffff', primary: '#1877f2', error: '#f00' },
    });
    const strokes = calls.filter((c) => c[0] === 'strokeStyle').map((c) => c[1]);
    expect(strokes).toEqual(['#ffffff', '#2f3640']); // outline first, then the arrow
    calls.length = 0;
    drawArrow(ctx, a, { m, hintId: -1, colors: { arrow: '#0b1442', outline: '', primary: '#1877f2', error: '#f00' } });
    expect(calls.filter((c) => c[0] === 'strokeStyle').map((c) => c[1])).toEqual(['#0b1442']);
  });
});

describe('previews: mini boards', () => {
  beforeEach(() => {
    state.style = 'crimson';
    state.cosmetics = {
      ...state.cosmetics,
      equipped: { ...state.cosmetics.equipped, board: 'chalk', head: 'bolt' },
    };
  });

  it('a board card is filled with that board, with the dot grid and sample arrows in the equipped color', () => {
    for (const id of ['chalk', 'blueprint']) {
      const html = boardPreview(id);
      expect(html).toContain(`--l-fill:${BOARD_LOOKS[id].light.fill}`);
      expect(html).toContain(`--d-fill:${BOARD_LOOKS[id].dark.fill}`);
      expect(html).toContain('--l-arrow:#c62835'); // Crimson arrows on it
      expect(html).toContain('class="p-dots"');
      expect(html.match(/class="p-arrow"/g)).toHaveLength(3);
    }
    // Chalkboard and Blueprint previews are dark boards now, not white arrows on a white card
    expect(BOARD_LOOKS.chalk.light.base).not.toBe('#ffffff');
    expect(BOARD_LOOKS.blueprint.light.base).not.toBe('#ffffff');
  });

  it('an arrow color card shows that color on the equipped board; arrowheads use the equipped head', () => {
    const html = stylePreview('gold');
    expect(html).toContain(lookVars('gold', 'chalk'));
    const [tag, attrs] = headShape({ hw: 7, back: 4, tip: 6, sw: 5, head: 'bolt' });
    expect(html).toContain(`<${tag} class="head"`);
    expect(html).toContain(attrs.points);
  });

  it('an arrowhead card shows that head large, on the equipped board in the equipped color', () => {
    const html = headPreview('diamond');
    expect(html).toContain(lookVars('crimson', 'chalk'));
    expect(html.match(/class="p-arrow"/g)).toHaveLength(1);
    expect(html).toContain(headShape({ hw: 13, back: 7, tip: 11, sw: 7, head: 'diamond' })[1].points);
  });

  it('low contrast previews carry the outline color, others a transparent outline', () => {
    expect(lookVars('charcoal', 'slate')).toContain('--l-out:#ffffff');
    expect(lookVars('crimson', 'plain')).toContain('--l-out:transparent');
  });
});

describe('boards and arrowheads', () => {
  it('the old style backgrounds are boards with the same names and prices', () => {
    expect(item('board', 'slate')).toMatchObject({ name: 'Dark Slate', price: { coins: 600 } });
    expect(item('board', 'olive')).toMatchObject({ name: 'Olive', price: { coins: 600 } });
    expect(item('board', 'mint')).toMatchObject({ name: 'Soft Mint', price: { diamonds: 8 } });
    expect(item('board', 'rose')).toMatchObject({ name: 'Rose Gold', price: { coins: 800, diamonds: 4 } });
    expect(item('board', 'neon')).toMatchObject({ name: 'Neon Night', price: { coins: 1100, diamonds: 6 } });
    for (const b of BOARDS) for (const t of THEMES) expect(BOARD_LOOKS[b][t], `${b} ${t}`).toBeTruthy();
  });

  it('new arrowhead prices and two premium heads', () => {
    expect(item('head', 'chevron').price).toEqual({ coins: 500 });
    expect(item('head', 'round').price).toEqual({ coins: 700 });
    expect(item('head', 'feather').price).toEqual({ coins: 900, diamonds: 3 });
    expect(item('head', 'diamond')).toMatchObject({ name: 'Diamond Tip', price: { coins: 1200, diamonds: 5 } });
    expect(item('head', 'bolt')).toMatchObject({ name: 'Bolt', price: { coins: 1500, diamonds: 8 } });
    for (const h of ['diamond', 'bolt'])
      expect(headShape({ hw: 6, back: 3, tip: 5, sw: 4, head: h })[0]).toBe('polygon');
  });

  it('the Starter Pack gives the same pair as the old Dark Slate style', () => {
    expect(OFFERS.starterPack.contents).toEqual({ hints: 5, ...{ style: 'pearl', board: 'slate' } });
    expect(STYLE_UPGRADE.slate).toEqual({ arrow: 'pearl', board: 'slate' });
  });
});

describe('save v8 migration', () => {
  const v7 = (items, cosmetics = {}) => ({ version: 7, items, cosmetics });

  it('every old style owned gives its arrow color and its board', () => {
    const d = migrateV7(
      v7({
        owned: { styles: ['classic', 'slate', 'olive', 'mint', 'rose', 'neon'], themes: ['blue'] },
        style: 'classic',
        accent: 'blue',
      }),
    );
    expect(d.version).toBe(8);
    expect(d.items.owned.styles).toEqual(['classic', 'pearl', 'forest', 'teal', 'rose', 'cyan']);
    expect(d.cosmetics.owned.board).toEqual(['plain', 'slate', 'olive', 'mint', 'rose', 'neon']);
    expect(d.items.style).toBe('classic');
    expect(d.cosmetics.equipped.board).toBe('plain');
  });

  it('the equipped old style equips its arrow color and board', () => {
    const d = migrateV7(v7({ owned: { styles: ['classic', 'neon'] }, style: 'neon' }));
    expect(d.items.style).toBe('cyan');
    expect(d.cosmetics.equipped.board).toBe('neon');
  });

  it('a board the player bought and equipped stays equipped', () => {
    const d = migrateV7(
      v7(
        { owned: { styles: ['classic', 'mint'] }, style: 'mint' },
        { owned: { board: ['plain', 'paper'] }, equipped: { board: 'paper' } },
      ),
    );
    expect(d.items.style).toBe('teal');
    expect(d.cosmetics.equipped.board).toBe('paper');
    expect(d.cosmetics.owned.board).toEqual(['plain', 'paper', 'mint']);
  });

  it('everything else is kept; a v8 save is never converted again', () => {
    const d = migrateV7({
      ...v7({ owned: { styles: ['classic', 'rose'] }, style: 'rose' }),
      wallet: { coins: 77, diamonds: 3, hints: 2 },
    });
    expect(d.wallet).toEqual({ coins: 77, diamonds: 3, hints: 2 });
    const again = sanitize(d);
    expect(again).toEqual(d);
    // in a v8 save 'rose' is the Rose Pink arrow color: no board is added
    const v8 = sanitize({ version: 8, items: { owned: { styles: ['classic', 'rose'] }, style: 'rose' } });
    expect(v8.items.style).toBe('rose');
    expect(v8.cosmetics.owned.board).toEqual(['plain']);
  });
});
