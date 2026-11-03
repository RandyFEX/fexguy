// Vercel Function: POST /api/price-explorer/ (Pricing Explorer v1.0, gated by
// phone verification since Quote System v2.2). Same-site, rate-limited; it
// returns the three category prices only, and only for a verified session
// (server/quote/session.js). It never uses or exposes RATE_ENGINE_API_KEY.
//
// Server-side environment variables: KV_REST_API_URL / KV_REST_API_TOKEN
// (the store the Health Question Search uses) and HEALTH_SEARCH_SECRET (or
// PRICE_EXPLORER_SECRET / QUOTE_SESSION_SECRET).

import { handlePriceExplorer } from '../server/rates/public-pricing.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { quoteStore } from '../server/quote/store.js';
import { verifiedLead } from '../server/quote/session.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;
const quotes = store ? quoteStore(store, process.env) : null;
const getEngine = store ? () => loadRateEngine(store, process.env) : undefined;
// Returns the verified lead id (or false); repricing updates that lead's current quote.
const isVerified = async (request) => (quotes ? (await verifiedLead(request, process.env, quotes))?.leadId ?? false : false);
const onPriced = async (leadId, input) => {
  const record = await quotes.getLead(leadId);
  if (record) await quotes.putLead(leadId, { ...record, lastQuote: input, lastQuoteAt: new Date().toISOString() });
};

export async function POST(request) {
  return handlePriceExplorer(request, process.env, { store, getEngine, isVerified, onPriced });
}

export async function GET(request) {
  return handlePriceExplorer(request, process.env, { store: null });
}
