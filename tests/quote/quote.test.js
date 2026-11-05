// Quote funnel server: the lead submission (V3.3, no SMS verification), Agent
// CRM delivery, quote sessions, the lead record and Apply Now. Uses a
// throwaway local redis-server (the real Lua scripts run) and a fake Agent CRM
// API; no SMS is ever sent and no lead is ever delivered.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from '../health-search/redis-test-server.js';
import { createEngine, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { handleQuote, SUBMIT_LIMITS } from '../../server/quote/handler.js';
import { quoteStore } from '../../server/quote/store.js';
import { COOKIE, sign, sessionKey, verifiedLead, SESSION_MS } from '../../server/quote/session.js';
import { toE164US } from '../../server/quote/phone.js';
import { CONSENT_TEXT, CONSENT_VERSION } from '../../server/quote/consent.js';
import { handlePriceExplorer } from '../../server/rates/public-pricing.js';

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
const PREVIEW = { VERCEL_ENV: 'preview', QUOTE_SESSION_SECRET: SECRET };
// Production with Agent CRM configured (the fake API below; no real request).
const PROD = { VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET, AGENT_CRM_TOKEN: 'pit-test-token', AGENT_CRM_LOCATION_ID: 'loc123' };
const PO = { origin: 'https://funeralfunds.com' };
const ORIGIN = 'https://fexguy-test-final-expense-guys-projects.vercel.app';
let ipCounter = 0;

/** A fake Agent CRM (GoHighLevel) API that records calls; `fail` makes every call fail. */
function fakeCrm({ fail = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, headers: init.headers, body: JSON.parse(init.body) });
    if (fail) return Response.json({ message: 'Unauthorized' }, { status: 401 });
    if (u.endsWith('/contacts/upsert')) return Response.json({ new: true, contact: { id: 'c123' } });
    return Response.json({ ok: true }, { status: 201 });
  };
  return { calls, fetchImpl };
}

