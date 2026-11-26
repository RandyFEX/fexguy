// @ts-check
// Owner test mode for the quote funnel (Randy, November 2026, V1.1).
//
// https://funeralfunds.com/test/ (api/test.js) asks for the server-only
// password FUNNEL_TEST_PASSWORD (12+ characters; without it /test/ answers 404
// and test mode can never switch on). A correct password sets two cookies:
//
//   ff_tm     HttpOnly, signed (HMAC with a key derived from the password and
//             the quote session secret), with its own expiry. It is the ONLY
//             thing that switches the server into test mode. Changing the
//             password signs every browser out.
//   ff_tm_ui  "1", readable by the page. It switches GA4 and Meta off in that
//             browser (src/scripts/tracking.ts) and makes the funnel send the
//             x-owner-test header. It grants nothing by itself.
//
// The quote and pricing APIs (api/quote.js, api/price-explorer.js) call
// ownerTestState() on every request:
//   'valid'    a valid ff_tm cookie: the request runs in test mode against the
//              separate 'owner-test' store (no production lead record, no
//              Agent CRM, no conversion, no submission limits)
//   'invalid'  the page asked for test mode (x-owner-test header) but the
//              signed cookie is missing, expired or no longer valid: the
//              request is refused, so a test never falls back to a real lead
//   'none'     an ordinary visitor: unchanged production behavior
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TEST_COOKIE = 'ff_tm';
export const TEST_UI_COOKIE = 'ff_tm_ui';
export const TEST_HEADER = 'x-owner-test';
export const TEST_DAYS = 30;
/** Test leads and sessions live in their own namespace (never 'production' or 'preview'). */
export const TEST_NAMESPACE = 'owner-test';
/** Test lead records expire on their own after 30 days. */
export const TEST_LEAD_TTL_MS = TEST_DAYS * 24 * 60 * 60 * 1000;

/** The test password, or null when it isn't configured (test mode off). @param {Record<string, string | undefined>} env */
export function testPassword(env) {
  const p = env.FUNNEL_TEST_PASSWORD ?? '';
  return p.length >= 12 ? p : null;
}

/** @param {string} password @param {Record<string, string | undefined>} env */
const signingKey = (password, env) =>
  createHmac('sha256', createHash('sha256').update(`ff-owner-test-v1:${password}`).digest())
    .update(env.QUOTE_SESSION_SECRET || env.HEALTH_SEARCH_SECRET || '')
    .digest();
/** @param {string} password @param {Record<string, string | undefined>} env @param {string} exp */
const mac = (password, env, exp) => createHmac('sha256', signingKey(password, env)).update(`owner-test:${exp}`).digest('hex');

/** True when the given password matches (constant time). @param {unknown} given @param {Record<string, string | undefined>} env */
export function passwordMatches(given, env) {
  const p = testPassword(env);
  if (!p || typeof given !== 'string' || given.length > 200) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(p).digest();
  return timingSafeEqual(a, b);
}

/** The Set-Cookie values that sign this browser in. @param {Record<string, string | undefined>} env @param {number} nowMs */
export function loginCookies(env, nowMs) {
  const p = testPassword(env);
  if (!p) return [];
  const maxAge = TEST_DAYS * 86400;
  const exp = String(Math.floor(nowMs / 1000) + maxAge);
  return [
    `${TEST_COOKIE}=${exp}.${mac(p, env, exp)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    `${TEST_UI_COOKIE}=1; Max-Age=${maxAge}; Path=/; Secure; SameSite=Lax`,
  ];
}

/** The Set-Cookie values that sign this browser out. */
export const logoutCookies = () => [
  `${TEST_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  `${TEST_UI_COOKIE}=; Max-Age=0; Path=/; Secure; SameSite=Lax`,
];

/** @param {Request} request @param {string} name */
function cookie(request, name) {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** Whether the request carries a valid, unexpired owner test cookie. @param {Request} request @param {Record<string, string | undefined>} env @param {number} nowMs */
export function signedIn(request, env, nowMs) {
  const p = testPassword(env);
  if (!p) return false;
  const m = /^(\d{9,12})\.([a-f0-9]{64})$/.exec(cookie(request, TEST_COOKIE) ?? '');
  if (!m || Number(m[1]) * 1000 <= nowMs) return false;
  return timingSafeEqual(Buffer.from(m[2], 'hex'), Buffer.from(mac(p, env, m[1]), 'hex'));
}

/**
 * The request's test-mode state (see the file header).
 * @param {Request} request @param {Record<string, string | undefined>} env @param {number} nowMs
 * @returns {'valid' | 'invalid' | 'none'}
 */
export function ownerTestState(request, env, nowMs) {
  if (signedIn(request, env, nowMs)) return 'valid';
  return request.headers.get(TEST_HEADER) ? 'invalid' : 'none';
}

export const TEST_SESSION_ENDED = 'Your test session has ended. Sign in again at /test/.';
