// @ts-check
// POST /api/impact-calculator/ (PREVIEW, Randy's V5.6 assignment; not
// approved for production). Monthly premiums for one applicant profile, for
// the Financial Impact Calculator.
//
// Same safeguards as the price explorer (server/rates/public-pricing.js):
// - Same-site browser requests only (Origin check); JSON body of at most
//   256 bytes with exactly age, coverage, gender and tobacco.
// - Per-IP limits in Redis (HMAC of the IP; burst and daily), because each
//   answer reveals prices and unlimited queries could rebuild a table.
// - Returns monthly premiums keyed by opaque codes only (FF-102, FF-103,
//   FF-201, CP-GA). Never tables, annual rates, fees, factors or product ids.
// - Texas reference pricing.
// Colonial Penn is priced from its unit price and the verified coverage per
// unit (src/data/colonial-penn-units.json); the rate-engine products are also
// priced at Colonial Penn's exact coverage so the comparison matches.

import { createHmac } from 'node:crypto';
import { allowedOrigin, LIMIT_SCRIPT } from '../rates/public-pricing.js';
import { ATTRIBUTION_CODES, REFERENCE_STATE } from '../rates/pricing-categories.js';
import { colonialPennUnits } from '../../src/lib/impact/calc.js';
import { AGES, VERIFIED_PRODUCTS } from '../../src/lib/impact/products.js';
import cpUnits from '../../src/data/colonial-penn-units.json' with { type: 'json' };

const MAX_BODY = 256;
export const IMPACT_LIMITS = { burst: 60, burstWindowMs: 10 * 60 * 1000, daily: 300, dailyWindowMs: 24 * 60 * 60 * 1000 };
const COVERAGE = { min: 5000, max: 25000 };
const ENGINE_IDS = Object.fromEntries(Object.entries(ATTRIBUTION_CODES).map(([id, code]) => [code, id]));

/** @param {number} status @param {Record<string, unknown>} body @param {Record<string, string>} [headers] */
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

/** @param {Request} request */
function clientIp(request) {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-vercel-forwarded-for') || h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

/** Exactly age, coverage, gender, tobacco, in range. @param {any} b */
export function parseImpactInput(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (Object.keys(b).sort().join(',') !== 'age,coverage,gender,tobacco') return null;
  const { age, gender, tobacco, coverage } = b;
  if (!Number.isInteger(age) || age < AGES.min || age > AGES.max) return null;
  if (gender !== 'male' && gender !== 'female') return null;
  if (typeof tobacco !== 'boolean') return null;
  if (!Number.isInteger(coverage) || coverage < COVERAGE.min || coverage > COVERAGE.max || coverage % 1000 !== 0) return null;
  return { age, gender, tobacco, coverage };
}

/**
 * Prices every verified product for one profile. Pure apart from the engine.
 * @param {{ quote(input: any): any } | null} engine @param {{ age: number, gender: 'male' | 'female', tobacco: boolean, coverage: number }} input
 */
export function priceProfile(engine, input) {
  const cpRow = /** @type {any} */ (cpUnits)[input.gender]?.find((/** @type {any} */ r) => r.age === input.age) ?? null;
  const cp = cpRow ? colonialPennUnits(cpRow, input.coverage) : null;
  /** @param {string} code @param {number} coverage */
  const enginePremium = (code, coverage) => {
    if (!engine) return null;
    const p = VERIFIED_PRODUCTS.find((x) => x.code === code);
    const r = engine.quote({ productId: ENGINE_IDS[code], age: input.age, gender: input.gender, tobacco: p?.tobacco ? input.tobacco : false, coverage, state: REFERENCE_STATE });
    return r?.ok ? Number(r.monthlyPremium) : null;
  };
  const products = VERIFIED_PRODUCTS.map((p) => {
    const outOfAge = input.age < p.ages.min || input.age > p.ages.max;
    if (p.pricing === 'units') {
      if (outOfAge || !cp) return { code: p.code, available: false, reason: `Issue ages ${p.ages.min} to ${p.ages.max}` };
      if (cp.overMax) return { code: p.code, available: false, reason: `Needs ${cp.units} units; the maximum is 25` };
      return { code: p.code, available: true, coverage: cp.coverage, premium: cp.premium, units: cp.units, perUnit: cpRow.perUnit };
    }
    if (outOfAge) return { code: p.code, available: false, reason: `Issue ages ${p.ages.min} to ${p.ages.max}` };
    const premium = enginePremium(p.code, input.coverage);
    if (premium === null) return { code: p.code, available: false, reason: 'Price not available' };
    const atCp = cp && !cp.overMax && cp.coverage !== input.coverage ? enginePremium(p.code, cp.coverage) : null;
    return { code: p.code, available: true, coverage: input.coverage, premium, ...(atCp !== null ? { atColonialPennCoverage: { coverage: cp?.coverage, premium: atCp } } : {}) };
  });
  return products;
}

/**
 * @param {Request} request @param {Record<string, string | undefined>} env
 * @param {{ store: { eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> } | null, getEngine?: () => Promise<{ engine: any, publishedAt: string } | null>, now?: () => number }} deps
 */
export async function handleImpact(request, env, deps) {
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' }, { Allow: 'POST' });
  if (!allowedOrigin(request.headers.get('origin'), env)) return json(403, { status: 'forbidden' });
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { status: 'bad-request' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json(413, { status: 'bad-request' });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { status: 'bad-request' });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { status: 'bad-request' }); }
  const input = parseImpactInput(body);
  if (!input) return json(400, { status: 'bad-request', message: `Choose an age from ${AGES.min} to ${AGES.max} and coverage from $5,000 to $25,000.` });

  const secret = env.PRICE_EXPLORER_SECRET || env.HEALTH_SEARCH_SECRET || '';
  if (!deps.store || secret.length < 32) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  const now = (deps.now ?? Date.now)();
  const ipKey = createHmac('sha256', secret).update(`imp-ip:${clientIp(request)}`).digest('hex').slice(0, 32);
  let allowed = 0;
  try {
    allowed = Number(await deps.store.eval(LIMIT_SCRIPT, [
      `imp:b:${ipKey}:${Math.floor(now / IMPACT_LIMITS.burstWindowMs)}`,
      `imp:d:${ipKey}:${Math.floor(now / IMPACT_LIMITS.dailyWindowMs)}`,
    ], [IMPACT_LIMITS.burst, IMPACT_LIMITS.burstWindowMs, IMPACT_LIMITS.daily, IMPACT_LIMITS.dailyWindowMs]));
  } catch {
    return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  }
  if (allowed !== 1) return json(429, { status: 'rate-limited', message: 'Too many comparisons from this network. Please try again later.' }, { 'Retry-After': '600' });

  const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
  if (!loaded) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
  return json(200, { status: 'ok', state: REFERENCE_STATE, ratesPublishedAt: loaded.publishedAt, inputs: input, products: priceProfile(loaded.engine, input) });
}
