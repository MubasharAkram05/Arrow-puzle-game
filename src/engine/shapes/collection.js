/**
 * Shape collection: which shapes a player has unlocked (by finishing their shape level), per category.
 * Uses the small index.json (category -> ids), so it works before the big library chunk has loaded.
 */
import INDEX from './index.json';

/** @type {{id: string, name: string, target: number}[]} */
export const SHAPE_CATEGORIES = INDEX.categories;

const CATEGORY_OF = new Map(Object.entries(INDEX.members).flatMap(([cat, ids]) => ids.map((id) => [id, cat])));

/** Every shape id in the game. */
export const SHAPE_COUNT = CATEGORY_OF.size;

/**
 * @param {string} id
 * @returns {string|undefined} category id
 */
export const categoryOf = (id) => CATEGORY_OF.get(id);

/**
 * Shape ids of a category, in library order.
 * @param {string} category
 * @returns {string[]}
 */
export const shapesIn = (category) => INDEX.members[category] || [];

/**
 * Collected count per category and in total. Unknown ids (e.g. from a newer save) are ignored.
 * @param {Set<string>} collected
 * @returns {{have: number, total: number, categories: {id: string, name: string, have: number, total: number}[]}}
 */
export function collectionProgress(collected) {
  const categories = SHAPE_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    have: shapesIn(c.id).filter((id) => collected.has(id)).length,
    total: shapesIn(c.id).length,
  }));
  return {
    have: categories.reduce((n, c) => n + c.have, 0),
    total: SHAPE_COUNT,
    categories,
  };
}

/**
 * How many shapes of one category are collected.
 * @param {Set<string>} collected
 * @param {string} category
 * @returns {number}
 */
export function collectedIn(collected, category) {
  let n = 0;
  for (const id of collected) if (CATEGORY_OF.get(id) === category) n++;
  return n;
}
