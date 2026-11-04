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
  action: 'start', firstName: 'Mary', phone: nextPhone(), state: 'Ohio', intendedUse: 'cremation', consent: true, consentVersion: CONSENT_VERSION,
  verifyNoticeVersion: VERIFY_NOTICE_VERSION, quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 },
  source: { page: '/free-quote/', utmSource: 'google', utmCampaign: 'fall' }, ...o,
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
  // v5.3: production without Twilio uses the temporary public test code; Twilio always wins.
  assert.equal(verifyMode({ VERCEL_ENV: 'production' }), 'public-test');
  assert.equal(verifyMode({ VERCEL_ENV: 'production', QUOTE_VERIFY_MODE: 'test' }), 'public-test');
  assert.equal(verifyMode({ VERCEL_ENV: 'production', QUOTE_PUBLIC_TEST_CODE: 'off' }), 'off');
  assert.equal(verifyMode({ ...TWILIO, VERCEL_ENV: 'production', QUOTE_VERIFY_MODE: 'test' }), 'twilio');
  assert.equal(verifyMode({ ...TWILIO, VERCEL_ENV: 'production' }), 'twilio');
});

test('production without Twilio and with the public test code switched off refuses verification (503)', async () => {
  const c = client({ VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET, QUOTE_PUBLIC_TEST_CODE: 'off' });
  const r = await c.call(startBody(), { origin: 'https://funeralfunds.com' });
  assert.equal(r.http, 503);
});

test('temporary public test code (v5.3): unlocks only this visitor\'s quotes, never marks the phone SMS-verified, real lead', async () => {
  const PROD = { VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET };
  const PO = { origin: 'https://funeralfunds.com' };
  const c = client(PROD);
  const prodPrice = async (cl) => {
    const res = await handlePriceExplorer(new Request('https://x.test/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://funeralfunds.com', 'x-real-ip': '10.9.9.9', 'x-quote-visit': cl.visit, ...(cl.cookie ? { cookie: cl.cookie } : {}) }, body: JSON.stringify({ age: 65, gender: 'male', tobacco: false, coverage: 10000 }) }),
      { ...PROD, HEALTH_SEARCH_SECRET: SECRET }, { store: redis.store, getEngine: async () => ({ engine }), isVerified: async (r) => Boolean(await verifiedLead(r, PROD, cl.store)) });
    return res.status;
  };
  const start = await c.call(startBody({ consent: false }), PO);
  assert.equal(start.http, 200);
  assert.equal(start.body.status, 'sent');
  assert.equal(start.body.testMode, false);
  // v6.2: the lead is saved at contact submission, before any code is entered.
  assert.equal((await c.store.getLead(start.body.lead)).firstName, 'Mary');
  assert.equal(await prodPrice(c), 401, 'no prices before the code');
  const wrong = await c.call({ action: 'check', lead: start.body.lead, code: '654321' }, PO);
  assert.equal(wrong.body.status, 'wrong-code');
  const ok = await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE }, PO);
  assert.equal(ok.body.status, 'verified');
  assert.equal(ok.body.testMode, false);
  assert.equal(ok.body.leadVerified, false, 'the temporary code is never a verified lead (no ad conversion)');
  assert.equal('notify' in ok.body, false, 'nothing for the browser to send');
  assert.equal(await prodPrice(c), 200, 'this visitor gets prices');
  const rec = await c.store.getLead(start.body.lead);
  assert.equal(rec.mode, 'public-test');
  assert.equal(rec.verification.status, 'test-code-accepted');
  assert.equal(rec.verification.phoneVerified, false);
  assert.equal(rec.verification.verifiedAt, null);
  assert.equal(rec.consent.given, false);
  assert.equal(rec.temporaryCodeNotice, 'Enter access code 123456 to view your insurance quotes.');
  // Production records stay in the production namespace, never the preview one.
  assert.equal(await quoteStore(redis.store, PREVIEW).getLead(start.body.lead), null);
  // The code alone opens nothing: another visitor without their own request gets no prices or session.
  const other = client(PROD);
  assert.equal((await other.call({ action: 'check', lead: start.body.lead, code: TEST_CODE }, PO)).http, 410);
  assert.equal(await prodPrice(other), 401);
  assert.equal((await other.call({ action: 'session' }, PO)).body.status, 'not-verified');
});

