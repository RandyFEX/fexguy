// Pricing reliability v1.3 (Randy, November 2026): the real /api/quote/ and
// /api/price-explorer/ handlers (tests/quote/funnel-server.mjs, preview mode,
// a throwaway redis-server), with TEST-ONLY rate tables (made-up flat rates,
// never shown anywhere; the private carrier tables are not needed). It checks
// that a submitted prospect always reaches prices without another submission:
// a new quote, an expired earlier quote in the same browser, several tabs,
// a slow or failing price service (automatic retries, Try Again), and the
// video's presentation-only price blur. Mocked pricing: these are not the
// carriers' rates. Run after a build:
//   node tests/quote/pricing-reliability.browser.mjs
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';
import { PRODUCTS } from '../../server/rates/products.js';

const { chromium, devices } = createRequire(import.meta.url)('playwright');

// TEST-ONLY tables: one flat made-up rate per product (Gerber left out: its card shows "Not available").
const datasets = {};
for (const [id, rate] of [['aetna-accendo-preferred', '50.00'], ['moo-living-promise-level', '40.00']]) {
  const p = PRODUCTS[id];
  const records = [];
  for (let a = p.issueAges.min; a <= p.issueAges.max; a++)
    for (const gender of ['male', 'female']) for (const tobacco of p.tobaccoClasses) records.push({ issueAge: a, gender, tobacco, annualRatePer1000: rate });
  datasets[id] = { productId: id, records };
}
const srv = await startFunnelServer({ videoIntro: true, datasets });
const browser = await chromium.launch();
const URL_ = `${srv.base}/free-quote/`;
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${String(e.message).split('\n')[0]}`);
  }
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
let ip = 10;

/** One browser (shared storage and cookies, like a person's phone) with request counters. */
async function newBrowser(device = devices['iPhone 13']) {
  const ctx = await browser.newContext({ ...device, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const counts = { start: 0, resume: 0, price: 0 };
  ctx.on('request', (r) => {
    if (r.url().endsWith('/api/price-explorer/')) counts.price++;
    if (r.url().endsWith('/api/quote/')) {
      const a = JSON.parse(r.postData() ?? '{}').action;
      if (a === 'start') counts.start++;
      if (a === 'resume') counts.resume++;
    }
  });
  return { ctx, counts };
}
// A different valid number each time (the server allows 4 submissions per number per hour).
let phoneN = 5310;
const nextPhone = () => `214-867-${phoneN++}`;
async function toContact(page) {
  await page.goto(URL_);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="68"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.fill('#qf-first', 'Pat');
  await page.fill('#qf-phone', nextPhone());
}
const cardState = (page) =>
  page.evaluate(() => ({
    step: [...document.querySelectorAll('[data-step]')].find((s) => !s.hidden)?.dataset.step,
    states: [...document.querySelectorAll('[data-qf-card]')].map((c) => c.dataset.state),
    amounts: [...document.querySelectorAll('[data-qf-card] [data-qf-amount]')].map((a) => a.textContent.trim()),
    placeholders: document.querySelectorAll('[data-qf-card] .qf-blur').length,
    veil: document.querySelector('[data-quote-funnel]').hasAttribute('data-video-veil'),
    amountFilter: getComputedStyle(document.querySelector('[data-qf-amount]')).filter,
    overlay: !document.querySelector('[data-qv]').hidden,
    retry: document.querySelector('[data-qf-retry-box]').hidden ? null : document.querySelector('[data-qf-retry-msg]').textContent,
    tryAgain: !document.querySelector('[data-qf-retry]').hidden,
    restart: !document.querySelector('[data-qf-restart]').hidden,
  }));
const priced = (s) => s.step === '7' && s.states[0] === 'ok' && s.states[1] === 'ok' && /^\$\d/.test(s.amounts[0]) && s.placeholders === 0;
const waitPriced = (page, timeout = 15000) =>
  page.waitForFunction(() => {
    const c = [...document.querySelectorAll('[data-qf-card]')];
    return c[0]?.dataset.state === 'ok' && c[1]?.dataset.state === 'ok' && !document.querySelector('[data-qf-card] .qf-blur');
  }, null, { timeout });
const closeVideo = (page) => page.evaluate(() => document.querySelector('[data-qv-close]')?.click());
const leadCount = async () => (await (await fetch(`${srv.base}/__evidence/`)).json()).length;

await check('new quote on a phone: prices load behind the video; only the price figures are blurred while it plays; the video ending reveals them at once', async () => {
  const { ctx, counts } = await newBrowser();
  const page = await ctx.newPage();
  await page.addInitScript(() => document.addEventListener('ended', () => (window.__ended = true), true));
  await toContact(page);
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  await waitPriced(page);
  let s = await cardState(page);
  assert(s.overlay && s.veil && /blur/.test(s.amountFilter), `figures not blurred during the video: ${JSON.stringify(s)}`);
  const otherFilter = await page.evaluate(() => getComputedStyle(document.querySelector('.qf-card__label')).filter);
  assert(otherFilter === 'none', 'the rest of the card is blurred');
  // End of the video: overlay closes, figures clear.
  await page.waitForFunction(() => document.querySelector('[data-qv] video').currentTime > 0.3, null, { timeout: 8000 });
  // Played to its natural end (this test server has no byte ranges, so no seeking).
  await page.waitForSelector('[data-qv]', { state: 'hidden', timeout: 45000 });
  assert((await page.evaluate(() => window.__ended)) === true, 'closed before the end');
  s = await cardState(page);
  assert(priced(s) && !s.veil && s.amountFilter === 'none' && !s.retry, JSON.stringify(s));
  assert(counts.start === 1 && counts.resume === 0, JSON.stringify(counts));
  await ctx.close();
});

await check('early close: the figures clear at once', async () => {
  const { ctx } = await newBrowser();
  const page = await ctx.newPage();
  await toContact(page);
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  await waitPriced(page);
  await closeVideo(page);
  const s = await cardState(page);
  assert(priced(s) && !s.veil && s.amountFilter === 'none', JSON.stringify(s));
  await ctx.close();
});

await check('video file fails: the overlay never covers the prices and the figures are not blurred', async () => {
  const { ctx } = await newBrowser();
  const page = await ctx.newPage();
  await page.route(/\/videos\/quote-intro\//, (r) => r.fulfill({ status: 404, body: '' }));
  await toContact(page);
  await page.click('[data-qf-submit]');
  await waitPriced(page);
  await page.waitForTimeout(1000);
  const s = await cardState(page);
  assert(priced(s) && !s.overlay && !s.veil, JSON.stringify(s));
  await ctx.close();
});

await check('returning visitor whose earlier quote expired in this browser: the new submission shows prices (fresh 10:00), no Start New Quote', async () => {
  const { ctx, counts } = await newBrowser();
  await ctx.addInitScript(() => {
    if (localStorage.getItem('ff:quote-visit')) return;
    localStorage.setItem('ff:quote-visit', 'stalevisit0000000002');
    localStorage.setItem('ff:quote-offer-results', JSON.stringify({ visit: 'stalevisit0000000002', expiresAt: Date.now() - 86400e3 }));
  });
  const page = await ctx.newPage();
  await toContact(page);
  await page.click('[data-qf-submit]');
  await waitPriced(page);
  await closeVideo(page);
  const s = await cardState(page);
  const timer = await page.textContent('[data-qf-countdown]');
  assert(priced(s) && !s.restart && /^(10:00|9:\d\d)$/.test(timer), JSON.stringify({ ...s, timer }));
  assert(counts.start === 1, JSON.stringify(counts));
  await ctx.close();
});

await check('two tabs: Start New Quote in an older tab while the new quote plays its video: the new tab keeps its prices and stays repriceable; no second lead', async () => {
  const { ctx, counts } = await newBrowser(devices['Desktop Chrome']);
  // Tab A: an earlier quote, still open.
  const a = await ctx.newPage();
  await toContact(a);
  await a.fill('#qf-phone', nextPhone());
  await a.click('[data-qf-submit]');
  await waitPriced(a);
  await closeVideo(a);
  // Tab B: a new tab of the same browser returns to that quote (12-hour access); start a fresh one there.
  const b = await ctx.newPage();
  await b.goto(URL_);
  await waitPriced(b);
  await b.click('[data-qf-restart]').catch(() => {});
  const leadsBefore = await leadCount();
  // Restart B through its own Start New Quote path, as a visitor would after an expired offer.
  await b.evaluate(() => {
    const btn = document.querySelector('[data-qf-restart]');
    btn.hidden = false;
    btn.click();
  });
  await b.waitForSelector('[data-step="1"]:not([hidden])', { timeout: 10000 });
  for (const s of ['[data-pick="gender"][data-value="male"]', '[data-pick="age"][data-value="70"]', '[data-pick="tobacco"][data-value="no"]']) await b.click(s);
  await b.selectOption('[data-qf-state]', 'Texas');
  await b.waitForSelector('[data-step="6"]:not([hidden])');
  await b.fill('#qf-first', 'Pat');
  await b.fill('#qf-phone', nextPhone());
  await b.click('[data-qf-submit]');
  await b.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  // Meanwhile tab A presses Start New Quote on its older quote.
  await a.evaluate(() => {
    const btn = document.querySelector('[data-qf-restart]');
    btn.hidden = false;
    btn.click();
  });
  await a.waitForSelector('[data-step="1"]:not([hidden])', { timeout: 10000 });
  await waitPriced(b);
  await closeVideo(b);
  // Tab B changes coverage: still priced, without another submission.
  await b.click('.qf-group--coverage label:has(input[value="15000"])');
  await b.waitForTimeout(1500);
  const s = await cardState(b);
  assert(priced(s), `new tab lost its prices: ${JSON.stringify(s)}`);
  assert((await leadCount()) === leadsBefore + 1, 'a second lead was created');
  assert(counts.start === 2, JSON.stringify(counts));
  await ctx.close();
});

await check('two tabs: another tab submits a newer quote (replacing the shared cookie): this tab re-opens its own quote automatically and keeps repricing; no new lead', async () => {
  const { ctx, counts } = await newBrowser(devices['Desktop Chrome']);
  const a = await ctx.newPage();
  await toContact(a);
  await a.click('[data-qf-submit]');
  await waitPriced(a);
  await closeVideo(a);
  // Another tab, with its own (cleared) quote storage, submits a newer quote: the cookie now holds that one.
  const b = await ctx.newPage();
  await b.addInitScript(() => { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.clear(); } });
  await b.route('**/api/quote/', (r) => (JSON.parse(r.request().postData() ?? '{}').action === 'session' ? r.fulfill({ json: { status: 'not-verified' } }) : r.continue()));
  await toContact(b);
  await b.fill('#qf-phone', nextPhone());
  await b.click('[data-qf-submit]');
  await waitPriced(b);
  const leads = await leadCount();
  const startsBefore = counts.start;
  // Tab A reprices: its session is gone from the cookie; it re-opens its own lead.
  await a.click('.qf-group--coverage label:has(input[value="20000"])');
  await a.waitForTimeout(2000);
  const s = await cardState(a);
  assert(priced(s), `older tab lost its prices: ${JSON.stringify(s)}`);
  assert(counts.resume >= 1 && counts.start === startsBefore && (await leadCount()) === leads, JSON.stringify({ counts, leads }));
  await ctx.close();
});

await check('slow price service (5 s): "Still loading your rates…" shows, then the prices; no retry storm', async () => {
  const { ctx, counts } = await newBrowser();
  const page = await ctx.newPage();
  await page.route('**/api/price-explorer/', async (r) => {
    await new Promise((ok) => setTimeout(ok, 5000));
    await r.continue();
  });
  await toContact(page);
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  await closeVideo(page);
  await page.waitForFunction(() => /Still loading/.test(document.querySelector('[data-qf-retry-msg]').textContent), null, { timeout: 5000 });
  await waitPriced(page);
  const s = await cardState(page);
  assert(priced(s) && !s.retry && counts.price === 1, JSON.stringify({ ...s, counts }));
  await ctx.close();
});

await check('price service fails twice (503, then a dropped connection): retried automatically, prices appear; one lead, one submission', async () => {
  const { ctx, counts } = await newBrowser();
  const page = await ctx.newPage();
  let n = 0;
  await page.route('**/api/price-explorer/', (r) => (++n === 1 ? r.fulfill({ status: 503, json: { status: 'unavailable' } }) : n === 2 ? r.abort('connectionreset') : r.continue()));
  const leads = await leadCount();
  await toContact(page);
  await page.click('[data-qf-submit]');
  await waitPriced(page, 20000);
  await closeVideo(page);
  const s = await cardState(page);
  assert(priced(s) && !s.retry && n === 3, JSON.stringify({ ...s, n }));
  assert(counts.start === 1 && (await leadCount()) === leads + 1, JSON.stringify(counts));
  await ctx.close();
});

await check('price service down for every retry: a clear message with Try Again (no placeholders left); Try Again loads the prices with no new submission', async () => {
  const { ctx, counts } = await newBrowser();
  const page = await ctx.newPage();
  let down = true;
  await page.route('**/api/price-explorer/', (r) => (down ? r.fulfill({ status: 502, body: 'Bad gateway' }) : r.continue()));
  await toContact(page);
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  await closeVideo(page);
  await page.waitForSelector('[data-qf-retry]:not([hidden])', { timeout: 20000 });
  let s = await cardState(page);
  assert(s.placeholders === 0 && /didn't load/.test(s.retry) && s.tryAgain, JSON.stringify(s));
  down = false;
  await page.click('[data-qf-retry]');
  await waitPriced(page);
  s = await cardState(page);
  assert(priced(s) && !s.retry && counts.start === 1, JSON.stringify({ ...s, counts }));
  await ctx.close();
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