function client(env, { fetchImpl, ip = `10.0.0.${++ipCounter}`, now, visit = `visit${String(++ipCounter).padStart(12, '0')}` } = {}) {
  let cookie = '';
  const store = quoteStore(redis.store, env);
  const deps = { store, getEngine: async () => ({ engine }), fetchImpl, now };
  const call = async (body, { origin = ORIGIN, withCookie = true } = {}) => {
    const res = await handleQuote(new Request('https://x.test/api/quote/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'x-real-ip': ip, 'user-agent': 'TestAgent/1.0', 'x-quote-visit': visit, ...(withCookie && cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }), env, deps);
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { http: res.status, body: await res.json(), setCookie: set };
  };
  const price = async (q = { age: 65, gender: 'male', tobacco: false, coverage: 10000 }, { withCookie = true, cookieValue, visitId = visit } = {}) => {
    const c = cookieValue ?? (withCookie ? cookie : '');
    const res = await handlePriceExplorer(new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-real-ip': ip, ...(visitId ? { 'x-quote-visit': visitId } : {}), ...(c ? { cookie: c } : {}) }, body: JSON.stringify(q) }),
      { ...env, HEALTH_SEARCH_SECRET: SECRET }, { store: redis.store, getEngine: async () => ({ engine }), isVerified: async (r) => Boolean(await verifiedLead(r, env, store, now ? now() : Date.now())) });
    return { http: res.status, body: await res.json() };
  };
  return { call, price, store, visit, get cookie() { return cookie; } };
}

let phoneN = 2000;
const nextPhone = () => `(214) 77${String(phoneN++).slice(-1)}-${String(1000 + phoneN).slice(-4)}`;
const startBody = (o = {}) => ({
  action: 'start', firstName: 'Mary Smith', phone: nextPhone(), state: 'Ohio', intendedUse: 'cremation', consent: true, consentVersion: CONSENT_VERSION,
  quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 },
  source: { page: '/free-quote/', utmSource: 'google', utmCampaign: 'fall' }, ...o,
});

test('phone numbers: US only, normalized to E.164; toll-free, premium, N11 and fictional rejected', () => {
  assert.equal(toE164US('(214) 555-1212'), '+12145551212');
  assert.equal(toE164US('(214) 555-0123'), null, 'fictional 555-01xx');
  assert.equal(toE164US('214-867-5309'), '+12148675309');
  assert.equal(toE164US('+1 214 867 5309'), '+12148675309');
  assert.equal(toE164US('12148675309'), '+12148675309');
  // Autofill/paste punctuation (non-breaking hyphens, invisible marks, slashes) is ignored, as on the page.
  assert.equal(toE164US('214\u2011867\u20115309'), '+12148675309');
  assert.equal(toE164US('\u202a(214) 867-5309\u202c'), '+12148675309');
  assert.equal(toE164US('214/867/5309'), '+12148675309');
  assert.equal(toE164US('214-867-5309 ext 2'), null);
  for (const bad of ['888-862-9456', '900-555-0000', '411-555-1234', '214-411-1234', '555-867-5309', '+44 20 7946 0958', '123', '', null, 'abc', '014-867-5309'])
    assert.equal(toE164US(bad), null, String(bad));
});

const prodPrice = async (cl) => {
  const res = await handlePriceExplorer(new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://funeralfunds.com', 'x-real-ip': '10.9.9.9', 'x-quote-visit': cl.visit, ...(cl.cookie ? { cookie: cl.cookie } : {}) }, body: JSON.stringify({ age: 65, gender: 'male', tobacco: false, coverage: 10000 }) }),
    { ...PROD, HEALTH_SEARCH_SECRET: SECRET }, { store: redis.store, getEngine: async () => ({ engine }), isVerified: async (r) => Boolean(await verifiedLead(r, PROD, cl.store)) });
  return res.status;
};

test('V3.3: SEE MY RATES saves the lead, delivers it to Agent CRM (upsert, tag, note) and opens the rates at once; no SMS, no code', async () => {
  const crm = fakeCrm();
  const c = client(PROD, { fetchImpl: crm.fetchImpl });
  assert.equal(await prodPrice(c), 401, 'no prices before the submission');
  const start = await c.call(startBody({ firstName: 'Mary Ann Smith', consent: true, source: { trafficSource: 'facebook / paid', utmSource: 'facebook', utmCampaign: 'launch' } }), PO);
  assert.equal(start.http, 200, JSON.stringify(start.body));
  assert.equal(start.body.status, 'verified');
  assert.equal(start.body.testMode, false);
  assert.equal(start.body.leadConversion, true, 'a delivered production lead counts once as an advertising lead');
  assert.match(start.setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await prodPrice(c)), 200, 'the rates open at once');
  assert.ok(!['masked', 'resendAfterMs', 'temporaryCodeNote'].some((k) => k in start.body), 'nothing about a code');
  assert.deepEqual(crm.calls.map((x) => x.url), ['https://services.leadconnectorhq.com/contacts/upsert', 'https://services.leadconnectorhq.com/contacts/c123/tags', 'https://services.leadconnectorhq.com/contacts/c123/notes']);
  assert.equal(crm.calls[0].headers.authorization, 'Bearer pit-test-token');
  assert.equal(crm.calls[0].headers.version, '2021-07-28');
  const rec = await c.store.getLead(start.body.lead);
  assert.deepEqual(crm.calls[0].body, { locationId: 'loc123', name: 'Mary Ann Smith', firstName: 'Mary', lastName: 'Ann Smith', phone: rec.phone, state: 'Ohio', source: 'Funeral Funds Website Quote' });
  assert.deepEqual(crm.calls[1].body, { tags: ['Funeral Funds - Website Quote'] });
  const note = crm.calls[2].body.body;
  for (const line of [`Lead ID: ${start.body.lead}`, 'Coverage requested: $10,000', 'Estimated monthly rate, ', 'Lead source: facebook / paid', 'UTM source: facebook', 'UTM campaign: launch', 'Full name: Mary Ann Smith', 'Consent to calls/texts: Yes, box checked', `Consent text: ${CONSENT_TEXT}`, `(${rec.consent.at}, ${CONSENT_VERSION})`, 'Phone verification: not verified (no SMS verification)'])
    assert.ok(note.includes(line), `note lacks ${line}:\n${note}`);
  assert.ok(!note.includes('TEST LEAD') && !note.includes('pit-test-token'));
  // The record never claims the phone was verified.
  assert.equal(rec.mode, 'direct');
  assert.deepEqual(rec.verification, { status: 'not-required', phoneVerified: false, provider: 'none', verifiedAt: null });
  assert.equal(rec.crm.delivered, true);
  assert.equal(rec.crm.contactId, 'c123');
  assert.equal('verifyNotice' in rec || 'temporaryCodeNotice' in rec, false);
  assert.deepEqual((await c.store.events(start.body.lead)).map((e) => e.type), ['contact-submitted', 'crm-delivered', 'lead-accepted']);
  // Production records stay in the production namespace, never the preview one.
  assert.equal(await quoteStore(redis.store, PREVIEW).getLead(start.body.lead), null);
  // Another visitor gets nothing from this lead.
  const other = client(PROD);
  assert.equal(await prodPrice(other), 401);
  assert.equal((await other.call({ action: 'session' }, PO)).body.status, 'not-verified');
  // A name with a suffix keeps it with the last name; the full name is sent as typed.
  const sfx = fakeCrm();
  await client(PROD, { fetchImpl: sfx.fetchImpl }).call(startBody({ firstName: 'John  Smith Jr.' }), PO);
  assert.deepEqual([sfx.calls[0].body.name, sfx.calls[0].body.firstName, sfx.calls[0].body.lastName], ['John Smith Jr.', 'John', 'Smith Jr.']);
});

