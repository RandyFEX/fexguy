// Quote System v5.8 browser test: the article sidebar's Get Prices module
// hands the Male/Female choice and the article's attribution to the funnel on
// /free-quote/. Built site + real handlers (tests/quote/funnel-server.mjs,
// Preview test mode: code 123456, no SMS, Formspark and Cloudflare
// intercepted, nothing sent). Run after a build:
//   node tests/quote/sidebar-entry.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
const OUT = process.env.OUT ?? '';
const ARTICLE = '/burial-insurance/cancer/';
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
const step = (page) => page.evaluate(() => Number(document.querySelector('[data-step]:not([hidden])')?.getAttribute('data-step')));
const evidence = async () => (await (await fetch(`${srv.base}/__evidence/`)).json());
const svgs = (html) => [...html.matchAll(/<svg viewBox="0 0 120 120"[\s\S]*?<\/svg>/g)].map((m) => m[0].replace(/\s*data-astro-cid-[a-z0-9]+(="")?/g, ''));

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.route('https://submit-form.com/**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.addInitScript(() => {
    window.__ev = [];
    addEventListener('ff:funnel', (e) => window.__ev.push(e.detail));
  });
  return { ctx, page: await ctx.newPage() };
}
async function finish(page, phone) {
  await page.click('[data-pick="age"][data-value="60"]');
  await page.click('[data-pick="tobacco"][data-value="no"]');
  await page.click('[data-pick="use"][data-value="burial"]');
  await page.click('[data-pick="coverage"][data-value="10000"]');
  await page.selectOption('[data-qf-state]', 'Ohio');
  await page.fill('#qf-first', 'Mary');
  await page.fill('#qf-phone', phone);
  await page.check('[data-qf-consent]');
  await page.click('[data-qf-contact] button[type="submit"]');
  await page.click('[data-qf-send]');
  await page.waitForSelector('[data-qf-verify]:not([hidden])');
  await page.fill('#qf-code', '123456');
  await page.click('[data-qf-verify-btn]');
  await page.waitForFunction(() => [...document.querySelectorAll('.qf-card')].every((c) => c.dataset.state === 'ok'), null, { timeout: 8000 });
}

