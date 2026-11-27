// 10 Easy Questions (Randy, November 2026) in a real browser, on the
// production handlers with a fake Agent CRM and TEST-ONLY made-up rate
// tables: the three cards' APPLY NOW buttons, exact questions and order,
// multiple selection, None of the above, exact feedback, progress,
// completion, saving on the existing lead, one CRM update (existing contact,
// Comments field, then the tag), the V2.4 confirmation and /about/ redirect, and owner test mode (no CRM).
// Run after a build: node tests/quote/application.browser.mjs
import { createRequire } from 'node:module';
import { startFunnelServer, OWNER_TEST_PASSWORD } from './funnel-server.mjs';
import { PRODUCTS } from '../../server/rates/products.js';
import { HEALTH_QUESTIONS, FEEDBACK } from '../../server/quote/application.js';
const headerCase = (t) => t.replace(/(^|\s)(\S)/g, (_m, sp, ch) => sp + ch.toUpperCase());
const SUCCESS = "Great News! I've Received Your Answers. I'll Review Your Information To Find Your Best Coverage Options. Randy Funeral Funds";
// V2.1: the latest upsert carries original_funnel_url, and it comes before the quote tag call.
const funnelField = (calls, url) => {
  const ui = calls.map((c) => c.url).lastIndexOf(calls.filter((c) => c.url.endsWith('/contacts/upsert')).at(-1)?.url);
  const up = [...calls].reverse().find((c) => c.url.endsWith('/contacts/upsert'));
  const upAt = calls.lastIndexOf(up);
  const tagAt = calls.findIndex((c, i) => i > upAt && c.url.endsWith('/tags'));
  const f = up?.body?.customFields?.find((x) => x.key === 'original_funnel_url');
  return f?.field_value === url && tagAt > upAt ? true : JSON.stringify({ f, upAt, tagAt, ui });
};
const successText = (page) => page.$eval('[data-qa-success]', (e) => e.innerText.replace(/\s+/g, ' ').trim());

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