test('V3.3: a failed Agent CRM delivery keeps the saved lead, reports no success (no session, no conversion), and the retry re-delivers the same lead', async () => {
  for (const fetchImpl of [fakeCrm({ fail: true }).fetchImpl, async () => { throw new TypeError('fetch failed'); }]) {
    let down = true;
    const good = fakeCrm();
    const c = client(PROD, { fetchImpl: (u, i) => (down ? fetchImpl(u, i) : good.fetchImpl(u, i)) });
    const phone = nextPhone();
    const first = await c.call(startBody({ phone }), PO);
    assert.equal(first.http, 502);
    assert.equal(first.body.status, 'delivery-failed');
    assert.match(first.body.message, /try again, or call 888-656-4648/);
    assert.equal(first.setCookie, null, 'no session');
    assert.equal(first.body.leadConversion, undefined);
    assert.equal(await prodPrice(c), 401, 'no rates without a delivered lead');
    const saved = await c.store.getLead(first.body.lead);
    assert.equal(saved.phone, toE164US(phone), 'the lead is saved, never discarded');
    assert.equal(saved.crm.delivered, false);
    assert.ok((await c.store.events(first.body.lead)).some((e) => e.type === 'crm-delivery-failed'));
    // The retry (same visit) re-sends that lead: no duplicate record.
    down = false;
    const retry = await c.call(startBody({ phone, retry: first.body.lead }), PO);
    assert.equal(retry.http, 200);
    assert.equal(retry.body.lead, first.body.lead, 'the same lead');
    assert.equal(retry.body.leadConversion, true);
    assert.equal(await prodPrice(c), 200);
    const rec = await c.store.getLead(first.body.lead);
    assert.equal(rec.crm.delivered, true);
    assert.equal(rec.attempts, 2);
    assert.deepEqual((await c.store.events(first.body.lead)).map((e) => e.type), ['contact-submitted', 'crm-delivery-failed', 'contact-resubmitted', 'crm-delivered', 'lead-accepted']);
    // A delivered lead, or another visit's lead, is never reused: a new lead.
    const again = await c.call(startBody({ retry: first.body.lead }), PO);
    assert.notEqual(again.body.lead, first.body.lead);
    const stranger = client(PROD, { fetchImpl: good.fetchImpl });
    const hijack = await stranger.call(startBody({ retry: again.body.lead }), PO);
    assert.notEqual(hijack.body.lead, again.body.lead);
  }
  // Agent CRM not configured on production: never reported as accepted.
  const none = [];
  const nc = client({ VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET }, { fetchImpl: async (u) => { none.push(u); return Response.json({}); } });
  const r = await nc.call(startBody(), PO);
  assert.equal(r.http, 502);
  assert.deepEqual(none, []);
  assert.ok((await nc.store.events(r.body.lead)).some((e) => e.type === 'crm-not-configured'));
});

test('V3.3: a lead labeled TEST is never an advertising conversion; a repeat never counts twice; previews never count or reach the CRM', async () => {
  for (const [name, counted] of [['TEST Lead Smoke', false], ['test mary', false], ['Testa Rossi', true]]) {
    const crm = fakeCrm();
    const c = client(PROD, { fetchImpl: crm.fetchImpl });
    const start = await c.call(startBody({ firstName: name }), PO);
    assert.equal(start.http, 200, name);
    assert.equal(start.body.leadConversion, counted, name);
    if (!counted) assert.ok(crm.calls[2].body.body.startsWith('TEST LEAD'), 'the CRM note says TEST');
  }
  const none = [];
  const p = client({ ...PREVIEW, AGENT_CRM_TOKEN: 't', AGENT_CRM_LOCATION_ID: 'l' }, { fetchImpl: async (u) => { none.push(u); return Response.json({}); } });
  const pr = await p.call(startBody());
  assert.equal(pr.http, 200);
  assert.equal(pr.body.testMode, true);
  assert.equal(pr.body.leadConversion, false, 'preview test mode never counts a lead');
  assert.deepEqual(none, [], 'previews never send to Agent CRM');
  assert.equal((await p.store.getLead(pr.body.lead)).mode, 'test');
});

test('V3.3: without the lead store or session key the funnel is unavailable (503, with the phone number)', async () => {
  const res = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-quote-visit': 'v'.repeat(20) }, body: JSON.stringify(startBody()) }), PREVIEW, { store: null });
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /888-656-4648/);
});

test('pricing gate: no session, forged, tampered or expired tokens get no prices', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.price(undefined, { withCookie: false })).http, 401, 'calling the pricing endpoint directly is refused');
  const key = sessionKey(PREVIEW);
  const forged = sign(Buffer.alloc(32, 7), { sid: 'x', lid: 'y', exp: Date.now() + 10000 });
  assert.equal((await c.price(undefined, { cookieValue: `${COOKIE}=${forged}` })).http, 401, 'wrong key');
  const noRecord = sign(key, { sid: 'not-in-store', lid: 'y', exp: Date.now() + 10000 });
  assert.equal((await c.price(undefined, { cookieValue: `${COOKIE}=${noRecord}` })).http, 401, 'signed but no server session');
  const ok = await c.call(startBody());
  assert.equal(ok.body.status, 'verified');
  assert.equal(ok.body.leadConversion, false, 'preview test mode never counts a lead');
  assert.match(ok.setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(ok.setCookie, /Max-Age=43200;/, '12-hour quote access from the unlock');
  assert.equal(typeof ok.body.expiresAt, 'number');
  assert.equal((await c.price()).http, 200, 'verified session gets prices');
  // Tampered payload (another lead id) fails the signature.
  const [body, mac] = c.cookie.split('=')[1].split('.');
  const claims = JSON.parse(Buffer.from(body, 'base64url'));
  const tampered = `${Buffer.from(JSON.stringify({ ...claims, lid: 'other' })).toString('base64url')}.${mac}`;
  assert.equal((await c.price(undefined, { cookieValue: `${COOKIE}=${tampered}` })).http, 401);
  // Expired (past the session lifetime).
  const later = client(PREVIEW, { now: () => Date.now() + SESSION_MS + 1000 });
  assert.equal((await later.price(undefined, { cookieValue: c.cookie })).http, 401);
});

