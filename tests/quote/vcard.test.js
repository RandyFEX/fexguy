// Personalized quote vCard (SAVE THIS QUOTE TO YOUR PHONE, Randy, November 2026):
// the master card's identity with the displayed quote in NOTE; one-time,
// session-bound download; the existing Agent CRM contact updated once per
// lead on production; never in test mode. Throwaway local redis-server and a
// fake Agent CRM API: no real request is ever made.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from '../health-search/redis-test-server.js';
import { createEngine, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { handleQuote } from '../../server/quote/handler.js';
import { quoteStore } from '../../server/quote/store.js';
import { CONSENT_VERSION } from '../../server/quote/consent.js';
import { handleVcardDownload, personalizeVcard, masterVcard } from '../../server/quote/vcard.js';
import { QUOTE_DOWNLOADED_TAG } from '../../server/quote/crm.js';
import { TEST_LEAD_TTL_MS, TEST_NAMESPACE, loginCookies } from '../../server/quote/owner-test.js';

let redis;
before(async () => { redis = await startRedis(); });
after(() => redis?.stop());

function fakeEngine() {
  const ds = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const records = [];
    for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
      for (const gender of ['male', 'female'])
        for (const tobacco of p.tobaccoClasses) records.push({ issueAge: age, gender, tobacco, annualRatePer1000: (age + 0.41 + (tobacco === 'tobacco' ? 7 : 0)).toFixed(2), sourcePage: 1 });
    ds[id] = { productId: id, extractedAt: 't', sourceSha256: 't', records };
    if (p.printedPremiums)
      ds[id].printedPremiums = records.flatMap((r) => p.printedPremiums.coverage.map((coverage) => ({ issueAge: r.issueAge, gender: r.gender, coverage, sourcePage: 1, monthlyPremium: toFixed(monthlyPremium({ coverage, annualRatePer1000: r.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2) })));
  }
  return createEngine(ds);
}
const engine = fakeEngine();
const SECRET = 'q'.repeat(48);
const PROD = { VERCEL_ENV: 'production', QUOTE_SESSION_SECRET: SECRET, HEALTH_SEARCH_SECRET: SECRET, AGENT_CRM_TOKEN: 'pit-test-token', AGENT_CRM_LOCATION_ID: 'loc123', FUNNEL_TEST_PASSWORD: 'correct horse battery staple' };
let n = 0;

function browser(env, { owner = false } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/contacts/upsert')) return Response.json({ new: true, contact: { id: 'contact-1' } });
    return Response.json({ ok: true }, { status: 201 });
  };
  const visit = `visit${String(++n).padStart(14, '0')}`;
  let session = '';
  const store = owner ? quoteStore(redis.store, env, { ns: TEST_NAMESPACE, leadTtlMs: TEST_LEAD_TTL_MS }) : quoteStore(redis.store, env);
  const testCookies = owner ? loginCookies(env, Date.now()).map((c) => c.split(';')[0]).join('; ') : '';
  const cookie = () => [session, testCookies].filter(Boolean).join('; ');
  const call = async (body) => {
    const headers = { 'content-type': 'application/json', origin: 'https://funeralfunds.com', 'x-real-ip': `10.7.0.${n}`, 'x-quote-visit': visit, cookie: cookie(), ...(owner ? { 'x-owner-test': '1' } : {}) };
    const res = await handleQuote(new Request('https://x.test/api/quote/', { method: 'POST', headers, body: JSON.stringify(body) }), env, { store, testStore: store, getEngine: async () => ({ engine }), fetchImpl });
    const set = res.headers.get('set-cookie');
    if (set) session = set.split(';')[0];
    return { http: res.status, body: await res.json() };
  };
  const download = (url, c = cookie()) => handleVcardDownload(new Request(`https://x.test${url}`, { headers: { cookie: c } }), env, { store, fetchImpl });
  const start = () => call({ action: 'start', firstName: 'Pat Smith', phone: `21486753${String(20 + n).slice(-2)}`, state: 'Texas', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 }, consentVersion: CONSENT_VERSION, funnel: 'get-rates' });
  return { call, download, start, calls, store, cookie };
}
const crmCalls = (b) => b.calls.filter((c) => /\/contacts\//.test(c.url));
const unfold = (t) => t.replace(/\r\n /g, '');
const note = (vcf) => unfold(vcf).match(/^NOTE:(.*)$/m)[1].replace(/\\n/g, '\n').replace(/\\([,;\\])/g, '$1');

test('the master card: same identity, photo and format; only NOTE is personalized', async () => {
  const master = await masterVcard();
  const out = personalizeVcard(master, 'Line one\nCoverage: $10,000; ok');
  assert.ok(out.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n') && out.endsWith('END:VCARD\r\n'));
  assert.ok(out.split('\r\n').every((l) => l.length <= 75), 'folded at 75');
  for (const l of ['FN:Randy VanderVaate', 'ORG:Funeral Funds;Burial\\, Cremation & Final Expense Insurance', 'TITLE:Owner & Licensed Life Insurance Agent', 'TEL;TYPE=WORK,VOICE,PREF:+18888629456', 'URL:https://funeralfunds.com']) assert.ok(unfold(out).includes(l), l);
  assert.match(unfold(out), /^PHOTO;ENCODING=b;TYPE=JPEG:\/9j\//m);
  assert.doesNotMatch(out, /EMAIL|@funeralfunds|sms:/i, 'card V1.1: no email address or text-message line');
  assert.match(unfold(master), /^NOTE:Life insurance\\nBurial insurance\\nCremation insurance\\nFinal expense insurance\\nFuneral insurance\\nDigital card: /m);
  assert.equal((unfold(out).match(/^NOTE:/gm) ?? []).length, 1);
  assert.equal(unfold(out).match(/^NOTE:(.*)$/m)[1], 'Line one\\nCoverage: $10\\,000\\; ok');
});

test('production: the vCard carries the displayed quote; the first download updates the existing contact once (tag + note); later ones never repeat it', async () => {
  const b = browser(PROD);
  assert.equal((await b.start()).http, 200);
  const deliveryCalls = crmCalls(b).length;
  // The visitor changed the coverage to $15,000 on the results page.
  const r = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 15000 } });
  assert.equal(r.http, 200);
  assert.match(r.body.url, /^\/api\/quote-vcard\/\?t=[a-f0-9]{48}$/);
  const res = await b.download(r.body.url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/vcard; charset=utf-8');
  assert.match(res.headers.get('content-disposition'), /attachment; filename="Randy-VanderVaate-Funeral-Funds-Quote\.vcf"/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const text = note(await res.text());
  assert.match(text, /^Funeral Funds quote for Pat\nQuote date: [A-Z][a-z]+ \d{1,2}, \d{4}\nCoverage: \$15,000\n/);
  assert.match(text, /Mutual of Omaha: \$\d+\.\d\d\/month/);
  assert.match(text, /Aetna: \$\d+\.\d\d\/month/);
  assert.match(text, /Gerber Life: \$\d+\.\d\d\/month \(2-year waiting period\)/);
  assert.match(text, /Call Randy directly at 888-862-9456 for possibly lower-cost options available in your state\.\nLife insurance\nBurial insurance\nCremation insurance\nFinal expense insurance\nFuneral insurance$/);
  assert.doesNotMatch(text, /Smith|Texas|214|68|female/i, 'no unnecessary personal data');
  const after = crmCalls(b).slice(deliveryCalls);
  assert.deepEqual(after.map((c) => c.url.replace('https://services.leadconnectorhq.com', '')), ['/contacts/contact-1/tags', '/contacts/contact-1/notes'], 'the existing contact, no upsert');
  assert.deepEqual(after[0].body, { tags: [QUOTE_DOWNLOADED_TAG] });
  assert.match(after[1].body.body, /Quote Downloaded[\s\S]*Coverage: \$15,000[\s\S]*Displayed rate, Mutual of Omaha: \$/);
  // The link works once only.
  assert.equal((await b.download(r.body.url)).status, 410);
  // A second download (another coverage) gets its own card, but no new CRM update.
  const r2 = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 5000 } });
  const res2 = await b.download(r2.body.url);
  assert.match(note(await res2.text()), /Coverage: \$5,000/);
  assert.equal(crmCalls(b).length, deliveryCalls + 2, 'no repeated CRM update');
});