async function toRates({ owner = false, phone = '214-867-5320', width = 390, funnel = 'get-rates' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const page = await ctx.newPage();
  if (owner) {
    await page.goto(`${srv.base}/test/`);
    await page.fill('input[name="password"]', OWNER_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('a[href="/get-rates/"]');
  }
  await page.goto(`${srv.base}/${funnel}/`);
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

await check('V1.4: in every card, under the premium, APPLY NOW - 10 EASY QUESTIONS then SAVE THIS QUOTE TO YOUR PHONE, then the coverage line; each opens the same questionnaire', async () => {
  const { ctx, page } = await toRates();
  const cards = await page.$$eval('[data-qf-card]', (cs) => cs.map((c) => { const p = c.querySelector('.qf-card__price').getBoundingClientRect(); const s = c.querySelector('[data-qf-save]').getBoundingClientRect(); const a = c.querySelector('[data-qf-apply-q]').getBoundingClientRect(); const tm = c.querySelector('[data-qf-timing]'); const t = tm.getBoundingClientRect(); return { text: c.querySelector('[data-qf-apply-q]').textContent.trim(), order: p.bottom <= a.top && a.bottom <= s.top && (tm.hidden || s.bottom <= t.top), sameWidth: Math.abs(a.width - s.width) < 1 }; }));
  assert(cards.length === 3 && cards.every((c) => c.text === 'APPLY NOW - 10 EASY QUESTIONS' && c.order && c.sameWidth), JSON.stringify(cards));
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
  assert(shown.length === 10 && shown[0].prompt === '1. What Is Your Height And Weight?', shown[0].prompt);
  HEALTH_QUESTIONS.forEach((q, i) => {
    const s = shown[i + 1];
    assert(s.prompt === `${i + 2}. ${headerCase(q.prompt)}` && JSON.stringify(s.options) === JSON.stringify(q.options.map((o) => o.label)) && s.checked === 0, `q${i + 2}: ${JSON.stringify(s)}`);
    assert(s.options.at(-1) === 'None of the above', `q${i + 2} none last`);
  });
  assert((await page.textContent('[data-qa-count]')).trim() === '0 of 10 completed', 'progress 0');
  // Multiple choices + Q2 feedback.
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
  await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="thyroid"])');
  assert((await fb(page, 'q2')) === FEEDBACK.conditions, await fb(page, 'q2'));
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
  assert(!done.hidden && done.text === 'SUBMIT MY ANSWERS Congratulations!' && !/completed all/.test(await page.textContent('[data-qa]')), JSON.stringify(done));
  await ctx.close();
});

await check('production: the Comments field (not Notes) gets the summary at lead delivery and the extended summary on submit, the tag only after Comments; then the confirmation and /about/; a repeat sends nothing', async () => {
  srv.crm.comments = 'Prefers mornings';
  const { ctx, page } = await toRates({ phone: '214-867-5322' });
  const pre = srv.crm.comments.split('\n');
  // V1.9 (mock CRM payloads): native State as the two-letter code; the note names the original funnel.
  const upsert = [...srv.crm.calls].reverse().find((c) => c.url.endsWith('/contacts/upsert'));
  const note = [...srv.crm.calls].reverse().find((c) => c.url.endsWith('/notes'));
  assert(upsert.body.state === 'TX' && note.body.body.includes('Lead Source: Facebook\nURL: https://funeralfunds.com/get-rates/'), JSON.stringify([upsert.body.state, note.body.body.slice(0, 160)]));
  const ff1 = funnelField(srv.crm.calls, 'https://funeralfunds.com/get-rates/');
  assert(ff1 === true, `get-rates original_funnel_url: ${ff1}`);
  // TEST-ONLY tables price Mutual of Omaha and Aetna (shown as CVS); Gerber has none here.
  assert(pre.join('\n') === '70 | Female | TX | Non-tobacco\n$5,000 Coverage\nMutual of Omaha: $21.00/mo\nCVS: $25.38/mo\nPrefers mornings', JSON.stringify(pre));
  const before = srv.crm.calls.length;
  await page.click('[data-qf-card="average-standard"] [data-qf-apply-q]');
  await page.waitForSelector('[data-qa]:not([hidden])');
  await answerAll(page);
  await page.click('[data-qa-submit]');
  await page.waitForSelector('[data-qa-success]:not([hidden])');
  assert((await successText(page)) === SUCCESS, await successText(page));
  const t0 = Date.now();
  await page.waitForURL(/\/about\/$/, { timeout: 8000 });
  assert(Date.now() - t0 > 4000, `redirected after ${Date.now() - t0} ms`);
  const calls = srv.crm.calls.slice(before);
  assert(!calls.some((c) => c.url.endsWith('/contacts/upsert')), 'no new contact');
  assert(!calls.some((c) => c.url.endsWith('/notes')), 'no note');
  const putAt = calls.findIndex((c) => c.method === 'PUT');
  const tagAt = calls.findIndex((c) => c.url.endsWith('/tags'));
  assert(putAt >= 0 && tagAt > putAt && calls[tagAt].body.tags.join() === 'Application Questionnaire Completed', JSON.stringify(calls.map((c) => [c.method, c.url])));
  const after = srv.crm.comments.split('\n');
  assert(after.join('\n') === `${pre.slice(0, 4).join('\n')}\n5’6” | 180 lbs\nArthritis, High cholesterol\nPrefers mornings`, JSON.stringify(after));
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

await check('V1.5 /test/: quote -> three rates -> APPLY NOW opens the 10 questions at once (no quote question, even while the session check is slow or fails once); submit shows the mocked Agent CRM update for the existing contact; nothing sent', async () => {
  const { ctx, page } = await toRates({ owner: true, phone: '214-867-5323' });
  const before = srv.crm.calls.length;
  let sessionCalls = 0;
  // The session check: slow, and a server error the first time.
  await page.route('**/api/quote/', async (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('"action":"session"')) {
      sessionCalls++;
      await new Promise((r) => setTimeout(r, 2000));
      if (sessionCalls === 1) return route.fulfill({ status: 503, body: '{}' });
    }
    return route.continue();
  });
  await Promise.all([page.waitForURL(/\/apply\/$/, { waitUntil: 'commit' }), page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]')]);
  await page.waitForLoadState('domcontentloaded');
  const early = await page.evaluate(() => ({ q1: getComputedStyle(document.querySelector('[data-step="1"]')).display, qa: getComputedStyle(document.querySelector('[data-qa]')).display }));
  assert(early.q1 === 'none' && early.qa !== 'none', `on arrival: ${JSON.stringify(early)}`);
  const seen = await page.evaluate(() => new Promise((res) => { let q1 = false; const t = setInterval(() => { if (getComputedStyle(document.querySelector('[data-step="1"]')).display !== 'none') q1 = true; }, 50); setTimeout(() => { clearInterval(t); res(q1); }, 6000); }));
  assert(!seen && sessionCalls >= 2, `quote question shown: ${seen}, session checks ${sessionCalls}`);
  await page.unroute('**/api/quote/');
  await answerAll(page);
  await page.click('[data-qa-submit]');
  await page.waitForSelector('[data-qa-preview]');
  const preview = await page.textContent('[data-qa-preview]');
  for (const t of ['TEST MODE: nothing was sent to Agent CRM.', 'New contact: no | Note: no', 'Field contact.comments:', '70 | Female | TX | Non-tobacco', '$5,000 Coverage', '5’6” | 180 lbs', 'Arthritis, High cholesterol', 'Then tag: Application Questionnaire Completed']) assert(preview.includes(t), `preview lacks ${t}: ${preview}`);
  assert(srv.crm.calls.length === before, `CRM calls: ${srv.crm.calls.length - before}`);
  assert((await successText(page)).startsWith(SUCCESS), await successText(page));
  await page.waitForURL(/\/about\/$/, { timeout: 8000 });
  await ctx.close();
});

await check('/apply/ (V1.0): APPLY NOW opens /apply/ with no query string and the adjusted coverage kept; the submission uses that quote and the same contact', async () => {
  const { ctx, page } = await toRates({ phone: '214-867-5324' });
  await page.click('.qf-adjust input[name="coverage"][value="15000"]', { force: true }).catch(() => page.check('.qf-adjust input[name="coverage"][value="15000"]', { force: true }));
  await page.waitForFunction(() => document.querySelector('.qf-adjust input[name="coverage"][value="15000"]')?.checked);
  await page.waitForTimeout(800);
  const before = srv.crm.calls.length;
  await Promise.all([page.waitForURL(/\/apply\/$/), page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]')]);
  await page.waitForSelector('[data-qa]:not([hidden])');
  assert(new URL(page.url()).search === '', page.url());
  await answerAll(page);
  await page.click('[data-qa-submit]');
  await page.waitForURL(/\/about\/$/, { timeout: 8000 });
  const calls = srv.crm.calls.slice(before);
  assert(!calls.some((c) => c.url.endsWith('/contacts/upsert')) && calls.some((c) => c.url.endsWith('/contacts/fake-contact') && c.method === 'PUT'), 'same contact');
  assert(srv.crm.comments.split('\n')[1] === '$15,000 Coverage', srv.crm.comments);
  await ctx.close();
});

await check('/apply/ visited directly without a quote: the quote form first, then straight to the questionnaire; /test/ links to /apply/', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
  const page = await ctx.newPage();
  await page.goto(`${srv.base}/apply/`);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  assert(await page.$eval('[data-qa]', (e) => e.hidden), 'questionnaire hidden first');
  for (const s of ['[data-pick="gender"][data-value="male"]', '[data-pick="age"][data-value="66"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.waitForTimeout(300);
  await page.fill('#qf-first', 'Direct Applicant');
  await page.fill('#qf-phone', '214-867-5325');
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qa]:not([hidden])', { timeout: 10000 });
  assert(srv.crm.comments.startsWith('66 | Male | TX | Non-tobacco\n$5,000 Coverage'), srv.crm.comments);
  // V1.8: a quote started on /apply/ itself keeps /apply/ as its URL (Website, never Facebook).
  const dnote = [...srv.crm.calls].reverse().find((c) => c.url.endsWith('/notes'));
  assert(dnote.body.body.includes('Lead Source: Website\nURL: https://funeralfunds.com/apply/'), dnote.body.body.slice(0, 200));
  const ff3 = funnelField(srv.crm.calls, 'https://funeralfunds.com/apply/');
  assert(ff3 === true, `apply original_funnel_url: ${ff3}`);
  const robots = await page.$eval('meta[name="robots"]', (m) => m.content);
  assert(robots === 'noindex, nofollow', robots);
  await page.goto(`${srv.base}/test/`);
  await page.fill('input[name="password"]', OWNER_TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('a[href="/apply/"]');
  await ctx.close();
});

for (const width of [390, 1280]) {
  await check(`V1.7 (${width}px): selected conditions pale green (V2.4), pale green bold None of the above (also unselected), exact feedback, "in the last 2 years", SUBMIT MY ANSWERS after the last question`, async () => {
    const { ctx, page } = await toRates({ owner: true, phone: `214-867-53${width === 390 ? 30 : 31}`, width });
    await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
    await page.waitForSelector('[data-qa]:not([hidden])');
    const st = (v) => page.$eval(`[data-qa-q="q2"] .qa-opt:has(input[value="${v}"])`, (l) => ({ bg: getComputedStyle(l).backgroundColor, w: getComputedStyle(l).fontWeight }));
    const white = (await st('arthritis')).bg;
    const none0 = await st('none');
    assert(none0.bg === 'rgb(232, 245, 233)' && Number(none0.w) >= 700, JSON.stringify(none0));
    await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
    assert((await st('arthritis')).bg === 'rgb(232, 245, 233)', JSON.stringify(await st('arthritis')));
    assert((await fb(page, 'q2')) === 'Great news! Funeral Funds has companies that may cover these conditions.', await fb(page, 'q2'));
    await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
    assert((await st('arthritis')).bg === white, 'deselected returns to original');
    await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="none"])');
    assert((await st('none')).bg === 'rgb(232, 245, 233)' && (await page.isChecked('input[name="q2"][value="none"]')), 'none selected stays green');
    assert((await fb(page, 'q2')) === 'Great news! You have no health concerns in this area.', await fb(page, 'q2'));
    const prompts = await page.$$eval('.qa-prompt', (p) => p.map((x) => x.textContent));
    assert(prompts.includes('5. In The Last 2 Years, Have You Had Any Of The Following?') && prompts.includes('7. Have You Ever Had Cancer Or Received Cancer Treatment?') && !prompts.some((t) => /two years/.test(t)), JSON.stringify(prompts));
    assert(await page.$eval('[data-qa-done]', (e) => e.hidden), 'no submit before complete');
    await answerAll(page);
    const btn = await page.evaluate(() => { const b = document.querySelector('[data-qa-submit]'); const last = document.querySelector('[data-qa-q="q10"]'); return { text: b.textContent.trim(), cta: b.classList.contains('qf-btn-cta'), after: b.getBoundingClientRect().top > last.getBoundingClientRect().bottom }; });
    assert(btn.text === 'SUBMIT MY ANSWERS' && btn.cta && btn.after, JSON.stringify(btn));
    await ctx.close();
  });
}

for (const [funnel, width] of [['get-rates', 390], ['free-quote', 1280]]) {
  await check(`V1.9 (/${funnel}/, ${width}px): /apply/ shows the carried-over name, phone, gender, age, state, tobacco and coverage above the first question`, async () => {
    const digits = width === 390 ? '40' : '41';
    const { ctx, page } = await toRates({ owner: true, phone: `214-867-55${digits}`, width, funnel });
    await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
    await page.waitForSelector('[data-qa]:not([hidden])');
    await page.waitForFunction(() => document.querySelector('[data-qa-sum="name"]')?.textContent);
    const sum = await page.$$eval('[data-qa-sum]', (d) => Object.fromEntries(d.map((e) => [e.dataset.qaSum, e.textContent])));
    const want = { name: 'Pat Applicant', phone: `(214) 867-55${digits}`, gender: 'Female', age: '70', state: 'Texas', tobacco: 'Non-Smoker', coverage: '$5,000' };
    assert(JSON.stringify(sum) === JSON.stringify(want), JSON.stringify(sum));
    const pos = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const sm = document.querySelector('[data-qa-summary]'); return { title: r('#qa-title').bottom, sumTop: r('[data-qa-summary]').top, sumBottom: r('[data-qa-summary]').bottom, q1: r('[data-qa-q="q1"]').top, inputs: sm.querySelectorAll('input,button,select').length, overflow: [...sm.querySelectorAll('dd')].some((d) => { const r = document.createRange(); r.selectNodeContents(d); return r.getBoundingClientRect().width > d.getBoundingClientRect().width + 0.5; }) }; });
    assert(pos.sumTop >= pos.title && pos.sumBottom <= pos.q1 && pos.inputs === 0 && !pos.overflow, JSON.stringify(pos));
    assert(!/Pat|214/.test(page.url()), page.url());
    await page.screenshot({ path: `/tmp/claude-0/apply-summary-${width}.png` });
    await ctx.close();
    return `summary ${Math.round(pos.sumBottom - pos.sumTop)}px tall`;
  });
}

for (const width of [390, 1280]) {
  await check(`Results layout V1.1 (${width}px): compact top line with the yellow number, symmetric card content, yellow APPLY NOW text, white SAVE text, no icons, "2-Year Wait Plan"`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-real-ip': `198.51.100.${ip++}` } });
    const page = await ctx.newPage();
    // Gerber has no TEST-ONLY rates here: the price response gets a Gerber card (display data only).
    await page.route('**/api/price-explorer/', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      const g = body.categories?.find((c) => c.id === 'guaranteed-acceptance');
      if (g) Object.assign(g, { status: 'ok', monthlyPremium: '35.18', monthlyPremiumCents: 3518, carriers: [{ carrier: 'Gerber Life', plan: 'Guaranteed Life', subtitle: 'No Health Questions', timing: '2-Year Waiting Period', logo: '/images/carriers/gerber-life-logo.png' }], attribution: ['FF-201'] });
      await route.fulfill({ response: res, json: body });
    });
    await page.goto(`${srv.base}/test/`);
    await page.fill('input[name="password"]', OWNER_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('a[href="/get-rates/"]');
    await page.goto(`${srv.base}/get-rates/`);
    for (const sel of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="70"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(sel);
    await page.selectOption('[data-qf-state]', 'Texas');
    await page.waitForSelector('[data-step="6"]:not([hidden])');
    await page.waitForTimeout(300);
    await page.fill('#qf-first', 'Pat Applicant');
    await page.fill('#qf-phone', `214-867-57${width === 390 ? 10 : 11}`);
    await page.click('[data-qf-submit]');
    await page.waitForSelector('[data-qf-card="guaranteed-acceptance"] [data-qf-apply-q]:not([disabled])', { timeout: 10000 });
    await page.keyboard.press('Escape');
    const r = await page.evaluate(() => {
      const top = document.querySelector('.qf-results-top');
      const lh = parseFloat(getComputedStyle(top).lineHeight);
      const tel = top.querySelector('a[href="tel:8888629456"]');
      const cards = [...document.querySelectorAll('[data-qf-card]')].map((c) => {
        const cb = c.getBoundingClientRect(), cs = getComputedStyle(c);
        const L = cb.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), R = cb.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
        const gaps = ['.qf-card__cat', '[data-qf-apply-q]', '[data-qf-save]', '[data-qf-timing]'].map((s) => { const b = c.querySelector(s).getBoundingClientRect(); return [Math.round(b.left - L), Math.round(R - b.right)]; });
        return { gaps, timing: c.querySelector('[data-qf-timing]').textContent, svg: c.querySelectorAll('[data-qf-timing] svg').length, apply: getComputedStyle(c.querySelector('[data-qf-apply-q]')).color, save: getComputedStyle(c.querySelector('[data-qf-save]')).color };
      });
      return { text: top.textContent.replace(/\s+/g, ' ').trim(), lines: Math.round(top.getBoundingClientRect().height / lh), telBg: tel && getComputedStyle(tel).backgroundColor, countBg: getComputedStyle(top.querySelector('[data-qf-countdown]')).backgroundColor, cards };
    });
    assert(/^Call 888-862-9456 for even lower-cost state-specific plans\. Rates viewable for \d+:\d\d$/.test(r.text) && !/30\+/.test(r.text), r.text);
    assert(r.lines <= (width === 390 ? 2 : 1), `lines ${r.lines}`);
    assert(r.telBg === 'rgb(255, 235, 59)' && r.countBg === 'rgb(255, 235, 59)', JSON.stringify([r.telBg, r.countBg]));
    for (const c of r.cards) {
      assert(c.gaps.every(([l, rt]) => l === 0 && rt === 0), JSON.stringify(c.gaps));
      assert(c.svg === 0 && c.apply === 'rgb(255, 235, 59)' && c.save === 'rgb(255, 255, 255)', JSON.stringify(c));
    }
    assert(r.cards.map((c) => c.timing).join('|') === 'First Day Coverage - $5,000|First Day Coverage - $5,000|2-Year Wait Plan - $5,000', r.cards.map((c) => c.timing).join('|'));
    await page.click('.qf-adjust input[name="coverage"][value="15000"]', { force: true }).catch(() => page.check('.qf-adjust input[name="coverage"][value="15000"]', { force: true }));
    await page.waitForFunction(() => document.querySelector('[data-qf-card="guaranteed-acceptance"] [data-qf-timing]')?.textContent === '2-Year Wait Plan - $15,000');
    await page.screenshot({ path: `/tmp/claude-0/layout11-${width}.png` });
    await ctx.close();
  });
}

