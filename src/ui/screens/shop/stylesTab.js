/**
 * Styles tab: arrow styles, accent themes, board backgrounds and arrowhead shapes.
 */
import { COSMETICS, SHOP_STYLES, SHOP_THEMES } from '../../../config.js';
import { cardState, cosmeticTap } from './actions.js';
import { card, section } from './cards.js';
import { boardPreview, headPreview, stylePreview, themePreview } from './previews.js';

const paid = (cat) => COSMETICS[cat].filter((i) => i.price).map((i) => `${cat}:${i.id}`);

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => [...paid('board'), ...paid('head')];

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
    section(
      'Arrow Styles',
      cards('styles', SHOP_STYLES, (s) => stylePreview(s.id)),
    ),
    section(
      'Themes',
      cards('themes', SHOP_THEMES, (t) => themePreview(t.color)),
    ),
    section(
      'Board Backgrounds',
      cards('board', COSMETICS.board, (b) => boardPreview(b.id)),
    ),
    section(
      'Arrowheads',
      cards('head', COSMETICS.head, (h) => headPreview(h.id)),
    ),
  ].join('');
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  cosmeticTap(el.dataset.kind, el.dataset.id);
}
