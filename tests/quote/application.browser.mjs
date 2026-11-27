// 10 Easy Questions (Randy, November 2026) in a real browser, on the
// production handlers with a fake Agent CRM and TEST-ONLY made-up rate
// tables: the three cards' APPLY NOW buttons, exact questions and order,
// multiple selection, None of the above, exact feedback, progress,
// completion, saving on the existing lead, one CRM update (existing contact,
// note + tag), the /randy/ confirmation state, and owner test mode (no CRM).
// Run after a build: node tests/quote/application.browser.mjs
import { createRequire } from 'node:module';
import { startFunnelServer, OWNER_TEST_PASSWORD } from './funnel-server.mjs';
import { PRODUCTS } from '../../server/rates/products.js';
import { HEALTH_QUESTIONS, FEEDBACK } from '../../server/quote/application.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const datasets = {};
for (const [id, rate] of [['aetna-accendo-preferred', '50.00'], ['moo-living-promise-level', '40.00']]) {
  const p = PRODUCTS[id];
  const records = [];
  for (let a = p.issueAges.min; a <= p.issueAges.max; a++) for (const gender of ['male', 'female']) for (const tobacco of p.tobaccoClasses) records.push({ issueAge: a, gender, tobacco, annualRatePer1000: rate });
  datasets[id] = { productId: id, records };
}
const srv = await startFunnelServer({ production: true, ownerTest: true, datasets });
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
let ip = 40;

async function toRates({ owner = false, phone = '214-867-5320', width = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const page = await ctx.newPage();
  if (owner) {
    await page.goto(`${srv.base}/test/`);
    await page.fill('input[name="password"]', OWNER_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('a[href="/get-rates/"]');
  }
  await page.goto(`${srv.base}/get-rates/`);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="70"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.waitForTimeout(300);
  await page.fill('#qf-first', 'Pat Applicant');
  await page.fill('#qf-phone', phone);
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qf-card="lowest-preferred"] [data-qf-apply-q]:not([disabled])', { timeout: 10000 });
  await page.keyboard.press('Escape');
  return { ctx, page };
}
const fb = (page, q) => page.$eval(`[data-qa-q="${q}"] [data-qa-fb]`, (e) => (e.hidden ? '' : e.textContent.trim()));
async function answerAll(page) {
  await page.selectOption('[data-qa-feet]', '5');
  await page.selectOption('[data-qa-inches]', '6');
  await page.fill('[data-qa-weight]', '180');
  await page.check('input[name="q2"][value="arthritis"]');
  await page.check('input[name="q2"][value="high-cholesterol"]');
  for (const q of HEALTH_QUESTIONS.slice(1)) await page.check(`input[name="${q.id}"][value="none"]`);
}

await check('three APPLY NOW - 10 EASY QUESTIONS buttons under the save buttons; each opens the same questionnaire', async () => {
  const { ctx, page } = await toRates();
  const cards = await page.$$eval('[data-qf-card]', (cs) => cs.map((c) => { const s = c.querySelector('[data-qf-save]').getBoundingClientRect(); const a = c.querySelector('[data-qf-apply-q]'); return { text: a.textContent.trim(), below: a.getBoundingClientRect().top >= s.bottom, sameWidth: Math.abs(a.getBoundingClientRect().width - s.width) < 1 }; }));
  assert(cards.length === 3 && cards.every((c) => c.text === 'APPLY NOW - 10 EASY QUESTIONS' && c.below && c.sameWidth), JSON.stringify(cards));
  for (const id of ['lowest-preferred', 'average-standard']) {
    await page.click(`[data-qf-card="${id}"] [data-qf-apply-q]`);
    await page.waitForSelector('[data-qa]:not([hidden])');
    assert((await page.textContent('#qa-title')).trim() === '10 Easy Questions', 'heading');
    await page.click('[data-qa-back]');
    await page.waitForSelector('[data-step="7"]:not([hidden])');
  }
  await ctx.close();
});

await check('exact questions and answer order; nothing preselected; multiple choices; None of the above stands alone; exact feedback; progress; completion', async () => {
  const { ctx, page } = await toRates({ phone: '214-867-5321' });
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
  await page.waitForSelector('[data-qa]:not([hidden])');
  const shown = await page.$$eval('[data-qa-q]', (fs) => fs.map((f) => ({ prompt: f.querySelector('.qa-prompt').textContent.trim(), options: [...f.querySelectorAll('.qa-opt span')].map((s) => s.textContent.trim()), checked: f.querySelectorAll('input:checked').length })));
  assert(shown.length === 10 && shown[0].prompt === 'What is your height and weight?', 'q1');
  HEALTH_QUESTIONS.forEach((q, i) => {
    const s = shown[i + 1];
    assert(s.prompt === q.prompt && JSON.stringify(s.options) === JSON.stringify(q.options.map((o) => o.label)) && s.checked === 0, `q${i + 2}: ${JSON.stringify(s)}`);
    assert(s.options.at(-1) === 'None of the above', `q${i + 2} none last`);
  });
  assert((await page.textContent('[data-qa-count]')).trim() === '0 of 10 completed', 'progress 0');
  // Multiple choices + Q2 feedback.
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="thyroid"])');
  assert((await fb(page, 'q2')) === FEEDBACK.q2, await fb(page, 'q2'));
  // None clears the others; a condition clears None.
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="none"])');
  let sel = await page.$$eval('input[name="q2"]:checked', (i) => i.map((x) => x.value));
  assert(JSON.stringify(sel) === '["none"]' && (await fb(page, 'q2')) === FEEDBACK.none, JSON.stringify(sel));
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="high-blood-pressure"])');
  sel = await page.$$eval('input[name="q2"]:checked', (i) => i.map((x) => x.value));
  assert(JSON.stringify(sel) === '["high-blood-pressure"]', JSON.stringify(sel));
  await page.click('[data-qa-q="q5"] .qa-opt:has(input[value="stroke"])');
  assert((await fb(page, 'q5')) === FEEDBACK.conditions, await fb(page, 'q5'));
  assert((await page.textContent('[data-qa-count]')).trim() === '2 of 10 completed', 'progress 2');
  assert(await page.$eval('[data-qa-done]', (e) => e.hidden), 'submit hidden until complete');
  await page.selectOption('[data-qa-feet]', '5');
  await page.selectOption('[data-qa-inches]', '6');
  await page.fill('[data-qa-weight]', '180');
  for (const q of HEALTH_QUESTIONS.slice(1)) if (q.id !== 'q5') await page.check(`input[name="${q.id}"][value="none"]`);
  assert((await page.textContent('[data-qa-count]')).trim() === '10 of 10 completed', 'progress 10');
  const done = await page.$eval('[data-qa-done]', (e) => ({ hidden: e.hidden, text: e.innerText.replace(/\s+/g, ' ').trim() }));
  assert(!done.hidden && done.text.startsWith('Congratulations! You’ve completed all 10 questions. SUBMIT MY ANSWERS'), JSON.stringify(done));
  await ctx.close();
});

