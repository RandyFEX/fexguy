// Private question storage: publish to a real local Redis, load in the
// function (validation, production completeness, cache, fallback), and the
// guarantee that this public repository holds no question records.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startRedis } from './redis-test-server.js';
import { buildPayload, payloadToFiles } from '../../server/health-search/publish.js';
import { loadDataset, checkPayload, clearCache, questionsKey, CACHE_MS } from '../../server/health-search/question-store.js';
import { config } from '../../server/health-search/config.generated.js';
import { sampleDataset } from '../../server/health-search/sample-dataset.js';
import { handleSearch } from '../../server/health-search/handler.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../server/health-search/data/${p}`, import.meta.url), 'utf8'));
const carriers = read('carriers.json');
const concepts = read('concepts.json');

// Synthetic records with placeholder wording ("Q ..."): not carrier wording.
function synthetic() {
  const q = (c, section, number, extra = {}) => ({ id: `${c}-${section}-${number}`, section, number, text: `Q ${section} ${number} heart attack`, yes: { classification: 'decline', explanation: 'x' }, ...extra });
  const files = [];
  for (const c of ['family-benefit-life', 'trinity-life']) files.push({ carrierId: c, status: 'complete', source: 't', questions: Array.from({ length: 14 }, (_, i) => q(c, 'Q', `${i + 1}`, { sharedKey: `k${i}` })) });
  files.push({ carrierId: 'guarantee-trust-life', status: 'complete', source: 't', questions: Array.from({ length: 6 }, (_, i) => q('gtl', 'Q', `${i + 1}`)) });
  files.push({ carrierId: 'cica-life', status: 'complete', source: 't', questions: Array.from({ length: 10 }, (_, i) => q('cica', 'Q', `${i + 1}`, { variant: i < 5 ? 'D-1' : 'D-2' })) });
  for (const c of ['aetna', 'aflac']) {
    const qs = [];
    for (const [s, n] of [['Part A', 13], ['Part B', 5], ['Part C', 4]]) for (let i = 1; i <= n; i++) {
      const is3A = s === 'Part A' && i === 3;
      qs.push(q(c, s, is3A ? '3A' : `${i}`, { sharedKey: `${s}${i}`, text: is3A ? `Q with ${c === 'aflac' ? 'Aflac' : 'Aetna'}` : `Q ${s} ${i}` }));
    }
    files.push({ carrierId: c, status: 'complete', source: 't', questions: qs });
  }
  return files;
}

let redis;
before(async () => { redis = await startRedis(); });
after(() => redis.stop());
beforeEach(() => clearCache());

test('publish builds a valid 88-question payload; production refuses an incomplete one', () => {
  const full = buildPayload(carriers, concepts, synthetic(), 'production');
  assert.equal(full.ok, true);
  assert.equal(full.payload.total, 88);
  assert.equal(full.payload.complete, true);
  const partial = synthetic().slice(0, 3);
  assert.equal(buildPayload(carriers, concepts, partial, 'production').ok, false);
  const preview = buildPayload(carriers, concepts, partial, 'preview');
  assert.equal(preview.ok, true);
  assert.equal(preview.payload.complete, false);
});

test('export splits a payload back into per-carrier files that publish identically', () => {
  const { payload } = buildPayload(carriers, concepts, synthetic(), 'production');
  const again = buildPayload(carriers, concepts, payloadToFiles(payload), 'production');
  assert.deepEqual(again.payload.questions, payload.questions);
});

test('production loads only a complete, valid payload from the store', async () => {
  const env = { VERCEL_ENV: 'production' };
  assert.equal(questionsKey(env), 'hqs:questions:production');
  assert.equal(await loadDataset(redis.store, env, config, sampleDataset, 1), null, 'nothing published: no data, no sample');
  clearCache();
  const partial = buildPayload(carriers, concepts, synthetic().slice(0, 3), 'preview').payload;
  await redis.store.set('hqs:questions:production', JSON.stringify(partial));
  assert.equal(await loadDataset(redis.store, env, config, sampleDataset, 2), null, 'incomplete refused in production');
  clearCache();
  const full = buildPayload(carriers, concepts, synthetic(), 'production').payload;
  await redis.store.set('hqs:questions:production', JSON.stringify(full));
  const ds = await loadDataset(redis.store, env, config, sampleDataset, 3);
  assert.equal(ds.questions.length, 88);
  assert.equal(ds.carriers.find((c) => c.id === 'cica-life').name, 'CICA Life Insurance');
});

