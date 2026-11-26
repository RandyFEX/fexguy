// Owner test mode (/test/, V1.1): only a valid signed cookie switches the
// quote funnel to test mode; test submissions never reach Agent CRM, never
// create a production lead record or a conversion, and skip the submission
// limits; a page that asks for test mode without a valid cookie is refused;
// ordinary production visitors are unchanged. Throwaway local redis-server and
// a fake Agent CRM API: no real request is ever made.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from '../health-search/redis-test-server.js';
import { createEngine, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { handleQuote, SUBMIT_LIMITS } from '../../server/quote/handler.js';
import { quoteStore } from '../../server/quote/store.js';
import { verifiedLead } from '../../server/quote/session.js';
import { CONSENT_VERSION } from '../../server/quote/consent.js';
import { handlePriceExplorer } from '../../server/rates/public-pricing.js';
import { TEST_LEAD_TTL_MS, TEST_NAMESPACE, loginCookies, ownerTestState } from '../../server/quote/owner-test.js';
import { handleTestPage } from '../../server/quote/test-page.js';

let redis;
before(async () => { redis = await startRedis(); });
after(() => redis?.stop());

function fakeEngine() {
  const ds = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const records = [];
    for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
      for (const gender of ['male', 'female'])
        for (const tobacco of p.tobaccoClasses)
          records.push({ issueAge: age, gender, tobacco, annualRatePer1000: (age + 0.41 + (tobacco === 'tobacco' ? 7 : 0)).toFixed(2), sourcePage: 1 });
    ds[id] = { productId: id, extractedAt: 't', sourceSha256: 't', records };
    if (p.printedPremiums)
      ds[id].printedPremiums = records.flatMap((r) => p.printedPremiums.coverage.map((coverage) => ({ issueAge: r.issueAge, gender: r.gender, coverage, sourcePage: 1, monthlyPremium: toFixed(monthlyPremium({ coverage, annualRatePer1000: r.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2) })));
  }
  return createEngine(ds);
}
const engine = fakeEngine();
const SECRET = 'q'.repeat(48);
const PASSWORD = 'correct horse battery staple';
const PROD = { VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET, HEALTH_SEARCH_SECRET: SECRET, AGENT_CRM_TOKEN: 'pit-test-token', AGENT_CRM_LOCATION_ID: 'loc123', FUNNEL_TEST_PASSWORD: PASSWORD };
const ORIGIN = 'https://funeralfunds.com';
let n = 0;

function fakeCrm() {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(String(url));
    if (String(url).endsWith('/contacts/upsert')) return Response.json({ new: true, contact: { id: 'c1' } });
    return Response.json({ ok: true }, { status: 201 });
  };
  return { calls, fetchImpl };
}

/** A browser: `testCookies` = the cookies set at /test/ sign-in; `header` = the page asks for test mode. */
function browser(env, { testCookies = '', header = false } = {}) {
  const crm = fakeCrm();
  const visit = `visit${String(++n).padStart(14, '0')}`;
  const ip = `10.9.0.${n}`;
  let session = '';
  const store = quoteStore(redis.store, env);
  const testStore = quoteStore(redis.store, env, { ns: TEST_NAMESPACE, leadTtlMs: TEST_LEAD_TTL_MS });
  const headers = () => ({ 'content-type': 'application/json', origin: ORIGIN, 'x-real-ip': ip, 'x-quote-visit': visit, ...(header ? { 'x-owner-test': '1' } : {}), cookie: [session, testCookies].filter(Boolean).join('; ') });
  const call = async (body) => {
    const res = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: headers(), body: JSON.stringify(body) }), env, { store, testStore, getEngine: async () => ({ engine }), fetchImpl: crm.fetchImpl });
    const set = res.headers.get('set-cookie');
    if (set) session = set.split(';')[0];
    return { http: res.status, body: await res.json() };
  };
  // The same store choice api/price-explorer.js makes.
  const price = async () => {
    const req = new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: headers(), body: JSON.stringify({ age: 65, gender: 'male', tobacco: false, coverage: 10000 }) });
    const owner = ownerTestState(req, env, Date.now());
    if (owner === 'invalid') return { http: 403 };
    const q = owner === 'valid' ? testStore : store;
    const res = await handlePriceExplorer(req, env, { store: redis.store, getEngine: async () => ({ engine }), isVerified: async (r) => (await verifiedLead(r, env, q))?.leadId ?? false, unlimited: () => owner === 'valid' });
    return { http: res.status, body: await res.json() };
  };
  const start = (phone = '2148675309') => call({ action: 'start', firstName: 'Owner Check', phone, state: 'Texas', quote: { age: 65, gender: 'male', tobacco: false, coverage: 10000 }, consentVersion: CONSENT_VERSION, funnel: 'get-rates' });
  return { call, price, start, crm, store, testStore };
}

const signIn = (env = PROD) => loginCookies(env, Date.now()).map((c) => c.split(';')[0]).join('; ');
const leadKeys = async (ns) => (await redis.command(['KEYS', `qe:${ns}:lead:*`])) ?? [];