for (const [funnel, width] of [['get-rates', 390], ['free-quote', 1280]]) {
  await check(`V2.4 (/${funnel}/, ${width}px, /test/): green headers, yellow feedback, synced counters (also after a deselect), confirmation, then /about/; a failed submit shows no confirmation`, async () => {
    const { ctx, page } = await toRates({ owner: true, phone: `214-867-58${width === 390 ? 10 : 11}`, width, funnel });
    await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
    await page.waitForSelector('[data-qa]:not([hidden])');
    const heads = await page.$$eval('[data-qa-q] legend', (ls) => ls.map((l) => ({ t: l.textContent.trim(), bg: getComputedStyle(l).backgroundColor, c: getComputedStyle(l.querySelector('.qa-prompt')).color, w: Math.round(l.getBoundingClientRect().width), r: getComputedStyle(l).borderTopLeftRadius })));
    const optW = await page.$eval('[data-qa-q="q2"] .qa-opt', (o) => Math.round(o.getBoundingClientRect().width));
    assert(heads[2].t === '3. Do You Have Any Of These Health Conditions?' && heads[5].t === '6. Have You Ever Had Any Of The Following?' && heads.every((h) => h.bg === 'rgb(23, 63, 53)' && h.c === 'rgb(255, 255, 255)' && h.w === optW && h.r === '12px' && !/Question|of 10/.test(h.t)), JSON.stringify(heads));
    await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
    const fbBox = await page.$eval('[data-qa-q="q2"] [data-qa-fb]', (e) => ({ bg: getComputedStyle(e).backgroundColor, r: getComputedStyle(e).borderTopLeftRadius, svg: !!e.querySelector('svg'), t: e.textContent.trim() }));
    assert(fbBox.bg === 'rgb(255, 247, 176)' && fbBox.r === '12px' && fbBox.svg && fbBox.t === FEEDBACK.conditions, JSON.stringify(fbBox));
    const counts = () => page.evaluate(() => [document.querySelector('[data-qa-count]').textContent, document.querySelector('[data-qa-count-bottom]').textContent, !document.querySelector('[data-qa-count-bottom]').hidden && getComputedStyle(document.querySelector('[data-qa-count-bottom]')).display !== 'none', document.querySelector('[data-qa-done]').hidden]);
    let c = await counts();
    assert(c[0] === '1 of 10 completed' && c[1] === c[0] && c[2] && c[3], JSON.stringify(c));
    await page.click('[data-qa-q="q2"] .qa-opt:has(input[value="arthritis"])');
    await answerAll(page);
    c = await counts();
    assert(c[0] === '10 of 10 completed' && c[1] === c[0] && !c[3], JSON.stringify(c));
    // V2.5: question 10's yellow feedback, SUBMIT MY ANSWERS (orange, white bold), Congratulations!, the bottom count.
    const lay = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const b = document.querySelector('[data-qa-submit]'), cs = getComputedStyle(b); const fb = r('[data-qa-q="q10"] [data-qa-fb]'), sb = r('[data-qa-submit]'), co = r('.qa-done__title'), ct = r('[data-qa-count-bottom]'); return { order: fb.bottom <= sb.top && sb.bottom <= co.top && co.bottom <= ct.top, gap: Math.round(sb.top - fb.bottom), bg: cs.backgroundColor, color: cs.color, weight: cs.fontWeight, opacity: cs.opacity, disabled: b.disabled, text: b.textContent.trim(), counts: document.querySelectorAll('[data-qa-count-bottom]').length }; });
    assert(lay.order && lay.gap < 48 && lay.bg === 'rgb(194, 65, 12)' && lay.color === 'rgb(255, 255, 255)' && Number(lay.weight) >= 700 && lay.opacity === '1' && !lay.disabled && lay.text === 'SUBMIT MY ANSWERS' && lay.counts === 1, JSON.stringify(lay));
    await page.uncheck('input[name="q10"][value="none"]');
    c = await counts();
    assert(c[0] === '9 of 10 completed' && c[1] === c[0] && c[3], JSON.stringify(c));
    await page.check('input[name="q10"][value="none"]');
    // A failed submission: no confirmation, no redirect, the answers stay.
    await page.route('**/api/quote/', (route) => (route.request().postData() ?? '').includes('"action":"application"') ? route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ status: 'delivery-failed', message: 'TEST failure' }) }) : route.continue());
    await page.click('[data-qa-submit]');
    await page.waitForFunction(() => document.querySelector('[data-qa-status]').textContent === 'TEST failure');
    await page.waitForTimeout(5600);
    assert(/\/apply\/$/.test(new URL(page.url()).pathname) && (await page.$eval('[data-qa-success]', (e) => e.hidden)), 'no confirmation or redirect after a failure');
    await page.unroute('**/api/quote/');
    await page.click('[data-qa-submit]');
    await page.waitForSelector('[data-qa-success]:not([hidden])');
    assert((await successText(page)).startsWith(SUCCESS), await successText(page));
    // V1.8: the test-mode CRM preview (nothing sent) shows the contact data for the real CRM.
    const pv = await page.textContent('[data-qa-preview]');
    const fb = funnel === 'get-rates';
    for (const t of ['New contact: no | Note: no', 'State: TX', `Contact source: Funeral Funds ${fb ? 'Facebook' : 'Website'} Quote`, `Lead Source: ${fb ? 'Facebook' : 'Website'}`, `URL: https://funeralfunds.com/${funnel}/`, `Field contact.original_funnel_url (set with the contact, before the quote tag): https://funeralfunds.com/${funnel}/`, 'Field contact.comments:', 'Then tag: Application Questionnaire Completed']) assert(pv.includes(t), `preview lacks ${t}: ${pv}`);
    await page.screenshot({ path: `/tmp/claude-0/v24-success-${width}.png` });
    await page.waitForURL(/\/about\/$/, { timeout: 8000 });
    await ctx.close();
  });
}

