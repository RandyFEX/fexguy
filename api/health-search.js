// Vercel Function: POST /api/health-search/ (health-question search).
// The site stays fully static; this is its only server endpoint. The private
// dataset is bundled into this function only (never into dist/ or public/).
//
// Server-side environment variables (Vercel project settings, never PUBLIC_):
//   HEALTH_SEARCH_SECRET      32+ random characters (HMAC key)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//     (or KV_REST_API_URL / KV_REST_API_TOKEN from Vercel's Redis integration)

import { handleSearch } from '../server/health-search/handler.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { dataset as realDataset } from '../server/health-search/dataset.generated.js';
import { sampleDataset } from '../server/health-search/sample-dataset.js';

function selectDataset(env) {
  const production = env.VERCEL_ENV === 'production';
  // Production serves only the complete, validated 88-question dataset.
  if (production) return realDataset.status === 'complete' ? realDataset : null;
  if (realDataset.questions.length > 0) return realDataset;
  // Until the real questions are loaded: fictional sample data on previews
  // and local runs only.
  return sampleDataset;
}

const cfg = redisConfig(process.env);
const store = cfg ? upstashStore(cfg) : null;

export async function POST(request) {
  return handleSearch(request, process.env, { store, dataset: selectDataset(process.env) });
}

export async function GET(request) {
  return handleSearch(request, process.env, { store, dataset: null });
}
