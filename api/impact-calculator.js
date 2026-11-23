// Vercel Function: POST /api/impact-calculator/ (PREVIEW, Randy's V5.6
// assignment; not approved for production). Monthly premiums for one profile,
// same-site and rate-limited; see server/impact/handler.js. It never uses or
// exposes RATE_ENGINE_API_KEY.

import { handleImpact } from '../server/impact/handler.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;
const getEngine = store ? () => loadRateEngine(store, process.env) : undefined;

export async function POST(request) {
  return handleImpact(request, process.env, { store, getEngine });
}

export async function GET(request) {
  return handleImpact(request, process.env, { store: null });
}
