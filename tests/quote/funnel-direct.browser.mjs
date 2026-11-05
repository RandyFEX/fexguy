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
    const box = document.querySelector('[data-qf-consent]');
    return {
      heading: document.querySelector('#qf-s7').textContent.trim(),
      back: r('[data-qf-back]'), progressBox: r('[data-qf-progress-label]'), agent: r('.qf-agent'), photo: r('.qf-agent__photo'), whyBox: r('.qf-why'), head: r('#qf-s7'),
      summary: r('[data-qf-summary]'), first: r('#qf-first'), phone: r('#qf-phone'), consentBox: r('.qf-consent'), checkbox: r('[data-qf-consent]'), button: r('[data-qf-submit]'), promise: r('.qf-reassure'), step: r('[data-step="7"]'),
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
      tel: tel.getAttribute('href'), telText: tel.textContent.trim(), telTarget: Math.round(Math.max(tel.getBoundingClientRect().height, parseFloat(getComputedStyle(tel, '::after').height) || 0)),
      consentText: document.querySelector('.qf-consent > span').textContent.replace(/\s+/g, ' ').trim(),
      privacy: document.querySelector('.qf-consent a')?.getAttribute('href'), privacyTarget: document.querySelector('.qf-consent a')?.getAttribute('target'),
      unchecked: !box.checked && !box.defaultChecked && !box.hasAttribute('checked'), required: box.required,
      fontPx: parseFloat(getComputedStyle(document.querySelector('.qf-consent')).fontSize),
      email: !!document.querySelector('[data-step="7"] input[type="email"], [data-step="7"] [name*="mail" i], [data-step="7"] [name*="birth" i], [data-step="7"] input[type="date"]'),
      sms: /access code|6-digit|verification|verify/i.test(document.querySelector('[data-step="7"]').innerText),
      progress: document.querySelector('[data-qf-progress-label]').textContent.trim(),
      hscroll: document.documentElement.scrollWidth > innerWidth,
      headerTel: document.querySelector('.qh-top a[data-header-phone]').getAttribute('href'),
      headerText: document.querySelector('.qh-top a[data-header-phone]').textContent.replace(/\s+/g, ' ').trim(),
      tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')),
      mainNumber: /862-9456/.test(document.body.innerHTML),
    };
  });

const CONSENT = 'By checking this box, I agree to receive calls and SMS text messages from Funeral Funds about my insurance request, according to the Privacy Policy (opens in a new tab).';
function common(l) {
  assert(l.heading === 'Your Contact Information', `heading ${l.heading}`);
  assert(l.name === 'Randy VanderVaate' && l.role === 'Independent Life Insurance Broker' && l.intro === 'Funeral Funds isn’t a call center. When you call, you deal directly with Randy.', `identification ${JSON.stringify([l.name, l.role, l.intro])}`);
  assert(l.photoSrc === '/wp-content/uploads/2025/11/RANDY-CIRCLE-IMAGE-SMALL.png' && l.photoLoaded, 'photo');
  assert(l.labels.join('|') === 'Full Name|Mobile Phone Number' && l.btn === 'SEE MY RATES' && !l.email && !l.sms, `form ${JSON.stringify([l.labels, l.btn, l.email, l.sms])}`);
  assert(l.consentText === CONSENT && l.privacy === '/privacy-policy/' && l.privacyTarget === '_blank' && l.unchecked && l.required && l.fontPx >= 16, `consent ${JSON.stringify([l.consentText, l.privacy, l.unchecked, l.required, l.fontPx])}`);
  assert(l.whyTitle === 'Why Funeral Funds?' && JSON.stringify(l.why) === JSON.stringify(WHY) && l.checks, `trust list ${JSON.stringify(l.why)}`);
  assert(l.tel === 'tel:+18886564648' && l.telText === '888-656-4648' && l.telTarget >= 44, `direct contact ${l.tel} ${l.telText} ${l.telTarget}px`);
  // V3.7: the advertising number everywhere on /free-quote/ (header, Direct Contact, cards, intake).
  assert(l.headerTel === 'tel:+18886564648' && l.headerText.endsWith('888-656-4648') && l.tels.every((h) => h === 'tel:+18886564648') && l.tels.length >= 5 && !l.mainNumber, `numbers ${JSON.stringify([l.headerTel, l.tels, l.mainNumber])}`);
  assert(l.progress === 'Step 7 of 7' && !l.hscroll, `${l.progress} hscroll ${l.hscroll}`);
  // Trust section above the contact information; then the heading, summary, fields, consent, button, promise.
  const order = [l.whyBox.top, l.head.top, l.summary.top, l.first.top, l.phone.top, l.consentBox.top, l.button.top, l.promise.top];
  assert(l.agent.bottom <= l.head.top && l.whyBox.bottom <= l.head.top && order.every((t, k) => k === 0 || t > order[k - 1]), `order ${JSON.stringify(order)}`);
  assert(l.first.h >= 44 && l.phone.h >= 44 && l.button.h >= 44 && l.checkbox.h >= 24, `touch targets ${JSON.stringify([l.first.h, l.phone.h, l.button.h, l.checkbox.h])}`);
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
    if (OUT) await page.screenshot({ path: `${OUT}/v37-${label.replace(/\s+/g, '-')}-contact.png`, fullPage: true });
    await ctx.close();
    return `trust ${l.agent.w}px + ${l.whyBox.w}px, inputs ${l.first.w}px, step ${l.step.h}px`;
  });
}

