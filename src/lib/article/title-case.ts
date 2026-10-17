// Table-of-contents labels (Randy, October 2026): Title Case, never ALL
// CAPS. Headings are stored in sentence case, so the label is the heading
// text with each major word's first letter raised. Nothing is ever lowered:
// a word that already has a capital (proper nouns, brand names, acronyms
// such as IUL, ADL, BS, AARP) is kept exactly as written. Text stored in
// capitals can't be converted safely (acronyms and names would be lost), so
// it needs an explicit label (src/config/toc-labels.ts).

/** Short words that stay lowercase inside a title (Chicago style). */
const MINOR = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via', 'vs', 'vs.', 'from', 'into', 'onto', 'with',
]);

// Raise a word's first letter only when it starts the word (after any opening
// quote or bracket): "1st" and "$10,000" stay as they are.
const raise = (w: string) => w.replace(/^([^\p{L}\p{N}]*)(\p{Ll})/u, (_, p: string, c: string) => p + c.toUpperCase());

/** Raise the first letter of each major word; never lowers a letter. */
export function titleCase(text: string): string {
  const tokens = text.split(/(\s+)/);
  const words = tokens.map((t, i) => (i % 2 === 0 ? t : null));
  const idx = words.map((w, i) => (w && /\p{L}/u.test(w) ? i : -1)).filter((i) => i >= 0);
  const first = idx[0];
  const last = idx[idx.length - 1];
  let afterBreak = true;
  return tokens
    .map((t, i) => {
      if (i % 2 === 1 || !/\p{L}/u.test(t)) {
        if (/[:\u2013\u2014?!]$|^[\u2013\u2014-]$/.test(t)) afterBreak = true;
        return t;
      }
      const forceCap = afterBreak || i === first || i === last;
      afterBreak = /[:?!]$/.test(t);
      if (/\p{Lu}/u.test(t)) return t; // already capitalized: keep exactly
      const core = t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.]+$/gu, '').toLowerCase();
      if (!forceCap && MINOR.has(core)) return t;
      // Hyphenated compounds: raise each part (two-year → Two-Year).
      return t
        .split('-')
        .map((part, n) => (n > 0 && MINOR.has(part.toLowerCase()) ? part : raise(part)))
        .join('-');
    })
    .join('');
}

/** Words of 3+ letters, ignoring a leading/trailing quote or bracket. */
const words = (text: string) => text.match(/[\p{L}’'.-]{3,}/gu) ?? [];

/** Mostly capitals (an ALL CAPS heading), not a label with an acronym or two. */
export function isAllCaps(text: string): boolean {
  const w = words(text).filter((x) => /\p{L}{3,}/u.test(x));
  const caps = w.filter((x) => x === x.toUpperCase());
  return caps.length >= 3 && caps.length > w.length / 2;
}