test('a tampered or malformed payload is refused', async () => {
  const env = { VERCEL_ENV: 'production' };
  const full = buildPayload(carriers, concepts, synthetic(), 'production').payload;
  const bad = { ...full, questions: full.questions.map((q) => (q.carrierId === 'aflac' && q.number === '3A' ? { ...q, text: 'Q with Aetna' } : q)) };
  assert.equal(checkPayload(bad, config).ok, false);
  await redis.store.set('hqs:questions:production', JSON.stringify(bad));
  assert.equal(await loadDataset(redis.store, env, config, sampleDataset, 10), null);
  clearCache();
  await redis.store.set('hqs:questions:production', 'not json');
  await assert.rejects(loadDataset(redis.store, env, config, sampleDataset, 11));
});

test('previews use published records when present, else the labeled sample', async () => {
  const env = { VERCEL_ENV: 'preview' };
  assert.equal(await loadDataset(redis.store, env, config, sampleDataset, 20), sampleDataset);
  clearCache();
  const partial = buildPayload(carriers, concepts, synthetic().slice(0, 3), 'preview').payload;
  await redis.store.set('hqs:questions:preview', JSON.stringify(partial));
  const ds = await loadDataset(redis.store, env, config, sampleDataset, 21);
  assert.equal(ds.questions.length, partial.questions.length);
});

test('the function caches the records and keeps the last good copy if the store fails', async () => {
  const env = { VERCEL_ENV: 'production' };
  await redis.store.set('hqs:questions:production', JSON.stringify(buildPayload(carriers, concepts, synthetic(), 'production').payload));
  let gets = 0;
  const counting = { get: (k) => { gets++; return redis.store.get(k); } };
  await loadDataset(counting, env, config, sampleDataset, 100);
  await loadDataset(counting, env, config, sampleDataset, 100 + CACHE_MS - 1);
  assert.equal(gets, 1, 'served from cache within the window');
  const failing = { get: async () => { throw new Error('down'); } };
  const stale = await loadDataset(failing, env, config, sampleDataset, 100 + CACHE_MS + 1);
  assert.equal(stale.questions.length, 88);
});

test('search results come from the stored records and expose no internal fields', async () => {
  const full = buildPayload(carriers, concepts, synthetic().map((f) => ({ ...f, questions: f.questions.map((q) => ({ ...q, search: { direct: ['stroke'], related: [] } })) })), 'production').payload;
  await redis.store.set('hqs:questions:production', JSON.stringify(full));
  const ds = await loadDataset(redis.store, { VERCEL_ENV: 'production' }, config, sampleDataset, 200);
  const req = new Request('https://funeralfunds.com/api/health-search/', { method: 'POST', headers: { origin: 'https://funeralfunds.com', 'content-type': 'application/json', 'x-real-ip': '192.0.2.9' }, body: JSON.stringify({ q: 'heart attack' }) });
  const res = await handleSearch(req, { HEALTH_SEARCH_SECRET: 's'.repeat(40), VERCEL_ENV: 'production' }, { store: redis.store, dataset: ds });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.matchCount > 0 && body.matchCount <= 40, 'capped');
  const shown = body.groups.reduce((s, g) => s + g.questions.length, 0);
  assert.ok(shown < 88, 'one page, never the whole set');
  const text = JSON.stringify(body);
  for (const field of ['"search"', '"id"', '"sharedKey"', '"source"', '"carrierId"']) assert.ok(!text.includes(field), field);
  assert.equal(body.sample, false);
  // Three carriers per page: CICA Life Insurance (fourth in order) is named on page 2.
  const req2 = new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({ q: 'heart attack', page: 2 }) });
  const page2 = await (await handleSearch(req2, { HEALTH_SEARCH_SECRET: 's'.repeat(40), VERCEL_ENV: 'production' }, { store: redis.store, dataset: ds })).json();
  assert.ok(page2.groups.some((g) => g.carrier === 'CICA Life Insurance'), JSON.stringify(page2.groups.map((g) => g.carrier)));
});

test('this public repository holds no question records', () => {
  const tracked = execFileSync('git', ['ls-files', 'server/health-search'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(!tracked.some((f) => /\/(questions|private)\//.test(f)), tracked.join(', '));
  assert.ok(readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8').includes('server/health-search/private/'));
  const generated = readFileSync(new URL('../../server/health-search/config.generated.js', import.meta.url), 'utf8');
  assert.ok(!/"questions"\s*:/.test(generated), 'generated config has no questions');
});