await check('V2.5: question 7 reads "7. Have You Ever Had Cancer Or Received Cancer Treatment?" with its four options; the selected cancer answers reach the saved summary', async () => {
  const { ctx, page } = await toRates({ owner: true, phone: '214-867-5910' });
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
  await page.waitForSelector('[data-qa]:not([hidden])');
  const q7 = await page.$eval('[data-qa-q="q7"]', (f) => ({ head: f.querySelector('legend').textContent.trim(), opts: [...f.querySelectorAll('.qa-opt span')].map((s) => s.textContent.trim()) }));
  assert(q7.head === '7. Have You Ever Had Cancer Or Received Cancer Treatment?' && q7.opts.join('|') === 'Cancer More Than 2 Years Ago|Cancer In The Last 2 Years|Currently Have Cancer|None of the above', JSON.stringify(q7));
  await page.selectOption('[data-qa-feet]', '5');
  await page.selectOption('[data-qa-inches]', '6');
  await page.fill('[data-qa-weight]', '180');
  for (const q of HEALTH_QUESTIONS) if (q.id !== 'q7') await page.check(`input[name="${q.id}"][value="none"]`);
  await page.check('input[name="q7"][value="cancer-over-2-years"]');
  await page.check('input[name="q7"][value="cancer-last-2-years"]');
  await page.check('input[name="q7"][value="none"]');
  assert((await page.$$eval('input[name="q7"]:checked', (i) => i.map((x) => x.value))).join() === 'none', 'None of the above clears the cancer answers');
  await page.check('input[name="q7"][value="cancer-last-2-years"]');
  await page.check('input[name="q7"][value="cancer-current"]');
  await page.click('[data-qa-submit]');
  await page.waitForSelector('[data-qa-preview]');
  const preview = await page.textContent('[data-qa-preview]');
  assert(preview.includes('Cancer In The Last 2 Years, Currently Have Cancer') && !/\(last 2 years\)/.test(preview), preview);
  await ctx.close();
});

