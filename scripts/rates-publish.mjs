#!/usr/bin/env node
// Publishes the private rate tables (server/rates/private/*.json, git-ignored)
// to the private store (the Upstash Redis the Health Question Search uses,
// under its own rates:v1:* keys; the search's hqs:* keys are never touched).
//
//   npm run rates:publish -- --dry-run                    validate only
//   npm run rates:publish -- --target preview             upload for previews
//   npm run rates:publish -- --target production --confirm-production
//                                                         upload for the live site
//                                                         (needs Randy's approval)
//
// Needs KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL /
// _TOKEN), e.g. `vercel env pull .env.local` then
// `node --env-file=.env.local scripts/rates-publish.mjs --target preview`.
// Prints counts only: never rates, premiums or credentials.

import { loadDatasets } from '../server/rates/engine.js';
import { buildRatePayload, payloadCounts, ratesKey } from '../server/rates/rate-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const target = opt('--target', 'preview');
if (!['preview', 'production'].includes(target)) { console.error('--target must be preview or production'); process.exit(2); }
if (target === 'production' && !flag('--confirm-production') && !flag('--dry-run')) {
  console.error('Publishing rates for the live site needs --confirm-production (and Randy\'s approval).');
  process.exit(2);
}
const key = ratesKey({ VERCEL_ENV: target === 'production' ? 'production' : 'preview' });
if (!key.startsWith('rates:')) { console.error('Refusing to write outside the rates:* keys.'); process.exit(2); }

const { ok, errors, missing, payload, status } = buildRatePayload(loadDatasets(), target);
for (const [id, c] of Object.entries(payloadCounts(payload))) console.log(`${id}: ${c.rates} rates, ${c.printedPremiums} printed premiums, source ${c.sourceSha256} (${status[id]})`);
for (const id of missing) console.error(`missing: ${id} (run npm run rates:extract first)`);
for (const e of errors) console.error(`error: ${e}`);
if (!ok) { console.error('Not published.'); process.exit(1); }
if (flag('--dry-run')) { console.log(`Valid. Would publish ${Object.keys(payload.datasets).length} rate tables to ${key}.`); process.exit(0); }

const cfg = redisConfig(process.env);
if (!cfg) { console.error('No store credentials (KV_REST_API_URL / KV_REST_API_TOKEN). Use --dry-run to validate only.'); process.exit(2); }
const store = upstashStore(cfg);
await store.set(key, JSON.stringify(payload));
const back = await store.get(key);
const parsed = back ? JSON.parse(back) : null;
if (!parsed || parsed.publishedAt !== payload.publishedAt || JSON.stringify(payloadCounts(parsed)) !== JSON.stringify(payloadCounts(payload))) {
  console.error('Published, but the read-back did not match.');
  process.exit(1);
}
console.log(`Published ${Object.keys(payload.datasets).length} rate tables to ${key} (${payload.publishedAt}). Live within 5 minutes (function cache).`);
