/**
 * Effects tab: escape effects, victory confetti and sound packs.
 */
import { playSound } from '../../../audio/sound.js';
import { COSMETICS } from '../../../config.js';
import { icon } from '../../components/icons.js';
import { cardState, cosmeticTap } from './actions.js';
import { card, section } from './cards.js';
import { confettiPreview, effectPreview } from './previews.js';

const paid = (cat) => COSMETICS[cat].filter((i) => i.price).map((i) => `${cat}:${i.id}`);

/** @returns {string[]} keys for the tab's "New" dot */
export const keys = () => [...paid('effect'), ...paid('confetti'), ...paid('sound')];

/** Sound card preview: a play chip that plays the pack's win jingle without buying. */
const soundPreview = (id) =>
  `${icon('music')}<span class="play-chip" data-play="${id}" role="button" tabindex="0" aria-label="Play sample">${icon('play')}</span>`;

/** Cards for one category. */
function cards(cat, preview) {
  return COSMETICS[cat].map((item) =>
    card({
      kind: cat,
      id: item.id,
      name: item.name,
      preview: preview(item.id),
      newKey: `${cat}:${item.id}`,
      ...cardState(cat, item),
    }),
  );
}

/** @returns {string} tab content */
export function render() {
  return [
    section('Escape Effects', cards('effect', effectPreview)),
    section('Victory Confetti', cards('confetti', confettiPreview)),
    section('Sound Packs', cards('sound', soundPreview)),
  ].join('');
}

/**
 * Handle a card tap in this tab. The sound play chip only plays a sample.
 * @param {HTMLElement} el card
 * @param {Event} e
 */
export function onCard(el, e) {
  const play = e.target.closest('[data-play]');
  if (play) return playSound('win', play.dataset.play);
  cosmeticTap(el.dataset.kind, el.dataset.id);
}