test('v5.4: the access-code instruction is sent only in temporary-code mode, never with Twilio or on previews', async () => {
  const NOTE = 'Enter access code 123456 to view your insurance quotes.';
  const prod = client({ VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET });
  const PO = { origin: 'https://funeralfunds.com' };
  assert.equal((await prod.call({ action: 'session' }, PO)).body.temporaryCodeNote, NOTE);
  assert.equal((await prod.call(startBody(), PO)).body.temporaryCodeNote, NOTE);
  const tw = fakeTwilio();
  const live = client({ ...TWILIO, VERCEL_ENV: 'production' }, { fetchImpl: tw.fetchImpl });
  const liveSession = await live.call({ action: 'session' }, PO);
  const liveStart = await live.call(startBody(), PO);
  assert.equal(liveStart.body.status, 'sent');
  assert.ok(!('temporaryCodeNote' in liveSession.body) && !('temporaryCodeNote' in liveStart.body));
  assert.ok(!JSON.stringify(liveStart.body).includes('123456'));
  assert.equal((await live.call({ action: 'check', lead: liveStart.body.lead, code: TEST_CODE }, PO)).body.status, 'wrong-code', 'Twilio mode never accepts the temporary code');
  const preview = client(PREVIEW);
  assert.ok(!('temporaryCodeNote' in (await preview.call({ action: 'session' })).body));
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
  assert.equal(ok.body.leadVerified, true, 'a real SMS verification is the verified lead');
  const repeat = await c.call({ action: 'check', lead: start.body.lead, code: '654321' });
  assert.equal(repeat.http, 410, 'the same lead cannot be verified (counted) twice');
  assert.equal(repeat.body.leadVerified, undefined);
  assert.equal(tw.calls.at(-1).url.endsWith('/VerificationCheck'), true);
  assert.deepEqual(tw.calls.at(-1).form, { To: '+12148675309', Code: '654321' });
  // v6.2: the saved lead holds the contact details, quote and consent.
  const saved = await c.store.getLead(start.body.lead);
  assert.equal(saved.phone, '+12148675309');
  assert.equal(saved.consent.version, CONSENT_VERSION);
  assert.deepEqual(saved.quoteAtSubmission, { age: 70, gender: 'female', tobacco: false, coverage: 10000 });
  assert.equal('notify' in ok.body, false);
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
  assert.equal(ok.body.leadVerified, false, 'preview test mode never counts a lead');
  assert.match(ok.setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.doesNotMatch(ok.setCookie, /Max-Age/, 'a browser-session cookie, not a persistent one');
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
  assert.equal(apply.body.saved, true);
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
  assert.equal(r.verifyNotice.text, "We'll text a 6-digit verification code to (***) ***-XXXX. Message and data rates may apply.");
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
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
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
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
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
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
  assert.equal((await c.price()).http, 200, 'same visit');
  assert.equal((await c.price(undefined, { visitId: 'another-visit-0000001' })).http, 401, 'a new tab or visit reusing the cookie');
  assert.equal((await c.price(undefined, { visitId: null })).http, 401, 'no visit id');
  // The session action used on page load: a new visit is not verified.
  const other = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, cookie: c.cookie, 'x-quote-visit': 'another-visit-0000002' }, body: JSON.stringify({ action: 'session' }) }), PREVIEW, { store: c.store });
  assert.equal((await other.json()).status, 'not-verified');
  // Verifying needs a visit id.
  const noVisit = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN }, body: JSON.stringify({ action: 'check', lead: start.body.lead, code: TEST_CODE }) }), PREVIEW, { store: c.store });
  assert.equal(noVisit.status, 400);
});

test('Start New Quote ends the session but keeps the lead, its consent record and events', async () => {
  const c = client(PREVIEW);
  const start = await c.call(startBody());
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
  const before = await c.store.getLead(start.body.lead);
  const end = await c.call({ action: 'end-session' });
  assert.equal(end.body.status, 'ended');
  assert.match(end.setCookie, /Max-Age=0/);
  assert.equal((await c.price()).http, 401, 'prices need a new verification');
  const after = await c.store.getLead(start.body.lead);
  assert.deepEqual(after.consent, before.consent);
  assert.equal(after.verification.status, 'approved');
  assert.deepEqual((await c.store.events(start.body.lead)).map((e) => e.type), ['sms-sent', 'verified', 'quote-restarted']);
  // A repeat request from the same phone is a new lead (the CRM handles duplicates); consent is asked again.
  const again = await c.call(startBody({ phone: '214-867-5309', consent: false, consentVersion: undefined }));
  assert.equal(again.http, 200);
  assert.notEqual(again.body.lead, start.body.lead);
  assert.equal((await c.store.getLead(again.body.lead)).consent.given, false);
});

