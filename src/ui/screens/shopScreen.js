/**
 * Shop: boosters (hints), arrow styles and accent themes. Owned items equip on tap.
 */
import { PRICES, SHOP_STYLES, SHOP_THEMES } from '../../config.js';
import { buyHints, buyItem } from '../../game/rewards.js';
import { state } from '../../game/state.js';
import { saveProgress } from '../../storage/save.js';
import { renderCurrency } from '../components/currencyBar.js';
import { icon } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { $ } from '../dom.js';
import { ask, priceHTML } from '../modals/ask.js';
import { PREVIEW_SVG } from '../components/stylePreview.js';
import { onReturn, openTab } from '../navigation.js';
import { applyTheme } from '../theme.js';

const BOOSTERS = [
  { id: 'hint', name: 'Hint', note: 'Shows an arrow that can escape', price: PRICES.hint, count: 1 },
  { id: 'pack', name: '5 Hints', note: 'Save 20%', price: PRICES.hintPack, count: PRICES.hintPack.count },
];

/** Card markup shared by every item. */
function card({ kind, id, name, note, preview, price, owned, equipped }) {
  const state = equipped ? 'Equipped' : owned ? 'Owned' : '';
  const foot = state
    ? `<span class="owned-tag${equipped ? ' on' : ''}">${icon('check')}${state}</span>`
    : priceHTML(price);
  return `<button class="shop-card${equipped ? ' equipped' : ''}" data-kind="${kind}" data-id="${id}">
    <span class="shop-preview">${preview}</span>
    <b>${name}</b>${note ? `<small>${note}</small>` : ''}
    <span class="shop-foot">${foot}</span>
  </button>`;
}

/** Whole page content. */
function renderShop() {
  const boosters = BOOSTERS.map((b) =>
    card({
      kind: 'booster',
      id: b.id,
      name: b.name,
      note: b.note,
      preview: `${icon('bulb')}<em>x${b.count}</em>`,
      price: b.price,
    }),
  ).join('');
  const styles = SHOP_STYLES.map((s) =>
    card({
      kind: 'styles',
      id: s.id,
      name: s.name,
      preview: `<span class="style-swatch" data-preview="${s.id}">${PREVIEW_SVG}</span>`,
      price: s.price,
      owned: state.owned.styles.includes(s.id),
      equipped: state.style === s.id,
    }),
  ).join('');
  const themes = SHOP_THEMES.map((t) =>
    card({
      kind: 'themes',
      id: t.id,
      name: t.name,
      preview: `<span class="theme-swatch" style="--sw:${t.color}"><i></i><i></i><i></i></span>`,
      price: t.price,
      owned: state.owned.themes.includes(t.id),
      equipped: state.accent === t.id,
    }),
  ).join('');
  $('shop-body').innerHTML = `
    <p class="hint-stock">${icon('bulb')}You have <b>${state.hints}</b> hint${state.hints === 1 ? '' : 's'}</p>
    <h3 class="section-title">Boosters</h3><div class="shop-grid">${boosters}</div>
    <h3 class="section-title">Arrow Styles</h3><div class="shop-grid">${styles}</div>
    <h3 class="section-title">Themes</h3><div class="shop-grid">${themes}</div>
    <h3 class="section-title">Get more coins</h3>
    <div class="soon-card">${icon('coin')}<div><b>Coin packs and rewarded videos</b><small>Coming soon</small></div><span class="soon-tag">Soon</span></div>`;
}

/** Open the shop tab. */
export function openShop() {
  renderShop();
  openTab('screen-shop');
}

/** Pulse a card after a purchase or equip. */
function celebrate(kind, id) {
  const el = $('shop-body').querySelector(`[data-kind="${kind}"][data-id="${id}"]`);
  if (el) el.classList.add('bought');
}

/** Equip an owned style or theme. */
function equip(kind, id) {
  if (kind === 'styles') state.style = id;
  else state.accent = id;
  applyTheme();
  saveProgress();
  renderShop();
  celebrate(kind, id);
}

/** Tap on a shop card: equip, or confirm and buy. */
function onCard(el) {
  const { kind, id } = el.dataset;
  if (kind === 'booster') {
    const b = BOOSTERS.find((x) => x.id === id);
    return ask({
      title: `Buy ${b.name}?`,
      message: b.note,
      icon: 'bulb',
      price: b.price,
      okLabel: 'Buy',
      onOk: () =>
        afterBuy(buyHints({ ...b.price, count: b.count }), kind, id, `+${b.count} hint${b.count === 1 ? '' : 's'}`),
    });
  }
  const list = kind === 'styles' ? SHOP_STYLES : SHOP_THEMES;
  const item = list.find((x) => x.id === id);
  if (state.owned[kind].includes(id)) return equip(kind, id);
  ask({
    title: `Unlock ${item.name}?`,
    message:
      kind === 'styles'
        ? 'A new look for the arrows and the board.'
        : 'A new accent colour for buttons and highlights.',
    icon: 'palette',
    price: item.price,
    okLabel: 'Unlock',
    onOk: () => {
      const res = buyItem(kind, item);
      if (res.ok) equip(kind, id);
      afterBuy(res, kind, id, `${item.name} unlocked`);
    },
  });
}

/** Save, refresh counters and show the result of a purchase. */
function afterBuy(res, kind, id, message) {
  if (!res.ok) return toast('Not enough currency');
  saveProgress();
  renderCurrency();
  renderShop();
  celebrate(kind, id);
  toast(message);
}

/** Wire the shop once. */
export function bindShop() {
  $('shop-body').addEventListener('click', (e) => {
    const el = e.target.closest('.shop-card');
    if (el) onCard(el);
  });
  onReturn('screen-shop', renderShop);
}