test('12-hour quote access: fixed from the original unlock; returning never restarts the clock; then the quote starts again', async () => {
  let t = Date.now();
  const c = client(PREVIEW, { now: () => t });
  const start = await c.call(startBody());
  const ok = start;
  const unlockAt = t;
  assert.equal(ok.body.expiresAt, unlockAt + SESSION_MS);
  t = unlockAt + 6 * 3600 * 1000;
  const mid = await c.call({ action: 'session' });
  assert.equal(mid.body.status, 'verified');
  assert.equal(mid.body.expiresAt, unlockAt + SESSION_MS, 'returning does not restart the clock');
  assert.equal(mid.setCookie ?? null, null, 'no new cookie on return');
  t = unlockAt + SESSION_MS - 60 * 1000;
  assert.equal((await c.call({ action: 'session' })).body.status, 'verified', 'still open just before 12 hours');
  t = unlockAt + SESSION_MS + 1000;
  assert.equal((await c.call({ action: 'session' })).body.status, 'not-verified', 'expired after 12 hours');
  assert.ok(await c.store.getLead(start.body.lead), 'the lead record is kept');
});

test('free repricing after the submission', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  for (const q of [{ age: 55, gender: 'male', tobacco: true, coverage: 5000 }, { age: 80, gender: 'female', tobacco: false, coverage: 25000 }, { age: 89, gender: 'male', tobacco: false, coverage: 12000 }]) {
    const r = await c.price(q);
    assert.equal(r.http, 200);
    assert.equal(r.body.categories.length, 3);
  }
});

test('evidence: consent, verification, quote, source and client recorded; survives session expiry; Apply Now recorded with a server price', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const id = start.body.lead;
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.status, 'ok');
  assert.equal(apply.body.saved, true);
  // A forged price in the request is ignored: the server re-prices.
  const r = await c.store.getLead(id);
  assert.equal(r.mode, 'test');
  assert.equal(r.firstName, 'Mary Smith');
  assert.match(r.phone, /^\+1\d{10}$/);
  assert.equal(r.state, 'Ohio');
  assert.ok(r.submittedAt);
  assert.deepEqual(r.verification, { status: 'not-required', phoneVerified: false, provider: 'none', verifiedAt: null });
  assert.deepEqual([r.consent.given, r.consent.action, r.consent.version, r.consent.text], [true, 'checked consent box', CONSENT_VERSION, CONSENT_TEXT]);
  assert.equal(r.source.utmSource, 'google');
  assert.equal(r.client.userAgent, 'TestAgent/1.0');
  assert.ok(r.client.ip);
  assert.deepEqual(r.quoteAtSubmission, { age: 70, gender: 'female', tobacco: false, coverage: 10000 });
  assert.equal(r.applications[0].category, 'Guaranteed Acceptance Rate');
  assert.equal(r.applications[0].monthlyPremium, apply.body.monthlyPremium);
  const types = (await c.store.events(id)).map((e) => e.type);
  assert.deepEqual(types, ['contact-submitted', 'lead-accepted', 'apply-now']);
  // Sessions expire; evidence doesn't (no TTL on the record or events).
  assert.equal(await redis.command(['TTL', `qe:preview:lead:${id}`]), -1);
  assert.equal(await redis.command(['TTL', `qe:preview:ev:${id}`]), -1);
  const sessTtl = await redis.command(['PTTL', `qs:preview:${c.cookie ? JSON.parse(Buffer.from(c.cookie.split('=')[1].split('.')[0], 'base64url')).sid : ''}`]);
  assert.ok(sessTtl > 0 && sessTtl <= SESSION_MS);
});

test('V3.7 consent: required and affirmative; exact text and version stored; unchecked, missing, non-true or old/unknown versions refused with nothing saved', async () => {
  assert.equal(CONSENT_VERSION, 'ff-quote-consent-v4-2026-11');
  assert.equal(CONSENT_TEXT, 'By checking this box, I agree to receive calls and SMS text messages from Funeral Funds about my insurance request, according to the Privacy Policy.');
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const r = await c.store.getLead(start.body.lead);
  assert.deepEqual([r.consent.given, r.consent.version, r.consent.text], [true, CONSENT_VERSION, CONSENT_TEXT]);
  for (const o of [{ consent: false }, { consent: undefined }, { consent: 'yes' }, { consent: 1 }]) {
    const x = client(PREVIEW);
    const res = await x.call(startBody(o));
    assert.equal(res.http, 400, JSON.stringify(o));
    assert.equal(res.body.field, 'consent');
    assert.equal(res.body.message, 'Please check the box to agree to receive calls and texts before continuing.');
    assert.equal(res.setCookie, null, 'no session without consent');
  }
  for (const v of ['made-up', 'ff-quote-consent-v3-2026-11', undefined]) assert.equal((await client(PREVIEW).call(startBody({ consentVersion: v }))).http, 400, String(v));
});

test('abuse and duplicate protection: per-IP and per-phone submission limits', async () => {
  const c = client(PREVIEW, { ip: '10.9.9.9' });
  for (let i = 0; i < SUBMIT_LIMITS.ipHour; i++) assert.equal((await c.call(startBody())).http, 200);
  assert.equal((await c.call(startBody())).http, 429, 'IP hourly limit');
  const phone = '214-867-0001';
  let last;
  for (let i = 0; i <= SUBMIT_LIMITS.phoneHour; i++) last = await client(PREVIEW).call(startBody({ phone }));
  assert.equal(last.http, 429, 'phone hourly limit across IPs');
});

