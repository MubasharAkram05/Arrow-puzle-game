/**
 * Offers tab: starter pack, free gift, weekly sale, coin exchange, "get more coins" placeholder.
 */
import { BOOSTERS, OFFERS } from '../../../config.js';
import {
  buySaleItem,
  buyStarterPack,
  claimFreeGift,
  exchangeCoins,
  starterPackAvailable,
} from '../../../game/offerActions.js';
import { formatCountdown, giftStatus, weeklySale } from '../../../game/offers.js';
import { state } from '../../../game/state.js';
import { flyCurrency } from '../../components/currencyBar.js';
import { icon } from '../../components/icons.js';
import { toast } from '../../components/toast.js';
import { renderNavDots } from '../../components/bottomNav.js';
import { buyFlow, cosmeticTap, done } from './actions.js';
import { card, section } from './cards.js';

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

/** Free gift card: claim button or countdown (updated every second by the shop shell). */
function giftCard() {
  const s = giftStatus(Date.now(), state.offers.giftLast);
  const foot = s.ready
    ? `<span class="claim-pill">${icon('gift')}Claim ${OFFERS.freeGift.coins}</span>`
    : `<span class="countdown" data-countdown>${formatCountdown(s.remainingMs)}</span>`;
  const note = s.clockBack ? 'Clock changed: timer restarted' : `${OFFERS.freeGift.coins} coins every 4 hours`;
  return card({
    kind: 'gift',
    id: 'gift',
    name: 'Free Gift',
    note,
    preview: `${icon('gift')}`,
    foot,
    newKey: 'offer:gift',
  });
}

/** Starter pack: hidden after purchase, locked before level 5. */
function starterCard() {
  if (state.offers.starterBought) return '';
  const c = OFFERS.starterPack.contents;
  const locked = starterPackAvailable() ? '' : `Unlocks at level ${OFFERS.starterPack.minLevel}`;
  const note = `${c.hints} hints, ${c.boosters.shield} Shields, ${c.boosters.reveal} Reveals + Dark Slate style`;
  return card({
    kind: 'starter',
    id: 'starter',
    name: 'Starter Pack',
    note,
    preview: `${icon('gift')}<em>x1</em>`,
    price: OFFERS.starterPack.price,
    locked,
    newKey: 'offer:starter',
  });
}

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => ['offer:starter', 'offer:gift', 'offer:exchange', 'offer:sale'];

/** @returns {string} tab content */
export function render() {
  const sale = weeklySale(new Date());
  const ex = OFFERS.exchange;
  const saleOwned =
    sale.cat === 'styles' || sale.cat === 'themes'
      ? state.owned[sale.cat].includes(sale.id)
      : state.cosmetics.owned[sale.cat].includes(sale.id);
  const saleCard = card({
    kind: 'sale',
    id: sale.id,
    name: sale.name,
    note: `Weekly sale, 30% off. Ends in ${formatCountdown(saleEndsIn(Date.now()))}`,
    preview: icon(SALE_ICON[sale.cat] || 'tag'),
    price: sale.price,
    sale: sale.sale,
    owned: saleOwned,
    newKey: 'offer:sale',
  });
  const exchange = [1, ex.bulk].map((n) =>
    card({
      kind: 'exchange',
      id: String(n),
      name: `${n * ex.diamonds} Diamond${n > 1 ? 's' : ''}`,
      note: `${(n * ex.coins).toLocaleString('en-US')} coins`,
      preview: `<svg class="cur-icon big-cur"><use href="#i-gem" /></svg>`,
      price: { coins: n * ex.coins },
      newKey: 'offer:exchange',
    }),
  );
  return [
    section('Daily', [giftCard(), starterCard()].filter(Boolean)),
    section('Weekly Sale', [saleCard]),
    section('Exchange', exchange),
    `<h3 class="section-title">Get more coins</h3><div class="soon-card">${icon('coin')}<div><b>Coin packs and rewarded videos</b><small>Coming soon</small></div><span class="soon-tag">Soon</span></div>`,
  ].join('');
}

/** Handle a card tap in this tab. */
export function onCard(el) {
  const { kind, id } = el.dataset;
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
      message: 'One-time offer: hints, boosters and the Dark Slate style.',
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
    if (el.querySelector('.owned-tag')) return cosmeticTap(sale.cat, sale.id);
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

/** Booster names for the shared booster bar text (re-exported for the boosters tab). */
export { BOOSTERS };
