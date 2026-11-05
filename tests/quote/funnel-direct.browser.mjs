// V3.3 (Randy, November 2026) browser test: the contact step without SMS
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
  for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="68"]', '[data-pick="tobacco"][data-value="no"]', '[data-pick="use"][data-value="burial"]', '[data-pick="coverage"][data-value="10000"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="7"]:not([hidden])');
  await page.waitForTimeout(400); // the step's fade-in
  return { ctx, page, external, logs };
}

const layout = (page) =>
  page.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
    const tel = document.querySelector('[data-qf-direct-call]');
    return {
      heading: document.querySelector('#qf-s7').textContent.trim(),
      summary: r('[data-qf-summary]'), photo: r('.qf-agent__photo'), first: r('#qf-first'), phone: r('#qf-phone'), button: r('[data-qf-submit]'), whyBox: r('.qf-why'), main: r('.qf-contact__main'),
      name: document.querySelector('.qf-agent__name').textContent.trim(),
      role: document.querySelector('.qf-agent__role').textContent.replace(/\s+/g, ' ').trim(),
      intro: document.querySelector('.qf-agent__intro').textContent.trim(),
      photoSrc: document.querySelector('.qf-agent__photo').getAttribute('src'),
      photoLoaded: document.querySelector('.qf-agent__photo').complete && document.querySelector('.qf-agent__photo').naturalWidth > 0,
      labels: [...document.querySelectorAll('[data-step="7"] label.qf-label')].map((l) => l.textContent.trim()),
      btn: document.querySelector('[data-qf-submit]').textContent.trim(),
      whyTitle: document.querySelector('.qf-why__title').textContent.trim(),
      why: [...document.querySelectorAll('.qf-why__list li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
      checks: [...document.querySelectorAll('.qf-why__list li')].every((li) => getComputedStyle(li, '::before').backgroundImage.includes('svg')),
      tel: tel.getAttribute('href'), telText: tel.textContent.trim(), telH: Math.round(tel.getBoundingClientRect().height),
      email: !!document.querySelector('[data-step="7"] input[type="email"], [data-step="7"] [name*="mail" i], [data-step="7"] [name*="birth" i], [data-step="7"] input[type="date"]'),
      sms: /access code|6-digit|verification|verify/i.test(document.querySelector('[data-step="7"]').innerText),
      progress: document.querySelector('[data-qf-progress-label]').textContent.trim(),
      hscroll: document.documentElement.scrollWidth > innerWidth,
      headerTel: document.querySelector('.qh-top a[data-header-phone]').getAttribute('href'),
    };
  });

function common(l) {
  assert(l.heading === 'Your Contact Information', `heading ${l.heading}`);
  assert(l.name === 'Randy VanderVaate' && l.role === 'Independent Life Insurance Broker · Founder of Funeral Funds' && l.intro === 'Funeral Funds isn’t a call center. When you call, you deal directly with Randy.', `identification ${JSON.stringify([l.name, l.role, l.intro])}`);
  assert(l.photoSrc === '/wp-content/uploads/2025/11/RANDY-CIRCLE-IMAGE-SMALL.png' && l.photoLoaded, 'photo');
  assert(l.labels.join('|') === 'First Name|Mobile Phone Number' && l.btn === 'SEE MY RATES' && !l.email && !l.sms, `form ${JSON.stringify([l.labels, l.btn, l.email, l.sms])}`);
  assert(l.whyTitle === 'Why Funeral Funds?' && JSON.stringify(l.why) === JSON.stringify(WHY) && l.checks, `trust list ${JSON.stringify(l.why)}`);
  assert(l.tel === 'tel:8886564648' && l.telText === '888-656-4648' && l.telH >= 44, `direct contact ${l.tel} ${l.telText} ${l.telH}px`);
  assert(l.headerTel === 'tel:8888629456', 'the header number changed');
  assert(l.progress === 'Step 7 of 7' && !l.hscroll, `${l.progress} hscroll ${l.hscroll}`);
}

await check('desktop 1280px: two columns under the summary (Randy and the form left, Why Funeral Funds? right)', async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  const l = await layout(page);
  common(l);
  assert(l.summary.bottom <= l.main.top && l.summary.bottom <= l.whyBox.top, 'columns not under the summary');
  assert(l.whyBox.left > l.main.right && Math.abs(l.whyBox.top - l.main.top) <= 4, `not side by side ${JSON.stringify([l.main, l.whyBox])}`);
  assert(l.photo.top < l.first.top && l.first.top < l.phone.top && l.phone.top < l.button.top && l.button.right <= l.main.right + 1, 'left column order');
  if (OUT) await page.screenshot({ path: `${OUT}/v33-desktop-contact.png`, fullPage: true });
  await ctx.close();
  return `left ${l.main.w}px, right ${l.whyBox.w}px`;
});

