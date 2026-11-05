// Direct preview access V1.1 (Randy, November 2026): the two preview-only links
// open the real final pages in a fresh browser, with the fixed sample and no
// earlier steps:
//   /free-quote/?preview=results   the three unlocked rate cards
//   /facebook/?preview=apply       the Ready to Apply page with the sample's selection
// No lead, SMS or CRM delivery; refused when the handlers run as Production.
// Built site + real handlers (tests/quote/funnel-server.mjs). Needs a build.
//   node tests/quote/preview-links.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
const prod = await startFunnelServer({ production: true });
const OUT = process.env.OUT ?? '';
const browser = await chromium.launch();
// Requests the preview links must never make (CRM, SMS, email, form services).
const EXTERNAL = /^https:\/\/([a-z0-9-]+\.)*(leadconnectorhq\.com|twilio\.com|resend\.com|submit-form\.com|challenges\.cloudflare\.com)\//;
const external = [];
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
const fresh = async (opts) => {
  const ctx = await browser.newContext(opts);
  await ctx.route(EXTERNAL, (r) => { external.push(r.request().url()); return r.abort(); });
  return { ctx, page: await ctx.newPage() };
};

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
  await check(`${name}: /free-quote/?preview=results opens the unlocked results directly (three cards, live controls)`, async () => {
    const { ctx, page } = await fresh(opts);
    await page.goto(`${srv.base}/free-quote/?preview=results`);
    await page.waitForFunction(() => [...document.querySelectorAll('.qf-card')].every((c) => c.dataset.state === 'ok'), null, { timeout: 10000 });
    const r = await page.evaluate(() => ({
      step: document.querySelector('[data-step]:not([hidden])')?.getAttribute('data-step'),
      labels: [...document.querySelectorAll('.qf-card__label')].map((e) => e.textContent.trim()),
      prices: [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent.trim()),
      controls: !document.querySelector('[data-qf-adjust]').hidden,
      lead: document.querySelector('[data-qf-results-lead]').textContent.trim(),
      calls: [...document.querySelectorAll('[data-qf-call]')].filter((a) => a.getClientRects().length).map((a) => a.getAttribute('href')),
      url: location.pathname + location.search,
    }));
    assert(r.step === '8' && r.labels.length === 3 && r.prices.every((p) => /^\$\d+\.\d\d$/.test(p)) && r.controls && r.calls.length === 3 && r.calls.every((h) => h === 'tel:8888629456'), JSON.stringify(r));
    assert(/Offer available for: (10:00|9:5\d)$/.test(r.lead) && r.url === '/free-quote/', JSON.stringify(r));
    // The controls reprice through the real rate engine.
    const before = r.prices.join();
    await page.selectOption('#qf-adj-age', '70');
    await page.waitForFunction((b) => [...document.querySelectorAll('[data-qf-amount]')].map((e) => e.textContent.trim()).join() !== b, before, { timeout: 8000 });
    if (OUT) await page.screenshot({ path: `${OUT}/preview-results-${name}.png`, fullPage: true });
    // A refresh stays on the results (the sample session), never the first question.
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await ctx.close();
    return r.prices.join(', ');
  });

  await check(`${name}: /facebook/?preview=apply opens Ready to Apply directly with the sample selection (no earlier page)`, async () => {
    const { ctx, page } = await fresh(opts);
    await page.goto(`${srv.base}/facebook/?preview=apply`);
    await page.waitForSelector('[data-fb-quote]:not([hidden])', { timeout: 10000 });
    const r = await page.evaluate(() => ({
      h1: document.querySelector('h1').textContent.trim(),
      dd: [...document.querySelectorAll('[data-fb-quote] dd')].map((e) => e.textContent.trim()),
      offer: document.querySelector('[data-fb-offer]').textContent.trim(),
      calls: [...document.querySelectorAll('.fb-call__btn')].map((a) => a.getAttribute('href')),
      url: location.pathname + location.search,
      hscroll: document.documentElement.scrollWidth > innerWidth,
    }));
    assert(r.h1 === "Here's What You Requested" && r.dd[0] === '$10,000' && /^\$\d+\.\d\d$/.test(r.dd[1]) && /: 2:00$|: 1:5\d$/.test(r.offer) && r.calls.length >= 1 && r.calls.every((h) => /^tel:\d{10}$/.test(h)) && r.url === '/facebook/' && !r.hscroll, JSON.stringify(r));
    if (OUT) await page.screenshot({ path: `${OUT}/preview-apply-${name}.png`, fullPage: true });
    await ctx.close();
    return `${r.dd.join(' / ')}`;
  });
}