test('a signed-in owner runs the real production funnel in test mode: rates shown, no Agent CRM, no conversion, no production lead record', async () => {
  const before = (await leadKeys('production')).length;
  const b = browser(PROD, { testCookies: signIn(), header: true });
  const r = await b.start();
  assert.equal(r.http, 200);
  assert.equal(r.body.status, 'verified');
  assert.equal(r.body.testMode, true);
  assert.equal(r.body.leadConversion, false);
  assert.deepEqual(b.crm.calls, [], 'nothing sent to Agent CRM');
  assert.equal((await leadKeys('production')).length, before, 'no production lead record');
  const rec = await b.testStore.getLead(r.body.lead);
  assert.equal(rec.mode, 'test');
  assert.equal(rec.ownerTest, true);
  const ttl = Number(await redis.command(['PTTL', `qe:${TEST_NAMESPACE}:lead:${r.body.lead}`]));
  assert.ok(ttl > 0 && ttl <= TEST_LEAD_TTL_MS, 'test records expire on their own');
  const p = await b.price();
  assert.equal(p.http, 200);
  assert.equal(p.body.categories.length, 3, 'the actual rate calculation');
  assert.equal((await b.call({ action: 'session' })).body.testMode, true);
  assert.equal((await b.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 65, gender: 'male', tobacco: false, coverage: 10000 } })).body.testMode, true);
  assert.equal((await b.call({ action: 'end-session' })).body.status, 'ended');
  assert.deepEqual(b.crm.calls, []);
});

test('owner test mode has no submission limits (unlimited repeat runs)', async () => {
  const b = browser(PROD, { testCookies: signIn(), header: true });
  for (let i = 0; i < SUBMIT_LIMITS.phoneDay + SUBMIT_LIMITS.ipHour + 2; i++) assert.equal((await b.start()).http, 200);
  assert.deepEqual(b.crm.calls, []);
});

test('fail safe: a page asking for test mode without a valid signed cookie is refused, never sent as a lead', async () => {
  for (const testCookies of ['', 'ff_tm_ui=1', 'ff_tm=9999999999.' + 'a'.repeat(64), signIn({ ...PROD, FUNNEL_TEST_PASSWORD: 'an old password value' })]) {
    const b = browser(PROD, { testCookies, header: true });
    const r = await b.start();
    assert.equal(r.http, 403, testCookies);
    assert.equal(r.body.status, 'test-session-ended');
    assert.deepEqual(b.crm.calls, []);
    assert.equal((await b.price()).http, 403);
  }
});

test('an expired test cookie never switches test mode on', async () => {
  const old = loginCookies(PROD, Date.now() - 31 * 24 * 3600 * 1000).map((c) => c.split(';')[0]).join('; ');
  const req = new Request('https://x.test/', { headers: { cookie: old } });
  assert.equal(ownerTestState(req, PROD, Date.now()), 'none');
});

test('unauthenticated visitors cannot switch test mode on: ordinary production behavior (Agent CRM delivery, limits) is unchanged', async () => {
  // The ui cookie alone, or a forged signed cookie, without the header: an ordinary visitor.
  for (const testCookies of ['ff_tm_ui=1', 'ff_tm=9999999999.' + 'b'.repeat(64)]) {
    const b = browser(PROD, { testCookies });
    const r = await b.start(`21486753${String(10 + n).slice(-2)}`);
    assert.equal(r.http, 200);
    assert.equal(r.body.testMode, false);
    assert.ok(b.crm.calls.some((u) => u.endsWith('/contacts/upsert')), 'delivered to Agent CRM as usual');
    assert.equal((await b.store.getLead(r.body.lead)).mode, 'direct');
  }
  // Without FUNNEL_TEST_PASSWORD, even a correctly signed cookie is ignored.
  const env = { ...PROD, FUNNEL_TEST_PASSWORD: '' };
  const cookie = signIn(PROD);
  assert.equal(ownerTestState(new Request('https://x.test/', { headers: { cookie } }), env, Date.now()), 'none');
});

test('/test/: 404 without a password; wrong password refused; right password signs in (HttpOnly signed cookie + ui cookie); same-site only; sign out; attempt limit', async () => {
  const get = (env, cookie = '') => handleTestPage(new Request('https://funeralfunds.com/test/', { headers: cookie ? { cookie } : {} }), env);
  const post = (env, body, origin = ORIGIN, deps = {}) =>
    handleTestPage(new Request('https://funeralfunds.com/test/', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded', 'x-real-ip': '10.8.0.1' }, body }), env, deps);
  assert.equal((await get({ ...PROD, FUNNEL_TEST_PASSWORD: '' })).status, 404);
  assert.equal((await get({ ...PROD, FUNNEL_TEST_PASSWORD: 'short' })).status, 404, 'passwords under 12 characters are refused');
  const login = await get(PROD);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(await login.text(), /type="password"/);
  assert.equal((await post(PROD, 'password=wrong')).status, 401);
  assert.equal((await post(PROD, `password=${encodeURIComponent(PASSWORD)}`, 'https://evil.example')).status, 403);
  const ok = await post(PROD, `password=${encodeURIComponent(PASSWORD)}`);
  assert.equal(ok.status, 303);
  const cookies = ok.headers.getSetCookie();
  assert.ok(cookies.some((c) => /^ff_tm=\d+\.[a-f0-9]{64};.*HttpOnly; Secure/.test(c)));
  assert.ok(cookies.some((c) => /^ff_tm_ui=1;/.test(c) && !/HttpOnly/.test(c)));
  const hub = await get(PROD, cookies.map((c) => c.split(';')[0]).join('; '));
  const html = await hub.text();
  assert.match(html, /href="\/get-rates\/"/);
  assert.match(html, /href="\/free-quote\/"/);
  const out = await post(PROD, 'action=logout');
  assert.ok(out.headers.getSetCookie().every((c) => /Max-Age=0/.test(c)));
  const store = quoteStore(redis.store, PROD, { ns: TEST_NAMESPACE });
  const limit = async (key, max, windowMs) => (await store.limit([{ key, limit: max, windowMs }])) > 0;
  let last;
  for (let i = 0; i < 11; i++) last = await post(PROD, 'password=wrong', ORIGIN, { limit });
  assert.equal(last.status, 429);
});
