/**
 * Grid directions. Index order matters: 0 up, 1 right, 2 down, 3 left.
 * `rot` is the arrowhead rotation in degrees.
 * @type {ReadonlyArray<{dr: number, dc: number, rot: number}>}
 */
export const DIRS = Object.freeze([
  Object.freeze({ dr: -1, dc: 0, rot: 0 }),
  Object.freeze({ dr: 0, dc: 1, rot: 90 }),
  Object.freeze({ dr: 1, dc: 0, rot: 180 }),
  Object.freeze({ dr: 0, dc: -1, rot: 270 }),
]);

/**
 * Direction index pointing the opposite way.
 * @param {number} dir
 * @returns {number}
 */
export function opposite(dir) {
  return (dir + 2) % 4;
}