test('Desired Premium: each company with the coverage that premium buys', async () => {
  const b = browser(PROD);
  await b.start();
  const r = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, premium: '50.00' } });
  const text = note(await (await b.download(r.body.url)).text());
  assert.match(text, /Monthly budget: \$50\.00/);
  assert.match(text, /Mutual of Omaha: \$[\d,]+ coverage for \$\d+\.\d\d\/month/);
});

test('the download link only works for the browser whose session made it; no session, no token', async () => {
  const b = browser(PROD);
  await b.start();
  const r = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 } });
  assert.equal((await b.download(r.body.url, '')).status, 410, 'no cookie');
  const other = browser(PROD);
  await other.start();
  assert.equal((await other.download(r.body.url)).status, 410, 'another visitor');
  assert.equal((await b.download('/api/quote-vcard/?t=nope')).status, 410);
  assert.equal((await browser(PROD).call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 } })).http, 401);
});

test('owner test mode and previews: the vCard downloads, Agent CRM is never contacted', async () => {
  for (const [env, owner] of [[PROD, true], [{ ...PROD, VERCEL_ENV: 'preview' }, false]]) {
    const b = browser(env, { owner });
    assert.equal((await b.start()).http, 200);
    const r = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 } });
    const res = await b.download(r.body.url);
    assert.equal(res.status, 200);
    assert.match(note(await res.text()), /Coverage: \$10,000/);
    assert.deepEqual(crmCalls(b), [], owner ? 'owner test' : 'preview');
  }
});

test('an Agent CRM failure never blocks the download', async () => {
  const b = browser(PROD);
  await b.start();
  const r = await b.call({ action: 'vcard', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 } });
  const res = await handleVcardDownload(new Request(`https://x.test${r.body.url}`, { headers: { cookie: b.cookie() } }), PROD, { store: b.store, fetchImpl: async () => { throw new Error('down'); } });
  assert.equal(res.status, 200);
  assert.match(note(await res.text()), /Coverage: \$10,000/);
});
