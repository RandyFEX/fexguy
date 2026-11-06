// @ts-check
// Prepare My Text (Randy, November 2026, texting handoff V4.0): the prewritten
// text and the native SMS link for /facebook/. Plain JavaScript so the page
// and the unit tests (tests/quote/quote.test.js) use the same code. Nothing
// here sends a message: the link only opens the visitor's own messaging app,
// and the visitor reviews the text and presses Send.

/** $15,000; $60 (whole dollars) or $61.69. @param {number | string} value */
export function dollars(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `$${n.toLocaleString('en-US', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The first word of the name the visitor gave (the funnel's "Your Name"). @param {unknown} name */
export const firstNameOf = (name) => (typeof name === 'string' ? name.trim().split(/\s+/)[0] ?? '' : '').slice(0, 40);

/**
 * Randy's approved message (V4.0):
 * "Hi, this is [First Name]. I have a few questions about my [Coverage Amount]
 * final expense insurance quote for [Monthly Premium]/month."
 * @param {{ firstName?: string | null, coverage: number, monthlyPremium: number | string }} q
 */
export function prewrittenText({ firstName, coverage, monthlyPremium }) {
  const first = firstNameOf(firstName);
  const cov = dollars(coverage);
  const prem = dollars(monthlyPremium);
  if (!cov || !prem) return '';
  return `${first ? `Hi, this is ${first}.` : 'Hi.'} I have a few questions about my ${cov} final expense insurance quote for ${prem}/month.`;
}

/** iPhone, iPad (including iPadOS's desktop user agent) and iPod. @param {{ userAgent: string, platform?: string, maxTouchPoints?: number }} nav */
export const isIOS = (nav) => /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1);

/**
 * Phones and tablets (iPhone, iPad, Android, other "Mobi" browsers) get the
 * sms: link; everything else is treated as a computer (device-aware handoff
 * V1.4, restored for the result cards in V4.16).
 * @param {{ userAgent: string, platform?: string, maxTouchPoints?: number }} nav
 */
export const isMobileDevice = (nav) => isIOS(nav) || /Android|Mobi/i.test(nav.userAgent);

/**
 * The native SMS link. iOS (8+) reads the body after "&"; Android and other
 * platforms read the RFC 5724 query "?body=". Returns '' without a valid
 * 10-digit US number.
 * @param {string | null | undefined} number @param {string} body @param {boolean} ios
 */
export function smsHref(number, body, ios) {
  const digits = String(number ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!/^[2-9]\d{9}$/.test(digits)) return '';
  const to = `+1${digits}`;
  const b = encodeURIComponent(body);
  return ios ? `sms:${to}&body=${b}` : `sms:${to}?body=${b}`;
}

/**
 * The computer option's QR code text (two-option handoff V1.9): the SMSTO form that iPhone and Android camera apps
 * open as a new text to the number with the message filled in. '' without a
 * valid 10-digit US number.
 * @param {string | null | undefined} number @param {string} body
 */
export function qrPayload(number, body) {
  const digits = String(number ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!/^[2-9]\d{9}$/.test(digits) || !body) return '';
  return `SMSTO:+1${digits}:${body}`;
}
