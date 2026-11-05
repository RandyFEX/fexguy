// V3.3/V3.7 (Randy, November 2026) browser test: the contact step without SMS
// verification, on the production handlers with a fake Agent CRM
// (tests/quote/funnel-server.mjs { production: true }; nothing is sent
// anywhere). Desktop (two columns), iPhone and Android (one column, the
// required order), SEE MY RATES straight to the three cards, a failed Agent CRM
// delivery (recoverable error, inputs kept, no duplicate lead on the retry),
// double-submit protection and the analytics events (no personal data, one
// conversion). Run after a build:
//   node tests/quote/funnel-direct.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer({ production: true });
const browser = await chromium.launch();
const OUT = process.env.OUT ?? '';
const URL_ = `${srv.base}/free-quote/`;
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
const WHY = ['Independent insurance agent', 'Compare multiple insurance companies', 'Personal assistance with your coverage', 'Direct Contact: 888-656-4648'];
const EXTERNAL = /^https:\/\/([a-z0-9-]+\.)*(leadconnectorhq\.com|twilio\.com|resend\.com|submit-form\.com|challenges\.cloudflare\.com)\//;
let ip = 50;

async function open(opts) {
  const ctx = await browser.newContext({ ...opts, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const page = await ctx.newPage();
  const external = [];
  page.on('request', (r) => { if (EXTERNAL.test(r.url())) external.push(r.url()); });
  // Every funnel event and lead event the page sends to tracking.ts, and every tracking call it logs.
  await page.addInitScript(() => {
    window.__ev = [];
    window.addEventListener('ff:funnel', (e) => window.__ev.push(e.detail.name));
    window.addEventListener('ff:lead', () => window.__ev.push('ff:lead'));
  });
  const logs = [];
  page.on('console', async (m) => {
    if (!/tracking disabled/.test(m.text())) return;
    logs.push(JSON.stringify(await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)))));
  });
  await page.goto(URL_);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="68"]', '[data-pick="tobacco"][data-value="no"]', '[data-pick="coverage"][data-value="10000"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.waitForTimeout(400); // the step's fade-in
  return { ctx, page, external, logs };
}

const layout = (page) =>
  page.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
    const tel = document.querySelector('[data-qf-direct-call]');
    return {
      heading: document.querySelector('#qf-s6').textContent.trim(),
      back: r('[data-qf-back]'), progressBox: r('[data-qf-progress-label]'), agent: r('.qf-agent'), photo: r('.qf-agent__photo'), whyBox: r('.qf-why'), head: r('#qf-s6'),
      summary: r('[data-qf-summary]'), first: r('#qf-first'), phone: r('#qf-phone'), button: r('[data-qf-submit]'), disclosure: r('[data-qf-disclosure]'), promise: r('.qf-reassure'), step: r('[data-step="6"]'),
      name: document.querySelector('.qf-agent__name').textContent.trim(),
      role: document.querySelector('.qf-agent__role').textContent.replace(/\s+/g, ' ').trim(),
      intro: document.querySelector('.qf-agent__intro').textContent.trim(),
      photoSrc: document.querySelector('.qf-agent__photo').getAttribute('src'),
      photoLoaded: document.querySelector('.qf-agent__photo').complete && document.querySelector('.qf-agent__photo').naturalWidth > 0,
      labels: [...document.querySelectorAll('[data-step="6"] label.qf-label')].map((l) => l.textContent.trim()),
      btn: document.querySelector('[data-qf-submit]').textContent.trim(),
      whyTitle: document.querySelector('.qf-why__title').textContent.trim(),
      why: [...document.querySelectorAll('.qf-why__list li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
      checks: [...document.querySelectorAll('.qf-why__list li')].every((li) => getComputedStyle(li, '::before').backgroundImage.includes('svg')),
      tel: tel.getAttribute('href'), telText: tel.textContent.trim(), telTarget: Math.round(Math.max(tel.getBoundingClientRect().height, parseFloat(getComputedStyle(tel, '::after').height) || 0)),
      consentText: document.querySelector('[data-qf-disclosure]').textContent.replace(/\s+/g, ' ').trim(),
      privacy: document.querySelector('[data-qf-disclosure] a')?.getAttribute('href'), privacyTarget: document.querySelector('[data-qf-disclosure] a')?.getAttribute('target'),
      checkboxes: document.querySelectorAll('[data-step="6"] input[type="checkbox"]').length,
      afterButton: document.querySelector('[data-qf-submit]').nextElementSibling?.hasAttribute('data-qf-disclosure'),
      described: document.querySelector('[data-qf-submit]').getAttribute('aria-describedby') === 'qf-disclosure',
      discColor: getComputedStyle(document.querySelector('[data-qf-disclosure]')).color,
      fontPx: parseFloat(getComputedStyle(document.querySelector('[data-qf-disclosure]')).fontSize),
      buttonFontPx: parseFloat(getComputedStyle(document.querySelector('[data-qf-submit]')).fontSize),
      email: !!document.querySelector('[data-step="6"] input[type="email"], [data-step="6"] [name*="mail" i], [data-step="6"] [name*="birth" i], [data-step="6"] input[type="date"]'),
      sms: /access code|6-digit|verification|verify/i.test(document.querySelector('[data-step="6"]').innerText),
      progress: document.querySelector('[data-qf-progress-label]').textContent.trim(),
      hscroll: document.documentElement.scrollWidth > innerWidth,
      headerTel: document.querySelector('.qh-top a[data-header-phone]').getAttribute('href'),
      headerText: document.querySelector('.qh-top a[data-header-phone]').textContent.replace(/\s+/g, ' ').trim(),
      tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')),
      mainNumber: /862-9456/.test(document.body.innerHTML),
    };
  });