test('requests from other origins and bad input are refused', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.call(startBody(), { origin: 'https://evil.example' })).http, 403);
  assert.equal((await c.call(startBody({ state: 'Puerto Rico' }))).http, 400);
  assert.equal((await c.call(startBody({ firstName: '<script>' }))).http, 400);
  assert.equal((await c.call(startBody({ quote: { age: 40, gender: 'male', tobacco: false, coverage: 10000 } }))).http, 400);
  assert.equal((await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 60, gender: 'male', tobacco: false, coverage: 10000 } }, { withCookie: false })).http, 401, 'apply needs a verified session');
});

test('preview and production records never mix', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  assert.ok(await quoteStore(redis.store, PREVIEW).getLead(start.body.lead));
  assert.equal(await quoteStore(redis.store, { VERCEL_ENV: 'production' }).getLead(start.body.lead), null);
});

// ---- Quote System v2.5: Apply Now -> carrier-specific health questions ----
import { config as hqsConfig } from '../../server/health-search/config.generated.js';
import { intakePlan, INTAKE_CARRIER } from '../../server/quote/intake.js';

function fakeAetnaQuestions() {
  const concept = hqsConfig.concepts[0].id;
  const qs = [];
  for (const [sec, n, rule] of [['Part A', 13, 'part-a'], ['Part B', 5, 'part-b'], ['Part C', 4, 'part-c']])
    for (let i = 1; i <= n; i++)
      qs.push({ id: `aetna-${sec.slice(-1).toLowerCase()}${i}`, carrierId: 'aetna', section: sec, number: String(i), text: `Test ${sec} question ${i}?`, yes: { rule }, no: { classification: 'none', explanation: 'No effect.' }, search: { direct: [concept], related: [] } });
  return { format: 1, target: 'preview', publishedAt: 't', total: qs.length, complete: false, questions: qs };
}

async function verifiedClient() {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const quoteClient = { ...c, raw: redis.store };
  const call = async (body) => {
    const res = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, cookie: c.cookie, 'x-quote-visit': c.visit }, body: JSON.stringify(body) }),
      PREVIEW, { store: c.store, raw: redis.store, getEngine: async () => ({ engine }) });
    return { http: res.status, body: await res.json() };
  };
  return { ...quoteClient, lead: start.body.lead, call };
}

test('intake map: Aetna -> its 22 verified questions; Gerber guaranteed issue; Mutual of Omaha no question set', async () => {
  assert.deepEqual(INTAKE_CARRIER, { 'FF-101': 'aetna', 'FF-102': null, 'FF-201': 'gerber-life' });
  await redis.store.set('hqs:questions:preview', JSON.stringify(fakeAetnaQuestions()));
  const a = await intakePlan(redis.store, PREVIEW, 'FF-101');
  assert.equal(a.mode, 'questions');
  assert.equal(a.questions.length, 22);
  assert.deepEqual(await intakePlan(redis.store, PREVIEW, 'FF-201'), { mode: 'none', reason: 'guaranteed-issue', carrierId: 'gerber-life' });
  assert.deepEqual(await intakePlan(redis.store, PREVIEW, 'FF-102'), { mode: 'none', reason: 'no-question-set', carrierId: null });
  // Never the fictional sample: no published records = no questions.
  await redis.command(['DEL', 'hqs:questions:preview']);
  assert.equal((await intakePlan(redis.store, PREVIEW, 'FF-101')).reason, 'no-question-set');
});

test('Apply Now on Guaranteed Acceptance (Gerber): no health questions, application interest recorded', async () => {
  const c = await verifiedClient();
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.deepEqual(apply.body.intake, { mode: 'none', reason: 'guaranteed-issue' });
  const next = await c.call({ action: 'intake-next', category: 'guaranteed-acceptance' });
  assert.deepEqual([next.body.status, next.body.reason], ['done', 'guaranteed-issue']);
  const r = await c.store.getLead(c.lead);
  assert.equal(r.applications[0].attribution[0], 'FF-201');
  assert.equal(r.intakes['guaranteed-acceptance'].status, 'no-questions');
});

