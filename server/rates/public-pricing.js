// @ts-check
// Request handling for POST /api/price-explorer/ (Pricing Explorer v1.0): the
// narrowly scoped public endpoint behind /free-quote/.
//
// - Same-site browser requests only (Origin check), JSON body of at most
//   256 bytes with exactly age, gender, tobacco and coverage.
// - Per-IP rate limits in Redis (an atomic Lua script; keys are HMACs of the
//   IP, never the IP itself): a burst limit and a daily limit. Each premium
//   reveals one price, so unlimited queries could rebuild a table: the limits
//   are part of keeping the tables private.
// - Returns the three category results only: label, status, monthly premium
//   and internal attribution ids. Never rate tables, annual rates, printed
//   premiums, fees, factors, checksums or the rate API key.
// - Texas reference pricing; ages 50-89; coverage $5,000-$25,000.

import { createHmac } from 'node:crypto';
import { AGES, COVERAGE, priceCategories } from './pricing-categories.js';

const MAX_BODY = 256;
export const LIMITS = { burst: 60, burstWindowMs: 10 * 60 * 1000, daily: 400, dailyWindowMs: 24 * 60 * 60 * 1000 };

// KEYS[1] burst counter, KEYS[2] daily counter; ARGV burst limit, burst ms, daily limit, daily ms
export const LIMIT_SCRIPT = `
local b = redis.call('INCR', KEYS[1])
if b == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
local d = redis.call('INCR', KEYS[2])
if d == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[4]) end
if b > tonumber(ARGV[1]) or d > tonumber(ARGV[3]) then return 0 end
return 1
`;

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

/** @param {string | null} origin @param {Record<string, string | undefined>} env */
export function allowedOrigin(origin, env) {
  if (!origin) return false;
  if (origin === 'https://funeralfunds.com' || origin === 'https://www.funeralfunds.com') return true;
  if (env.VERCEL_ENV !== 'production' && /^https:\/\/fexguy-[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (env.VERCEL_ENV === undefined && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

/** @param {Request} request */
function clientIp(request) {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-vercel-forwarded-for') || h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

/** Validates the body: exactly the four fields, in range. @param {any} b */
export function parseInput(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const keys = Object.keys(b).sort().join(',');
  if (keys !== 'age,coverage,gender,tobacco') return null;
  const { age, gender, tobacco, coverage } = b;
  if (!Number.isInteger(age) || age < AGES.min || age > AGES.max) return null;
  if (gender !== 'male' && gender !== 'female') return null;
  if (typeof tobacco !== 'boolean') return null;
  if (!Number.isInteger(coverage) || coverage < COVERAGE.min || coverage > COVERAGE.max) return null;
  return { age, gender, tobacco, coverage };
}

/**
 * @typedef {{ eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> }} LimitStore
 * @typedef {{ store: LimitStore | null, getEngine?: () => Promise<{ engine: any, publishedAt: string } | null>, isVerified?: (request: Request) => Promise<unknown>, onPriced?: (verified: unknown, input: any) => Promise<unknown>, now?: () => number }} Deps
 * @param {Request} request @param {Record<string, string | undefined>} env @param {Deps} deps
 */
export async function handlePriceExplorer(request, env, deps) {
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' }, { Allow: 'POST' });
  if (!allowedOrigin(request.headers.get('origin'), env)) return json(403, { status: 'forbidden' });
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { status: 'bad-request' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json(413, { status: 'bad-request' });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { status: 'bad-request' });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { status: 'bad-request' }); }
  const input = parseInput(body);
  if (!input) return json(400, { status: 'bad-request', message: `Choose an age from ${AGES.min} to ${AGES.max} and coverage from $5,000 to $25,000.` });

  // Quote System v2.2: prices only for a phone-verified session (server-checked
  // cookie, see server/quote/session.js). No session check configured = no prices.
  const verified = deps.isVerified ? await deps.isVerified(request).catch(() => false) : false;
  if (!verified) return json(401, { status: 'verify-required', message: 'Please verify your phone number to see prices.' });

  const secret = env.PRICE_EXPLORER_SECRET || env.HEALTH_SEARCH_SECRET || '';
  if (!deps.store || secret.length < 32) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  const now = (deps.now ?? Date.now)();
  const ipKey = createHmac('sha256', secret).update(`px-ip:${clientIp(request)}`).digest('hex').slice(0, 32);
  let allowed = 0;
  try {
    allowed = Number(await deps.store.eval(LIMIT_SCRIPT, [
      `px:b:${ipKey}:${Math.floor(now / LIMITS.burstWindowMs)}`,
      `px:d:${ipKey}:${Math.floor(now / LIMITS.dailyWindowMs)}`,
    ], [LIMITS.burst, LIMITS.burstWindowMs, LIMITS.daily, LIMITS.dailyWindowMs]));
  } catch {
    return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  }
  if (allowed !== 1) return json(429, { status: 'rate-limited', message: 'Too many price checks from this network. Please try again later.' }, { 'Retry-After': '600' });

  const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
  if (!loaded) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  const categories = priceCategories(loaded.engine, input);
  // Keep the verified lead's current quote selections up to date (best effort).
  if (deps.onPriced) await deps.onPriced(verified, input).catch(() => {});
  return json(200, { status: 'ok', state: 'TX', inputs: input, categories });
}
