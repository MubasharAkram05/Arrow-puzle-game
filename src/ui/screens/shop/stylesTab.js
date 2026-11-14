/**
 * Styles tab (3.27.0): arrow colors, accent themes, boards and arrowheads. Every arrow color, board and arrowhead
 * is previewed as a mini board: arrow colors on the player's board, boards with the player's arrow color, heads on
 * both. When the equipped arrow color and board have low contrast, a note says the outline is on.
 */
import { COSMETICS, SHOP_STYLES, SHOP_THEMES } from '../../../config.js';
import { cardState, cosmeticTap } from './actions.js';
import { lookFor } from '../../../game/looks.js';
import { state } from '../../../game/state.js';
import { icon } from '../../components/icons.js';
import { card, section } from './cards.js';
import { boardPreview, headPreview, stylePreview, themePreview } from './previews.js';

const paid = (cat) => COSMETICS[cat].filter((i) => i.price).map((i) => `${cat}:${i.id}`);

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => [
  ...SHOP_STYLES.filter((i) => i.price).map((i) => `styles:${i.id}`),
  ...paid('board'),
  ...paid('head'),
];

/** "Low contrast, outline added" when the equipped arrow color and board need the outline. */
function contrastNote() {
  const theme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  if (!lookFor(state.style, state.cosmetics.equipped.board, theme).outline) return '';
  return `<p class="contrast-note" role="status">${icon('alert')}Low contrast, outline added: your arrow color and board are close, so arrows get an outline.</p>`;
}

/** Cards for one category. */
function cards(cat, list, preview) {
  return list.map((item) =>
    card({
      kind: cat,
      id: item.id,
      name: item.name,
      preview: preview(item),
      newKey: `${cat}:${item.id}`,
      ...cardState(cat, item),
    }),
  );
}

/** @returns {string} tab content */
export function render() {
  return [
    contrastNote(),
    section(
      'Arrow Colors',
      cards('styles', SHOP_STYLES, (s) => stylePreview(s.id)),
      '',
      {
        icon: 'palette',
        sub: 'The color of every arrow, shown on your board',
      },
    ),
    section(
      'Themes',
      cards('themes', SHOP_THEMES, (t) => themePreview(t.color)),
      '',
      {
        icon: 'palette',
        sub: 'The accent color of the game',
      },
    ),
    section(
      'Boards',
      cards('board', COSMETICS.board, (b) => boardPreview(b.id)),
      '',
      {
        icon: 'image',
        sub: 'Behind every level, shown with your arrows',
      },
    ),
    section(
      'Arrowheads',
      cards('head', COSMETICS.head, (h) => headPreview(h.id)),
      '',
      {
        icon: 'nav',
        sub: 'The tip of every arrow, on your board',
      },
    ),
  ].join('');
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  cosmeticTap(el.dataset.kind, el.dataset.id);
}
