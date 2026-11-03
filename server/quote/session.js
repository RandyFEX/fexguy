// @ts-check
// Verified-session tokens for the quote funnel. Issued only by the server
// after Twilio (or Preview test mode) approves the code; carried in an
// HttpOnly, Secure, SameSite=Strict cookie the page's scripts can't read.
// A token is valid only when its HMAC signature checks, it hasn't expired AND
// its session record still exists in the store (so a token can't be forged,
// replayed after expiry, or reused for another lead).

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'ff_qs';
export const SESSION_MS = 24 * 60 * 60 * 1000;

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

/** @param {string} token @param {number} maxAgeMs */
export const setCookie = (token, maxAgeMs) =>
  `${COOKIE}=${token}; Path=/api/; Max-Age=${Math.floor(maxAgeMs / 1000)}; HttpOnly; Secure; SameSite=Strict`;
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
  return { leadId: claims.lid, sid: claims.sid, exp: claims.exp };
}
