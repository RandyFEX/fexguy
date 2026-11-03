// @ts-check
// Request handling for POST /api/rate-quote/ (Rate Engine V2.1). Pure
// function of (request, env, deps) so it can be tested without the Vercel
// runtime.
//
// Access: server-to-server only. Every request must carry the header
// `x-rate-engine-key` equal to the RATE_ENGINE_API_KEY environment variable
// (32+ characters, compared in constant time). Without that variable the
// endpoint is switched off and answers 404. The key is never sent to a
// browser; a future quote wizard needs its own server-side caller.
//
// Output: calculated monthly premiums and their status only. Rate tables,
// annual rates, printed card premiums, fees, factors and source checksums
// are never returned.

import { createHash, timingSafeEqual } from 'node:crypto';
import { PRODUCTS } from './products.js';

const MAX_BODY = 1024;
const INPUT_KEYS = new Set(['age', 'gender', 'tobacco', 'coverage', 'state', 'products']);

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

const digest = (/** @type {string} */ s) => createHash('sha256').update(s, 'utf8').digest();

/** @param {string | null} given @param {string} expected */
function keyMatches(given, expected) {
  if (!given) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** The fields a caller may see from one engine result. @param {any} r */
function publicResult(r) {
  if (!r.ok) return { productId: r.productId ?? null, carrier: r.carrier ?? null, product: r.product ?? null, rateClass: r.rateClass ?? null, ok: false, reason: r.reason, message: r.message, ...(r.limits && { limits: r.limits }) };
  return {
    productId: r.productId,
    carrier: r.carrier,
    product: r.product,
    rateClass: r.rateClass,
    ok: true,
    monthlyPremium: r.monthlyPremium,
    monthlyPremiumCents: r.monthlyPremiumCents,
    modalMode: r.formula.modalMode,
    inputs: r.inputs,
    limits: r.limits,
    availability: r.availability,
    stateRule: r.stateRule,
    source: { form: r.source.form ?? null, effective: r.source.effective ?? null },
  };
}

/**
 * @typedef {{ getEngine?: () => Promise<{ engine: { quote: (i: any) => any }, publishedAt: string } | null> }} Deps
 * @param {Request} request @param {Record<string, string | undefined>} env @param {Deps} deps
 */
export async function handleRateQuote(request, env, deps) {
  const secret = env.RATE_ENGINE_API_KEY ?? '';
  if (secret.length < 32) return json(404, { status: 'not-found' });
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' }, { Allow: 'POST' });
  if (!keyMatches(request.headers.get('x-rate-engine-key'), secret)) return json(401, { status: 'unauthorized' });
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { status: 'bad-request', message: 'Send JSON.' });
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY) return json(413, { status: 'bad-request', message: 'Request too large.' });

  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { status: 'bad-request', message: 'Request too large.' });
  /** @type {any} */
  let input;
  try { input = JSON.parse(text); } catch { return json(400, { status: 'bad-request', message: 'Invalid JSON.' }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json(400, { status: 'bad-request', message: 'Send one applicant object.' });
  const extra = Object.keys(input).filter((k) => !INPUT_KEYS.has(k));
  if (extra.length) return json(400, { status: 'bad-request', message: `Unknown field(s): ${extra.join(', ')}.` });

  const ids = input.products ?? Object.keys(PRODUCTS);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > Object.keys(PRODUCTS).length || !ids.every((id) => typeof id === 'string' && PRODUCTS[id]) || new Set(ids).size !== ids.length)
    return json(400, { status: 'bad-request', message: 'products must list known product ids, each once.' });
  if (input.state != null && typeof input.state !== 'string') return json(400, { status: 'bad-request', message: 'state must be a two-letter code.' });

  const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
  if (!loaded) return json(503, { status: 'unavailable', message: 'Rates are not available right now.' });

  const applicant = { age: input.age, gender: input.gender, tobacco: input.tobacco, coverage: input.coverage, state: input.state ?? null };
  const results = ids.map((productId) => publicResult(loaded.engine.quote({ ...applicant, productId })));
  return json(200, { status: 'ok', ratesVersion: loaded.publishedAt, results });
}
