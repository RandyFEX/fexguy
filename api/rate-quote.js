// Vercel Function: POST /api/rate-quote/ (Rate Engine V2.1, server-to-server).
//
// The rate tables are NOT in this repository (it is public) or in the site:
// they are published to the private store with `npm run rates:publish` and
// loaded here, re-validated and cached. Only calculated premiums are
// returned; see server/rates/handler.js.
//
// Server-side environment variables (Vercel project settings, never PUBLIC_):
//   RATE_ENGINE_API_KEY   32+ random characters; without it the endpoint is off (404)
//   KV_REST_API_URL / KV_REST_API_TOKEN (the store the Health Question Search uses)

import { handleRateQuote } from '../server/rates/handler.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;

// The store is read only after the request passes every check in the handler.
const getEngine = store ? () => loadRateEngine(store, process.env) : undefined;

export async function POST(request) {
  return handleRateQuote(request, process.env, { getEngine });
}

export async function GET(request) {
  return handleRateQuote(request, process.env, {});
}
