/**
 * Shop "All" tab: every section in order under its own heading (Offers, Boosters, Styles, Effects,
 * Profile items). Card taps go to the section the card belongs to.
 */
import { icon } from '../../components/icons.js';
import * as boosters from './boostersTab.js';
import * as effects from './effectsTab.js';
import * as offers from './offersTab.js';
import * as profile from './profileTab.js';
import * as styles from './stylesTab.js';

/** Sections in display order. */
export const PARTS = [
  { id: 'offers', title: 'Offers', icon: 'gift', mod: offers },
  { id: 'boosters', title: 'Boosters', icon: 'bolt', mod: boosters },
  { id: 'styles', title: 'Styles', icon: 'palette', mod: styles },
  { id: 'effects', title: 'Effects', icon: 'sparkle', mod: effects },
  { id: 'profile', title: 'Profile items', icon: 'user', mod: profile },
];

/** "New" keys of every section. */
export const keys = () => PARTS.flatMap((p) => p.mod.keys());

/** @returns {string} tab content */
export function render() {
  return PARTS.map(
    (p) =>
      `<section class="shop-part" data-part="${p.id}"><h2 class="shop-part-head">${icon(p.icon)}${p.title}</h2>${p.mod.render()}</section>`,
  ).join('');
}

/**
 * A card was tapped: let its own section handle it.
 * @param {HTMLElement} el
 * @param {Event} e
 */
export function onCard(el, e) {
  const part = PARTS.find((p) => p.id === el.closest('[data-part]')?.dataset.part);
  part?.mod.onCard(el, e);
}