for (const [label, dev] of [['iPhone 13', devices['iPhone 13']], ['Pixel 7 (Android)', devices['Pixel 7']], ['320px', { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true }]]) {
  await check(`${label}: one column: Back/progress, Randy, Why Funeral Funds?, Your Contact Information, summary, Full Name, phone, consent, SEE MY RATES, promise; no horizontal scroll`, async () => {
    const { ctx, page } = await open(dev);
    const l = await layout(page);
    common(l);
    const tops = [l.back.top, l.agent.top, l.whyBox.top, l.head.top, l.summary.top, l.first.top, l.phone.top, l.consentBox.top, l.button.top, l.promise.top];
    assert(l.progressBox.bottom <= l.agent.top && tops.every((t, k) => k === 0 || t > tops[k - 1]), `order ${tops}`);
    if (OUT) await page.screenshot({ path: `${OUT}/v37-${shotName(label)}-contact.png`, fullPage: true });
    await ctx.close();
    return `step ${l.step.h}px`;
  });
}

await check('consent required: unchecked blocks SEE MY RATES with the approved message, inputs kept, nothing sent; checking it clears the message; the Privacy Policy link opens the policy', async () => {
  const { ctx, page } = await open({ ...devices['iPhone 13'] });
  let starts = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/quote/') && /"action":"start"/.test(r.postData() ?? '')) starts++; });
  await page.fill('#qf-first', 'Ruth Ann Baker');
  await page.fill('#qf-phone', '214-867-5315');
  await page.click('[data-qf-submit]');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ err: document.querySelector('#qf-consent-error').textContent.trim(), visible: !document.querySelector('#qf-consent-error').hidden, focus: document.activeElement?.id, name: document.querySelector('#qf-first').value, phone: document.querySelector('#qf-phone').value, step7: !document.querySelector('[data-step="7"]').hidden, checked: document.querySelector('[data-qf-consent]').checked }));
  assert(r.err === 'Please check the box to agree to receive calls and texts before continuing.' && r.visible && r.focus === 'qf-consent' && r.name === 'Ruth Ann Baker' && r.phone === '214-867-5315' && r.step7 && !r.checked && starts === 0, `blocked ${JSON.stringify(r)} starts ${starts}`);
  if (OUT) await page.screenshot({ path: `${OUT}/v37-iphone-consent-required.png`, fullPage: true });
  // Clicking the Privacy Policy link opens the policy in a new tab and does not check the box.
  const [pp] = await Promise.all([ctx.waitForEvent('page'), page.click('.qf-consent a')]);
  await pp.waitForLoadState();
  assert(new URL(pp.url()).pathname === '/privacy-policy/' && /Privacy Policy/i.test(await pp.textContent('h1')), `privacy page ${pp.url()}`);
  await pp.close();
  assert(!(await page.isChecked('[data-qf-consent]')), 'the link checked the box');
  await page.check('[data-qf-consent]');
  assert(await page.isHidden('#qf-consent-error'), 'message not cleared');
  // A single word is not a full name.
  await page.fill('#qf-first', 'Ruth');
  await page.click('[data-qf-submit]');
  assert((await page.textContent('#qf-first-error')).trim() === 'Please enter your full name (first and last name).' && starts === 0, 'full name validation');
  await page.fill('#qf-first', 'Ruth Ann Baker-Smith Jr.');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  const rec = (await (await fetch(`${srv.base}/__evidence/`)).json()).find((x) => x.phone === '+12148675315');
  assert(rec && rec.firstName === 'Ruth Ann Baker-Smith Jr.' && rec.consent.given === true && rec.consent.action === 'checked consent box' && rec.consent.version === 'ff-quote-consent-v4-2026-11' && rec.consent.text === CONSENT.replace(' (opens in a new tab)', ''), `record ${JSON.stringify(rec?.consent)}`);
  const crm = srv.crm.calls.filter((c) => c.url.endsWith('/contacts/upsert') && c.body.phone === '+12148675315');
  assert(crm.length === 1 && crm[0].body.name === 'Ruth Ann Baker-Smith Jr.' && crm[0].body.firstName === 'Ruth' && crm[0].body.lastName === 'Ann Baker-Smith Jr.', `CRM contact ${JSON.stringify(crm[0]?.body)}`);
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
  await page.check('[data-qf-consent]');
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
  assert(crm.length === 3 && crm[0].url.endsWith('/contacts/upsert') && crm[0].body.name === 'Dorothy Hale' && crm[0].body.phone === '+12148675312' && /Phone verification: not verified/.test(crm[2].body.body) && /Consent to calls\/texts: Yes, box checked/.test(crm[2].body.body), `CRM ${JSON.stringify(crm).slice(0, 300)}`);
  const cardTels = await page.$$eval('[data-qf-call]', (els) => els.map((a) => a.getAttribute('href')));
  assert(cardTels.length === 3 && cardTels.every((h) => h === 'tel:+18886564648'), `card numbers ${cardTels}`);
  const ev = await page.evaluate(() => window.__ev);
  const order = ['quote_contact_submit', 'quote_lead_accepted', 'ff:lead', 'quote_pricing_view'].map((n) => ev.indexOf(n));
  assert(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])) && ev.filter((n) => n === 'ff:lead').length === 1 && !ev.some((n) => /sms|verified/.test(n)), `events ${ev}`);
  const conv = logs.filter((t) => /generate_lead|"Lead"/.test(t));
  assert(conv.length === 2, `conversion logs ${conv}`);
  if (OUT) { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/v37-iphone-results.png`, fullPage: true }); }
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
  await page.check('[data-qf-consent]');
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.dataset.state === 'ok', null, { timeout: 8000 });
  await page.waitForTimeout(400);
  if (OUT) await page.screenshot({ path: `${OUT}/v37-desktop-results.png`, fullPage: true });
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
  assert(r.step7 && !r.results && r.err && r.msg === 'We could not send your request just now. Please try again, or call 888-656-4648.' && r.name === 'Harold Moss' && r.phone === '214-867-5314' && r.consent && !r.btn, `failure ${JSON.stringify(r)}`);
  assert(!r.ev.includes('ff:lead') && !r.ev.includes('quote_lead_accepted') && !r.ev.includes('quote_pricing_view'), `events on failure ${r.ev}`);
  if (OUT) await page.screenshot({ path: `${OUT}/v37-desktop-crm-error-test.png` });
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
