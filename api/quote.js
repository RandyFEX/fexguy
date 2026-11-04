// Vercel Function: POST /api/quote/ (Quote System v2.2): phone verification
// (Twilio Verify), verified sessions, consent/verification evidence and
// Apply Now records for /free-quote/. See
// server/quote/handler.js.
//
// Server-side environment variables:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (or TWILIO_API_KEY_SID +
//   TWILIO_API_KEY_SECRET), TWILIO_VERIFY_SERVICE_SID   real SMS codes
//     (without them: clearly marked test mode on previews; in production the
//     temporary public test code 123456 (v5.3), never recorded as SMS-verified)
//   KV_REST_API_URL / KV_REST_API_TOKEN                  evidence and sessions
//   QUOTE_SESSION_SECRET (or HEALTH_SEARCH_SECRET)       session signing, hashing
//   QUOTE_SMS_DAILY_LIMIT (optional, default 300)        global daily SMS cap
//   AGENT_CRM_TOKEN, AGENT_CRM_LOCATION_ID (optional)    Agent CRM contacts (GoHighLevel API)

import { handleQuote } from '../server/quote/handler.js';
import { quoteStore } from '../server/quote/store.js';
import { loadRateEngine } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';

const cfg = redisConfig(process.env);
const raw = cfg ? upstashStore(cfg) : null;
const store = raw ? quoteStore(raw, process.env) : null;
const getEngine = raw ? () => loadRateEngine(raw, process.env) : undefined;

export async function POST(request) {
  return handleQuote(request, process.env, { store, raw, getEngine });
}

export async function GET(request) {
  return handleQuote(request, process.env, { store: null });
}