// ---- Quote System v2.9: intended use (lead information only) ----
test('intended use is required, stored with the lead, in the notifications, Apply Now and intake; never a pricing input', async () => {
  const c = client(PREVIEW);
  assert.equal((await c.call(startBody({ intendedUse: undefined }))).http, 400);
  assert.equal((await c.call(startBody({ intendedUse: 'vacation' }))).http, 400);
  const start = await c.call(startBody({ intendedUse: 'burial' }));
  await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE });
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

test('intended use is saved with the lead (real Twilio mode)', async () => {
  const tw = fakeTwilio();
  const c = client(TWILIO, { fetchImpl: tw.fetchImpl });
  const start = await c.call(startBody({ phone: '214-867-5390', intendedUse: 'other' }));
  assert.deepEqual((await c.store.getLead(start.body.lead)).intendedUse, { value: 'other', label: 'Other Expenses' });
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

test('one "Your Name" field (v4.5): a first name or a full name is accepted and stored as typed; nothing else is required', async () => {
  for (const name of ['Mary', 'Mary Ann Smith', "Mary-Jo O'Neil Smith"]) {
    const c = client(PREVIEW);
    const r = await c.call(startBody({ firstName: name }));
    assert.equal(r.http, 200, name);
    assert.equal((await c.store.getLead(r.body.lead)).firstName, name);
  }
  assert.equal((await client(PREVIEW).call(startBody({ firstName: 'x'.repeat(61) }))).http, 200, 'over-long names are trimmed, not refused');
  assert.equal((await client(PREVIEW).call(startBody({ firstName: '' }))).http, 400);
});

test('v5.8: the article-sidebar entry is stored with the lead and is saved with the lead', async () => {
  const tw = fakeTwilio();
  const c = client(TWILIO, { fetchImpl: tw.fetchImpl });
  const source = { page: 'https://funeralfunds.com/free-quote/', utmSource: 'newsletter', entryType: 'article-sidebar', originTitle: 'Cancer Burial Insurance', originUrl: 'https://funeralfunds.com/burial-insurance/cancer/', entryGender: 'female', entryAt: '2026-11-03T22:00:00.000Z' };
  const start = await c.call(startBody({ source }));
  await c.call({ action: 'check', lead: start.body.lead, code: '654321' });
  const rec = await c.store.getLead(start.body.lead);
  assert.deepEqual({ ...rec.source }, source);
  const apply = await c.call({ action: 'apply', category: 'guaranteed-acceptance', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal(apply.body.saved, true);
  assert.equal((await c.store.getLead(start.body.lead)).applications[0].categoryId, 'guaranteed-acceptance');
  // Unknown entry types, genders and non-URL origins are dropped, never stored.
  const bad = await client(TWILIO, { fetchImpl: tw.fetchImpl }).call(startBody({ source: { entryType: 'popup', entryGender: 'x', originUrl: 'javascript:alert(1)', originTitle: 'T' } }));
  const badRec = await c.store.getLead(bad.body.lead);
  assert.deepEqual({ ...badRec.source }, { originTitle: 'T' });
  // A direct entry is labelled as one.
  const d = client(TWILIO, { fetchImpl: tw.fetchImpl });
  const ds = await d.call(startBody({ source: { entryType: 'direct', entryAt: '2026-11-03T22:00:00.000Z' } }));
  assert.equal((await d.store.getLead(ds.body.lead)).source.entryType, 'direct');
});

test('v6.2: the funnel saves the lead and makes no outbound request (no Formspark, Turnstile or email service)', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, ...rest) => { calls.push(String(url)); return realFetch(url, ...rest); };
  try {
    const PROD = { VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET };
    const PO = { origin: 'https://funeralfunds.com' };
    const c = client(PROD);
    const source = { entryType: 'article-sidebar', originTitle: 'Cancer Burial Insurance', originUrl: 'https://funeralfunds.com/burial-insurance/cancer/', entryGender: 'male', entryAt: '2026-11-03T22:00:00.000Z' };
    const start = await c.call(startBody({ source }), PO);
    assert.equal(start.http, 200);
    assert.equal((await c.call({ action: 'check', lead: start.body.lead, code: TEST_CODE }, PO)).body.status, 'verified');
    const apply = await c.call({ action: 'apply', category: 'lowest-preferred', quote: { age: 70, gender: 'female', tobacco: false, coverage: 10000 } }, PO);
    assert.equal(apply.body.status, 'ok');
    assert.equal(apply.body.saved, true);
    const rec = await c.store.getLead(start.body.lead);
    assert.equal(rec.firstName, 'Mary');
    assert.deepEqual({ ...rec.source }, source);
    assert.equal(rec.consent.given, true);
    assert.equal(rec.applications.length, 1);
    assert.deepEqual(calls, [], 'no outbound request');
  } finally {
    globalThis.fetch = realFetch;
  }
});
