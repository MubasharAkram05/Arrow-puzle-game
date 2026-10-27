export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Element by id.
 * @param {string} id
 * @returns {HTMLElement}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Create an SVG element with attributes.
 * @param {string} tag
 * @param {Record<string, string|number>} [attrs]
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/**
 * Short local date label, e.g. "Oct 27".
 * @param {Date} d
 * @returns {string}
 */
export function shortDate(d) {
  try {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}
