// Quote System v2.2: Twilio Verify, the verification gate, verified sessions,
// consent/verification evidence and Apply Now. Uses a throwaway local
// redis-server (the real Lua scripts run) and a fake Twilio API; no SMS is
// ever sent and no lead is ever delivered.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from '../health-search/redis-test-server.js';
import { createEngine, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { handleQuote, MAX_ATTEMPTS, RESEND_COOLDOWN_MS, SMS_LIMITS } from '../../server/quote/handler.js';
import { quoteStore } from '../../server/quote/store.js';
import { COOKIE, sign, sessionKey, verifiedLead, SESSION_MS } from '../../server/quote/session.js';
import { toE164US } from '../../server/quote/phone.js';
import { verifyMode, TEST_CODE } from '../../server/quote/twilio.js';
import { CONSENT_TEXT, CONSENT_VERSION, VERIFY_NOTICE_VERSION } from '../../server/quote/consent.js';
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
const TWILIO = { ...PREVIEW, TWILIO_ACCOUNT_SID: `AC${'1'.repeat(32)}`, TWILIO_AUTH_TOKEN: 'tok', TWILIO_VERIFY_SERVICE_SID: `VA${'2'.repeat(32)}` };
const ORIGIN = 'https://fexguy-test-final-expense-guys-projects.vercel.app';
let ipCounter = 0;

/** A fake Twilio Verify API that records calls (code 654321 is correct). */
function fakeTwilio() {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const form = Object.fromEntries(new URLSearchParams(init.body));
    calls.push({ url, auth: init.headers.Authorization, form });
    if (url.endsWith('/Verifications')) return new Response(JSON.stringify({ sid: 'VE123', status: 'pending' }), { status: 201 });
    if (url.endsWith('/VerificationCheck')) return new Response(JSON.stringify({ sid: 'VE123', status: form.Code === '654321' ? 'approved' : 'pending' }), { status: 200 });
    return new Response('{}', { status: 404 });
  };
  return { calls, fetchImpl };
}