test('Apply Now on Lowest Preferred (Mutual of Omaha): agent-assistance continuation, nothing invented', async () => {
  const c = await verifiedClient();
  const apply = await c.call({ action: 'apply', category: 'lowest-preferred', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.status, 'ok');
  assert.deepEqual(apply.body.intake, { mode: 'none', reason: 'no-question-set' });
  assert.equal((await c.store.getLead(c.lead)).applications[0].attribution[0], 'FF-102');
  assert.equal((await c.call({ action: 'intake-next', category: 'lowest-preferred' })).body.reason, 'no-question-set');
  // Standard Rate (Aetna) is now quotable and carries its own attribution.
  const std = await c.call({ action: 'apply', category: 'average-standard', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(std.body.status, 'ok');
  assert.equal(std.body.category, 'Standard Rate');
  assert.equal((await c.store.getLead(c.lead)).applications[1].attribution[0], 'FF-101');
});

test('carrier questions one at a time; answers kept; a declining YES stops and flags without ending the lead', async () => {
  await redis.store.set('hqs:questions:preview', JSON.stringify(fakeAetnaQuestions()));
  const c = await verifiedClient();
  // An Aetna application on the lead (Aetna has the question set).
  const rec = await c.store.getLead(c.lead);
  rec.applications = [{ at: 't', categoryId: 'average-standard', category: 'Standard Rate', monthlyPremium: '1.00', quote: rec.quoteAtSubmission, attribution: ['FF-101'] }];
  await c.store.putLead(c.lead, rec);
  assert.equal((await c.call({ action: 'intake-next', category: 'guaranteed-acceptance' })).http, 409, 'no Apply Now for that category');
  let r = await c.call({ action: 'intake-next', category: 'average-standard' });
  assert.equal(r.body.question.index, 1);
  assert.equal(r.body.question.total, 22);
  assert.ok(!('yes' in r.body.question) && !('no' in r.body.question), 'no outcomes or rules sent to the browser');
  // Wrong question id is refused (answers must follow the order).
  assert.equal((await c.call({ action: 'intake-answer', category: 'average-standard', questionId: 'aetna-a5', answer: 'no' })).http, 400);
  for (let i = 1; i <= 2; i++) {
    r = await c.call({ action: 'intake-answer', category: 'average-standard', questionId: r.body.question.id, answer: 'no' });
    assert.equal(r.body.question.index, i + 1);
  }
  r = await c.call({ action: 'intake-answer', category: 'average-standard', questionId: r.body.question.id, answer: 'yes' });
  assert.deepEqual([r.body.status, r.body.reason, r.body.flag], ['done', 'stopped', 'may-not-qualify']);
  const saved = (await c.store.getLead(c.lead)).intakes['average-standard'];
  assert.deepEqual(saved.answers.map((a) => [a.questionId, a.answer, a.outcome]), [['aetna-a1', 'no', 'none'], ['aetna-a2', 'no', 'none'], ['aetna-a3', 'yes', 'decline']]);
  assert.equal(saved.answers[0].text, 'Test Part A question 1?');
  const evs = (await c.store.events(c.lead)).filter((e) => e.type === 'intake-answer');
  assert.equal(evs.length, 3);
  await redis.command(['DEL', 'hqs:questions:preview']);
});

test('repricing updates the lead\'s current quote; session restore returns it', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const q = { age: 77, gender: 'male', tobacco: true, coverage: 15000 };
  const res = await handlePriceExplorer(new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, cookie: c.cookie, 'x-quote-visit': c.visit }, body: JSON.stringify(q) }),
    { ...PREVIEW, HEALTH_SEARCH_SECRET: SECRET }, {
      store: redis.store, getEngine: async () => ({ engine }),
      isVerified: async (r) => (await verifiedLead(r, PREVIEW, c.store))?.leadId ?? false,
      onPriced: async (leadId, input) => { const rec = await c.store.getLead(leadId); await c.store.putLead(leadId, { ...rec, lastQuote: input }); },
    });
  assert.equal(res.status, 200);
  assert.deepEqual((await c.call({ action: 'session' })).body.quote, q);
});

// ---- Quote System v2.7: visit-scoped verification ----
test('a verified session works only for the visit (tab) it was verified in', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  assert.equal((await c.price()).http, 200, 'same visit');
  assert.equal((await c.price(undefined, { visitId: 'another-visit-0000001' })).http, 401, 'a new tab or visit reusing the cookie');
  assert.equal((await c.price(undefined, { visitId: null })).http, 401, 'no visit id');
  // The session action used on page load: a new visit is not verified.
  const other = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, cookie: c.cookie, 'x-quote-visit': 'another-visit-0000002' }, body: JSON.stringify({ action: 'session' }) }), PREVIEW, { store: c.store });
  assert.equal((await other.json()).status, 'not-verified');
  // Opening a session needs a visit id.
  const noVisit = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify(startBody()) }), PREVIEW, { store: c.store });
  assert.equal(noVisit.status, 400);
});

test('Start New Quote ends the session but keeps the lead, its consent record and events', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const before = await c.store.getLead(start.body.lead);
  const end = await c.call({ action: 'end-session' });
  assert.equal(end.body.status, 'ended');
  assert.match(end.setCookie, /Max-Age=0/);
  assert.equal((await c.price()).http, 401, 'prices need a new submission');
  const after = await c.store.getLead(start.body.lead);
  assert.deepEqual(after.consent, before.consent);
  assert.equal(after.verification.phoneVerified, false);
  assert.deepEqual((await c.store.events(start.body.lead)).map((e) => e.type), ['contact-submitted', 'lead-accepted', 'quote-restarted']);
  // A repeat request from the same phone is a new lead (the CRM handles duplicates); consent is asked again.
  const noConsent = await c.call(startBody({ phone: '214-867-5309', consent: false }));
  assert.equal(noConsent.http, 400);
  const again = await c.call(startBody({ phone: '214-867-5309' }));
  assert.equal(again.http, 200);
  assert.notEqual(again.body.lead, start.body.lead);
  assert.equal((await c.store.getLead(again.body.lead)).consent.given, true);
});