await check('production: answers saved on the existing lead, one CRM update to the existing contact (note + tag), then /randy/ in its confirmation state; a repeat sends nothing', async () => {
  const { ctx, page } = await toRates({ phone: '214-867-5322' });
  const before = srv.crm.calls.length;
  await page.click('[data-qf-card="average-standard"] [data-qf-apply-q]');
  await page.waitForSelector('[data-qa]:not([hidden])');
  await answerAll(page);
  await Promise.all([page.waitForURL(/\/randy\/$/), page.click('[data-qa-submit]')]);
  const calls = srv.crm.calls.slice(before);
  assert(!calls.some((c) => c.url.endsWith('/contacts/upsert')), 'no new contact');
  const note = calls.find((c) => c.url.endsWith('/notes'))?.body?.body ?? '';
  const tag = calls.find((c) => c.url.endsWith('/tags'))?.body?.tags ?? [];
  assert(tag.includes('Application Questionnaire Completed'), JSON.stringify(tag));
  for (const s of ['Name: Pat Applicant', 'Phone:', 'Age: 70', 'Gender: Female', 'Tobacco: No', 'State: Texas', 'Coverage: $5,000', 'Quoted: Mutual of Omaha: $', '1. What is your height and weight? 5 ft 6 in, 180 lb', '2. Do you have any of these health conditions? Arthritis, High cholesterol', '3. Do you have any of these health conditions? None of the above', '10. Do any of the following currently apply to you? None of the above']) assert(note.includes(s), `note lacks ${s}`);
  const card = await page.evaluate(() => ({ title: document.querySelector('.rc-received')?.innerText.replace(/\s+/g, ' ').trim(), visible: getComputedStyle(document.querySelector('.rc-received')).display !== 'none', call: [...document.querySelectorAll('[data-card-action="call"] span')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent.trim()), href: document.querySelector('[data-card-action="call"]').getAttribute('href'), note: getComputedStyle(document.querySelector('.rc-call-note')).display !== 'none', save: [...document.querySelectorAll('[data-card-save] span')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent.trim()), alert: getComputedStyle(document.querySelector('.rc-alert')).display, email: /mailto:|sms:/.test(document.body.innerHTML) }));
  assert(card.visible && card.title === 'Randy just received your information! Call Randy now to find out which plans are available to you.', JSON.stringify(card));
  assert(card.call.join('|') === 'CALL RANDY NOW|888-862-9456' && card.href === 'tel:8888629456' && card.note, JSON.stringify(card));
  assert(card.save.join('|') === 'SAVE MY CONTACT INFORMATION' && !card.email, JSON.stringify(card));
  // A second submission (back on the funnel) sends nothing more.
  const n = srv.crm.calls.length;
  await page.goBack();
  await page.waitForTimeout(1500);
  const r = await page.evaluate(async () => (await fetch('/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Quote-Visit': localStorage.getItem('ff:quote-visit') ?? '' }, body: JSON.stringify({ action: 'application', answers: { heightFeet: 5, heightInches: 6, weight: 180, health: Object.fromEntries(['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'].map((q) => [q, ['none']])) }, quote: { age: 70, gender: 'female', tobacco: false, coverage: 5000 } }) })).json());
  assert(r.status === 'ok' && srv.crm.calls.length === n, `repeat: ${JSON.stringify(r)} calls ${srv.crm.calls.length - n}`);
  await ctx.close();
  return `${calls.length} CRM calls`;
});

await check('an ordinary visitor to /randy/ sees the normal card (no confirmation state)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${srv.base}/randy/`);
  const s = await page.evaluate(() => ({ received: getComputedStyle(document.querySelector('.rc-received')).display, call: [...document.querySelectorAll('[data-card-action="call"] span')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.textContent.trim()).join('|') }));
  assert(s.received === 'none' && s.call === 'Talk to Randy Directly|888-862-9456', JSON.stringify(s));
  await ctx.close();
});

await check('owner test mode (/test/): the questionnaire submits and opens the confirmation card with no Agent CRM call', async () => {
  const { ctx, page } = await toRates({ owner: true, phone: '214-867-5323' });
  const before = srv.crm.calls.length;
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
  await answerAll(page);
  await Promise.all([page.waitForURL(/\/randy\/$/), page.click('[data-qa-submit]')]);
  assert(srv.crm.calls.length === before, `CRM calls: ${srv.crm.calls.length - before}`);
  await ctx.close();
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
