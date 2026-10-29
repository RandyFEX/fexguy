// Publishes the private health-question records to the search store
// (Upstash Redis), or exports them back for backup and editing. The records
// never go into this public repository: keep them in
// server/health-search/private/questions/<carrier-id>.json (git-ignored).
//
//   npm run health-search:publish -- --dry-run                validate only
//   npm run health-search:publish -- --target preview         upload for previews
//   npm run health-search:publish -- --target production      upload for the live site
//                                                             (must be the complete 88)
//   npm run health-search:publish -- --export --target preview   download to private/
//
// Needs KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL /
// _TOKEN) in the environment, e.g. from `vercel env pull .env.local` then
// `node --env-file=.env.local scripts/health-search-publish.mjs ...`.
// Prints counts only: never question wording, never credentials.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPayload, payloadToFiles } from '../server/health-search/publish.js';
import { checkPayload, questionsKey } from '../server/health-search/question-store.js';
import { redisConfig, upstashStore } from '../server/health-search/stores.js';
import { config } from '../server/health-search/config.generated.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const target = opt('--target', 'preview');
if (!['preview', 'production'].includes(target)) { console.error('--target must be preview or production'); process.exit(2); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'health-search');
const dir = opt('--dir', join(root, 'private', 'questions'));
const key = questionsKey({ VERCEL_ENV: target === 'production' ? 'production' : 'preview' });
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const cfg = redisConfig(process.env);
const needStore = !flag('--dry-run');
if (needStore && !cfg) {
  console.error('No search store credentials (KV_REST_API_URL / KV_REST_API_TOKEN). Use --dry-run to validate only.');
  process.exit(2);
}
const store = cfg ? upstashStore(cfg) : null;

if (flag('--export')) {
  const raw = await store.get(key);
  if (!raw) { console.error(`Nothing published at ${key}.`); process.exit(1); }
  const payload = JSON.parse(raw);
  const files = payloadToFiles(payload);
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const p = join(dir, `${f.carrierId}.json`);
    if (existsSync(p) && !flag('--force')) { console.error(`${p} exists; add --force to overwrite.`); process.exit(1); }
    writeFileSync(p, JSON.stringify(f, null, 2) + '\n');
  }
  console.log(`Exported ${payload.questions.length} questions (${files.length} carriers, published ${payload.publishedAt}) to ${dir}.`);
  process.exit(0);
}

if (!existsSync(dir)) { console.error(`No private question folder at ${dir}.`); process.exit(1); }
const carriers = readJson(join(root, 'data', 'carriers.json'));
const concepts = readJson(join(root, 'data', 'concepts.json'));
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(join(dir, f)));
const { ok, result, payload } = buildPayload(carriers, concepts, files, target);
for (const w of result.warnings) console.warn(`warning: ${w}`);
for (const p of result.pending) console.log(`pending: ${p}`);
console.log(`counts: ${Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(', ')} (total ${result.total} of ${carriers.expectedQuestionTotal})`);
if (!ok) {
  for (const e of result.errors) console.error(`error: ${e}`);
  console.error(`Not published: ${result.errors.length} error(s).`);
  process.exit(1);
}
const check = checkPayload(payload, config);
if (!check.ok) { for (const e of check.errors) console.error(`error: ${e}`); process.exit(1); }
if (flag('--dry-run')) { console.log(`Valid. Would publish ${payload.total} questions to ${key} (complete: ${payload.complete}).`); process.exit(0); }
await store.set(key, JSON.stringify(payload));
const back = await store.get(key);
if (!back || JSON.parse(back).publishedAt !== payload.publishedAt) { console.error('Published, but the read-back did not match.'); process.exit(1); }
console.log(`Published ${payload.total} questions to ${key} (complete: ${payload.complete}). Live within ${5} minutes (function cache).`);