// ---- Quote System v2.9: intended use (lead information only) ----
test('intended use is required, stored with the lead, in the notifications, Apply Now and intake; never a pricing input', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.call(startBody({ intendedUse: undefined }))).http, 400);
  assert.equal((await c.call(startBody({ intendedUse: 'vacation' }))).http, 400);
  const start = await c.call(startBody({ intendedUse: 'burial' }));
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.status, 'ok');
  await c.call({ action: 'intake-next', category: 'guaranteed-acceptance' });
  const r = await c.store.getLead(start.body.lead);
  assert.deepEqual(r.intendedUse, { value: 'burial', label: 'Burial Expenses' });
  assert.equal(r.applications[0].intendedUse, 'Burial Expenses');
  assert.equal(r.intakes['guaranteed-acceptance'].intendedUse, 'Burial Expenses');
  // Same prices whatever the answer (the pricing endpoint only accepts the four rating inputs).
  assert.equal((await c.price({ age: 65, gender: 'male', tobacco: false, coverage: 10000, intendedUse: 'burial' })).http, 400);
});

test('Call to Get Approved tap (v3.7): verified session only, server price and official product name recorded, no completed call claimed', async () => {
  const c = await verifiedClient();
  const quote = { age: 70, gender: 'female', tobacco: false, coverage: 10000 };
  const ok = await c.call({ action: 'call-click', category: 'guaranteed-acceptance', quote, quoteRef: 'abcDEF1234567890', monthlyPremium: '0.01' });
  assert.equal(ok.http, 200);
  const r = await c.store.getLead(c.lead);
  const click = r.callClicks[0];
  assert.deepEqual([click.carrier, click.product, click.categoryId, click.coverage, click.quoteRef], ['Gerber Life', 'Guaranteed Life', 'guaranteed-acceptance', 10000, 'abcDEF1234567890']);
  assert.match(click.monthlyPremium, /^\d+\.\d{2}$/);
  assert.notEqual(click.monthlyPremium, '0.01', 'the browser price is never trusted');
  assert.ok(click.at && !('callCompleted' in click) && !('approved' in click));
  assert.equal((await c.store.events(c.lead)).filter((e) => e.type === 'call-click').length, 1);
  assert.equal((await client(PREVIEW).call({ action: 'call-click', category: 'guaranteed-acceptance', quote })).http, 401, 'needs a verified session');
  assert.equal((await c.call({ action: 'call-click', category: 'nope', quote })).http, 400);
});

test('V3.7 Full Name: a meaningful full name (multiple words, hyphens, apostrophes, suffixes) is accepted and stored as typed; a single word or junk is refused', async () => {
  for (const name of ['Mary Smith', 'Mary Ann Smith', "Mary-Jo O'Neil Smith", 'Pat O\u2019Neil', 'John Smith Jr.', 'Robert King III', 'José Álvarez', 'Smith, John']) {
    const c = client(PREVIEW);
    const r = await c.call(startBody({ firstName: name }));
    assert.equal(r.http, 200, name);
    assert.equal((await c.store.getLead(r.body.lead)).firstName, name);
  }
  assert.equal((await client(PREVIEW).call(startBody({ firstName: `Mary ${'x'.repeat(61)}` }))).http, 200, 'over-long names are trimmed, not refused');
  for (const bad of ['', 'Mary', 'J. R.', 'A B', 'Mary 2', '<b>Mary</b> Smith', 'x'.repeat(61)]) {
    const refused = await client(PREVIEW).call(startBody({ firstName: bad }));
    assert.equal(refused.http, 400, bad);
    assert.equal(refused.body.field, 'name', 'the page reopens the name field');
    assert.equal(refused.body.message, 'Please enter your full name (first and last name).');
  }
  const badPhone = await client(PREVIEW).call(startBody({ phone: '214-555-0123' }));
  assert.equal(badPhone.body.field, 'phone', 'the page reopens the phone field');
});

test('v5.8: the article-sidebar entry is stored with the lead and is saved with the lead', async () => {
  const c = client(PREVIEW);
  const source = { page: 'https://funeralfunds.com/free-quote/', utmSource: 'newsletter', entryType: 'article-sidebar', originTitle: 'Cancer Burial Insurance', originUrl: 'https://funeralfunds.com/burial-insurance/cancer/', entryGender: 'female', entryAt: '2026-11-03T22:00:00.000Z' };
  const start = await c.call(startBody({ source }));
  const rec = await c.store.getLead(start.body.lead);
  assert.deepEqual({ ...rec.source }, source);
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.saved, true);
  assert.equal((await c.store.getLead(start.body.lead)).applications[0].categoryId, 'guaranteed-acceptance');
  // Unknown entry types, genders and non-URL origins are dropped, never stored.
  const bad = await client(PREVIEW).call(startBody({ source: { entryType: 'popup', entryGender: 'x', originUrl: 'javascript:alert(1)', originTitle: 'T' } }));
  const badRec = await c.store.getLead(bad.body.lead);
  assert.deepEqual({ ...badRec.source }, { originTitle: 'T' });
  // A direct entry is labelled as one.
  const d = client(PREVIEW);
  const ds = await d.call(startBody({ source: { entryType: 'direct', entryAt: '2026-11-03T22:00:00.000Z' } }));
  assert.equal((await d.store.getLead(ds.body.lead)).source.entryType, 'direct');
});

