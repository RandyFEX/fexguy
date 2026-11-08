// Exact decimal arithmetic for premiums (no binary floating point).
// A value is { n: BigInt, s: scale } meaning n / 10^s. Carrier rates,
// policy fees and modal factors are parsed from their printed strings, so
// "0.083334" is exactly 83334 / 10^6.

/** Parse a decimal string or integer ("12.34", "$1,234.50", 11, "0.0875"). */
export function dec(value) {
  const str = String(value).replace(/[$,\s]/g, '');
  const m = str.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`Not a decimal number: ${JSON.stringify(value)}`);
  const frac = m[3] ?? '';
  const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n);
  return { n, s: frac.length };
}

const align = (a, b) => {
  const s = Math.max(a.s, b.s);
  return [a.n * 10n ** BigInt(s - a.s), b.n * 10n ** BigInt(s - b.s), s];
};

export const add = (a, b) => {
  const [x, y, s] = align(a, b);
  return { n: x + y, s };
};

/** -1, 0 or 1 as a is less than, equal to or greater than b (exact). */
export const cmp = (a, b) => {
  const [x, y] = align(a, b);
  return x < y ? -1 : x > y ? 1 : 0;
};

export const mul = (a, b) => ({ n: a.n * b.n, s: a.s + b.s });

/** Divide by 10^k exactly (e.g. coverage / 1000 is div10(coverage, 3)). */
export const div10 = (a, k) => ({ n: a.n, s: a.s + k });

/** Round to `places` decimals, half away from zero (spreadsheet ROUND and
 * "round to the nearest whole cent"). */
export function round(a, places) {
  if (a.s <= places) return { n: a.n * 10n ** BigInt(places - a.s), s: places };
  const drop = 10n ** BigInt(a.s - places);
  const neg = a.n < 0n;
  const abs = neg ? -a.n : a.n;
  let q = abs / drop;
  if ((abs % drop) * 2n >= drop) q += 1n;
  return { n: neg ? -q : q, s: places };
}

/** Fixed-point string, e.g. toFixed(x, 2) === "63.89". */
export function toFixed(a, places) {
  const r = round(a, places);
  const neg = r.n < 0n;
  const digits = (neg ? -r.n : r.n).toString().padStart(places + 1, '0');
  const int = digits.slice(0, digits.length - places);
  const frac = digits.slice(digits.length - places);
  return `${neg ? '-' : ''}${int}${places ? '.' + frac : ''}`;
}

/** Whole cents as a JavaScript integer (safe for any premium). */
export const toCents = (a) => Number(round(a, 2).n);
