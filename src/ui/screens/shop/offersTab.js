/**
 * Offers tab (3.26.0 redesign): the Free rewards card (ad rewards and the Free Gift), the Starter Pack as a featured
 * card, the Weekly Sale card and the coin-to-diamond Exchange. Items, prices and purchase logic are unchanged.
 */
import { OFFERS } from '../../../config.js';
import {
  buySaleItem,
  buyStarterPack,
  claimFreeGift,
  exchangeCoins,
  starterPackAvailable,
} from '../../../game/offerActions.js';
import { formatCountdown, weeklySale } from '../../../game/offers.js';
import { state } from '../../../game/state.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { icon } from '../../components/icons.js';
import { toast } from '../../components/toast.js';
import { renderNavDots } from '../../components/bottomNav.js';
import { buyFlow, cosmeticTap, done } from './actions.js';
import { cardMode, sectionHead } from './cards.js';
import { freeRewardsCard, onEarn } from './adEarn.js';
import { lookPreviewOf } from './previews.js';
import { priceHTML } from '../../modals/ask.js';
import { wallet } from '../../../game/rewards.js';

const GEM = '<svg class="cur-icon" aria-hidden="true"><use href="#i-gem" /></svg>';
const COIN = '<svg class="cur-icon" aria-hidden="true"><use href="#i-coin" /></svg>';

const SALE_ICON = {
  styles: 'palette',
  themes: 'palette',
  effect: 'sparkle',
  board: 'image',
  head: 'nav',
  confetti: 'sparkle',
  sound: 'music',
  avatar: 'user',
  frame: 'frame',
};

/** Time left until the sale changes (next Monday 00:00 UTC). */
function saleEndsIn(now) {
  const d = new Date(now);
  const day = d.getUTCDay() || 7;
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 8 - day);
  return next - now;
}

/** Starter Pack: a big featured card (gradient, what's inside, price button, "One-time offer" ribbon). */
function starterCard() {
  if (state.offers.starterBought) return '';
  const c = OFFERS.starterPack.contents;
  const p = OFFERS.starterPack.price;
  const locked = starterPackAvailable() ? '' : `Unlocks at level ${OFFERS.starterPack.minLevel}`;
  const mode = cardMode({ price: p, locked }, wallet());
  const btn =
    mode === 'locked'
      ? `<span class="price-btn is-locked">${icon('lock')}${locked}</span>`
      : `<span class="price-btn is-${mode} big">${priceHTML(p)}</span>`;
  return `<button class="starter-card" data-kind="starter" data-id="starter" data-mode="${mode}">
    <span class="ribbon">One-time offer</span>
    <span class="starter-title"><b>Starter Pack</b><small>Best value to get going</small></span>
    <span class="starter-items">
      <span class="starter-item">${icon('bulb')}<b>x${c.hints}</b><small>Hints</small></span>
      <span class="starter-item">${lookPreviewOf(c.style, c.board)}<small>Pearl arrows + Dark Slate board</small></span>
    </span>
    ${btn}
  </button>`;
}

/** Weekly Sale: "-30%" badge, old price crossed out, new price, time left. */
function saleCard(sale) {
  const owned =
    sale.cat === 'styles' || sale.cat === 'themes'
      ? state.owned[sale.cat].includes(sale.id)
      : state.cosmetics.owned[sale.cat].includes(sale.id);
  const off = Math.round(OFFERS.weeklySale.discount * 100);
  const mode = cardMode({ price: sale.price, sale: sale.sale, owned }, wallet());
  const btn = owned
    ? '<span class="price-btn is-owned">Owned: Equip</span>'
    : `<span class="price-btn is-${mode}"><span class="old-price">${priceHTML(sale.price)}</span>${priceHTML(sale.sale)}</span>`;
  return `<button class="sale-card" data-kind="sale" data-id="${sale.id}" data-mode="${owned ? 'owned' : mode}">
    <span class="sale-badge">-${off}%</span>
    <span class="sale-preview">${icon(SALE_ICON[sale.cat] || 'tag')}</span>
    <span class="sale-text"><b>${sale.name}</b><small>${icon('clock')}Ends in ${formatCountdown(saleEndsIn(Date.now()))}</small></span>
    ${btn}
  </button>`;
}