const CONSENT = 'By clicking "see my rates", you agree to our Privacy Policy (opens in a new tab) and consent to receive phone calls and SMS text messages from Funeral Funds at the number provided about your insurance request. Consent is not a condition of purchase.';
function common(l) {
  assert(l.heading === 'Your Contact Information', `heading ${l.heading}`);
  assert(l.name === 'Randy VanderVaate' && l.role === 'Independent Life Insurance Broker' && l.intro === 'Funeral Funds isn’t a call center. When you call, you deal directly with Randy.', `identification ${JSON.stringify([l.name, l.role, l.intro])}`);
  assert(l.photoSrc === '/wp-content/uploads/2025/11/RANDY-CIRCLE-IMAGE-SMALL.png' && l.photoLoaded, 'photo');
  assert(l.labels.join('|') === 'Full Name|Mobile Phone Number' && l.btn === 'SEE MY RATES' && !l.email && !l.sms, `form ${JSON.stringify([l.labels, l.btn, l.email, l.sms])}`);
  assert(l.consentText === CONSENT && l.privacy === '/privacy-policy/' && l.privacyTarget === '_blank' && l.checkboxes === 0 && l.afterButton && l.described && l.fontPx >= 13 && l.fontPx < l.buttonFontPx && l.discColor === 'rgb(91, 101, 96)' && l.disclosure.top >= l.button.bottom && l.disclosure.top - l.button.bottom <= 12, `disclosure ${JSON.stringify([l.consentText, l.privacy, l.checkboxes, l.afterButton, l.fontPx, l.discColor, l.disclosure, l.button])}`);
  assert(l.whyTitle === 'Why Funeral Funds?' && JSON.stringify(l.why) === JSON.stringify(WHY) && l.checks, `trust list ${JSON.stringify(l.why)}`);
  assert(l.tel === 'tel:+18886564648' && l.telText === '888-656-4648' && l.telTarget >= 44, `direct contact ${l.tel} ${l.telText} ${l.telTarget}px`);
  // V3.7: the advertising number everywhere on /free-quote/ (header, Direct Contact, cards, intake).
  assert(l.headerTel === 'tel:+18886564648' && l.headerText.endsWith('888-656-4648') && l.tels.every((h) => h === 'tel:+18886564648') && l.tels.length >= 5 && !l.mainNumber, `numbers ${JSON.stringify([l.headerTel, l.tels, l.mainNumber])}`);
  assert(l.progress === 'Step 6 of 6' && !l.hscroll, `${l.progress} hscroll ${l.hscroll}`);
  // Trust section above the contact information; then the heading, summary, fields, consent, button, promise.
  const order = [l.whyBox.top, l.head.top, l.summary.top, l.first.top, l.phone.top, l.button.top, l.disclosure.top, l.promise.top];
  assert(l.agent.bottom <= l.head.top && l.whyBox.bottom <= l.head.top && order.every((t, k) => k === 0 || t > order[k - 1]), `order ${JSON.stringify(order)}`);
  assert(l.first.h >= 44 && l.phone.h >= 44 && l.button.h >= 44, `touch targets ${JSON.stringify([l.first.h, l.phone.h, l.button.h])}`);
}
const shotName = (label) => label.split(' ')[0].toLowerCase().replace(/px$/, 'px');