function client(env, { fetchImpl, ip = `10.0.0.${++ipCounter}`, now } = {}) {
  let cookie = '';
  const store = quoteStore(redis.store, env);
  const deps = { store, getEngine: async () => ({ engine }), fetchImpl, now };
  const call = async (body, { origin = ORIGIN, withCookie = true } = {}) => {
    const res = await handleQuote(new Request('https://x.test/api/quote/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'x-real-ip': ip, 'user-agent': 'TestAgent/1.0', ...(withCookie && cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }), env, deps);
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { http: res.status, body: await res.json(), setCookie: set };
  };
  const price = async (q = { age: 65, gender: 'male', tobacco: false, coverage: 10000 }, { withCookie = true, cookieValue } = {}) => {
    const c = cookieValue ?? (withCookie ? cookie : '');
    const res = await handlePriceExplorer(new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-real-ip': ip, ...(c ? { cookie: c } : {}) }, body: JSON.stringify(q) }),
      { ...env, HEALTH_SEARCH_SECRET: SECRET }, { store: redis.store, getEngine: async () => ({ engine }), isVerified: async (r) => Boolean(await verifiedLead(r, env, store, now ? now() : Date.now())) });
    return { http: res.status, body: await res.json() };
  };
  return { call, price, store, get cookie() { return cookie; } };
}

let phoneN = 2000;
const nextPhone = () => `(214) 77${String(phoneN++).slice(-1)}-${String(1000 + phoneN).slice(-4)}`;
const startBody = (o = {}) => ({
  action: 'start', firstName: 'Mary', phone: nextPhone(), state: 'Ohio', consent: true, consentVersion: CONSENT_VERSION,
  verifyNoticeVersion: VERIFY_NOTICE_VERSION, quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 },
  source: { page: '/final-expense-insurance-prices/', utmSource: 'google', utmCampaign: 'fall' }, ...o,
});

test('phone numbers: US only, normalized to E.164; toll-free, premium, N11 and fictional rejected', () => {
  assert.equal(toE164US('(214) 555-1212'), '+12145551212');
  assert.equal(toE164US('(214) 555-0123'), null, 'fictional 555-01xx');
  assert.equal(toE164US('214-867-5309'), '+12148675309');
  assert.equal(toE164US('+1 214 867 5309'), '+12148675309');
  assert.equal(toE164US('12148675309'), '+12148675309');
  for (const bad of ['888-862-9456', '900-555-0000', '411-555-1234', '214-411-1234', '555-867-5309', '+44 20 7946 0958', '123', '', null, 'abc', '014-867-5309'])
    assert.equal(toE164US(bad), null, String(bad));
});

test('verification modes: real Twilio when configured; test mode only outside production; never in production', () => {
  assert.equal(verifyMode(TWILIO), 'twilio');
  assert.equal(verifyMode(PREVIEW), 'test');
  assert.equal(verifyMode({ VERCEL_ENV: 'production' }), 'off');
  assert.equal(verifyMode({ VERCEL_ENV: 'production', QUOTE_VERIFY_MODE: 'test' }), 'off');
  assert.equal(verifyMode({ ...TWILIO, VERCEL_ENV: 'production', QUOTE_VERIFY_MODE: 'test' }), 'twilio');
});

test('production without Twilio credentials refuses verification (503), never a bypass', async () => {
  const c = client({ VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET });
  const r = await c.call(startBody(), { origin: 'https://funeralfunds.com' });
  assert.equal(r.http, 503);
});

test('Twilio Verify: official endpoints, Basic auth, E.164 To, sms channel', async () => {
  const tw = fakeTwilio();
  const c = client(TWILIO, { fetchImpl: tw.fetchImpl });
  const start = await c.call(startBody({ phone: '214-867-5309' }));
  assert.equal(start.http, 200, JSON.stringify(start.body));
  assert.equal(start.body.testMode, false);
  assert.equal(start.body.masked, '(***) ***-5309');
  assert.equal(tw.calls[0].url, `https://verify.twilio.com/v2/Services/${TWILIO.TWILIO_VERIFY_SERVICE_SID}/Verifications`);
  assert.equal(tw.calls[0].auth, `Basic ${Buffer.from(`${TWILIO.TWILIO_ACCOUNT_SID}:tok`).toString('base64')}`);
  assert.deepEqual(tw.calls[0].form, { To: '+12148675309', Channel: 'sms' });
  const wrong = await c.call({ action: 'check', lead: start.body.lead, code: '111111' });
  assert.equal(wrong.body.status, 'wrong-code');
  const ok = await c.call({ action: 'check', lead: start.body.lead, code: '654321' });
  assert.equal(ok.body.status, 'verified');
  assert.equal(tw.calls.at(-1).url.endsWith('/VerificationCheck'), true);
  assert.deepEqual(tw.calls.at(-1).form, { To: '+12148675309', Code: '654321' });
  // One notification for the verified lead, with the quote and consent, never twice.
  assert.equal(ok.body.notify['Quote Event'], 'Verified quote request');
  assert.equal(ok.body.notify['Contact Consent'], `Yes (${CONSENT_VERSION})`);
  const again = await c.call({ action: 'session' });
  assert.equal(again.body.status, 'verified');
});

test('pricing gate: no session, forged, tampered or expired tokens get no prices', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.price(undefined, { withCookie: false })).http, 401, 'calling the pricing endpoint directly is refused');
  const key = sessionKey(PREVIEW);
  const forged = sign(Buffer.alloc(32, 7), { sid: 'x', lid: 'y', exp: Date.now() + 10000 });
  assert.equal((await c.price(undefined, { cookieValue: `${COOKIE}=${forged}` })).http, 401, 'wrong key');
  const noRecord = sign(key, { sid: 'not-in-store', lid: 'y', exp: Date.now() + 10000 });
  assert.equal((await c.price(undefined, { cookieValue: `${COOKIE}=${noRecord}` })).http, 401, 'signed but no server session');
  const start = await c.call(startBody());
  const ok = await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
  assert.equal(ok.body.status, 'verified');
  assert.match(ok.setCookie, /HttpOnly; Secure; SameSite=Strict/);
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

test('free repricing after verification needs no new code', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
  for (const q of [{ age: 55, gender: 'male', tobacco: true, coverage: 5000 }, { age: 80, gender: 'female', tobacco: false, coverage: 25000 }, { age: 89, gender: 'male', tobacco: false, coverage: 12000 }]) {
    const r = await c.price(q);
    assert.equal(r.http, 200);
    assert.equal(r.body.categories.length, 3);
  }
});

