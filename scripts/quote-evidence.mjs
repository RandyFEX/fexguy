#!/usr/bin/env node
// Retrieves a quote lead's consent and verification evidence for a compliance
// inquiry, and records the retrieval in the access log (qe:<ns>:access).
// Every retrieval needs a reason and the name of the person retrieving it.
//
//   node --env-file=.env.local scripts/quote-evidence.mjs --lead <lead id> --by "Randy" --reason "TCPA inquiry #123"
//   node --env-file=.env.local scripts/quote-evidence.mjs --phone 2145551212 --by "Randy" --reason "..."
//   node --env-file=.env.local scripts/quote-evidence.mjs --access-log --by "Randy" --reason "audit"
//   add --target preview for preview (test) records; default production.
//
// Needs KV_REST_API_URL / KV_REST_API_TOKEN and the same QUOTE_SESSION_SECRET
// (or HEALTH_SEARCH_SECRET) as the deployment (phone lookups use its HMAC).
// Prints the evidence to the terminal only; never writes it to a file.

import { createHmac } from 'node:crypto';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { quoteStore } from '../server/quote/store.js';
import { toE164US } from '../server/quote/phone.js';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const by = opt('--by');
const reason = opt('--reason');
const target = opt('--target') ?? 'production';
if (!by || !reason) { console.error('--by and --reason are required (they go into the access log).'); process.exit(2); }
const cfg = redisConfig(process.env);
if (!cfg) { console.error('No store credentials (KV_REST_API_URL / KV_REST_API_TOKEN).'); process.exit(2); }
const env = { ...process.env, VERCEL_ENV: target === 'production' ? 'production' : 'preview' };
const store = quoteStore(upstashStore(cfg), env);

let ids = [];
if (opt('--lead')) ids = [opt('--lead')];
else if (opt('--phone')) {
  const phone = toE164US(opt('--phone'));
  const secret = env.QUOTE_SESSION_SECRET || env.HEALTH_SEARCH_SECRET || '';
  if (!phone || secret.length < 32) { console.error('Need a valid US number and the deployment secret.'); process.exit(2); }
  ids = await store.leadsForPhone(createHmac('sha256', secret).update(`phone:${phone}`).digest('hex').slice(0, 32));
} else if (!args.includes('--access-log')) { console.error('Use --lead, --phone or --access-log.'); process.exit(2); }

await store.logAccess({ at: new Date().toISOString(), by, reason, what: args.includes('--access-log') ? 'access-log' : { leads: ids } });
if (args.includes('--access-log')) console.log(JSON.stringify(await store.accessLog(), null, 2));
for (const id of ids) {
  const record = await store.getLead(id);
  console.log(JSON.stringify({ record, events: record ? await store.events(id) : [] }, null, 2));
}
if (!ids.length && !args.includes('--access-log')) console.log('No records found.');
