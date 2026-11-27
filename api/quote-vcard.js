// Vercel Function: GET /api/quote-vcard/?t=<token>, the personalized quote
// vCard (SAVE QUOTE & CONTACT INFO; server/quote/vcard.js). One-time token,
// only for the browser whose quote session made it. Owner test mode (/test/
// cookie): the owner-test store, never Agent CRM.
//
// Server-side environment variables: KV_REST_API_URL / KV_REST_API_TOKEN,
// QUOTE_SESSION_SECRET (or HEALTH_SEARCH_SECRET), AGENT_CRM_TOKEN and
// AGENT_CRM_LOCATION_ID (production), FUNNEL_TEST_PASSWORD (optional).
import { handleVcardDownload } from '../server/quote/vcard.js';
import { quoteStore } from '../server/quote/store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { TEST_LEAD_TTL_MS, TEST_NAMESPACE, ownerTestState } from '../server/quote/owner-test.js';

const cfg = redisConfig(process.env);
const raw = cfg ? upstashStore(cfg) : null;
const store = raw ? quoteStore(raw, process.env) : null;
const testStore = raw ? quoteStore(raw, process.env, { ns: TEST_NAMESPACE, leadTtlMs: TEST_LEAD_TTL_MS }) : null;

export async function GET(request) {
  const owner = ownerTestState(request, process.env, Date.now());
  return handleVcardDownload(request, process.env, { store: owner === 'valid' ? testStore : store });
}
