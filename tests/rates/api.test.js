// The private rate store and the key-protected rate API, with an in-memory
// store standing in for Upstash Redis. Uses made-up rates (always) and the
// real private tables when they exist locally (skipped in CI).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, loadDatasets, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { buildRatePayload, clearRateCache, loadRateEngine, ratesKey, CACHE_MS } from '../../server/rates/rate-store.js';
import { handleRateQuote } from '../../server/rates/handler.js';

const KEY = 'k'.repeat(40);
const ENV = { RATE_ENGINE_API_KEY: KEY, VERCEL_ENV: 'preview' };

function fake(id) {
  const p = PRODUCTS[id];
  const records = [];
  for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
    for (const gender of ['male', 'female'])
      for (const tobacco of p.tobaccoClasses)
        records.push({ issueAge: age, gender, tobacco, annualRatePer1000: (age + (gender === 'male' ? 0.37 : 0.53) + (tobacco === 'tobacco' ? 9 : 0)).toFixed(2), sourcePage: 1 });
  const ds = { fexguyRateData: true, productId: id, extractedAt: 'test', sourceSha256: 'f'.repeat(64), records };
  if (p.printedPremiums)
    ds.printedPremiums = records.flatMap((r) => p.printedPremiums.coverage.map((coverage) => ({
      issueAge: r.issueAge, gender: r.gender, coverage, sourcePage: 1,
      monthlyPremium: toFixed(monthlyPremium({ coverage, annualRatePer1000: r.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2),
    })));
  return ds;
}
const fakeAll = () => Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, fake(id)]));

function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  const reads = [];
  return { data, reads, get: async (k) => { reads.push(k); return data.get(k) ?? null; }, set: async (k, v) => { data.set(k, v); } };
}