await check('V1.9 (/free-quote/, mock CRM): State "TX", note "Lead Source: Website" / its URL, the same contact gets the questionnaire summary in Comments, then the tag; no new contact', async () => {
  srv.crm.comments = '';
  const { ctx, page } = await toRates({ phone: '214-867-5920', funnel: 'free-quote' });
  const upsert = [...srv.crm.calls].reverse().find((c) => c.url.endsWith('/contacts/upsert'));
  const note = [...srv.crm.calls].reverse().find((c) => c.url.endsWith('/notes'));
  assert(upsert.body.state === 'TX' && upsert.body.source === 'Funeral Funds Website Quote' && note.body.body.includes('Lead Source: Website\nURL: https://funeralfunds.com/free-quote/'), JSON.stringify([upsert.body.state, note.body.body.slice(0, 160)]));
  const ff2 = funnelField(srv.crm.calls, 'https://funeralfunds.com/free-quote/');
  assert(ff2 === true, `free-quote original_funnel_url: ${ff2}`);
  const before = srv.crm.calls.length;
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply-q]');
  await page.waitForSelector('[data-qa]:not([hidden])');
  await page.selectOption('[data-qa-feet]', '5');
  await page.selectOption('[data-qa-inches]', '6');
  await page.fill('[data-qa-weight]', '180');
  for (const q of HEALTH_QUESTIONS) if (q.id !== 'q7') await page.check(`input[name="${q.id}"][value="none"]`);
  await page.check('input[name="q7"][value="cancer-over-2-years"]');
  await page.click('[data-qa-submit]');
  await page.waitForURL(/\/about\/$/, { timeout: 8000 });
  const calls = srv.crm.calls.slice(before);
  assert(!calls.some((c) => c.url.endsWith('/contacts/upsert') || c.url.endsWith('/notes')), 'no new contact, no note');
  assert(calls.filter((c) => c.url.endsWith('/tags')).length === 1, 'one tag call');
  assert(srv.crm.comments.split('\n').slice(-2).join('|') === '5’6” | 180 lbs|Cancer More Than 2 Years Ago', srv.crm.comments);
  await ctx.close();
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
