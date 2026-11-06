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
import { renderSVG } from 'uqr';

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
    assert(r.step === '7' && r.labels.length === 3 && r.prices.every((p) => /^\$\d+\.\d\d$/.test(p)) && r.controls && r.calls.length === 3 && r.calls.every((h) => h === 'tel:+18886564648'), JSON.stringify(r));
    assert(/Rates viewable for (10:00|9:5\d)$/.test(r.lead) && r.url === '/free-quote/', JSON.stringify(r));
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
    assert(r.h1 === 'Burial Insurance Quotes' && r.dd[0] === '$10,000' && /^\$\d+\.\d\d$/.test(r.dd[1]) && /: 2:00$|: 1:5\d$/.test(r.offer) && r.calls.length >= 1 && r.calls.every((h) => /^tel:\d{10}$/.test(h)) && r.url === '/facebook/' && !r.hscroll, JSON.stringify(r));
    if (OUT) await page.screenshot({ path: `${OUT}/preview-apply-${name}.png`, fullPage: true });
    await ctx.close();
    return `${r.dd.join(' / ')}`;
  });
}

// Two-option SMS handoff V1.9 (Randy, November 2026).
const PREWRITTEN = 'Hi, this is Preview. I have a few questions about my $10,000 final expense insurance quote for $51.10/month.';
await check('two-option handoff V1.9 at 320, 375, 390, 430 and 1280px: exact wording and order, two orange buttons (side by side with a divider on desktop, stacked cell phone first on phones), no QR before the click, no copy link, no call link', async () => {
  const { ctx, page } = await fresh({ viewport: { width: 390, height: 844 } });
  await page.goto(`${srv.base}/facebook/?preview=apply`);
  await page.waitForSelector('[data-fb-quote]:not([hidden])', { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('[data-fb-text]').getAttribute('href'), null, { timeout: 8000 });
  const sizes = [];
  for (const w of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => {
      const c = (e) => getComputedStyle(e);
      const rect = (e) => e.getBoundingClientRect();
      const h1 = document.querySelector('h1'), re = document.querySelector('[data-fb-reassure]'), opts = document.querySelector('.fb-text-options'), timer = document.querySelector('[data-fb-offer]'), box = document.querySelector('[data-fb-quote]');
      const [phone, computer] = [...document.querySelectorAll('.fb-text-opt')];
      const btns = [...document.querySelectorAll('.fb-text__btn')], notes = [...document.querySelectorAll('.fb-text__note')];
      const lines = (el) => { const rg = document.createRange(); rg.selectNodeContents(el.querySelector('span')); return new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size; };
      return {
        h1: h1.textContent.trim(), h1Hidden: h1.classList.contains('visually-hidden'), reassure: !!re || /adjust these amounts later|Here's What You Selected/.test(document.body.innerText), timer: timer.textContent.trim(),
        card: [...box.querySelectorAll('dt, dd')].map((e) => e.textContent.trim()),
        labels: btns.map((b) => b.querySelector('span').innerText.replace(/\s+/g, ' ').trim()), icons: btns.map((b) => !!b.querySelector('svg')),
        notes: notes.map((n) => n.textContent.trim()), noteWhite: notes.every((n) => c(n).color === 'rgb(255, 255, 255)' && c(n).textAlign === 'center'),
        orange: btns.every((b) => c(b).backgroundColor === 'rgb(194, 65, 12)' && c(b).color === 'rgb(255, 255, 255)' && Number(c(b).fontWeight) >= 700),
        twoLines: btns.every((b) => lines(b) === 2), fits: btns.every((b) => b.scrollWidth <= b.clientWidth),
        sameSize: Math.abs(rect(btns[0]).width - rect(btns[1]).width) <= 2 && Math.abs(rect(btns[0]).height - rect(btns[1]).height) <= 2,
        order: rect(opts).bottom <= rect(timer).top && rect(timer).bottom <= rect(box).top && rect(box).bottom <= rect(document.querySelector('.fb-advantage')).top && rect(opts).top - rect(document.querySelector('.fb-hero')).top <= 64 && rect(btns[0]).top - rect(opts).top <= 1 && Math.abs(rect(btns[1]).top - rect(computer).top) <= 1,
        sideBySide: Math.abs(rect(phone).top - rect(computer).top) <= 1 && rect(phone).right <= rect(computer).left + 1 && Math.abs(rect(phone).width - rect(computer).width) <= 1,
        divider: c(computer).borderLeftStyle === 'solid' && parseFloat(c(computer).borderLeftWidth) >= 1,
        stacked: rect(phone).bottom <= rect(computer).top,
        qr: !document.querySelector('[data-fb-qr]').hidden, qrSpace: Math.round(document.querySelector('[data-fb-qr]').getBoundingClientRect().height), copy: !!document.querySelector('[data-fb-copy]'), oldButton: /PREPARE MY TEXT|Just review your prewritten/.test(document.querySelector('.fb-hero').innerText),
        heroTel: !!document.querySelector('.fb-hero a[href^="tel:"]') || /\d{3}-\d{3}-\d{4}/.test(document.querySelector('.fb-hero').innerText),
        href: document.querySelector('[data-fb-text]').getAttribute('href'), smsBody: document.querySelector('[data-fb-text]').dataset.smsBody,
        hscroll: document.documentElement.scrollWidth > innerWidth, h: Math.round(rect(btns[0]).height), fs: c(btns[0]).fontSize,
      };
    });
    assert(r.h1 === 'Burial Insurance Quotes' && r.h1Hidden && !r.reassure && /^Please respond within: (2:00|1:5\d)$/.test(r.timer), `${w}px top ${JSON.stringify(r)}`);
    assert(JSON.stringify(r.card) === JSON.stringify(['Your Selected Coverage', '$10,000', 'Estimated Monthly Rate', '$51.10']), `${w}px card ${JSON.stringify(r.card)}`);
    assert(JSON.stringify(r.labels) === JSON.stringify(["TAP HERE IF YOU'RE ON A CELL PHONE", "CLICK HERE IF YOU'RE ON A COMPUTER"]) && r.icons.every(Boolean), `${w}px labels ${JSON.stringify(r.labels)}`);
    // V4.21: no permanent instructions; the orange buttons come first and the QR panel takes no space while hidden.
    assert(r.notes.length === 0 && r.qrSpace === 0, `${w}px notes ${JSON.stringify([r.notes, r.qrSpace])}`);
    assert(r.orange && r.twoLines && r.fits && r.sameSize && r.order && !r.hscroll, `${w}px layout ${JSON.stringify(r)}`);
    assert(w >= 1280 ? r.sideBySide && r.divider : r.stacked, `${w}px columns ${JSON.stringify(r)}`);
    assert(!r.qr && !r.copy && !r.oldButton && !r.heroTel, `${w}px extras ${JSON.stringify(r)}`);
    assert(r.smsBody === PREWRITTEN && r.href === `sms:+18886720762?body=${encodeURIComponent(PREWRITTEN)}`, `${w}px sms ${r.href}`);
    if (OUT) await page.locator('.fb-hero').screenshot({ path: `${OUT}/texting-${w}.png` });
    sizes.push(`${w}: ${r.h}px/${r.fs}`);
  }
  await ctx.close();
  return sizes.join(', ');
});

