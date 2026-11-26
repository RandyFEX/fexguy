// Owner test mode (/test/, V1.1) in a real browser, on the production
// handlers with a fake Agent CRM (nothing is sent anywhere) and TEST-ONLY
// made-up rate tables: sign in at /test/, run /get-rates/ and /free-quote/
// from the first question to the rates (video overlay, coverage change),
// with zero Agent CRM calls, zero production lead records and zero analytics
// requests; a browser that only fakes the ui cookie is refused, and an
// ordinary visitor still reaches Agent CRM. Run after a build:
//   node tests/quote/owner-test.browser.mjs
import { createRequire } from 'node:module';
import { startFunnelServer, OWNER_TEST_PASSWORD } from './funnel-server.mjs';
import { PRODUCTS } from '../../server/rates/products.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const datasets = {};
for (const [id, rate] of [['aetna-accendo-preferred', '50.00'], ['moo-living-promise-level', '40.00']]) {
  const p = PRODUCTS[id];
  const records = [];
  for (let a = p.issueAges.min; a <= p.issueAges.max; a++)
    for (const gender of ['male', 'female']) for (const tobacco of p.tobaccoClasses) records.push({ issueAge: a, gender, tobacco, annualRatePer1000: rate });
  datasets[id] = { productId: id, records };
}
const srv = await startFunnelServer({ production: true, ownerTest: true, videoIntro: true, datasets });
const browser = await chromium.launch();
const results = [];
const check = async (name, fn) => {
  try {
    const n = await fn();
    results.push(`PASS  ${name}${n ? ` (${n})` : ''}`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${String(e.message).split('\n')[0]}`);
  }
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const ANALYTICS = /google-analytics\.com|googletagmanager\.com|facebook\.(com|net)|doubleclick\.net/;
const keys = async (p) => (await (await fetch(`${srv.base}/__keys/?p=${encodeURIComponent(p)}`)).json()) ?? [];
let ip = 10;

async function context() {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const page = await ctx.newPage();
  const analytics = [];
  page.on('request', (r) => { if (ANALYTICS.test(r.url())) analytics.push(r.url()); });
  return { ctx, page, analytics };
}

async function toContact(page) {
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="male"]', '[data-pick="age"][data-value="66"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.waitForTimeout(400);
  await page.fill('#qf-first', 'Owner Test');
  await page.fill('#qf-phone', '214-867-5309');
}

for (const path of ['/get-rates/', '/free-quote/']) {
  await check(`signed in at /test/: ${path} runs from the first question to real rates, video, coverage change; no Agent CRM, no production lead, no analytics`, async () => {
    const { ctx, page, analytics } = await context();
    const crmBefore = srv.crm.calls.length;
    const prodBefore = (await keys('qe:production:lead:*')).length;
    const testBefore = (await keys('qe:owner-test:lead:*')).length;
    await page.goto(`${srv.base}/test/`);
    await page.fill('input[name="password"]', OWNER_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector(`a[href="${path}"]`);
    await page.click(`a[href="${path}"]`);
    await page.waitForURL(new RegExp(path));
    await toContact(page);
    await page.click('[data-qf-submit]');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-qf-card]')].some((c) => c.dataset.state === 'ok'), null, { timeout: 10000 });
    const video = await page.evaluate(() => !!document.querySelector('[data-qv]') && !document.querySelector('[data-qv]').hidden);
    await page.keyboard.press('Escape');
    const shown = await page.evaluate(() => ({ banner: !document.querySelector('[data-qf-test]').hidden, amounts: [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent.trim()).filter((t) => /\$\d/.test(t)) }));
    assert(shown.banner, 'TEST MODE note shown');
    assert(shown.amounts.length >= 2, `prices shown: ${shown.amounts.join(' ')}`);
    const before = shown.amounts.join('|');
    await page.click('.qf-adjust input[name="coverage"][value="15000"]', { force: true }).catch(() => page.check('.qf-adjust input[name="coverage"][value="15000"]', { force: true }));
    await page.waitForFunction((b) => [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent.trim()).filter((t) => /\$\d/.test(t)).join('|') !== b, before, { timeout: 8000 });
    assert(srv.crm.calls.length === crmBefore, `Agent CRM calls: ${srv.crm.calls.length - crmBefore}`);
    assert((await keys('qe:production:lead:*')).length === prodBefore, 'production lead record created');
    assert((await keys('qe:owner-test:lead:*')).length === testBefore + 1, 'test record in the owner-test store');
    assert(analytics.length === 0, `analytics requests: ${analytics.join(' ')}`);
    await ctx.close();
    return `video ${video ? 'opened' : 'not shown'}; ${shown.amounts.length} prices`;
  });
}

await check('a browser that only fakes the test ui cookie is refused (no lead, no Agent CRM), with the sign-in message', async () => {
  const { ctx, page } = await context();
  const url = new URL(srv.base);
  await ctx.addCookies([{ name: 'ff_tm_ui', value: '1', domain: url.hostname, path: '/' }]);
  const crmBefore = srv.crm.calls.length;
  const prodBefore = (await keys('qe:production:lead:*')).length;
  await page.goto(`${srv.base}/free-quote/`);
  await toContact(page);
  const res = page.waitForResponse((r) => r.url().includes('/api/quote/') && /"action":"start"/.test(r.request().postData() ?? ''));
  await page.click('[data-qf-submit]');
  assert((await res).status() === 403, 'refused');
  assert(srv.crm.calls.length === crmBefore && (await keys('qe:production:lead:*')).length === prodBefore, 'nothing created');
  await ctx.close();
});

await check('an ordinary visitor is unchanged: the submission reaches Agent CRM as a production lead', async () => {
  const { ctx, page } = await context();
  const crmBefore = srv.crm.calls.length;
  await page.goto(`${srv.base}/free-quote/`);
  await toContact(page);
  await page.fill('#qf-phone', '214-867-5310');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-qf-card]')].some((c) => c.dataset.state === 'ok'), null, { timeout: 10000 });
  assert(srv.crm.calls.slice(crmBefore).some((c) => c.url.endsWith('/contacts/upsert')), 'Agent CRM upsert');
  assert(await page.evaluate(() => document.querySelector('[data-qf-test]').hidden), 'no TEST MODE note');
  await ctx.close();
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