// The sidebar reuses the funnel's own drawings, byte for byte.
const funnelHtml = readFileSync(new URL('../../dist/free-quote/index.html', import.meta.url), 'utf8');
const articleHtml = readFileSync(new URL(`../../dist${ARTICLE}index.html`, import.meta.url), 'utf8');
await check('the sidebar shows the funnel\'s exact Male and Female illustrations, and no old lead form', async () => {
  const a = svgs(articleHtml.match(/<div class="quote-box[^"]*gp"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/)?.[0] ?? '');
  const f = svgs(funnelHtml);
  assert(a.length === 2 && f.length === 2 && a[0] === f[0] && a[1] === f[1], `illustrations differ (${a.length}/${f.length})`);
  assert(!/data-lead-form|Request Rates or Info/.test(articleHtml), 'old sidebar form still on the article');
  assert(!/data-lead-form|Request a Callback/.test(funnelHtml), 'old callback form still on /free-quote/');
});

const PHONES = { mobile: '214-867-5309', desktop: '972-867-5310' };
for (const [name, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  await check(`${name}: direct /free-quote/ starts at Who Needs Coverage? (direct entry)`, async () => {
    const { ctx, page } = await newPage(opts);
    await page.goto(`${srv.base}/free-quote/`);
    await page.waitForSelector('[data-step="1"]:not([hidden])');
    assert((await page.textContent('#qf-s1')).trim() === 'Who Needs Coverage?', 'first screen');
    const ev = await page.evaluate(() => window.__ev.find((e) => e.name === 'quote_funnel_entry'));
    assert(ev && ev.entryType === 'direct' && !ev.entryPath, `entry event ${JSON.stringify(ev)}`);
    await ctx.close();
  });

  for (const gender of ['male', 'female']) {
    await check(`${name}: sidebar ${gender} opens /free-quote/ at the age question with the choice kept`, async () => {
      const { ctx, page } = await newPage(opts);
      await page.goto(`${srv.base}${ARTICLE}?utm_source=newsletter&utm_campaign=fall`);
      const box = page.locator('[data-get-prices]');
      await box.scrollIntoViewIfNeeded();
      const t = await box.evaluate((b) => ({ title: b.querySelector('.quote-box__title').textContent.trim(), q: b.querySelector('.gp__q').textContent.trim(), w: b.getBoundingClientRect().width, links: [...b.querySelectorAll('a.qf-person')].map((a) => a.textContent.trim()) }));
      assert(t.title === 'Get Prices' && t.q === 'Who Needs Coverage?' && t.links.join() === 'Male,Female', JSON.stringify(t));
      if (OUT && gender === 'male') await box.screenshot({ path: `${OUT}/sidebar-${name}.png` });
      await box.locator(`[data-gp-gender="${gender}"]`).click();
      await page.waitForURL(/\/free-quote\//);
      await page.waitForSelector('[data-step="2"]:not([hidden])');
      const url = new URL(page.url());
      assert(url.pathname === '/free-quote/' && !url.searchParams.has('gender') && !url.searchParams.has('origin') && url.searchParams.get('utm_source') === 'newsletter' && url.searchParams.get('utm_campaign') === 'fall', `URL ${page.url()}`);
      assert((await page.textContent('#qf-s2')).trim() === 'How Old Are You?', 'not the age question');
      const pressed = await page.getAttribute(`[data-pick="gender"][data-value="${gender}"]`, 'aria-pressed');
      assert(pressed === 'true', 'choice not kept');
      if (OUT && gender === 'male') await page.screenshot({ path: `${OUT}/age-${name}.png` });
      // Back returns to the choice, and the visitor can change it.
      await page.click('[data-qf-back]');
      assert((await step(page)) === 1, 'Back did not return to the choice');
      const other = gender === 'male' ? 'female' : 'male';
      await page.click(`[data-pick="gender"][data-value="${other}"]`);
      assert((await step(page)) === 2, 'changing the choice did not advance');
      await page.click('[data-qf-back]');
      await page.click(`[data-pick="gender"][data-value="${gender}"]`);
      const phone = gender === 'male' ? PHONES[name] : PHONES[name].replace(/9$/, '1').replace(/0$/, '2');
      await finish(page, phone);
      const prices = await page.$$eval('[data-qf-amount]', (els) => els.map((e) => e.textContent.trim()));
      assert(prices.length === 3 && prices.every((p) => /^\$\d+\.\d\d$/.test(p)), `prices ${prices}`);
      // A quote adjustment reprices and keeps the source.
      const before = await page.textContent('[data-qf-card="average-standard"] [data-qf-amount]');
      await page.click('.qf-adjust label:has(input[name="tobacco"][value="yes"])');
      await page.waitForFunction((b) => document.querySelector('[data-qf-card="average-standard"] [data-qf-amount]')?.textContent !== b, before, { timeout: 5000 });
      const ev = await page.evaluate(() => window.__ev);
      assert(ev.some((e) => e.name === 'quote_pricing_adjust'), 'no adjustment event');
      const names = ev.map((e) => e.name);
      assert(names.includes('quote_sidebar_select') && names.includes('quote_funnel_entry') && names.includes('quote_pricing_view'), names.join());
      assert(ev.every((e) => e.entryType === 'article-sidebar' && e.entryPath === ARTICLE), `event source ${JSON.stringify(ev.find((e) => e.entryPath !== ARTICLE))}`);
      assert(!JSON.stringify(ev).includes('Mary') && !JSON.stringify(ev).includes(phone.slice(-4)), 'personal data in analytics');
      const rec = (await evidence()).find((r) => r.phone.endsWith(phone.replace(/\D/g, '').slice(-4)));
      assert(rec, 'no lead record');
      const s = rec.source;
      const h1 = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      assert(s.entryType === 'article-sidebar' && s.originTitle === h1 && s.originUrl === `${srv.base}${ARTICLE}` && s.entryGender === gender && !Number.isNaN(Date.parse(s.entryAt)), `source ${JSON.stringify(s)}`);
      assert(s.page.endsWith('/free-quote/') && s.utmSource === 'newsletter' && s.utmCampaign === 'fall', `campaign ${JSON.stringify(s)}`);
      assert(rec.consent.given === true && rec.consent.text, 'consent not recorded');
      await ctx.close();
      return `${s.originTitle}`;
    });
  }
}

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