await check('two-option handoff V1.9 on iPhone and Android: the cell phone button opens a text to +1 888-672-0762 with the prewritten text; nothing is sent or called', async () => {
  const out = [];
  for (const [n, d, want] of [['iPhone 13', devices['iPhone 13'], '&body='], ['Pixel 7', devices['Pixel 7'], '?body=']]) {
    const { ctx, page } = await fresh(d);
    const posts = [];
    page.on('request', (q) => { if (q.method() === 'POST') posts.push(`${new URL(q.url()).pathname} ${q.postData() ?? ''}`); });
    await page.goto(`${srv.base}/facebook/?preview=apply`);
    await page.waitForFunction(() => document.querySelector('[data-fb-text]').getAttribute('href'), null, { timeout: 10000 });
    const href = await page.getAttribute('[data-fb-text]', 'href');
    assert(href === `sms:+18886720762${want}${encodeURIComponent(PREWRITTEN)}` && decodeURIComponent(href.split(want)[1]) === PREWRITTEN, `${n} ${href}`);
    assert(!(await page.isVisible('[data-fb-qr]')), `${n} QR shown before the computer button`);
    assert(posts.every((p) => /^\/api\/(quote|price-explorer)\/ /.test(p) && !/"action":"(start|resend|check|apply)"/.test(p)), `${n} requests ${posts.join(' | ')}`);
    out.push(`${n}: ${href.slice(0, 26)}`);
    await ctx.close();
  }
  return out.join(', ');
});

await check('two-option handoff V1.9 on a computer: the computer button reveals the QR code (SMSTO to +1 888-672-0762 with the prewritten text) under its instruction and launches nothing', async () => {
  const { ctx, page } = await fresh({ viewport: { width: 1280, height: 900 } });
  const navs = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
  await page.goto(`${srv.base}/facebook/?preview=apply`);
  await page.waitForFunction(() => document.querySelector('[data-fb-text]').getAttribute('href'), null, { timeout: 10000 });
  assert(!(await page.isVisible('[data-fb-qr]')), 'QR shown before the click');
  const before = navs.length;
  await page.click('[data-fb-qr-btn]');
  await page.waitForSelector('[data-fb-qr]:not([hidden]) svg', { timeout: 5000 });
  const q = await page.evaluate(() => {
    const code = document.querySelector('[data-fb-qr-code]');
    const note = document.querySelector('.fb-qr__note'), btn = document.querySelector('[data-fb-qr-btn]'), offer = document.querySelector('[data-fb-offer]');
    return { text: code.dataset.qrText, svg: code.innerHTML, below: btn.getBoundingClientRect().bottom <= note.getBoundingClientRect().top && note.getBoundingClientRect().bottom <= code.getBoundingClientRect().top && code.getBoundingClientRect().bottom <= offer.getBoundingClientRect().top, noteText: note.textContent.trim(), noteColor: getComputedStyle(note).color, noteAlign: getComputedStyle(note).textAlign, url: location.pathname + location.search + location.hash, expanded: document.querySelector('[data-fb-qr-btn]').getAttribute('aria-expanded'), w: Math.round(document.querySelector('.fb-qr__code').getBoundingClientRect().width) };
  });
  const want = `SMSTO:+18886720762:${PREWRITTEN}`;
  const pattern = (svg) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join('|');
  assert(q.text === want && pattern(q.svg) && pattern(q.svg) === pattern(renderSVG(want, { ecc: 'M', border: 2 })), `QR payload ${q.text}`);
  assert(q.noteText === 'Scan this code with your cell phone camera.' && q.noteColor === 'rgb(255, 255, 255)' && q.noteAlign === 'center' && q.below && q.url === '/facebook/' && navs.length === before && q.expanded === 'true' && q.w <= 180, JSON.stringify(q));
  if (OUT) await page.locator('.fb-hero').screenshot({ path: `${OUT}/texting-qr-desktop.png` });
  await ctx.close();
  return `${q.w}px QR`;
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
