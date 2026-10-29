/**
 * Shared shop actions: confirm + buy with feedback, equipping, and sale prices.
 */
import { SHOP_STYLES, SHOP_THEMES } from '../../../config.js';
import { findItem } from '../../../game/cosmetics.js';
import { weeklySale } from '../../../game/offers.js';
import { buyCosmeticItem, buyItem, equipCosmeticItem } from '../../../game/rewards.js';
import { state } from '../../../game/state.js';
import { saveProgress } from '../../../storage/save.js';
import { renderCurrency } from '../../components/currencyBar.js';
import { toast } from '../../components/toast.js';
import { ask, missingText } from '../../modals/ask.js';
import { applyTheme } from '../../theme.js';

let rerender = () => {};

/**
 * Register how to redraw the shop after a change.
 * @param {() => void} fn
 */
export function onShopChange(fn) {
  rerender = fn;
}

/**
 * Sale price for an item this week, or undefined.
 * @param {string} cat "styles" | "themes" | cosmetic category
 * @param {string} id
 * @returns {object|undefined}
 */
export function saleFor(cat, id) {
  const s = weeklySale(new Date());
  return s.cat === cat && s.id === id ? s.sale : undefined;
}

/** Pulse the card after a purchase or equip. */
function celebrate(kind, id) {
  const el = document.querySelector(`#shop-body [data-kind="${kind}"][data-id="${id}"]`);
  if (el) el.classList.add('bought');
}

/**
 * After a change: save, refresh counters and the shop, celebrate.
 * @param {string} kind
 * @param {string} id
 * @param {string} message toast text
 */
export function done(kind, id, message) {
  saveProgress();
  renderCurrency();
  rerender();
  celebrate(kind, id);
  if (message) toast(message);
}

/**
 * Confirm, then buy. Shows a clear error when the purchase fails.
 * @param {{kind: string, id: string, title: string, message: string, icon: string, price: object, okLabel?: string, buy: () => {ok: boolean, missing?: object}, success: string, after?: () => void}} o
 */
export function buyFlow(o) {
  ask({
    title: o.title,
    message: o.message,
    icon: o.icon,
    price: o.price,
    okLabel: o.okLabel || 'Buy',
    onOk: () => {
      const res = o.buy();
      if (!res.ok) return toast(res.missing ? missingText(o.price) : 'Could not buy this item');
      if (o.after) o.after();
      done(o.kind, o.id, o.success);
    },
  });
}

/**
 * Tap on a style, theme or cosmetic card: equip if owned, otherwise confirm and buy (at the sale price if any).
 * @param {string} cat "styles" | "themes" | cosmetic category
 * @param {string} id
 */
export function cosmeticTap(cat, id) {
  const isStyle = cat === 'styles' || cat === 'themes';
  const item = isStyle ? (cat === 'styles' ? SHOP_STYLES : SHOP_THEMES).find((i) => i.id === id) : findItem(cat, id);
  const owned = isStyle
    ? state.owned[cat].includes(id)
    : item.price === null || state.cosmetics.owned[cat].includes(id);
  const equip = () => {
    if (cat === 'styles') state.style = id;
    else if (cat === 'themes') state.accent = id;
    else if (cat !== 'avatar') equipCosmeticItem(cat, id);
    applyTheme();
  };
  if (owned) {
    if (cat === 'avatar') return toast('Pick it on your Profile');
    equip();
    return done(cat, id, `${item.name} equipped`);
  }
  const price = saleFor(cat, id) || item.price;
  buyFlow({
    kind: cat,
    id,
    title: `Unlock ${item.name}?`,
    message: 'It is yours to keep and equip any time.',
    icon: 'palette',
    price,
    okLabel: 'Unlock',
    buy: () => (isStyle ? buyItem(cat, { ...item, price }) : buyCosmeticItem(cat, id, price)),
    after: () => {
      if (cat !== 'avatar') equip();
    },
    success: `${item.name} unlocked`,
  });
}

/**
 * Card data shared by style/theme/cosmetic cards: owned, equipped and sale.
 * @param {string} cat
 * @param {{id: string, price: object|null}} item
 * @returns {{owned: boolean, equipped: boolean, price: object|null, sale?: object}}
 */
export function cardState(cat, item) {
  const isStyle = cat === 'styles' || cat === 'themes';
  const owned = isStyle
    ? state.owned[cat].includes(item.id)
    : item.price === null || state.cosmetics.owned[cat].includes(item.id);
  const equipped =
    cat === 'styles'
      ? state.style === item.id
      : cat === 'themes'
        ? state.accent === item.id
        : state.cosmetics.equipped[cat] === item.id;
  return { owned, equipped, price: item.price, sale: owned ? undefined : saleFor(cat, item.id) };
}
