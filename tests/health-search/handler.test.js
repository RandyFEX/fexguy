// End-to-end API behavior (handler + real local Redis + fictional sample data).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from './redis-test-server.js';
import { handleSearch, COOKIE } from '../../server/health-search/handler.js';
import { QUOTA } from '../../server/health-search/quota.js';
import { sampleDataset } from '../../server/health-search/sample-dataset.js';
import { upstashStore, redisConfig } from '../../server/health-search/stores.js';

let redis;
before(async () => { redis = await startRedis(); });
after(() => redis.stop());

const env = { HEALTH_SEARCH_SECRET: 'x'.repeat(40), VERCEL_ENV: 'preview' };
const ORIGIN = 'https://funeralfunds.com';
let ipN = 0;
const deps = () => ({ store: redis.store, dataset: sampleDataset });

function req(body, { cookie, origin = ORIGIN, method = 'POST', type = 'application/json', ip } = {}) {
  const headers = { 'content-type': type, 'x-real-ip': ip ?? `198.51.100.${++ipN % 250}` };
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  return new Request('https://funeralfunds.com/api/health-search/', { method, headers, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
}
const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0];

test('rejects non-POST, other origins, wrong content type and missing configuration', async () => {
  assert.equal((await handleSearch(req(null, { method: 'GET' }), env, deps())).status, 405);
  assert.equal((await handleSearch(req({ q: 'copd' }, { origin: 'https://example.com' }), env, deps())).status, 403);
  assert.equal((await handleSearch(req({ q: 'copd' }, { origin: null }), env, deps())).status, 403);
  assert.equal((await handleSearch(req({ q: 'copd' }, { origin: 'https://fexguy-abc123-team.vercel.app' }), { ...env, VERCEL_ENV: 'production' }, deps())).status, 403);
  assert.equal((await handleSearch(req({ q: 'copd' }, { type: 'text/plain' }), env, deps())).status, 415);
  assert.equal((await handleSearch(req({ q: 'copd' }), { ...env, HEALTH_SEARCH_SECRET: 'short' }, deps())).status, 503);
  assert.equal((await handleSearch(req({ q: 'copd' }), env, { store: null, dataset: sampleDataset })).status, 503);
  assert.equal((await handleSearch(req({ q: 'copd' }), env, { store: redis.store, dataset: null })).status, 503);
});

test('validates input without counting it', async () => {
  for (const [body, status] of [['not json', 400], [{ q: 'a' }, 400], [{ q: 'x'.repeat(61) }, 400], [{ q: '<script>' }, 400], [{ q: 'copd', page: 0 }, 400], [{ q: 'copd', page: 99 }, 400], [{ q: 'the and of' }, 400], ['{"q":"' + 'a'.repeat(3000) + '"}', 413]]) {
    assert.equal((await handleSearch(req(body), env, deps())).status, status, JSON.stringify(body).slice(0, 40));
  }
});

test('issues an HttpOnly visitor cookie and reuses it', async () => {
  const r1 = await handleSearch(req({ action: 'status' }), env, deps());
  const setCookie = r1.headers.get('set-cookie');
  assert.match(setCookie, new RegExp(`^${COOKIE}=[A-Za-z0-9_-]{22}; Path=/api/health-search;.*HttpOnly; Secure; SameSite=Strict`));
  const r2 = await handleSearch(req({ action: 'status' }, { cookie: cookieOf(r1) }), env, deps());
  assert.equal(r2.headers.get('set-cookie'), null);
  assert.equal(r1.headers.get('cache-control'), 'no-store');
  assert.equal(r1.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('the daily allowance, then exhausted; earlier results can still be reopened', async () => {
  const L = QUOTA.perVisitor;
  const first = await handleSearch(req({ action: 'status' }), env, deps());
  const cookie = cookieOf(first);
  const ip = '203.0.113.7';
  const body = async (r) => ({ ...(await r.json()), http: r.status });
  const terms = ['COPD', 'heart attack', 'insulin', 'stroke', 'oxygen', 'dialysis', 'hospice', 'ALS', 'emphysema', 'stent', 'diabetes', 'angioplasty'];
  assert.ok(terms.length > L);
  for (let i = 0; i < L; i++) {
    const r = await body(await handleSearch(req({ q: terms[i] }, { cookie, ip }), env, deps()));
    assert.equal(r.http, 200, terms[i]); assert.equal(r.counted, true, terms[i]); assert.equal(r.remaining, L - 1 - i); assert.equal(r.limit, L);
    assert.equal(r.sample, true);
    if (i === 1) {
      const none = await body(await handleSearch(req({ q: 'hip replacement' }, { cookie, ip }), env, deps()));
      assert.equal(none.http, 200); assert.equal(none.matchCount, 0); assert.equal(none.remaining, L - 2, 'no-match search is free');
    }
  }
  const d = await body(await handleSearch(req({ q: terms[L] }, { cookie, ip }), env, deps()));
  assert.equal(d.http, 429); assert.equal(d.status, 'exhausted'); assert.equal(d.remaining, 0); assert.ok(d.resetAt > Date.now());
  // Reopening an accepted search (same words, different spacing/case) is allowed and free.
  const again = await body(await handleSearch(req({ q: '  copd ' }, { cookie, ip }), env, deps()));
  assert.equal(again.http, 200); assert.equal(again.counted, false); assert.equal(again.remaining, 0);
});

test('records are loaded only after a request passes every check', async () => {
  let loads = 0;
  const lazy = () => ({ store: redis.store, getDataset: async () => { loads++; return sampleDataset; } });
  for (const r of [
    req({ q: 'copd' }, { origin: 'https://example.com' }),
    req({ q: 'copd' }, { type: 'text/plain' }),
    req('not json'),
    req({ q: '12345' }),
    req({ q: 'one two three four five six seven eight nine' }),
    req({ q: 'x'.repeat(61) }),
  ]) assert.notEqual((await handleSearch(r, env, lazy())).status, 200);
  assert.equal(loads, 0);
  assert.equal((await handleSearch(req({ q: 'copd' }), env, lazy())).status, 200);
  assert.equal(loads, 1);
});

test('one IP sending many requests of any kind is slowed down (status checks included)', async () => {
  const ip = '203.0.113.99';
  let last;
  for (let i = 0; i <= QUOTA.burstPerIp; i++) last = await handleSearch(req({ action: 'status' }, { ip }), env, deps());
  assert.equal(last.status, 429);
  assert.equal((await last.json()).status, 'rate-limited');
  assert.ok(Number(last.headers.get('retry-after')) >= 60);
});

test('stores no readable cookie, IP or search text in Redis', async () => {
  const keys = await redis.command(['KEYS', 'hqs:*']);
  assert.ok(keys.length > 0);
  const dump = JSON.stringify(keys) + JSON.stringify(await Promise.all(keys.filter((k) => k.startsWith('hqs:q:')).map((k) => redis.command(['HGETALL', k]))));
  for (const secretish of ['copd', 'COPD', 'heart', 'insulin', '203.0.113.7', '198.51.100.']) assert.ok(!dump.includes(secretish), secretish);
});

test('results contain only the matched questions, never the whole dataset', async () => {
  const r = await (await handleSearch(req({ q: 'stent' }), env, deps())).json();
  const all = sampleDataset.questions.length;
  const shown = r.groups.reduce((s, g) => s + g.questions.length, 0);
  assert.ok(shown > 0 && shown < all);
  assert.ok(!JSON.stringify(r).includes('"search"'), 'search metadata not exposed');
  assert.ok(!JSON.stringify(r).includes('"id"'), 'internal ids not exposed');
});

test('Upstash REST store sends EVAL with keys and args and reads the result', async () => {
  let seen;
  const fake = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ result: ['ok', 1, 5] }), { status: 200 }); };
  const store = upstashStore({ url: 'https://example.upstash.io', token: 't0k' }, fake);
  assert.deepEqual(await store.eval('return 1', ['k1', 'k2'], [1, 'a']), ['ok', 1, 5]);
  assert.equal(seen.url, 'https://example.upstash.io');
  assert.equal(seen.init.headers.Authorization, 'Bearer t0k');
  assert.deepEqual(JSON.parse(seen.init.body), ['EVAL', 'return 1', '2', 'k1', 'k2', '1', 'a']);
  const failing = upstashStore({ url: 'https://example.upstash.io', token: 't' }, async () => new Response(JSON.stringify({ error: 'x' }), { status: 400 }));
  await assert.rejects(failing.eval('x', [], []));
  assert.equal(redisConfig({}), null);
  assert.equal(redisConfig({ KV_REST_API_URL: 'http://insecure', KV_REST_API_TOKEN: 't' }), null);
  assert.deepEqual(redisConfig({ KV_REST_API_URL: 'https://a.upstash.io/', KV_REST_API_TOKEN: 't' }), { url: 'https://a.upstash.io', token: 't' });
});

test('store failure refuses the search (fails closed)', async () => {
  const broken = { eval: async () => { throw new Error('down'); } };
  const r = await handleSearch(req({ q: 'copd' }), env, { store: broken, dataset: sampleDataset });
  assert.equal(r.status, 503);
});