for (const [label, opts] of [['desktop 1280px', { viewport: { width: 1280, height: 900 } }], ['desktop 1440px', { viewport: { width: 1440, height: 900 } }]]) {
  await check(`${label}: compact two-column trust section (Randy left, Why Funeral Funds? right) above the contact information; narrower form`, async () => {
    const { ctx, page } = await open(opts);
    const l = await layout(page);
    common(l);
    assert(l.whyBox.left > l.agent.right && Math.abs((l.whyBox.top + l.whyBox.bottom) / 2 - (l.agent.top + l.agent.bottom) / 2) <= 30, `not side by side ${JSON.stringify([l.agent, l.whyBox])}`);
    assert(l.first.w <= 520 && l.first.w >= 400, `input width ${l.first.w}`);
    assert(l.step.h <= 860, `contact step ${l.step.h}px tall`);
    if (OUT) await page.screenshot({ path: `${OUT}/v38-${label.replace(/\s+/g, '-')}-contact.png`, fullPage: true });
    await ctx.close();
    return `trust ${l.agent.w}px + ${l.whyBox.w}px, inputs ${l.first.w}px, step ${l.step.h}px`;
  });
}

for (const [label, dev] of [['iPhone 13', devices['iPhone 13']], ['Pixel 7 (Android)', devices['Pixel 7']], ['320px', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
  await check(`${label}: one column: Back/progress, Randy, Why Funeral Funds?, Your Contact Information, summary, Full Name, phone, SEE MY RATES, disclosure, promise; no horizontal scroll`, async () => {
    const { ctx, page } = await open(dev);
    const l = await layout(page);
    common(l);
    const tops = [l.back.top, l.agent.top, l.whyBox.top, l.head.top, l.summary.top, l.first.top, l.phone.top, l.button.top, l.disclosure.top, l.promise.top];
    assert(l.progressBox.bottom <= l.agent.top && tops.every((t, k) => k === 0 || t > tops[k - 1]), `order ${tops}`);
    if (OUT) await page.screenshot({ path: `${OUT}/v38-${shotName(label)}-contact.png`, fullPage: true });
    await ctx.close();
    return `step ${l.step.h}px`;
  });
}

// V4.2: the insurance company logo wall, under the coverage question only.
for (const [label, dev] of [['desktop 1280px', { viewport: { width: 1280, height: 900 } }], ['iPhone 13', devices['iPhone 13']], ['Pixel 7 (Android)', devices['Pixel 7']], ['320px', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
  await check(`${label}: logo wall only on the coverage question (heading, authentic images loaded, rows, no overflow); coverage still advances`, async () => {
    const ctx = await browser.newContext({ ...dev, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
    const page = await ctx.newPage();
    await page.goto(URL_);
    await page.waitForSelector('[data-step="1"]:not([hidden])');
    const hiddenAt = async () => page.evaluate(() => !document.querySelector('[data-qf-logos]').getClientRects().length);
    assert(await hiddenAt(), 'logo wall on step 1');
    await page.click('[data-pick="gender"][data-value="female"]');
    assert(await hiddenAt(), 'logo wall on step 2');
    await page.click('[data-pick="age"][data-value="68"]');
    assert(await hiddenAt(), 'logo wall on step 3');
    await page.click('[data-pick="tobacco"][data-value="no"]');
    await page.waitForSelector('[data-step="4"]:not([hidden])');
    await page.waitForFunction(() => [...document.querySelectorAll('.qf-logos img')].every((i) => i.complete), null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const wall = document.querySelector('[data-qf-logos]'), panel = document.querySelector('[data-qf-panel]');
      const imgs = [...wall.querySelectorAll('img')];
      const items = [...wall.querySelectorAll('.qf-logos__item')].map((e) => e.getBoundingClientRect());
      const rows = new Set(items.map((b) => Math.round(b.top))).size;
      const perRow = items.filter((b) => Math.round(b.top) === Math.round(items[0].top)).length;
      return {
        question: document.querySelector('#qf-s4').textContent.trim(),
        title: wall.querySelector('.qf-logos__title').textContent.trim(),
        below: wall.getBoundingClientRect().top >= panel.getBoundingClientRect().bottom - 1,
        names: imgs.map((i) => i.alt), broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.alt),
        heights: imgs.map((i) => Math.round(i.getBoundingClientRect().height)), overflow: imgs.some((i) => i.getBoundingClientRect().right > i.parentElement.getBoundingClientRect().right + 1),
        perRow, rows, cica: /cica/i.test(wall.innerHTML),
        borders: [...wall.querySelectorAll('.qf-logos__item')].filter((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0 || getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length,
        areas: imgs.map((i) => { const b = i.getBoundingClientRect(); return Math.round(b.width * b.height); }),
        widths: imgs.map((i) => Math.round(i.getBoundingClientRect().width)),
        hscroll: document.documentElement.scrollWidth > innerWidth,
        options: [...document.querySelectorAll('[data-step="4"] .qf-opt')].map((e) => e.textContent.trim()).join('|'),
      };
    });
    assert(r.question === 'How Much Coverage Would You Like?' && r.title === 'We compare coverage from trusted insurance companies' && r.below, JSON.stringify(r));
    // V4.4: all 16 authentic logos, borderless, every one loaded and readable.
    assert(r.names.length === 16 && !r.broken.length && !r.overflow && !r.cica && !r.hscroll && r.borders === 0, JSON.stringify(r));
    assert(r.heights.every((h) => h >= 16 && h <= 48) && r.widths.every((w) => w >= 36), `logo sizes ${r.heights} / ${r.widths}`);
    const want = label.startsWith('desktop') ? 6 : label === '320px' ? 2 : 3;
    assert(r.perRow === want && (!label.startsWith('desktop') || r.rows === 3), `${r.perRow} logos per row (${r.rows} rows), expected ${want}`);
    assert(r.options === '$5,000|$10,000|$15,000|$20,000|$25,000|Other', r.options);
    if (OUT) await page.screenshot({ path: `${OUT}/v42-${label.split(' ')[0].toLowerCase()}-coverage-logos.png`, fullPage: true });
    // Coverage selection is unchanged: a choice advances to the state question, and the wall goes away.
    await page.click('[data-pick="coverage"][data-value="10000"]');
    await page.waitForSelector('[data-step="5"]:not([hidden])');
    assert(await hiddenAt(), 'logo wall on the state question');
    await page.selectOption('[data-qf-state]', 'Texas');
    await page.waitForSelector('[data-step="6"]:not([hidden])');
    assert(await hiddenAt(), 'logo wall on the contact step');
    await ctx.close();
    return `${r.names.length} logos: ${r.names.join(', ')}; ${r.perRow} per row, ${r.rows} rows`;
  });
}

await check('V3.8 consent: no checkbox; the disclosure sits directly under SEE MY RATES; its Privacy Policy link opens the corrected policy; clicking the button submits and records button-submission consent', async () => {
  const { ctx, page } = await open({ ...devices['iPhone 13'] });
  let starts = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/quote/') && /"action":"start"/.test(r.postData() ?? '')) starts++; });
  // The Privacy Policy link opens the policy in a new tab and submits nothing.
  const [pp] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-qf-disclosure] a')]);
  await pp.waitForLoadState();
  const ppText = await pp.textContent('main');
  assert(new URL(pp.url()).pathname === '/privacy-policy/' && /Privacy Policy/i.test(await pp.textContent('h1')) && /online quote tool/.test(ppText) && /does not use Formspark or Cloudflare Turnstile/.test(ppText) && /ff_qs/.test(ppText), `privacy page ${pp.url()}`);
  await pp.close();
  assert(starts === 0, 'the link submitted the form');
  // A single word is not a full name (nothing sent).
  await page.fill('#qf-first', 'Ruth');
  await page.fill('#qf-phone', '214-867-5315');
  await page.click('[data-qf-submit]');
  assert((await page.textContent('#qf-first-error')).trim() === 'Please enter your full name (first and last name).' && starts === 0, 'full name validation');
  await page.fill('#qf-first', 'Ruth Ann Baker-Smith Jr.');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  assert(starts === 1, `${starts} submissions`);
  const rec = (await (await fetch(`${srv.base}/__evidence/`)).json()).find((x) => x.phone === '+12148675315');
  const shown = CONSENT.replace(' (opens in a new tab)', '');
  assert(rec && rec.firstName === 'Ruth Ann Baker-Smith Jr.' && rec.consent.given === true && rec.consent.method === 'button-submission' && !/check/i.test(rec.consent.action) && rec.consent.version === 'ff-quote-consent-v5-2026-11' && rec.consent.text === shown && rec.consent.at, `record ${JSON.stringify(rec?.consent)}`);
  const upsert = srv.crm.calls.find((c) => c.url.endsWith('/contacts/upsert') && c.body.phone === '+12148675315');
  assert(upsert && upsert.body.name === 'Ruth Ann Baker-Smith Jr.' && upsert.body.firstName === 'Ruth' && upsert.body.lastName === 'Ann Baker-Smith Jr.', `CRM contact ${JSON.stringify(upsert?.body)}`);
  assert(srv.crm.calls.some((c) => c.url.endsWith('/notes') && /Consent to calls\/texts: Yes, by clicking SEE MY RATES under the disclosure/.test(c.body.body) && c.body.body.includes(`Consent text: ${shown}`) && c.body.body.includes('Ruth Ann Baker-Smith Jr.')), 'CRM note consent');
  await ctx.close();
});

await check('SEE MY RATES: validates, then (production) delivers to Agent CRM and shows the three cards at once; analytics in order with no personal data; one conversion', async () => {
  const { ctx, page, external, logs } = await open({ ...devices['iPhone 13'] });
  // Validation: empty fields stay on the page with their errors (nothing sent).
  const before = srv.crm.calls.length;
  await page.click('[data-qf-submit]');
  assert((await page.textContent('#qf-first-error')).trim() === 'Please enter your full name (first and last name).' && (await page.evaluate(() => document.activeElement?.id)) === 'qf-first', 'name validation');
  await page.fill('#qf-first', 'Dorothy Hale');
  await page.fill('#qf-phone', '214-555-0123');
  await page.click('[data-qf-submit]');
  assert((await page.textContent('#qf-phone-error')).includes('10-digit'), 'phone validation');
  assert(srv.crm.calls.length === before, 'an invalid form reached the server');
  await page.fill('#qf-phone', '(214) 867-5312');
  // Double tap: one submission only.
  let starts = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/quote/') && /"action":"start"/.test(r.postData() ?? '')) starts++; });
  await page.dblclick('[data-qf-submit]');
  await page.waitForFunction(() => ['lowest-preferred', 'average-standard', 'guaranteed-acceptance'].every((c) => document.querySelector(`[data-qf-card="${c}"]`)?.dataset.state === 'ok'), null, { timeout: 8000 });
  assert(starts === 1, `${starts} submissions`);
  const crm = srv.crm.calls.slice(before);
  assert(crm.length === 3 && crm[0].url.endsWith('/contacts/upsert') && crm[0].body.name === 'Dorothy Hale' && crm[0].body.phone === '+12148675312' && /Phone verification: not verified/.test(crm[2].body.body) && /Consent to calls\/texts: Yes, by clicking SEE MY RATES under the disclosure/.test(crm[2].body.body), `CRM ${JSON.stringify(crm).slice(0, 300)}`);
  const cardTels = await page.$$eval('[data-qf-call]', (els) => els.map((a) => a.getAttribute('href')));
  assert(cardTels.length === 3 && cardTels.every((h) => h === 'tel:+18886564648'), `card numbers ${cardTels}`);
  const ev = await page.evaluate(() => window.__ev);
  const order = ['quote_contact_submit', 'quote_lead_accepted', 'ff:lead', 'quote_pricing_view'].map((n) => ev.indexOf(n));
  assert(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])) && ev.filter((n) => n === 'ff:lead').length === 1 && !ev.some((n) => /sms|verified/.test(n)), `events ${ev}`);
  const conv = logs.filter((t) => /generate_lead|"Lead"/.test(t));
  assert(conv.length === 2, `conversion logs ${conv}`);
  if (OUT) { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/v38-iphone-results.png`, fullPage: true }); }
  // A card's call button (GA4 click_to_call and quote_call_click) and the green button: their own events.
  await page.evaluate(() => document.querySelector('[data-qf-card="average-standard"] [data-qf-call]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await page.click('[data-qf-card="average-standard"] [data-qf-call]');
  await page.click('[data-qf-card="average-standard"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
  const all = logs.join('\n');
  assert(/quote_call_click/.test(all) && /click_to_call/.test(all) && /quote_apply_now/.test(all), 'call or application event missing');
  assert(!/Dorothy|Hale|5312|214|\+1214/.test(all.replace(/"quote_ref":"[A-Za-z0-9]+"/g, '')), `personal data in analytics: ${all.slice(0, 300)}`);
  assert(!/generate_lead|"Lead"/.test(logs.slice(logs.findIndex((t) => /quote_apply_now/.test(t))).join('')), 'conversion counted again after Apply Now');
  assert(external.length === 0, `browser made external requests ${external}`);
  await ctx.close();
  return ev.join(' > ');
});

await check('texting option on the Ready to Apply page: quote_text_click (QR code on a computer), no personal data', async () => {
  const { ctx, page, logs } = await open({ viewport: { width: 1280, height: 900 } });
  await page.fill('#qf-first', 'Walter Gray');
  await page.fill('#qf-phone', '214-867-5313');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  await page.waitForTimeout(400);
  if (OUT) await page.screenshot({ path: `${OUT}/v38-desktop-results.png`, fullPage: true });
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
  await page.waitForSelector('[data-fb-qr-btn]:not([disabled])');
  await page.click('[data-fb-qr-btn]');
  await page.waitForFunction(() => window.__ev.includes('quote_text_click'), null, { timeout: 3000 });
  await page.waitForTimeout(200);
  const t = logs.filter((x) => /quote_text_click/.test(x));
  assert(t.length === 1 && /"text_method":"qr-code"/.test(t[0]) && !/Walter|Gray|5313/.test(t[0]), `text event ${t}`);
  await ctx.close();
});

await check('Agent CRM down: a recoverable error, every input kept, no cards, no conversion; the retry delivers the same saved lead (no duplicate)', async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.fill('#qf-first', 'Harold Moss');
  await page.fill('#qf-phone', '214-867-5314');
  srv.crm.down = true;
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-contact-status]').classList.contains('is-error'), null, { timeout: 8000 });
  const r = await page.evaluate(() => ({
    step7: !document.querySelector('[data-step="6"]').hidden, results: !document.querySelector('[data-step="7"]').hidden,
    msg: document.querySelector('[data-qf-contact-status]').textContent.trim(), err: document.querySelector('[data-qf-contact-status]').classList.contains('is-error'),
    name: document.querySelector('#qf-first').value, phone: document.querySelector('#qf-phone').value,
    btn: document.querySelector('[data-qf-submit]').disabled, ev: window.__ev,
  }));
  assert(r.step7 && !r.results && r.err && r.msg === 'We could not send your request just now. Please try again, or call 888-656-4648.' && r.name === 'Harold Moss' && r.phone === '214-867-5314' && !r.btn, `failure ${JSON.stringify(r)}`);
  assert(!r.ev.includes('ff:lead') && !r.ev.includes('quote_lead_accepted') && !r.ev.includes('quote_pricing_view'), `events on failure ${r.ev}`);
  if (OUT) await page.screenshot({ path: `${OUT}/v38-desktop-crm-error-test.png` });
  srv.crm.down = false;
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  const recs = (await (await fetch(`${srv.base}/__evidence/`)).json()).filter((x) => x.phone === '+12148675314');
  assert(recs.length === 1 && recs[0].crm.delivered === true && recs[0].attempts === 2 && recs[0].consent.given === true && recs[0].verification.phoneVerified === false, `records ${JSON.stringify(recs).slice(0, 300)}`);
  assert((await page.evaluate(() => window.__ev.filter((n) => n === 'ff:lead').length)) === 1, 'conversion count');
  await ctx.close();
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