for (const [label, dev] of [['iPhone 13', devices['iPhone 13']], ['Pixel 7 (Android)', devices['Pixel 7']], ['320px', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
  await check(`${label}: one column in order heading/summary, photo, first name, phone, SEE MY RATES, trust list; no horizontal scroll`, async () => {
    const { ctx, page } = await open(dev);
    const l = await layout(page);
    common(l);
    const tops = [l.summary.top, l.photo.top, l.first.top, l.phone.top, l.button.top, l.whyBox.top];
    assert(tops.every((t, k) => k === 0 || t > tops[k - 1]), `order ${tops}`);
    assert(l.whyBox.top >= l.button.bottom && l.first.h >= 44 && l.phone.h >= 44 && l.button.h >= 44, `sizes ${JSON.stringify(l)}`);
    if (OUT) await page.screenshot({ path: `${OUT}/v33-${label.split(' ')[0].toLowerCase()}-contact.png`, fullPage: true });
    await ctx.close();
    return tops.join(' < ');
  });
}

await check('SEE MY RATES: validates, then (production) delivers to Agent CRM and shows the three cards at once; analytics in order with no personal data; one conversion', async () => {
  const { ctx, page, external, logs } = await open({ ...devices['iPhone 13'] });
  // Validation: empty fields stay on the page with their errors (nothing sent).
  const before = srv.crm.calls.length;
  await page.click('[data-qf-submit]');
  assert((await page.textContent('#qf-first-error')).trim() === 'Please enter your first name.' && (await page.evaluate(() => document.activeElement?.id)) === 'qf-first', 'name validation');
  await page.fill('#qf-first', 'Dorothy');
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
  assert(crm.length === 3 && crm[0].url.endsWith('/contacts/upsert') && crm[0].body.firstName === 'Dorothy' && crm[0].body.phone === '+12148675312' && /Phone verification: not verified/.test(crm[2].body.body), `CRM ${JSON.stringify(crm).slice(0, 300)}`);
  const ev = await page.evaluate(() => window.__ev);
  const order = ['quote_contact_submit', 'quote_lead_accepted', 'ff:lead', 'quote_pricing_view'].map((n) => ev.indexOf(n));
  assert(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])) && ev.filter((n) => n === 'ff:lead').length === 1 && !ev.some((n) => /sms|verified/.test(n)), `events ${ev}`);
  const conv = logs.filter((t) => /generate_lead|"Lead"/.test(t));
  assert(conv.length === 2, `conversion logs ${conv}`);
  // A card's call button and the green button: their own events.
  await page.evaluate(() => document.querySelector('[data-qf-card="average-standard"] [data-qf-call]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await page.click('[data-qf-card="average-standard"] [data-qf-call]');
  await page.click('[data-qf-card="average-standard"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
  const all = logs.join('\n');
  assert(/quote_call_click/.test(all) && /quote_apply_now/.test(all), 'call or application event missing');
  assert(!/Dorothy|5312|214|\+1214/.test(all.replace(/"quote_ref":"[A-Za-z0-9]+"/g, '')), `personal data in analytics: ${all.slice(0, 300)}`);
  assert(!/generate_lead|"Lead"/.test(logs.slice(logs.findIndex((t) => /quote_apply_now/.test(t))).join('')), 'conversion counted again after Apply Now');
  assert(external.length === 0, `browser made external requests ${external}`);
  if (OUT) await page.screenshot({ path: `${OUT}/v33-iphone-handoff.png` });
  await ctx.close();
  return ev.join(' > ');
});

await check('texting option on the Ready to Apply page: quote_text_click (QR code on a computer), no personal data', async () => {
  const { ctx, page, logs } = await open({ viewport: { width: 1280, height: 900 } });
  await page.fill('#qf-first', 'Walter');
  await page.fill('#qf-phone', '214-867-5313');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  await page.waitForTimeout(400);
  if (OUT) await page.screenshot({ path: `${OUT}/v33-desktop-results.png`, fullPage: true });
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
  await page.waitForSelector('[data-fb-qr-btn]:not([disabled])');
  await page.click('[data-fb-qr-btn]');
  await page.waitForFunction(() => window.__ev.includes('quote_text_click'), null, { timeout: 3000 });
  await page.waitForTimeout(200);
  const t = logs.filter((x) => /quote_text_click/.test(x));
  assert(t.length === 1 && /"text_method":"qr-code"/.test(t[0]) && !/Walter|5313/.test(t[0]), `text event ${t}`);
  await ctx.close();
});

await check('Agent CRM down: a recoverable error, every input kept, no cards, no conversion; the retry delivers the same saved lead (no duplicate)', async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.fill('#qf-first', 'Harold');
  await page.fill('#qf-phone', '214-867-5314');
  await page.check('[data-qf-consent]');
  srv.crm.down = true;
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-contact-status]').classList.contains('is-error'), null, { timeout: 8000 });
  const r = await page.evaluate(() => ({
    step7: !document.querySelector('[data-step="7"]').hidden, results: !document.querySelector('[data-step="8"]').hidden,
    msg: document.querySelector('[data-qf-contact-status]').textContent.trim(), err: document.querySelector('[data-qf-contact-status]').classList.contains('is-error'),
    name: document.querySelector('#qf-first').value, phone: document.querySelector('#qf-phone').value, consent: document.querySelector('[data-qf-consent]').checked,
    btn: document.querySelector('[data-qf-submit]').disabled, ev: window.__ev,
  }));
  assert(r.step7 && !r.results && r.err && r.msg === 'We could not send your request just now. Please try again, or call 888-862-9456.' && r.name === 'Harold' && r.phone === '214-867-5314' && r.consent && !r.btn, `failure ${JSON.stringify(r)}`);
  assert(!r.ev.includes('ff:lead') && !r.ev.includes('quote_lead_accepted') && !r.ev.includes('quote_pricing_view'), `events on failure ${r.ev}`);
  if (OUT) await page.screenshot({ path: `${OUT}/v33-desktop-crm-error.png` });
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
