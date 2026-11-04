// @ts-check
// Verified-session tokens for the quote funnel. Issued only by the server
// after Twilio (or Preview test mode) approves the code; carried in an
// HttpOnly, Secure, SameSite=Strict cookie the page's scripts can't read.
// A token is valid only when its HMAC signature checks, it hasn't expired,
// its session record still exists in the store (so a token can't be forged,
// replayed after expiry, or reused for another lead) AND the request carries
// the same visit id the session was verified for (Quote System v2.7).
//
// Visit-scoped sessions (v2.7): the page keeps a random visit id in
// sessionStorage (one per browser tab, gone when the tab closes) and sends it
// as the x-quote-visit header. The server stores only its hash in the
// session record and requires a match on every use, so a new tab or a new
// visit is never verified by an earlier visit's cookie.
//
// 12-hour quote access (Randy, November 2026): the visit id is kept in
// localStorage and the cookie carries Max-Age, so on the same browser the
// unlocked quote stays available, across closing and reopening it, for
// SESSION_MS (12 hours) after the original unlock. The cookie, its signed
// expiry and the server record are all set once, at the unlock, and never
// renewed, so refreshing or returning never restarts the clock. After that
// the visitor completes the quote again; lead records are kept.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'ff_qs';
export const SESSION_MS = 12 * 60 * 60 * 1000;
export const VISIT_HEADER = 'x-quote-visit';
const VISIT_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** The request's visit id, or null. @param {Request | { headers: Headers }} request */
export const visitOf = (request) => {
  const v = request.headers.get(VISIT_HEADER) ?? '';
  return VISIT_RE.test(v) ? v : null;
};
/** Only a hash of the visit id is stored. @param {string} visit */
export const visitHash = (visit) => createHash('sha256').update(`ff-quote-visit:${visit}`).digest('hex');

/** The signing key: QUOTE_SESSION_SECRET, else HEALTH_SEARCH_SECRET (domain-separated). @param {Record<string, string | undefined>} env */
export function sessionKey(env) {
  const base = env.QUOTE_SESSION_SECRET || env.HEALTH_SEARCH_SECRET || '';
  return base.length >= 32 ? createHmac('sha256', base).update('ff-quote-session-v1').digest() : null;
}

const b64 = (/** @type {Buffer | string} */ b) => Buffer.from(b).toString('base64url');

/** @param {Buffer} key @param {{ sid: string, lid: string, exp: number }} claims */
export function sign(key, claims) {
  const body = b64(JSON.stringify({ v: 1, ...claims }));
  return `${body}.${b64(createHmac('sha256', key).update(body).digest())}`;
}

/** @param {Buffer} key @param {string | null | undefined} token @param {number} now */
export function unsign(key, token, now) {
  if (!token || token.length > 512) return null;
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined) return null;
  const want = createHmac('sha256', key).update(body).digest();
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (c.v !== 1 || typeof c.sid !== 'string' || typeof c.lid !== 'string' || typeof c.exp !== 'number' || c.exp <= now) return null;
    return /** @type {{ sid: string, lid: string, exp: number }} */ (c);
  } catch {
    return null;
  }
}

export const newSid = () => randomBytes(18).toString('base64url');

/** @param {Request} request */
export function readCookie(request) {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [name, ...v] = part.trim().split('=');
    if (name === COOKIE) return v.join('=');
  }
  return null;
}

/** The session cookie: it lasts until the session's fixed expiry (SESSION_MS after the unlock). @param {string} token */
export const setCookie = (token) => `${COOKIE}=${token}; Path=/api/; Max-Age=${Math.floor(SESSION_MS / 1000)}; HttpOnly; Secure; SameSite=Strict`;
export const clearCookie = () => `${COOKIE}=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

/**
 * The verified lead for this request, or null.
 * @param {Request} request @param {Record<string, string | undefined>} env
 * @param {{ getSession(sid: string): Promise<any> }} store
 */
export async function verifiedLead(request, env, store, now = Date.now()) {
  const key = sessionKey(env);
  if (!key) return null;
  const claims = unsign(key, readCookie(request), now);
  if (!claims) return null;
  const s = await store.getSession(claims.sid);
  if (!s || s.lid !== claims.lid) return null;
  const visit = visitOf(request);
  if (!visit || !s.visit || s.visit !== visitHash(visit)) return null;
  return { leadId: claims.lid, sid: claims.sid, exp: claims.exp };
}
