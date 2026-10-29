// @ts-check
// Text normalization for the health-question search. Used only for matching:
// the legally meaningful application wording is never altered or displayed
// from here (it lives verbatim in the question records).

/** Words that carry no search meaning in a consumer query. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'by', 'can', 'did', 'do', 'does', 'for', 'from',
  'get', 'got', 'had', 'has', 'have', 'having', 'i', 'im', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on',
  'or', 'our', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'was', 'we', 'were', 'what', 'when',
  'which', 'who', 'will', 'with', 'you', 'your', 'about', 'if', 'am', 'so', 'some', 'there', 'past', 'ever',
  'take', 'taking', 'takes', 'use', 'using', 'used', 'diagnosed', 'treated', 'currently',
]);

/**
 * Lowercase, strip accents, turn punctuation into spaces, collapse spaces.
 * "Alzheimer's" -> "alzheimers", "A-Fib" -> "a fib", "COPD." -> "copd".
 * @param {string} text
 */
export function normalize(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Light plural/suffix folding so "stents" matches "stent". @param {string} t */
export function stem(t) {
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 4 && t.endsWith('es') && /(ch|sh|ss|x|z)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) return t.slice(0, -1);
  return t;
}

/** Normalized, stemmed tokens. @param {string} text @param {{keepStopwords?: boolean}} [opts] */
export function tokens(text, opts = {}) {
  const out = normalize(text).split(' ').filter(Boolean);
  return (opts.keepStopwords ? out : out.filter((t) => !STOPWORDS.has(t))).map(stem);
}

/** A phrase as a stemmed token string, for whole-word phrase matching. @param {string} text */
export function phraseKey(text) {
  return tokens(text, { keepStopwords: true }).join(' ');
}

/**
 * True when `phrase` occurs in `haystack` on word boundaries (both already
 * phraseKey()-normalized).
 * @param {string} haystack @param {string} phrase
 */
export function containsPhrase(haystack, phrase) {
  if (!phrase) return false;
  return (' ' + haystack + ' ').includes(' ' + phrase + ' ');
}

/** Optimal string alignment distance, capped (returns cap+1 when larger). @param {string} a @param {string} b @param {number} cap */
export function editDistance(a, b, cap = 2) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > cap) return cap + 1;
  }
  return d[a.length][b.length];
}

/** Typos allowed for a token of this length (none for short words, so "mi" never becomes "ms"). @param {number} len */
export function allowedTypos(len) {
  if (len >= 9) return 2;
  if (len >= 5) return 1;
  return 0;
}
