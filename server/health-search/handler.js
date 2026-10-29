// @ts-check
// Request handling for POST /api/health-search/. Pure function of
// (request, env, deps) so it can be tested without the Vercel runtime.
//
// Privacy: the search text is never logged or stored. The quota store keeps
// only HMACs (keyed with HEALTH_SEARCH_SECRET) of the visitor cookie, the IP
// and the normalized query, and every key expires within 24 hours.

import { createHmac, randomBytes } from 'node:crypto';
import { normalize } from './normalize.js';
import { search, prepare, LIMITS } from './search.js';
import { runQuota, QUOTA } from './quota.js';

export const COOKIE = 'ff_hqs';
const COOKIE_RE = /^[A-Za-z0-9_-]{22}$/;
const QUERY_RE = /^[\p{L}\p{N}\s'’.,()&/+-]+$/u;
const MAX_BODY = 2048;

/** @typedef {{ store: import('./quota.js').QuotaStore | null, dataset: import('./search.js').Dataset | null, now?: () => number }} Deps */

/** Origins allowed to call the API (same-site browser requests only). @param {string | null} origin @param {Record<string, string | undefined>} env */
function allowedOrigin(origin, env) {
  if (!origin) return false;
  if (origin === 'https://funeralfunds.com' || origin === 'https://www.funeralfunds.com') return true;
  const extra = (env.HEALTH_SEARCH_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  // Vercel preview deployments of this project (never in production).
  if (env.VERCEL_ENV !== 'production' && /^https:\/\/fexguy-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (env.VERCEL_ENV === undefined && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

/** @param {number} status @param {Record<string, unknown>} body @param {Record<string, string>} [headers] */
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

/** @param {string} header */
function readCookie(header) {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

/** @param {Request} request */
function clientIp(request) {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-vercel-forwarded-for') || h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

const prepared = new WeakMap();
/** @param {import('./search.js').Dataset} d */
function prepFor(d) {
  if (!prepared.has(d)) prepared.set(d, prepare(d));
  return prepared.get(d);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {Deps} deps
 */
export async function handleSearch(request, env, deps) {
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' }, { Allow: 'POST' });
  if (!allowedOrigin(request.headers.get('origin'), env)) return json(403, { status: 'forbidden' });
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json(415, { status: 'unsupported-media-type' });
  }
  const secret = env.HEALTH_SEARCH_SECRET ?? '';
  if (!deps.store || secret.length < 32 || !deps.dataset) {
    return json(503, { status: 'unavailable', message: 'The health question search is not available right now.' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { status: 'too-large' });
  /** @type {{ q?: unknown, page?: unknown, action?: unknown }} */
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { status: 'invalid', message: 'Invalid request.' }); }
  if (!body || typeof body !== 'object') return json(400, { status: 'invalid', message: 'Invalid request.' });

  // Visitor cookie: random, HttpOnly, sent only to this API path.
  let visitorId = readCookie(request.headers.get('cookie') ?? '');
  const headers = /** @type {Record<string, string>} */ ({});
  if (!visitorId || !COOKIE_RE.test(visitorId)) {
    visitorId = randomBytes(16).toString('base64url');
    headers['Set-Cookie'] = `${COOKIE}=${visitorId}; Path=/api/health-search; Max-Age=${7 * 24 * 3600}; HttpOnly; Secure; SameSite=Strict`;
  }
  const mac = (/** @type {string} */ kind, /** @type {string} */ value) => createHmac('sha256', secret).update(`${kind}:${value}`).digest('base64url').slice(0, 32);
  const visitor = mac('visitor', visitorId);
  const ip = mac('ip', clientIp(request));
  const now = (deps.now ?? Date.now)();
  const member = `${now}:${randomBytes(6).toString('base64url')}`;
  const sample = Boolean(deps.dataset.sample);

  try {
    if (body.action === 'status') {
      const s = await runQuota(deps.store, { visitor, ip, queryFp: '-', now, mode: 'status', member });
      return json(200, { status: 'quota', remaining: s.remaining, limit: QUOTA.perVisitor, resetAt: s.resetAt, sample }, headers);
    }

    const q = typeof body.q === 'string' ? body.q.trim() : '';
    const page = body.page === undefined ? 1 : Number(body.page);
    if (!Number.isInteger(page) || page < 1 || page > LIMITS.maxPage) return json(400, { status: 'invalid', message: 'Invalid page.' }, headers);
    if (q.length < LIMITS.minQueryChars) {
      return json(400, { status: 'too-short', message: 'Please type at least 2 letters, such as "COPD" or "heart attack".' }, headers);
    }
    if (q.length > LIMITS.maxQueryChars || !QUERY_RE.test(q)) {
      return json(400, { status: 'invalid', message: `Please use letters and numbers only, up to ${LIMITS.maxQueryChars} characters.` }, headers);
    }

    const result = search(prepFor(deps.dataset), q, { page });
    if (!result.ok) {
      return json(400, { status: 'too-short', message: 'Please type a health condition, procedure or medication, such as "COPD".' }, headers);
    }
    const queryFp = mac('query', normalize(q));
    const found = (result.matchCount ?? 0) > 0;
    const quota = await runQuota(deps.store, { visitor, ip, queryFp, now, mode: found ? 'search' : 'nomatch', member });

    if (quota.code === 'ip-limited') {
      return json(429, { status: 'rate-limited', message: 'Too many searches from this network. Please try again later.', resetAt: quota.resetAt }, {
        ...headers, 'Retry-After': String(Math.max(60, Math.ceil(((quota.resetAt ?? now + 3600000) - now) / 1000))),
      });
    }
    if (quota.code === 'exhausted') {
      return json(429, { status: 'exhausted', remaining: 0, limit: QUOTA.perVisitor, resetAt: quota.resetAt, sample }, headers);
    }
    return json(200, {
      status: 'ok',
      counted: quota.code === 'ok',
      remaining: quota.remaining,
      limit: QUOTA.perVisitor,
      resetAt: quota.resetAt,
      ...result,
    }, headers);
  } catch {
    // Store unreachable: refuse rather than search without enforcement.
    return json(503, { status: 'unavailable', message: 'The health question search is not available right now.' }, headers);
  }
}
