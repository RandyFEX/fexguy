// Two-stage countdown timers V2.0 (Randy, November 2026): the /free-quote/
// results line ("Offer viewable for: 10:00") and the /facebook/ Ready to
// Apply line ("Your offer will expire in: 2:00"). Built site + real handlers
// in test mode (tests/quote/funnel-server.mjs; code 123456, nothing sent),
// with Playwright's fake clock. Needs a build and the private rate tables.
//   node tests/quote/countdown.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
const URL_ = `${srv.base}/free-quote/`;
const OUT = process.env.OUT ?? '';
const RESULTS = /^Let us check your lowest rates from 30\+ insurance companies\. Offer viewable for: (\d+:\d\d)$/;
const APPLY = /^Your offer will expire in: (\d+:\d\d)$/;
const YELLOW = 'rgb(255, 235, 59)';
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
const secs = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
const lead = (page) => page.$eval('[data-qf-results-lead]', (e) => e.textContent.trim());
const ready = (page) => page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });

async function verified(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto(URL_);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="male"]', '[data-pick="age"][data-value="60"]', '[data-pick="tobacco"][data-value="no"]', '[data-pick="use"][data-value="burial"]', '[data-pick="coverage"][data-value="10000"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.fill('#qf-first', 'Test');
  await page.fill('#qf-phone', '214-867-5309');
  await page.click('[data-qf-contact] button[type="submit"]');
  await page.waitForSelector('[data-step="8"]:not([hidden])');
  // The timer is not shown before the prices are.
  assert(await page.isHidden('[data-qf-results-lead]'), 'countdown shown before verification');
  await page.click('[data-qf-send]');
  await page.waitForSelector('[data-qf-verify]:not([hidden])');
  await page.fill('#qf-code', '123456');
  await page.click('[data-qf-verify-btn]');
  await ready(page);
  return { ctx, page };
}

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
  let ctx, page;
  await check(`${name}: results line reads the approved wording and starts at 10:00`, async () => {
    ({ ctx, page } = await verified(opts));
    const m = (await lead(page)).match(RESULTS);
    assert(m && m[1] === '10:00', `results line "${await lead(page)}"`);
    if (OUT) await page.locator('.qf-results').screenshot({ path: `${OUT}/${name}-results-timer.png` });
  });
  await check(`${name}: only the countdown digits are yellow; the line is one element (inline on desktop, wraps on phones)`, async () => {
    const s = await page.evaluate(() => {
      const p = document.querySelector('[data-qf-results-lead]'), t = p.querySelector('[data-qf-countdown]');
      const lines = Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
      return { tag: p.tagName, children: p.children.length, digits: t.textContent, bg: getComputedStyle(t).backgroundColor, pBg: getComputedStyle(p).backgroundColor, pColor: getComputedStyle(p).color, lines };
    });
    assert(s.tag === 'P' && s.children === 1 && /^\d+:\d\d$/.test(s.digits) && s.bg === YELLOW && s.pBg === 'rgba(0, 0, 0, 0)', JSON.stringify(s));
    assert(name === 'desktop' ? s.lines === 1 : s.lines >= 2, `lines ${s.lines}`);
    return `${s.lines} line(s)`;
  });
  await check(`${name}: counts down every second; pricing changes and a refresh keep the same end time`, async () => {
    await page.clock.runFor(5000);
    assert((await lead(page)).endsWith('9:55'), `after 5s: ${await lead(page)}`);
    await page.selectOption('#qf-adj-age', '65');
    await page.clock.runFor(1000);
    await page.waitForFunction(() => /Offer viewable for: 9:5[0-4]$/.test(document.querySelector('[data-qf-results-lead]').textContent), null, { timeout: 5000 });
    await page.click('.qf-adjust label:has(input[name="coverage"][value="15000"])');
    await page.clock.runFor(1000);
    assert(!(await lead(page)).endsWith('10:00'), 'pricing change restarted the timer');
    await page.reload();
    await ready(page);
    const left = secs((await lead(page)).match(RESULTS)[1]);
    assert(left <= 593 && left >= 585, `after refresh ${left}s left`);
    return `${left}s left after refresh`;
  });
  await check(`${name}: Apply Now shows "Your offer will expire in: 2:00" (yellow digits); it counts down and survives a refresh`, async () => {
    await page.click('[data-qf-card="average-standard"] [data-qf-apply]');
    await page.waitForURL(/\/facebook\//, { timeout: 8000 });
    await page.waitForSelector('[data-fb-offer]:not([hidden])');
    const t = await page.$eval('[data-fb-offer]', (e) => ({ text: e.textContent.trim(), color: getComputedStyle(e.querySelector('[data-fb-offer-time]')).color, pColor: getComputedStyle(e).color, children: e.children.length, lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)) }));
    assert(t.text === 'Your offer will expire in: 2:00' && t.color === YELLOW && t.pColor === 'rgb(255, 255, 255)' && t.children === 1 && t.lines === 1, JSON.stringify(t));
    assert(await page.isVisible('[data-fb-quote]'), 'selected quote hidden');
    assert(!(await page.evaluate(() => /remain active for the next 12 hours/i.test(document.body.innerText))), 'old 12-hour message shown');
    if (OUT) await page.locator('.fb-hero').screenshot({ path: `${OUT}/${name}-apply-timer.png` });
    await page.clock.runFor(30000);
    assert(APPLY.exec((await page.textContent('[data-fb-offer]')).trim())[1] === '1:30', 'not 1:30 after 30s');
    await page.reload();
    await page.waitForSelector('[data-fb-offer]:not([hidden])');
    assert(APPLY.exec((await page.textContent('[data-fb-offer]')).trim())[1] === '1:30', 'refresh restarted the apply timer');
  });
  await check(`${name}: at 0:00 the apply offer expires (call buttons stay); Start New Quote opens a fresh quote`, async () => {
    await page.clock.runFor(90000);
    const e = await page.evaluate(() => ({ text: document.querySelector('[data-fb-offer]').textContent.trim(), quote: !document.querySelector('[data-fb-quote]').hidden, restart: !document.querySelector('[data-fb-offer-restart]').hidden, calls: [...document.querySelectorAll('.fb-call__btn')].filter((a) => a.getClientRects().length && a.getAttribute('href').startsWith('tel:')).length }));
    assert(e.text === 'Your offer will expire in: 0:00' && !e.quote && e.restart && e.calls >= 1, JSON.stringify(e));
    if (OUT) await page.locator('.fb-hero').screenshot({ path: `${OUT}/${name}-apply-expired.png` });
    await page.click('[data-fb-offer-restart]');
    await page.waitForURL(/\/free-quote\/$/);
    await page.waitForSelector('[data-step="1"]:not([hidden])');
    const st = await page.evaluate(async () => ({ keys: Object.keys(localStorage).filter((k) => k.startsWith('ff:quote-') && k !== 'ff:quote-visit'), price: (await fetch('/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': localStorage.getItem('ff:quote-visit') ?? 'none-visit-00000000' }, body: JSON.stringify({ age: 60, gender: 'male', tobacco: false, coverage: 10000 }) })).status }));
    assert(st.keys.length === 0 && st.price === 401, JSON.stringify(st));
  });
  await ctx?.close();

  await check(`${name}: at 0:00 the results prices are hidden, a refresh keeps them expired, Start New Quote restarts`, async () => {
    const v = await verified(opts);
    await v.page.clock.runFor(10 * 60 * 1000);
    const real = await v.page.evaluate(() => ({ text: document.querySelector('[data-qf-results-lead]').textContent.trim(), amounts: [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent), apply: [...document.querySelectorAll('[data-qf-apply]')].every((b) => b.disabled), adjust: document.querySelector('[data-qf-adjust]').hidden, restart: !document.querySelector('[data-qf-restart]').hidden }));
    assert(real.text.endsWith('Offer viewable for: 0:00') && real.apply && real.adjust && real.restart && real.amounts.every((a) => /This offer has expired/.test(a)), JSON.stringify(real));
    if (OUT) await v.page.locator('.qf-results').screenshot({ path: `${OUT}/${name}-results-expired.png` });
    await v.page.reload();
    await v.page.waitForSelector('[data-qf-restart]:not([hidden])', { timeout: 8000 });
    assert((await lead(v.page)).endsWith('0:00'), 'refresh restarted an expired results timer');
    await v.page.click('[data-qf-restart]');
    await v.page.waitForURL(/\/free-quote\/$/);
    await v.page.waitForSelector('[data-step="1"]:not([hidden])');
    await v.ctx.close();
  });
}

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
