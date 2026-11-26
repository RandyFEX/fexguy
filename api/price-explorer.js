// Vercel Function: POST /api/price-explorer/ (Pricing Explorer v1.0, gated by
// phone verification since Quote System v2.2). Same-site, rate-limited; it
// returns the three category prices only, and only for a verified session
// (server/quote/session.js). It never uses or exposes RATE_ENGINE_API_KEY.
//
// Owner test mode (V1.1, server/quote/owner-test.js): a browser with a valid
// signed /test/ cookie is checked against the separate owner-test store and
// has no per-network price limits; a request that asks for test mode without
// a valid cookie is refused.
//
// Server-side environment variables: KV_REST_API_URL / KV_REST_API_TOKEN
// (the store the Health Question Search uses) and HEALTH_SEARCH_SECRET (or
// PRICE_EXPLORER_SECRET / QUOTE_SESSION_SECRET); FUNNEL_TEST_PASSWORD (owner
// test mode; optional).

import { handlePriceExplorer } from '../server/rates/public-pricing.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { quoteStore } from '../server/quote/store.js';
import { verifiedLead } from '../server/quote/session.js';
import { TEST_LEAD_TTL_MS, TEST_NAMESPACE, TEST_SESSION_ENDED, ownerTestState } from '../server/quote/owner-test.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;
const quotes = store ? quoteStore(store, process.env) : null;
const testQuotes = store ? quoteStore(store, process.env, { ns: TEST_NAMESPACE, leadTtlMs: TEST_LEAD_TTL_MS }) : null;
const getEngine = store ? () => loadRateEngine(store, process.env) : undefined;

export async function POST(request) {
  const owner = ownerTestState(request, process.env, Date.now());
  if (owner === 'invalid') {
    return new Response(JSON.stringify({ status: 'test-session-ended', message: TEST_SESSION_ENDED }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  const q = owner === 'valid' ? testQuotes : quotes;
  // Returns the verified lead id (or false); repricing updates that lead's current quote.
  const isVerified = async (req) => (q ? (await verifiedLead(req, process.env, q))?.leadId ?? false : false);
  const onPriced = async (leadId, input) => {
    const record = await q.getLead(leadId);
    if (record) await q.putLead(leadId, { ...record, lastQuote: input, lastQuoteAt: new Date().toISOString() });
  };
  return handlePriceExplorer(request, process.env, { store, getEngine, isVerified, onPriced, unlimited: () => owner === 'valid' });
}

export async function GET(request) {
  return handlePriceExplorer(request, process.env, { store: null });
}
