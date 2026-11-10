// @ts-check
// Name check for the quote funnel's "Your Name" field, shared by the page and
// the server so a name accepted on the page is never refused by the server.
// V1.1 (Randy, November 2026; replaces the V3.7 full-name rule): any nonempty
// name, a first name alone ("Randy") or a full name ("Randy VanderVaate"):
// letters first, then letters, marks, spaces and the punctuation real names
// use (hyphen, straight or curly apostrophe, period, comma), up to 60
// characters. No second word or last name is required.

const NAME_RE = /^[\p{L}][\p{L}\p{M} .,'\u2019-]{0,59}$/u;

/** @param {unknown} raw */
export function isValidName(raw) {
  if (typeof raw !== 'string') return false;
  return NAME_RE.test(raw.trim().replace(/\s+/g, ' '));
}

/** The first word of the name (for the personalized text handoff). @param {unknown} raw */
export const firstNameOf = (raw) => (typeof raw === 'string' ? raw.trim().split(/\s+/)[0].slice(0, 40) : '');