/** Exchange: coins to diamonds, with an arrow between the amounts. */
function exchangeCard(n) {
  const ex = OFFERS.exchange;
  const price = { coins: n * ex.coins };
  const mode = cardMode({ price }, wallet());
  return `<button class="exchange-card" data-kind="exchange" data-id="${n}" data-mode="${mode}">
    <span class="ex-amounts"><span class="ex-amt">${COIN}${(n * ex.coins).toLocaleString('en-US')}</span><span class="ex-arrow">${icon('arrow-right')}</span><span class="ex-amt">${GEM}${n * ex.diamonds}</span></span>
    <span class="price-btn is-${mode}">Exchange</span>
  </button>`;
}

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => ['offer:starter', 'offer:gift', 'offer:exchange', 'offer:sale'];

/**
 * @param {{inAll?: boolean}} [o] inAll: the All tab draws the Free rewards card itself, at its very top
 * @returns {string} tab content
 */
export function render(o = {}) {
  const sale = weeklySale(new Date());
  const starter = starterCard();
  return [
    o.inAll ? '' : freeRewardsCard(),
    starter ? sectionHead('Starter Pack', { icon: 'gift', sub: 'A one-time bundle for new players' }) + starter : '',
    sectionHead('Weekly Sale', {
      icon: 'tag',
      sub: `${Math.round(OFFERS.weeklySale.discount * 100)}% off one item, new every Monday`,
    }) + saleCard(sale),
    sectionHead('Exchange', { icon: 'swap', sub: 'Turn coins into diamonds' }) +
      `<div class="exchange-list">${[1, OFFERS.exchange.bulk].map(exchangeCard).join('')}</div>`,
  ].join('');
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
  if (kind === 'adearn') return onEarn(el);
  if (kind === 'gift') {
    const before = state.coins;
    const res = claimFreeGift();
    if (res.ok) {
      flyCurrency(el, 'coins', before, res.coins);
      renderNavDots();
      return done('gift', 'gift', `+${res.coins} coins`);
    }
    renderNavDots();
    done('gift', 'gift');
    return toast(res.reason === 'clock' ? 'Your clock changed, so the timer restarted' : 'Not ready yet');
  }
  if (kind === 'starter') {
    if (!starterPackAvailable()) return toast(`Reach level ${OFFERS.starterPack.minLevel} to unlock`);
    return buyFlow({
      kind,
      id,
      title: 'Buy the Starter Pack?',
      message: 'One-time offer: 5 hints, Pearl White arrows and the Dark Slate board.',
      icon: 'gift',
      price: OFFERS.starterPack.price,
      buy: buyStarterPack,
      success: 'Starter Pack added',
    });
  }
  if (kind === 'exchange') {
    const n = Number(id);
    return buyFlow({
      kind,
      id,
      title: `Get ${n} diamond${n > 1 ? 's' : ''}?`,
      message: `Exchange ${n * OFFERS.exchange.coins} coins.`,
      icon: 'swap',
      price: { coins: n * OFFERS.exchange.coins },
      okLabel: 'Exchange',
      buy: () => exchangeCoins(n),
      success: `+${n} diamond${n > 1 ? 's' : ''}`,
    });
  }
  if (kind === 'sale') {
    const sale = weeklySale(new Date());
    if (el.dataset.mode === 'owned') return cosmeticTap(sale.cat, sale.id);
    return buyFlow({
      kind,
      id,
      title: `Buy ${sale.name}?`,
      message: 'Weekly sale price.',
      icon: 'tag',
      price: sale.sale,
      buy: () => buySaleItem(),
      success: `${sale.name} unlocked`,
    });
  }
}
