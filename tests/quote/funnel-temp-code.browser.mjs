// Quote funnel v5.4 browser test: Production without Twilio (the temporary
// public access code). Built site + real handlers via tests/quote/funnel-server.mjs
// with { production: true }; Formspark and Cloudflare are intercepted, so
// nothing is sent. Needs a build and the private rate tables (runs locally).
//   node tests/quote/funnel-temp-code.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer({ production: true });
const URL_ = `${srv.base}/free-quote/`;
const OUT = process.env.OUT ?? '';
const NOTE = 'Enter access code 123456 to view your insurance quotes.';
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
const priceStatus = (page) =>
  page.evaluate(async () => (await fetch('/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': sessionStorage.getItem('ff:quote-visit') ?? 'none-visit-00000000' }, body: JSON.stringify({ age: 60, gender: 'male', tobacco: false, coverage: 10000 }) })).status);
const PHONES = { mobile: '214-867-5309', desktop: '972-867-5310' };

for (const [name, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  await ctx.route('https://submit-form.com/**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  const page = await ctx.newPage();

  await check(`${name}: unlock panel shows the access-code instruction instead of the SMS sentence`, async () => {
    await page.goto(URL_);
    await page.waitForSelector('[data-step="1"]:not([hidden])');
    // The instruction is not in the page HTML; only the server sends it (the hidden Preview
    // banner, unchanged, is the only other place the test code appears, and it stays hidden).
    assert(!(await (await fetch(URL_)).text()).includes('Enter access code'), 'instruction in the HTML');
    for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="60"]', '[data-pick="tobacco"][data-value="no"]', '[data-pick="use"][data-value="cremation"]', '[data-pick="coverage"][data-value="10000"]']) await page.click(s);
    await page.selectOption('[data-qf-state]', 'Ohio');
    await page.fill('#qf-first', 'Mary');
    await page.fill('#qf-phone', PHONES[name]);
    await page.click('[data-qf-contact] button[type="submit"]');
    await page.waitForSelector('[data-step="8"]:not([hidden])');
    const p = await page.evaluate(() => {
      const vis = (e) => !!e && e.getClientRects().length > 0;
      const parts = ['#qf-unlock-title', '[data-qf-send]', '[data-qf-send-form] [data-qf-temp-note]', '[data-qf-edit-phone]', '#qf-verify-rates'].map((s) => document.querySelector(s));
      return {
        texts: parts.map((e) => (vis(e) ? e.textContent.trim() : null)),
        tops: parts.map((e) => e.getBoundingClientRect().top),
        sms: vis(document.querySelector('[data-qf-phone-summary]')),
        panel: document.querySelector('[data-qf-unlock]').innerText,
        banner: vis(document.querySelector('[data-qf-test]')),
        subtitle: vis(document.querySelector('[data-qf-results-sub]')),
      };
    });
    assert(JSON.stringify(p.texts) === JSON.stringify(['Unlock Your Rates', 'Text Me My Access Code', NOTE, 'Change Number', 'Message and data rates may apply.']), `panel ${JSON.stringify(p.texts)}`);
    assert(p.tops.every((t, i) => i === 0 || t > p.tops[i - 1]), `order ${p.tops}`);
    assert(!p.sms && !/We'll text|sent to|on its way/i.test(p.panel), `SMS wording shown: ${p.panel}`);
    assert(!p.banner && !p.subtitle, 'preview banner or subtitle shown before unlocking');
    if (OUT) await page.locator('[data-qf-unlock]').screenshot({ path: `${OUT}/temp-${name}-unlock.png` });
  });

  await check(`${name}: code entry keeps the instruction, claims no text message, then 123456 unlocks this visitor's quotes`, async () => {
    assert((await priceStatus(page)) === 401, 'prices before the code');
    await page.click('[data-qf-send]');
    await page.waitForSelector('[data-qf-verify]:not([hidden])');
    const c = await page.evaluate(() => {
      const f = document.querySelector('[data-qf-verify]');
      const vis = (e) => !!e && e.getClientRects().length > 0;
      return { text: f.innerText, note: vis(f.querySelector('[data-qf-temp-note]')), resend: vis(f.querySelector('[data-qf-resend]')), field: vis(f.querySelector('#qf-code')), focused: document.activeElement?.id === 'qf-code' };
    });
    assert(c.note && c.text.includes('Enter the 6-digit code') && c.text.includes(NOTE) && c.field && c.focused, `code screen ${JSON.stringify(c)}`);
    assert(!c.resend && !/sent|on its way|text message/i.test(c.text), `SMS claim on the code screen: ${c.text}`);
    if (OUT) await page.locator('[data-qf-unlock]').screenshot({ path: `${OUT}/temp-${name}-code.png` });
    await page.fill('#qf-code', '000000');
    await page.click('[data-qf-verify-btn]');
    await page.waitForFunction(() => /not right/.test(document.querySelector('[data-qf-verify-status]').textContent));
    assert((await priceStatus(page)) === 401, 'a wrong code unlocked prices');
    await page.fill('#qf-code', '123456');
    await page.click('[data-qf-verify-btn]');
    await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    const r = await page.evaluate(() => ({
      title: document.querySelector('#qf-s8').textContent.trim(),
      sub: document.querySelector('[data-qf-results-sub]').textContent.trim(),
      cards: [...document.querySelectorAll('.qf-card')].map((e) => e.dataset.state),
      prices: [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent.trim()),
      banner: document.querySelector('[data-qf-test]').getClientRects().length > 0,
    }));
    assert(r.title === 'Your Insurance Quotes' && r.sub === 'Here Are 3 of Your 30+ Insurance Company Options' && r.cards.every((s) => s === 'ok') && r.prices.every((p) => /^\$\d+\.\d\d$/.test(p)) && !r.banner, JSON.stringify(r));
    assert((await priceStatus(page)) === 200, 'no prices after the code');
    if (OUT) await page.screenshot({ path: `${OUT}/temp-${name}-revealed.png` });
    return r.prices.join(', ');
  });

  await check(`${name}: the code opens nothing for another visitor (new tab, no request of its own)`, async () => {
    const other = await ctx.newPage();
    await other.goto(URL_);
    await other.waitForSelector('[data-step="1"]:not([hidden])');
    assert((await priceStatus(other)) === 401, 'another tab got prices');
    const s = await other.evaluate(async () => (await (await fetch('/api/quote/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': sessionStorage.getItem('ff:quote-visit') }, body: JSON.stringify({ action: 'check', lead: '00000000-0000-0000-0000-000000000000', code: '123456' }) })).json()).status);
    assert(s === 'expired', `check without a request: ${s}`);
    await other.close();
  });
  await ctx.close();
}

await check('evidence: real production leads, consent kept, never marked SMS-verified', async () => {
  const recs = await (await fetch(`${srv.base}/__evidence/`)).json();
  assert(recs.length === 2, `${recs.length} records`);
  for (const r of recs) {
    assert(r.mode === 'public-test' && r.verification.status === 'test-code-accepted' && r.verification.phoneVerified === false && r.verification.verifiedAt === null, JSON.stringify(r.verification));
    assert(r.consent && typeof r.consent.given === 'boolean' && r.consent.action, 'consent record');
    assert(r.temporaryCodeNotice === NOTE, 'instruction shown not recorded');
  }
  return `${recs.length} records`;
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