const req = (body, { key = KEY, method = 'POST', type = 'application/json' } = {}) =>
  new Request('https://example.test/api/rate-quote/', {
    method,
    headers: { ...(key ? { 'x-rate-engine-key': key } : {}), ...(type ? { 'content-type': type } : {}) },
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
const call = async (r, env = ENV, deps) => { const res = await handleRateQuote(r, env, deps); return { http: res.status, headers: res.headers, body: await res.json() }; };

beforeEach(() => clearRateCache());

test('rates use their own keys, never the Health Question Search keys', () => {
  assert.equal(ratesKey({ VERCEL_ENV: 'production' }), 'rates:v1:production');
  assert.equal(ratesKey({ VERCEL_ENV: 'preview' }), 'rates:v1:preview');
  assert.equal(ratesKey({}), 'rates:v1:preview');
  for (const env of [{ VERCEL_ENV: 'production' }, { VERCEL_ENV: 'preview' }, {}]) assert.ok(!ratesKey(env).startsWith('hqs:'));
});

test('store: a published payload loads; previews never read the production key', async () => {
  const { ok, payload } = buildRatePayload(fakeAll(), 'preview', '2026-11-03T00:00:00.000Z');
  assert.equal(ok, true);
  const store = memoryStore({ 'rates:v1:preview': JSON.stringify(payload), 'hqs:questions:preview': 'untouched' });
  const loaded = await loadRateEngine(store, { VERCEL_ENV: 'preview' });
  assert.equal(loaded.publishedAt, '2026-11-03T00:00:00.000Z');
  assert.deepEqual(Object.values(loaded.engine.status()), ['loaded', 'loaded', 'loaded']);
  assert.deepEqual(store.reads, ['rates:v1:preview']);
  assert.equal(store.data.get('hqs:questions:preview'), 'untouched');
  clearRateCache();
  assert.equal(await loadRateEngine(store, { VERCEL_ENV: 'production' }), null, 'nothing published for production');
});

test('store: fails closed on missing, corrupt or invalid data; caches for 5 minutes', async () => {
  assert.equal(await loadRateEngine(memoryStore(), ENV), null);
  clearRateCache();
  assert.equal(await loadRateEngine(memoryStore({ 'rates:v1:preview': '{not json' }), ENV), null);
  clearRateCache();
  assert.equal(await loadRateEngine(memoryStore({ 'rates:v1:preview': JSON.stringify({ format: 'other', datasets: fakeAll() }) }), ENV), null);
  clearRateCache();
  // One broken table: that product is refused, the others still load.
  const all = fakeAll();
  all['gerber-guaranteed-life'].printedPremiums[0].monthlyPremium = '0.01';
  const store = memoryStore({ 'rates:v1:preview': JSON.stringify({ format: 'fexguy-rates-1', publishedAt: 'x', datasets: all }) });
  const loaded = await loadRateEngine(store, ENV, 1000);
  assert.deepEqual(loaded.engine.status(), { 'aetna-accendo-preferred': 'loaded', 'moo-living-promise-level': 'loaded', 'gerber-guaranteed-life': 'invalid' });
  await loadRateEngine(store, ENV, 1000 + CACHE_MS - 1);
  assert.equal(store.reads.length, 1, 'cached');
  await loadRateEngine(store, ENV, 1000 + CACHE_MS);
  assert.equal(store.reads.length, 2, 'refreshed after 5 minutes');
  // buildRatePayload refuses to produce a publishable payload from it.
  assert.equal(buildRatePayload(all, 'preview').ok, false);
  assert.equal(buildRatePayload({ 'aetna-accendo-preferred': fake('aetna-accendo-preferred') }, 'preview').ok, false, 'all three tables are required');
});

const engineDeps = (datasets = fakeAll()) => ({ getEngine: async () => ({ engine: createEngine(datasets), publishedAt: 'v-test' }) });

test('API is switched off without a 32+ character key, and requires the key', async () => {
  let reads = 0;
  const deps = { getEngine: async () => { reads++; return null; } };
  assert.equal((await call(req({}), {}, deps)).http, 404);
  assert.equal((await call(req({}), { RATE_ENGINE_API_KEY: 'short' }, deps)).http, 404);
  assert.equal((await call(req({}, { key: null }), ENV, deps)).http, 401);
  assert.equal((await call(req({}, { key: 'k'.repeat(39) }), ENV, deps)).http, 401);
  assert.equal((await call(req({}, { key: KEY + 'x' }), ENV, deps)).http, 401);
  assert.equal((await call(req(null, { method: 'GET' }), ENV, deps)).http, 405);
  assert.equal(reads, 0, 'the store is never read before the checks pass');
});

test('API rejects malformed, oversized and unexpected input', async () => {
  const deps = engineDeps();
  assert.equal((await call(req('{bad'), ENV, deps)).http, 400);
  assert.equal((await call(req([1, 2]), ENV, deps)).http, 400);
  assert.equal((await call(req({ age: 60, table: true }), ENV, deps)).http, 400);
  assert.equal((await call(req({ age: 60, products: ['nope'] }), ENV, deps)).http, 400);
  assert.equal((await call(req({ age: 60, products: ['gerber-guaranteed-life', 'gerber-guaranteed-life'] }), ENV, deps)).http, 400);
  assert.equal((await call(req({ age: 60, pad: 'x'.repeat(2000) }), ENV, deps)).http, 413);
  assert.equal((await call(req({ age: 60 }, { type: 'text/plain' }), ENV, deps)).http, 415);
  assert.equal((await call(req({ age: 60 }), ENV, {})).http, 503, 'no store: unavailable, never a guess');
});

test('API returns calculated premiums only: no tables, rates, printed premiums, fees or checksums', async () => {
  const { http, headers, body } = await call(req({ age: 60, gender: 'female', tobacco: true, coverage: 10000, state: 'TX' }), ENV, engineDeps());
  assert.equal(http, 200);
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.equal(body.ratesVersion, 'v-test');
  assert.deepEqual(body.results.map((r) => [r.productId, r.ok]), Object.keys(PRODUCTS).map((id) => [id, true]));
  const text = JSON.stringify(body);
  for (const banned of ['annualRatePer1000', 'records', 'printedPremiums', 'policyFee', 'modalFactor', 'sourceSha256', 'fexguyRateData', 'ffff'])
    assert.ok(!text.includes(banned), `response must not include ${banned}`);
  // Gender and tobacco classes apply: female tobacco differs from male non-tobacco (Aetna, MOO); Gerber ignores tobacco.
  const male = (await call(req({ age: 60, gender: 'male', tobacco: false, coverage: 10000, state: 'TX' }), ENV, engineDeps())).body.results;
  const maleSmoker = (await call(req({ age: 60, gender: 'male', tobacco: true, coverage: 10000, state: 'TX' }), ENV, engineDeps())).body.results;
  assert.notEqual(body.results[0].monthlyPremium, male[0].monthlyPremium);
  assert.notEqual(maleSmoker[1].monthlyPremium, male[1].monthlyPremium);
  assert.equal(maleSmoker[2].monthlyPremium, male[2].monthlyPremium);
});

test('API enforces state and coverage rules and returns unavailable results', async () => {
  const deps = engineDeps();
  const r = async (o) => (await call(req({ age: 60, gender: 'male', tobacco: false, coverage: 10000, ...o }), ENV, deps)).body.results;
  const mt = await r({ state: 'MT' });
  assert.equal(mt[2].reason, 'unavailable_in_state');
  assert.equal(mt[1].stateRule.includes('Unisex'), true);
  assert.equal((await r({ state: 'NY' }))[1].reason, 'unavailable_in_state');
  assert.equal((await r({ state: 'SD', coverage: 20000 }))[2].reason, 'coverage_out_of_range');
  assert.equal((await r({ state: 'NY', age: 78 }))[2].reason, 'age_out_of_range');
  assert.equal((await r({ state: 'WA', coverage: 3000 }))[1].reason, 'coverage_out_of_range');
  assert.equal((await r({ state: 'TX', coverage: 50000 }))[1].reason, 'coverage_out_of_range');
  assert.equal((await r({ state: 'ZZ' }))[0].reason, 'invalid_state');
  const tx = await r({ state: 'TX' });
  assert.equal(tx[0].availability.verified, false, 'Aetna state availability is flagged as unverified');
  assert.equal(tx[0].limits.verified, false);
});

const real = loadDatasets();
test('real tables through the store and API: Gerber benchmark $63.89 / $51.06', { skip: !real['gerber-guaranteed-life'] && 'private tables not present' }, async () => {
  const { ok, payload } = buildRatePayload(real, 'preview');
  assert.equal(ok, true);
  const store = memoryStore({ 'rates:v1:preview': JSON.stringify(payload) });
  const deps = { getEngine: () => loadRateEngine(store, ENV) };
  for (const [gender, expected] of [['male', '63.89'], ['female', '51.06']]) {
    const { body } = await call(req({ age: 60, gender, tobacco: false, coverage: 10000, state: 'TX', products: ['gerber-guaranteed-life'] }), ENV, deps);
    assert.equal(body.results[0].monthlyPremium, expected);
  }
});
