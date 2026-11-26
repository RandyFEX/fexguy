// Vercel Function: https://funeralfunds.com/test/ (vercel.json rewrite), the
// owner's sign-in page for testing the live quote funnels without creating
// leads. See server/quote/test-page.js and server/quote/owner-test.js.
//
// Server-side environment variables:
//   FUNNEL_TEST_PASSWORD (12+ characters)   the page's password; without it /test/ is a 404
//   QUOTE_SESSION_SECRET (or HEALTH_SEARCH_SECRET)  part of the test cookie's signing key
//   KV_REST_API_URL / KV_REST_API_TOKEN     sign-in attempt limits

import { handleTestPage } from '../server/quote/test-page.js';
import { quoteStore } from '../server/quote/store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { TEST_NAMESPACE } from '../server/quote/owner-test.js';

const cfg = redisConfig(process.env);
const raw = cfg ? upstashStore(cfg) : null;
const store = raw ? quoteStore(raw, process.env, { ns: TEST_NAMESPACE }) : null;
const limit = store ? async (key, max, windowMs) => (await store.limit([{ key, limit: max, windowMs }])) > 0 : undefined;

export async function GET(request) {
  return handleTestPage(request, process.env, { limit });
}

export async function POST(request) {
  return handleTestPage(request, process.env, { limit });
}
