// @ts-check
// Full name check for the quote funnel (V3.7, Randy, November 2026), shared
// by the page and the server so a name accepted on the page is never refused
// by the server. A meaningful full name: letters first, then letters, marks,
// spaces and the punctuation real names use (hyphen, straight or curly
// apostrophe, period, comma), up to 60 characters, with at least two words
// (first and last name; suffixes such as Jr., Sr. or III are welcome as more
// words) and at least one word of two or more letters.

const NAME_RE = /^[\p{L}][\p{L}\p{M} .,'\u2019-]{0,59}$/u;

/** @param {unknown} raw */
export function isFullName(raw) {
  if (typeof raw !== 'string') return false;
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(s)) return false;
  const words = s.split(' ').filter((w) => /\p{L}/u.test(w));
  return words.length >= 2 && words.some((w) => (w.match(/\p{L}/gu) ?? []).length >= 2);
}

/** The first word of a full name (for the personalized text handoff). @param {unknown} raw */
export const firstNameOf = (raw) => (typeof raw === 'string' ? raw.trim().split(/\s+/)[0].slice(0, 40) : '');