await check('texting page V1.1 at 320, 375, 390, 430 and 1280px: wording, one-line Prepare My Text, no SMS link without the approved number', async () => {
  const { ctx, page } = await fresh({ viewport: { width: 390, height: 844 } });
  await page.goto(`${srv.base}/facebook/?preview=apply`);
  await page.waitForSelector('[data-fb-quote]:not([hidden])', { timeout: 10000 });
  const sizes = [];
  for (const w of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => {
      const h1 = document.querySelector('h1'), re = document.querySelector('[data-fb-reassure]'), box = document.querySelector('[data-fb-quote]');
      const btn = document.querySelector('[data-fb-text]'), note = document.querySelector('.fb-text__note'), num = document.querySelector('.fb-hero .fb-call__number');
      const label = btn.querySelector('span'), icon = btn.querySelector('svg');
      const rg = document.createRange();
      rg.selectNodeContents(label.firstChild);
      const b = btn.getBoundingClientRect(), t = rg.getBoundingClientRect(), i = icon.getBoundingClientRect();
      const c = (e) => getComputedStyle(e);
      return {
        h1: h1.textContent.trim(), reassure: re.hidden ? null : re.textContent.trim(), label: btn.textContent.trim(), note: note.textContent.trim(),
        order: h1.getBoundingClientRect().bottom <= re.getBoundingClientRect().top && re.getBoundingClientRect().bottom <= box.getBoundingClientRect().top && b.bottom <= note.getBoundingClientRect().top && note.getBoundingClientRect().bottom <= num.getBoundingClientRect().top,
        white: [h1, re, note].every((e) => c(e).color === 'rgb(255, 255, 255)') && [h1, re, note].every((e) => c(e).textAlign === 'center'),
        oneLine: rg.getClientRects().length === 1 && i.right <= t.left + 1 && Math.abs(i.top + i.height / 2 - (t.top + t.height / 2)) <= 3,
        centered: Math.abs((i.left + t.right) / 2 - (b.left + b.right) / 2) <= 2,
        fits: btn.scrollWidth <= btn.clientWidth && t.right <= b.right && i.left >= b.left,
        bg: c(btn).backgroundColor, h: Math.round(b.height), fs: c(btn).fontSize, smaller: parseFloat(c(note).fontSize) < parseFloat(c(btn).fontSize) && parseFloat(c(re).fontSize) < parseFloat(c(h1).fontSize),
        href: btn.getAttribute('href'), number: num.textContent.trim(), hscroll: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(r.h1 === "Here's What You Requested" && r.reassure === "Don't worry, you can always adjust these amounts later." && r.label === 'Prepare My Text' && r.note === "We've prepared your text for you. Just review it and hit Send.", JSON.stringify(r));
    assert(r.order && r.white && r.oneLine && r.centered && r.fits && r.smaller && !r.hscroll && r.bg === 'rgb(194, 65, 12)' && r.h === 56 && r.fs === '19px', `${w}px ${JSON.stringify(r)}`);
    // No approved SMS number is configured (src/config/phones.ts SMS_NUMBER), so the button opens nothing.
    assert(r.href === null && r.number === '888-862-9456', `${w}px ${JSON.stringify(r)}`);
    if (OUT) await page.locator('.fb-hero').screenshot({ path: `${OUT}/texting-${w}.png` });
    sizes.push(`${w}: ${r.h}px`);
  }
  await ctx.close();
  return sizes.join(', ');
});

await check('the normal funnel is unchanged: /free-quote/ without ?preview= starts at the first question', async () => {
  const { ctx, page } = await fresh({ viewport: { width: 390, height: 844 } });
  await page.goto(`${srv.base}/free-quote/`);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  const s = await page.evaluate(async () => (await fetch('/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': localStorage.getItem('ff:quote-visit') ?? 'none-visit-00000000' }, body: JSON.stringify({ age: 60, gender: 'male', tobacco: false, coverage: 10000 }) })).status);
  assert(s === 401, `prices without verification: ${s}`);
  await ctx.close();
});

await check('no lead, SMS, CRM or other external request: only the one fixed preview sample record', async () => {
  const recs = await (await fetch(`${srv.base}/__evidence/`)).json();
  assert(recs.length === 1 && recs[0].mode === 'preview-sample' && recs[0].sample === true && recs[0].phone === null && recs[0].leadId === '00000000-0000-4000-8000-000000000000', JSON.stringify(recs.map((r) => [r.leadId, r.mode])));
  assert(external.length === 0, external.join('; '));
});

await check('Production refuses the preview sample session', async () => {
  {
    const res = await fetch(`${prod.base}/api/quote/`, { method: 'POST', headers: { 'content-type': 'application/json', origin: prod.base, 'x-quote-visit': 'previewcheckvisit00001' }, body: JSON.stringify({ action: 'preview-sample' }) });
    assert(res.status === 404 && !res.headers.get('set-cookie'), `status ${res.status}`);
    const recs = await (await fetch(`${prod.base}/__evidence/`)).json();
    assert(recs.length === 0, `${recs.length} records`);
  }
});

await browser.close();
await srv.close();
await prod.close();

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