test('evidence: consent, verification, quote, source and client recorded; survives session expiry; Apply Now recorded with a server price', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody({ consent: false, consentVersion: undefined }));
  const id = start.body.lead;
  await c.call({ action: 'check', lead: id, code: TEST_CODE });
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.status, 'ok');
  assert.equal(apply.body.notify, null, 'test mode never notifies');
  // A forged price in the request is ignored: the server re-prices.
  const r = await c.store.getLead(id);
  assert.equal(r.mode, 'test');
  assert.equal(r.firstName, 'Mary');
  assert.match(r.phone, /^\+1\d{10}$/);
  assert.equal(r.state, 'Ohio');
  assert.ok(r.submittedAt && r.verification.verifiedAt && r.verification.verifiedAt >= r.submittedAt);
  assert.equal(r.verification.status, 'approved');
  assert.deepEqual([r.consent.given, r.consent.action, r.consent.text], [false, 'left consent box unchecked', null]);
  assert.equal(r.verifyNotice.version, VERIFY_NOTICE_VERSION);
  assert.equal(r.source.utmSource, 'google');
  assert.equal(r.client.userAgent, 'TestAgent/1.0');
  assert.ok(r.client.ip);
  assert.deepEqual(r.quoteAtSubmission, { age: 70, gender: 'female', tobacco: false, coverage: 10000 });
  assert.equal(r.applications[0].category, 'Guaranteed Acceptance Rate');
  assert.equal(r.applications[0].monthlyPremium, apply.body.monthlyPremium);
  const types = (await c.store.events(id)).map((e) => e.type);
  assert.deepEqual(types, ['sms-sent', 'verified', 'apply-now']);
  // Sessions expire; evidence doesn't (no TTL on the record or events).
  assert.equal(await redis.command(['TTL', `qe:preview:lead:${id}`]), -1);
  assert.equal(await redis.command(['TTL', `qe:preview:ev:${id}`]), -1);
  const sessTtl = await redis.command(['PTTL', `qs:preview:${c.cookie ? JSON.parse(Buffer.from(c.cookie.split('=')[1].split('.')[0], 'base64url')).sid : ''}`]);
  assert.ok(sessTtl > 0 && sessTtl <= SESSION_MS);
});

test('consent given: exact text and version stored; unknown versions refused', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  const r = await c.store.getLead(start.body.lead);
  assert.deepEqual([r.consent.given, r.consent.version, r.consent.text], [true, CONSENT_VERSION, CONSENT_TEXT]);
  assert.equal((await c.call(startBody({ consentVersion: 'made-up' }))).http, 400);
  assert.equal((await c.call(startBody({ consent: 'yes' }))).http, 400);
});

test('code attempts, resend cooldown and resend cap', async () => {
  let t = Date.now();
  const c = client(PREVIEW, { now: () => t });
  const start = await c.call(startBody());
  const id = start.body.lead;
  assert.equal((await c.call({ action: 'resend', lead: id })).body.status, 'cooldown');
  for (let i = 0; i < 3; i++) {
    t += RESEND_COOLDOWN_MS + 1;
    assert.equal((await c.call({ action: 'resend', lead: id })).body.status, 'sent');
  }
  t += RESEND_COOLDOWN_MS + 1;
  assert.equal((await c.call({ action: 'resend', lead: id })).http, 429, 'resend cap');
  for (let i = 0; i < MAX_ATTEMPTS; i++) assert.equal((await c.call({ action: 'check', lead: id, code: '000000' })).body.status, 'wrong-code');
  assert.equal((await c.call({ action: 'check', lead: id, code: TEST_CODE })).body.status, 'too-many-attempts', 'even the right code is refused after 5 wrong ones');
  assert.equal((await c.call({ action: 'check', lead: 'not-a-lead', code: TEST_CODE })).http, 410);
});

test('SMS-pumping protection: per-IP and per-phone limits', async () => {
  const c = client(PREVIEW, { ip: '10.9.9.9' });
  for (let i = 0; i < SMS_LIMITS.ipHour; i++) assert.equal((await c.call(startBody())).http, 200);
  assert.equal((await c.call(startBody())).http, 429, 'IP hourly limit');
  const phone = '214-867-0001';
  let last;
  for (let i = 0; i <= SMS_LIMITS.phoneHour; i++) last = await client(PREVIEW).call(startBody({ phone }));
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