test('v6.2: the funnel saves the lead and makes no outbound request but Agent CRM (no Formspark, Turnstile, SMS or email service)', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, ...rest) => { calls.push(String(url)); return realFetch(url, ...rest); };
  try {
    const crm = fakeCrm();
    const c = client(PROD, { fetchImpl: crm.fetchImpl });
    const source = { entryType: 'article-sidebar', originTitle: 'Cancer Burial Insurance', originUrl: 'https://funeralfunds.com/burial-insurance/cancer/', entryGender: 'male', entryAt: '2026-11-03T22:00:00.000Z' };
    const start = await c.call(startBody({ source }), PO);
    assert.equal(start.http, 200);
    assert.equal(start.body.status, 'verified');
    const apply = await c.call({ action: 'apply', category: 'lowest-preferred', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } }, PO);
    assert.equal(apply.body.status, 'ok');
    assert.equal(apply.body.saved, true);
    const rec = await c.store.getLead(start.body.lead);
    assert.equal(rec.firstName, 'Mary Smith');
    assert.deepEqual({ ...rec.source }, source);
    assert.equal(rec.consent.given, true);
    assert.equal(rec.applications.length, 1);
    assert.deepEqual(calls, [], 'no outbound request');
    assert.ok(crm.calls.every((x) => x.url.startsWith('https://services.leadconnectorhq.com/')), 'only Agent CRM');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('direct preview access: preview-sample makes no CRM call, never in production', async () => {
  for (const env of [PREVIEW, { ...PREVIEW, AGENT_CRM_TOKEN: 'tok', AGENT_CRM_LOCATION_ID: 'loc' }]) {
    const tw = fakeCrm();
    const c = client(env, { fetchImpl: tw.fetchImpl });
    const r = await c.call({ action: 'preview-sample' });
    assert.equal(r.http, 200);
    assert.equal(r.body.status, 'verified');
    assert.equal(tw.calls.length, 0, 'a CRM request was made');
    assert.equal((await c.price()).http, 200, 'prices for the sample session');
    const lead = await c.store.getLead('00000000-0000-4000-8000-000000000000');
    assert.equal(lead.mode, 'preview-sample');
    assert.equal(lead.phone, null);
  }
  const prod = client(PROD);
  const p = await prod.call({ action: 'preview-sample' }, { origin: 'https://funeralfunds.com' });
  assert.equal(p.http, 404);
  assert.equal(p.setCookie, null);
});

test('texting handoff V4.0: the approved prewritten text and the iOS/Android SMS link formats', async () => {
  const { dollars, firstNameOf, isIOS, prewrittenText, smsHref } = await import('../../src/scripts/sms-link.js');
  assert.equal(dollars(15000), '$15,000');
  assert.equal(dollars('60.00'), '$60');
  assert.equal(dollars('61.69'), '$61.69');
  assert.equal(firstNameOf('  Mary Ann Smith '), 'Mary');
  assert.equal(prewrittenText({ firstName: 'Brandon', coverage: 15000, monthlyPremium: '60.00' }), 'Hi, this is Brandon. I have a few questions about my $15,000 final expense insurance quote for $60/month.');
  assert.equal(prewrittenText({ firstName: 'Mary Ann', coverage: 10000, monthlyPremium: '61.69' }), 'Hi, this is Mary. I have a few questions about my $10,000 final expense insurance quote for $61.69/month.');
  assert.equal(prewrittenText({ firstName: '', coverage: 10000, monthlyPremium: '61.69' }), 'Hi. I have a few questions about my $10,000 final expense insurance quote for $61.69/month.');
  assert.equal(prewrittenText({ firstName: 'Mary', coverage: 0, monthlyPremium: '61.69' }), '');
  const body = 'Hi, this is Mary. I have a few questions about my $10,000 final expense insurance quote for $61.69/month.';
  const enc = encodeURIComponent(body);
  assert.equal(smsHref('(555) 555-0100'.replace('555) 555', '214) 555'), body, true), `sms:+12145550100&body=${enc}`);
  assert.equal(smsHref('2145550100', body, false), `sms:+12145550100?body=${enc}`);
  assert.equal(smsHref('12145550100', body, false), `sms:+12145550100?body=${enc}`);
  assert.equal(smsHref(null, body, true), '');
  assert.equal(smsHref('123', body, true), '');
  assert.equal(decodeURIComponent(smsHref('2145550100', body, false).split('?body=')[1]), body, 'body round-trips (& and $ encoded)');
  assert.ok(isIOS({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }));
  assert.ok(isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 }));
  assert.ok(!isIOS({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }));
  assert.ok(!isIOS({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 }));
});

test('texting handoff V4.0: the session answer carries the first name of this verified visit only', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.call({ action: 'session' })).body.firstName, undefined, 'no name without a verified session');
  const r = await c.call({ action: 'preview-sample' });
  assert.equal(r.http, 200);
  assert.equal((await c.call({ action: 'session' })).body.firstName, 'Preview');
});

test('two-option handoff V1.9: the QR code text for the computer option', async () => {
  const { qrPayload } = await import('../../src/scripts/sms-link.js');
  const body = 'Hi, this is Mary. I have a few questions about my $10,000 final expense insurance quote for $61.69/month.';
  assert.equal(qrPayload('8886720762', body), `SMSTO:+18886720762:${body}`);
  assert.equal(qrPayload(null, body), '');
  assert.equal(qrPayload('8886720762', ''), '');
});
