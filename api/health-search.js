// Vercel Function: POST /api/health-search/ (health-question search).
// The site stays fully static; this is its only server endpoint.
//
// The question records are NOT in this repository (it is public) or in the
// site: they are published to the private search store with
// `npm run health-search:publish` and loaded here, re-validated and cached.
// Production serves only the complete, validated 88-question set; previews
// fall back to clearly labeled fictional sample data until records exist.
//
// Server-side environment variables (Vercel project settings, never PUBLIC_):
//   HEALTH_SEARCH_SECRET      32+ random characters (HMAC key)
//   KV_REST_API_URL / KV_REST_API_TOKEN
//     (Vercel Marketplace: Upstash for Redis; or UPSTASH_REDIS_REST_URL / _TOKEN)

import { handleSearch } from '../server/health-search/handler.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { loadDataset } from '../server/health-search/question-store.js';
import { config } from '../server/health-search/config.generated.js';
import { sampleDataset } from '../server/health-search/sample-dataset.js';

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;

export async function POST(request) {
  let dataset = null;
  if (store) {
    try {
      dataset = await loadDataset(store, process.env, config, sampleDataset);
    } catch {
      dataset = null; // store unreachable: the handler answers 503
    }
  }
  return handleSearch(request, process.env, { store, dataset });
}

export async function GET(request) {
  return handleSearch(request, process.env, { store, dataset: null });
}
