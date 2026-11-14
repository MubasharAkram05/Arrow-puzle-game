/**
 * Deterministic math for level generation (3.28.0).
 *
 * Math.log, Math.exp, Math.sin, Math.cos and Math.pow / ** with a fractional exponent are not exactly
 * specified by JavaScript: engines (Node's V8, Chrome, each Android WebView version) may return results that
 * differ in the last bit. Rounded into board sizes, goals or shapes, one bit can change a whole board, so the
 * same level number gave different boards on different devices.
 *
 * Everything here uses only + - * / and comparisons, which IEEE 754 defines exactly (correctly rounded), plus
 * Math.sqrt (also correctly rounded by the spec). So the results are identical, bit for bit, on every engine.
 * They are not always the closest double to the true value (about 1e-15 relative error), which does not
 * matter here: the generator only needs the same answer everywhere.
 */

const LN2 = 0.6931471805599453; // a literal: no platform function involved

/**
 * Natural logarithm, deterministic.
 * x = m * 2^e with m in [sqrt(1/2), sqrt(2)) (exact halving and doubling), then
 * ln(m) = 2 * atanh(s) with s = (m - 1) / (m + 1), |s| < 0.172, summed to a fixed number of terms.
 * @param {number} x
 * @returns {number}
 */
export function dlog(x) {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  let m = x;
  let e = 0;
  // powers of two: multiplying or dividing by 2 is exact (no rounding)
  while (m >= 1.4142135623730951) {
    m /= 2;
    e++;
  }
  while (m < 0.7071067811865476) {
    m *= 2;
    e--;
  }
  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  // atanh(s) = s + s^3/3 + s^5/5 + ... ; |s| < 0.172, so 14 terms reach well below 1e-16
  let term = s;
  let sum = 0;
  for (let k = 1; k <= 27; k += 2) {
    sum += term / k;
    term *= s2;
  }
  return 2 * sum + e * LN2;
}

/**
 * e^x, deterministic. x = k * ln2 + r with |r| <= ln2 / 2, e^r by a fixed Taylor sum, then times 2^k
 * (exact doubling or halving).
 * @param {number} x
 * @returns {number}
 */
export function dexp(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.8) return Infinity;
  if (x < -745.2) return 0;
  const k = Math.round(x / LN2);
  const r = x - k * LN2;
  let term = 1;
  let sum = 1;
  for (let i = 1; i <= 20; i++) {
    term = (term * r) / i;
    sum += term;
  }
  let out = sum;
  if (k > 0) for (let i = 0; i < k; i++) out *= 2;
  else for (let i = 0; i < -k; i++) out /= 2;
  return out;
}

/**
 * base ** exp, deterministic. Integer exponents multiply exactly step by step; 0.5 is Math.sqrt (correctly
 * rounded by the spec); anything else is e^(exp * ln base) with the functions above.
 * @param {number} base
 * @param {number} exp
 * @returns {number}
 */
export function dpow(base, exp) {
  if (exp === 0) return 1;
  if (exp === 0.5 && base >= 0) return Math.sqrt(base);
  if (Number.isInteger(exp) && Math.abs(exp) <= 64) {
    let out = 1;
    for (let i = 0; i < Math.abs(exp); i++) out *= base;
    return exp < 0 ? 1 / out : out;
  }
  if (base === 0) return exp > 0 ? 0 : Infinity;
  if (base < 0) return NaN;
  return dexp(exp * dlog(base));
}
