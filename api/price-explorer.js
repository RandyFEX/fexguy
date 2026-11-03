// Vercel Function: POST /api/price-explorer/ (Pricing Explorer v1.0), the
// public, same-site, rate-limited endpoint behind
// /final-expense-insurance-prices/. It returns the three category prices
// only; see server/rates/public-pricing.js. It never uses or exposes
// RATE_ENGINE_API_KEY: it reads the private tables from the store directly.
//
// Server-side environment variables: KV_REST_API_URL / KV_REST_API_TOKEN
// (the store the Health Question Search uses) and HEALTH_SEARCH_SECRET (or
// PRICE_EXPLORER_SECRET) to hash IPs for the rate limits.

import { handlePriceExplorer } from '../server/rates/public-pricing.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;
const getEngine = store ? () => loadRateEngine(store, process.env) : undefined;

export async function POST(request) {
  return handlePriceExplorer(request, process.env, { store, getEngine });
}

export async function GET(request) {
  return handlePriceExplorer(request, process.env, { store: null });
}
