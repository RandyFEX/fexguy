// Quote funnel end-to-end browser test (Quote System v3.5), mobile and
// desktop, against the built site (run `npm run build` first) served by
// tests/quote/funnel-server.mjs in test mode (V3.3: no SMS verification; no
// Agent CRM delivery on previews; Formspark intercepted, nothing sent). Needs the private rate tables in
// server/rates/private/ (npm run rates:extract), so it runs locally:
//   npm run test:quote:browser          (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';
import { priceCategories } from '../../server/rates/pricing-categories.js';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
const BASE = srv.base;
const OUT = process.env.OUT ?? '';
const URL_ = `${BASE}/free-quote/`;
const browser = await chromium.launch();
// v6.1/v6.2: requests the quote funnel must never make (Formspark, Cloudflare Turnstile, Resend).
const FORBIDDEN = /^https:\/\/([a-z0-9-]+\.)*(submit-form\.com|challenges\.cloudflare\.com|api\.resend\.com|resend\.com)\//;
const forbidden = [];
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
const shot = async (page, file, fullPage = false) => {
  if (OUT) await page.screenshot({ path: `${OUT}/${file}`, fullPage });
};
const PHONES = { mobile: '214-867-5309', desktop: '972-867-5310' };
const NAMES = { mobile: 'Mary Ann Smith', desktop: 'Mary Smith' };
const GREEN = 'rgb(23, 63, 53)';
const ORANGE = 'rgb(194, 65, 12)';
const TITLES = ['I need pricing for a...', 'How Old Are You?', 'Do You Use Tobacco?', 'How Would You Use These Funds?', 'How Much Coverage Would You Like?', 'What State Do You Live In?', 'Your Contact Information'];
const step = (page) => page.evaluate(() => Number(document.querySelector('[data-step]:not([hidden])')?.getAttribute('data-step')));
const amount = (page, id) => page.textContent(`[data-qf-card="${id}"] [data-qf-amount]`);
const atStart = (page) => page.waitForFunction(() => document.querySelector('[data-step="1"]:not([hidden])'), null, { timeout: 6000 });
const priceStatus = (page) =>
  page.evaluate(async () => (await fetch('/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': localStorage.getItem('ff:quote-visit') ?? 'none-visit-00000000' }, body: JSON.stringify({ age: 60, gender: 'male', tobacco: false, coverage: 10000 }) })).status);
const expected = (q) => Object.fromEntries(priceCategories(srv.engine, q).map((c) => [c.id, c.status === 'ok' ? `$${c.monthlyPremium}` : c.status]));

/** The dedicated minimal layout: nothing of the regular site header, menus, promo or footer. */
async function minimalLayout(page) {
  const r = await page.evaluate(() => {
    const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const text = document.body.innerText;
    const h1 = document.querySelector('h1');
    return {
      siteHeader: !!document.querySelector('header.site-header, .nav--mega, [data-mega-nav], footer.site-footer, .pre-footer'),
      menus: ['Company Reviews', 'Health & Eligibility', 'Guides & Tools', 'About Us'].filter((t) => text.includes(t)),
      promo: /Compare Quotes From Top Life Insurance Companies|GET QUOTES NOW|SEE PRICES NOW|Get Your Final Expense Insurance Quote|Olympia Drive|Flower Mound|Mailing Address/i.test(text),
      h1Visible: h1 ? h1.getBoundingClientRect().height > 2 : false,
      h1Count: document.querySelectorAll('h1').length,
      logo: document.querySelector('.qh-top a[data-header-logo]')?.getAttribute('href'),
      secure: visible(document.querySelector('.qh-secure')) && /Secure Form/.test(document.querySelector('.qh-secure')?.textContent ?? '') && !!document.querySelector('.qh-secure svg'),
      tel: document.querySelector('.qh-top a[data-header-phone]')?.getAttribute('href'),
      legal: [...document.querySelectorAll('.qh-foot a')].map((a) => a.textContent.trim()),
      footText: document.querySelector('.qh-foot').innerText.replace(/\s+/g, ' ').trim(),
      sticky: !!document.querySelector('.sticky-call, [data-sticky-call]'),
      headerH: Math.round(document.querySelector('.qh-top').getBoundingClientRect().height),
      label: /Speak With a Licensed Agent/i.test(document.querySelector('.qh-top').textContent),
    };
  });
  assert(!r.siteHeader && !r.menus.length && !r.promo && !r.sticky, `regular site parts present ${JSON.stringify(r)}`);
  assert(r.h1Count === 1 && !r.h1Visible, 'page heading visible');
  assert(r.logo === 'https://funeralfunds.com/' && r.secure && r.tel === 'tel:+18886564648', `header ${JSON.stringify(r)}`);
  assert(r.legal.join('|') === 'Privacy Policy|Terms of Use|Licenses', `legal links ${r.legal}`);
  assert(r.footText === 'Privacy Policy Terms of Use Licenses', `footer holds more than the three links: ${r.footText.slice(0, 80)}`);
  assert(r.headerH <= 90, `header ${r.headerH}px tall`);
  assert(!r.label, 'header still shows Speak With a Licensed Agent');
}

async function walk(page, phone, who = NAMES[phone === PHONES.mobile ? 'mobile' : 'desktop']) {
  await atStart(page);
  await page.click('[data-pick="gender"][data-value="female"]');
  await page.click('[data-pick="age"][data-value="60"]');
  await page.click('[data-pick="tobacco"][data-value="no"]');
  await page.click('[data-pick="use"][data-value="cremation"]');
  await page.click('[data-pick="coverage"][data-value="10000"]');
  await page.selectOption('[data-qf-state]', 'Ohio');
  await page.fill('#qf-first', who);
  await page.fill('#qf-phone', phone);
  await page.click('[data-qf-contact] button[type="submit"]');
}
/** V3.3: SEE MY RATES (walk) opens the rates at once; wait for the cards. */
async function verify(page) {
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
}

// The homepage SEE PRICES NOW button is the source of truth for the orange (v4.1).
const HOME_ORANGE = await (async () => {
  const p = await browser.newPage();
  await p.goto(`${BASE}/`);
  const c = await p.$eval('.hero__btn--primary', (e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color]);
  await p.close();
  if (c[1] !== 'rgb(255, 255, 255)') throw new Error(`homepage button text ${c[1]}`);
  return c[0];
})();
const HOME_HOVER = await (async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(`${BASE}/`);
  await p.hover('.hero__btn--primary');
  const f = await p.$eval('.hero__btn--primary', (e) => getComputedStyle(e).filter);
  await p.close();
  return f;
})();
/** /facebook/ after the handoff: no old callback form, CTA wording updated,
 * and every phone link and visible number is the expected one (campaign
 * number for Facebook/Instagram ad visits, the main number otherwise). */
const CAMPAIGN = { href: 'tel:8886564648', display: '888-656-4648', source: 'facebook-ad' };
const MAIN = { href: 'tel:8888629456', display: '888-862-9456', source: 'website' };
async function minimalCheckFacebook(page, phone = CAMPAIGN) {
  const other = phone === CAMPAIGN ? MAIN : CAMPAIGN;
  const ph = await page.evaluate(() => ({
    tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')),
    labels: [...document.querySelectorAll('a[href^="tel:"][aria-label]')].map((a) => a.getAttribute('aria-label')).join(' '),
    text: document.body.innerText,
    source: document.body.dataset.phoneSource,
    disclosure: document.querySelector('.fb-quote__note')?.textContent.trim(),
  }));
  assert(ph.tels.length >= 5 && ph.tels.every((h) => h === phone.href), `facebook tel links ${JSON.stringify(ph.tels)}`);
  const digits = other.display.replace(/-/g, '');
  assert(ph.text.includes(phone.display) && !ph.text.includes(other.display) && !ph.text.includes(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`) && !ph.labels.includes(other.display), `facebook numbers shown ${phone.display} / ${other.display}`);
  assert(ph.source === phone.source, `phone source ${ph.source}`);
  assert(!(await page.evaluate(() => document.documentElement.classList.contains('fb-phone-pending'))), 'phone numbers still hidden');
  assert(ph.disclosure === 'Your final premium and coverage are subject to insurance company approval.', `disclosure ${ph.disclosure}`);
  const f = await page.evaluate(() => ({
    forms: document.querySelectorAll('form').length,
    oldText: /Request Rates or Info|Prefer a Callback|Question or Message|REQUEST A CALLBACK|CALL NOW FOR YOUR FREE QUOTE|Burial Insurance That Can Start Today/i.test(document.body.innerText),
    ctas: [...document.querySelectorAll('a.fb-call__btn')].map((a) => [a.textContent.trim(), a.getAttribute('href')]),
    text: (() => { const t = document.querySelector('.fb-hero [data-fb-text]'), q = document.querySelector('.fb-hero [data-fb-qr-btn]'); return t && q && { label: t.querySelector('span').innerText.replace(/\s+/g, ' ').trim(), qrLabel: q.querySelector('span').innerText.replace(/\s+/g, ' ').trim(), icon: !!t.querySelector('svg') && !!q.querySelector('svg'), href: t.getAttribute('href'), note: t.nextElementSibling?.textContent.trim(), qrNote: q.nextElementSibling?.textContent.trim() }; })(),
    benefits: !!document.querySelector('#fb-advantage-title') && document.querySelector('#fb-advantage-title').textContent.trim() === 'Why Families Choose Funeral Funds Coverage',
  }));
  assert(f.forms === 0 && !f.oldText && f.benefits, `facebook page ${JSON.stringify(f)}`);
  // Two-option handoff V1.9: the cell phone button (an sms: link to the Agent CRM number once the
  // visitor's session has answered; no tel: link) and the computer button (QR code); the other
  // three call buttons are unchanged.
  assert(f.ctas.length === 3 && f.ctas.every(([t, h]) => t === 'CALL NOW TO COMPLETE YOUR APPLICATION' && h === phone.href), `facebook CTAs ${JSON.stringify(f.ctas)}`);
  assert(f.text && f.text.label === "CLICK HERE IF YOU'RE ON A CELL PHONE" && f.text.qrLabel === "CLICK HERE IF YOU'RE ON A COMPUTER" && f.text.icon && (f.text.href === null || /^sms:\+18886720762[?&]body=Hi%2C%20this%20is%20/.test(f.text.href)) && f.text.note === 'Click the button above to generate an SMS text and hit Send.' && f.text.qrNote === 'Scan our code with your cell phone camera to send a text.', `text options ${JSON.stringify(f.text)}`);
}

for (const [name, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  // v6.2: the funnel never contacts Formspark, Cloudflare Turnstile or Resend; any such request is recorded and fails the test.
  await ctx.route(FORBIDDEN, (r) => { forbidden.push(`${r.request().url()} (from ${r.request().frame()?.url() ?? '?'})`); return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await check(`${name}: a new visit starts at I need pricing for a... in the minimal quote layout`, async () => {
    await page.goto(URL_);
    await atStart(page);
    assert((await page.textContent('#qf-s1')).trim() === TITLES[0], 'title');
    await minimalLayout(page);
    await page.waitForTimeout(300);
    await shot(page, `v35-${name}-1-start.png`);
  });

  await check(`${name}: exact seven-step sequence, wording, progress and minimal layout on every screen`, async () => {
    for (let s = 1; s <= 7; s++) {
      assert((await step(page)) === s, `expected step ${s}`);
      assert((await page.textContent(`#qf-s${s}`)).trim() === TITLES[s - 1], `step ${s} title`);
      assert((await page.textContent('[data-qf-progress-label]')).trim() === `Step ${s} of 7`, `step ${s} progress`);
      const txt = await page.evaluate(() => [...document.querySelectorAll('.qf-body *')].filter((e) => e.offsetParent && e.children.length === 0).map((e) => e.textContent).join(' '));
      assert(!/Questions\? Call|How these prices work|Representative monthly rates|What Will Your Insurance Money|Burial & Funeral|Other Final Expenses/.test(txt), `step ${s}: ${txt.slice(0, 120)}`);
      await minimalLayout(page);
      if (s === 1) await page.click('[data-pick="gender"][data-value="female"]');
      if (s === 2) {
        const ages = await page.$$eval('[data-pick="age"]', (els) => els.map((e) => Number(e.dataset.value)));
        assert(ages.length === 40 && ages[0] === 50 && ages[39] === 89, 'ages 50-89');
        await page.click('[data-pick="age"][data-value="60"]');
      }
      if (s === 3) await page.click('[data-pick="tobacco"][data-value="no"]');
      if (s === 4) {
        const o = await page.$$eval('[data-pick="use"]', (els) => els.map((e) => [e.textContent, Math.round(e.getBoundingClientRect().height), Math.round(e.getBoundingClientRect().width)]));
        assert(o.map((x) => x[0]).join('|') === 'Burial Expenses|Cremation Expenses|Other Expenses', JSON.stringify(o));
        assert(new Set(o.map((x) => x[1])).size === 1 && new Set(o.map((x) => x[2])).size === 1 && o[0][1] >= 44, `button sizes ${JSON.stringify(o)}`);
        const lab = await page.$$eval('[data-pick="use"]', (els) => els.map((e) => { const range = document.createRange(); range.selectNodeContents(e); const t = range.getBoundingClientRect(); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { off: Math.abs(t.top + t.height / 2 - (r.top + r.height / 2)), lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), pad: [cs.paddingTop, cs.paddingBottom] }; }));
        assert(lab.every((x) => x.off <= 1.5 && x.lh <= 1.2 && x.pad[0] === x.pad[1]) && new Set(lab.map((x) => x.pad.join())).size === 1, `step 4 labels ${JSON.stringify(lab)}`);
        await page.waitForTimeout(400);
        await shot(page, `v35-${name}-2-use.png`);
        await page.click('[data-pick="use"][data-value="cremation"]');
      }
      if (s === 5) {
        const c = await page.$$eval('[data-qf-step="5"] .qf-opt, [data-step="5"] .qf-opt', (els) => els.map((e) => e.textContent.trim()));
        assert(c.join('|') === '$5,000|$10,000|$15,000|$20,000|$25,000|Other', c.join('|'));
        await page.click('[data-pick="coverage"][data-value="10000"]');
      }
      if (s === 6) {
        assert((await page.$$eval('[data-qf-state] option', (els) => els.filter((e) => e.value).length)) === 50, '50 states');
        await page.selectOption('[data-qf-state]', 'Ohio');
      }
    }
    await page.click('[data-qf-back]');
    assert((await step(page)) === 6, 'back');
    await page.goto(URL_);
  });

  await check(`${name}: contact screen shows the selections, SEE MY RATES with the consent disclosure under it, and the promise`, async () => {
    await atStart(page);
    await page.click('[data-pick="gender"][data-value="female"]');
    await page.click('[data-pick="age"][data-value="60"]');
    await page.click('[data-pick="tobacco"][data-value="no"]');
    await page.click('[data-pick="use"][data-value="cremation"]');
    await page.click('[data-pick="coverage"][data-value="10000"]');
    await page.selectOption('[data-qf-state]', 'Ohio');
    const sum = await page.$$eval('[data-qf-summary] > div', (els) => els.map((e) => `${e.querySelector('dt').textContent}:${e.querySelector('dd').textContent}`));
    assert(sum.join('|') === 'Gender:Female|Age:60|State:Ohio|Tobacco:Non-Smoker|Coverage:$10,000', sum.join('|'));
    const wraps = await page.$$eval('[data-qf-summary] dd', (els) => els.filter((e) => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).lineHeight) * 1.5).length);
    assert(wraps === 0, `${wraps} summary values wrap`);
    const over = await page.$$eval('[data-qf-summary] > div', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    assert(over === 0, `${over} summary values overflow their box`);
    const btn = await page.$eval('[data-qf-contact] button[type="submit"]', (b) => [b.textContent.trim(), b.nextElementSibling?.matches('[data-qf-disclosure]')]);
    assert(btn[0] === 'SEE MY RATES' && btn[1], JSON.stringify(btn));
    const cta = await page.$eval('[data-qf-contact] button[type="submit"]', (b) => [getComputedStyle(b).backgroundColor, getComputedStyle(b).color]);
    assert(cta[0] === HOME_ORANGE && cta[0] === ORANGE && cta[1] === 'rgb(255, 255, 255)', `contact button colors ${cta} vs homepage ${HOME_ORANGE}`);
    const inputs = await page.$$eval('[data-qf-contact] input:not([type="checkbox"]):not([type="hidden"])', (els) => els.map((e) => [e.id, document.querySelector(`label[for="${e.id}"]`)?.textContent.trim(), e.type]));
    assert(JSON.stringify(inputs) === JSON.stringify([['qf-first', 'Full Name', 'text'], ['qf-phone', 'Mobile Phone Number', 'tel']]), `contact inputs ${JSON.stringify(inputs)}`);
    assert(!(await page.$('[data-step="7"] input[type="email"], [data-step="7"] [name*="mail" i]')), 'an email field is on the contact screen');
    const sel = '[data-qf-contact] button[type="submit"]';
    const colors = async () => page.$eval(sel, (b) => [getComputedStyle(b).backgroundColor, getComputedStyle(b).color, getComputedStyle(b).filter]);
    await page.hover(sel);
    const hov = await colors();
    await page.focus(sel);
    const foc = await colors();
    await page.mouse.move(0, 0);
    assert(hov[0] === HOME_ORANGE && hov[1] === 'rgb(255, 255, 255)' && foc[0] === HOME_ORANGE && foc[1] === 'rgb(255, 255, 255)', `hover/focus colors ${hov} / ${foc}`);
    if (HOME_HOVER && name === 'desktop') assert(hov[2] === HOME_HOVER, `hover ${hov[2]} vs homepage ${HOME_HOVER}`);
    const dis = await page.$eval(sel, (b) => { b.disabled = true; const r = [getComputedStyle(b).backgroundColor, getComputedStyle(b).color]; b.disabled = false; return r; });
    assert(dis[0] === HOME_ORANGE && dis[1] === 'rgb(255, 255, 255)', `disabled colors ${dis}`);
    const cw = await page.$eval('[data-qf-contact] button[type="submit"]', (b) => getComputedStyle(b).fontWeight);
    assert(Number(cw) >= 700, `contact button weight ${cw}`);
    const order = await page.$eval('.qf-reassure', (e) => [e.textContent.trim(), e.previousElementSibling?.matches('[data-qf-contact-status]') && e.previousElementSibling.previousElementSibling?.matches('[data-qf-disclosure]') && e.previousElementSibling.previousElementSibling.previousElementSibling?.matches('button[type="submit"]')]);
    assert(order[0] === 'Our Promise: No Spam Calls. No Junk Mail.' && order[1], `promise is not under the button ${JSON.stringify(order)}`);
    // V3.8 disclosure: smaller muted text (14px), up to 4 lines on desktop.
    const consent = await page.$eval('[data-qf-disclosure]', (e) => { const cs = getComputedStyle(e); return { fs: parseFloat(cs.fontSize), lines: Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; });
    assert(consent.fs >= 13 && consent.fs < 16 && (name !== 'desktop' || consent.lines <= 4), `consent text ${JSON.stringify(consent)}`);
    assert(!(await page.$('[data-step="7"] input[type="checkbox"], [data-qf-consent]')), 'a consent checkbox is on the contact step');
    assert((await page.textContent('[data-qf-disclosure]')).trim() === 'By clicking "see my rates", you agree to our Privacy Policy (opens in a new tab) and consent to receive phone calls and SMS text messages from Funeral Funds at the number provided about your insurance request. Consent is not a condition of purchase.', 'disclosure text');
    assert((await page.getAttribute('[data-qf-disclosure] a', 'href')) === '/privacy-policy/', 'privacy link');
    assert((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, 'horizontal scroll');
    await page.fill('#qf-first', NAMES[name]);
    await page.fill('#qf-phone', PHONES[name]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await shot(page, `v35-${name}-3-contact.png`);
    await page.goto(URL_);
  });

  await check(`${name}: SEE MY RATES opens the rates directly: no code, no access-code text, no unlock panel`, async () => {
    await page.goto(URL_);
    await atStart(page);
    await page.evaluate(() => { window.__same = true; });
    await walk(page, PHONES[name]);
    await page.waitForSelector('[data-step="8"]:not([hidden])', { timeout: 8000 });
    await minimalLayout(page);
    const r = await page.evaluate(() => ({
      unlock: !!document.querySelector('[data-qf-unlock], [data-qf-send], [data-qf-verify], #qf-code, [data-qf-temp-note], [data-qf-resend]'),
      text: /access code|6-digit|verification code|Verify Code|123456|Unlock|temporarily unavailable/i.test(document.body.innerText),
      progress: !document.querySelector('[data-qf-progress-wrap]').hidden,
    }));
    assert(!r.unlock && !r.text && !r.progress, JSON.stringify(r));
  });

  await check(`${name}: the results: shown in place, exact card content, accurate premiums, scrolled to the results`, async () => {
    await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.qf-card img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
    assert(await page.evaluate(() => window.__same === true), 'page reloaded');
    const h = await page.$eval('#qf-s8', (e) => ({ t: e.textContent.trim(), top: e.getBoundingClientRect().top, h: e.getBoundingClientRect().height }));
    assert(h.t === 'Call Funeral Funds for Access to Even Lower Rates!' && h.h > 10, JSON.stringify(h));
    const resIntro = await page.evaluate(() => {
      const t = document.querySelector('#qf-s8'), lead = document.querySelector('[data-qf-results-lead]'), c = document.querySelector('.qf-cards');
      const ls = getComputedStyle(lead), lr = lead.getBoundingClientRect(), tr = t.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const between = [...t.parentElement.children].filter((el) => el.getClientRects().length && el.getBoundingClientRect().top >= tr.top - 1 && el.getBoundingClientRect().bottom <= cr.top + 1 && el !== t && el !== lead && !el.classList.contains('visually-hidden'));
      return { text: lead.textContent.trim(), afterHeading: lead.previousElementSibling === t, nextIsCards: (() => { let n = lead.nextElementSibling; while (n && (n.classList.contains('visually-hidden') || n.hidden)) n = n.nextElementSibling; return n === c; })(), fs: parseFloat(ls.fontSize), align: ls.textAlign, color: ls.color, gap: Math.round(lr.top - tr.bottom), below: Math.round(cr.top - lr.bottom),
        centered: Math.abs(lr.left + lr.width / 2 - (cr.left + cr.width / 2)) <= 2, headingAlign: getComputedStyle(t).textAlign, headingColor: getComputedStyle(t).color, headingFs: parseFloat(getComputedStyle(t).fontSize), others: between.map((el) => el.className), oldGone: !document.querySelector('[data-qf-results-sub]') && !/Insurance Company Options|up to 30 additional|May Qualify/.test(document.body.innerText) };
    });
    assert(/^Let us check your lowest rates from 30\+ insurance companies\. Offer available for: (10:00|9:[0-5]\d)$/.test(resIntro.text) && resIntro.afterHeading && resIntro.nextIsCards && resIntro.fs < resIntro.headingFs && resIntro.fs >= 15 && resIntro.align === 'center' && resIntro.centered && resIntro.color === GREEN && resIntro.headingColor === GREEN && resIntro.headingAlign === 'center' && resIntro.gap >= 4 && resIntro.gap <= 12 && resIntro.below >= 6 && resIntro.below <= 12 && resIntro.others.length === 0 && resIntro.oldGone, `results intro ${JSON.stringify(resIntro)}`);
    const vh = await page.evaluate(() => window.innerHeight);
    assert(h.top >= 0 && h.top < vh / 3, `results heading at ${Math.round(h.top)}px (viewport ${vh})`);
    assert(!(await page.content()).includes('Your Insurance Prices'), 'old heading present');
    const cards = await page.$$eval('.qf-card', (els) =>
      els.map((e) => {
        const img = e.querySelector('[data-qf-logo] img');
        const r = img?.getBoundingClientRect();
        return {
          s: e.dataset.state, amount: e.querySelector('[data-qf-amount]').textContent, plan: e.querySelector('[data-qf-plan]').textContent, timing: e.querySelector('[data-qf-timing]').textContent,
          timingShown: !e.querySelector('[data-qf-timing]').hidden, blurred: e.querySelectorAll('.qf-blur').length, dis: e.querySelector('[data-qf-apply]').disabled,
          logo: img ? img.alt : e.querySelector('[data-qf-logo]').textContent, src: img?.getAttribute('src') ?? null,
          ratio: img ? Math.abs(r.width / r.height - img.naturalWidth / img.naturalHeight) / (img.naturalWidth / img.naturalHeight) : 0,
        };
      }),
    );
    assert(cards.every((c) => c.s === 'ok' && c.blurred === 0 && !c.dis && c.timingShown && c.ratio < 0.03), JSON.stringify(cards));
    assert(cards.map((c) => `${c.logo}/${c.plan}/${c.timing}`).join('|') === 'Mutual of Omaha/Living Promise/First-Day Coverage|Aetna/Accendo Final Expense/First-Day Coverage|Gerber Life/No Health Questions/2-Year Waiting Period', cards.map((c) => `${c.logo}/${c.plan}/${c.timing}`).join('|'));
    assert(cards[0].src === '/images/carriers/mutual-of-omaha-logo.jpg' && cards[1].src === '/images/carriers/cvs-aetna-logo.png' && cards[2].src === '/images/carriers/gerber-life-logo.png', `logo files ${cards.map((c) => c.src)}`);
    const icons = await page.$$eval('[data-qf-timing] svg', (els) => els.map((e) => e.dataset.icon));
    assert(icons.join('|') === 'check|check|calendar', `timing icons ${icons}`);
    const fit = await page.$$eval('.qf-card__logo img', (els) => els.map((e) => getComputedStyle(e).objectFit));
    assert(fit.every((f) => f === 'contain'), `object-fit ${fit}`);
    const exp = expected({ age: 60, gender: 'female', tobacco: false, coverage: 10000 });
    assert(cards[0].amount === exp['lowest-preferred'] && cards[1].amount === exp['average-standard'] && cards[2].amount === exp['guaranteed-acceptance'], `premiums ${cards.map((c) => c.amount)} vs ${JSON.stringify(exp)}`);
    assert(cards[2].amount === '$51.06', `Gerber benchmark ${cards[2].amount}`);
    assert(!(await page.$('[data-qf-unlock]')), 'verification panel present');
    const intro = await page.textContent('[data-qf-adjust-intro]');
    assert(intro === 'Adjust Your Quote Below', intro);
    const gaps = await page.evaluate(() => { const c = document.querySelector('.qf-cards').getBoundingClientRect(), i = document.querySelector('[data-qf-adjust-intro]'), r = i.getBoundingClientRect(), a = document.querySelector('[data-qf-adjust]').getBoundingClientRect(); return { cards: Math.round(r.top - c.bottom), controls: Math.round(a.top - r.bottom), align: getComputedStyle(i).textAlign }; });
    assert(gaps.cards >= 10 && gaps.cards <= 14 && gaps.controls <= 12 && gaps.align === 'center', `spacing under the cards ${JSON.stringify(gaps)}`);
    const o = await page.evaluate(() => ['.qf-cards', '[data-qf-adjust-intro]', '[data-qf-adjust]', '.qf-ref', '[data-qf-tiers]'].map((sel) => document.querySelector(sel).getBoundingClientRect().top));
    const ref = await page.$eval('[data-qf-ref]', (e) => ({ visible: e.getClientRects().length > 0, text: e.textContent.trim() }));
    assert(ref.visible && ref.text === 'Representative monthly rates. Actual premiums and availability may vary by state and insurance company.', `rate note after verification ${JSON.stringify(ref)}`);
    // Rate-tier explanations directly under the disclaimer; no Start New Quote control.
    const tiers = await page.evaluate(() => { const t = document.querySelector('[data-qf-tiers]'), r = document.querySelector('[data-qf-ref]'); const cs = getComputedStyle(t);
      return { after: r.nextElementSibling === t, visible: t.getClientRects().length > 0, text: t.innerText.replace(/\s+/g, ' ').trim(), align: cs.textAlign, color: cs.color, fs: parseFloat(cs.fontSize), refFs: parseFloat(getComputedStyle(r).fontSize), bold: [...t.querySelectorAll('strong, .qf-tiers__title')].map((e) => Number(getComputedStyle(e).fontWeight)), restart: !!document.querySelector('[data-qf-restart]')?.getClientRects().length, overflow: t.scrollWidth > t.clientWidth }; });
    assert(tiers.after && tiers.visible && tiers.text === "Understanding Your 3 Rate Options Lowest Preferred Rate: Covers those in generally good health, including multiple common medical conditions controlled with medication(s). Standard Rate: Covers many serious health conditions such as heart attacks, Parkinson's, COPD, and other serious medical conditions. Guaranteed Acceptance Rate: Covers all health issues with no questions asked. Comes with a 2-year waiting period for nonaccidental death." && tiers.align === 'left' && tiers.color === 'rgb(32, 37, 34)' && tiers.fs >= 14 && tiers.fs <= 15 && tiers.bold.length === 4 && tiers.bold.every((w) => w >= 700) && !tiers.restart && !tiers.overflow, `rate tiers ${JSON.stringify(tiers)}`);
    // v4.3: each adjustment label is centered over its own controls.
    const centers = await page.$$eval('.qf-adjust .qf-group', (gs) => gs.map((g) => {
      const t = g.querySelector('.qf-group__title');
      const range = document.createRange();
      range.selectNodeContents(t);
      const tr = range.getBoundingClientRect();
      const ctl = g.querySelector('select, .qf-seg__opts').getBoundingClientRect();
      return { label: t.textContent.trim(), off: Math.round(Math.abs(tr.left + tr.width / 2 - (ctl.left + ctl.width / 2))) };
    }));
    assert(centers.map((c) => c.label).join('|') === 'Age|Gender|Tobacco|Coverage' && centers.every((c) => c.off <= 2), `labels not centered ${JSON.stringify(centers)}`);
    assert(o.every((t, i) => i === 0 || t > o[i - 1]), `order ${o}`);
    await shot(page, `v35-${name}-5-revealed.png`);
    await shot(page, `v35-${name}-5-revealed-full.png`, true);
    return cards.map((c) => `${c.logo} ${c.amount}`).join('; ');
  });

  await check(`${name}: approved card design (borders, accents, panels, buttons, alignment)`, async () => {
    const d = await page.$$eval('.qf-card', (els) =>
      els.map((e) => {
        const cs = getComputedStyle(e);
        const top = (sel) => Math.round(e.querySelector(sel).getBoundingClientRect().top);
        const r = e.getBoundingClientRect();
        return {
          bg: cs.backgroundColor, bTop: cs.borderTopWidth, bTopC: cs.borderTopColor, bSide: parseFloat(cs.borderLeftWidth), bSideC: cs.borderLeftColor, radius: parseFloat(cs.borderTopLeftRadius),
          cat: getComputedStyle(e.querySelector('.qf-card__cat')).backgroundColor, timing: getComputedStyle(e.querySelector('[data-qf-timing]')).backgroundColor,
          apply: getComputedStyle(e.querySelector('[data-qf-apply]')).backgroundColor, amt: parseFloat(getComputedStyle(e.querySelector('[data-qf-amount]')).fontSize), per: parseFloat(getComputedStyle(e.querySelector('.qf-card__per')).fontSize),
          logoH: Math.round(e.querySelector('[data-qf-logo]').getBoundingClientRect().height),
          rows: [top('.qf-card__cat'), top('[data-qf-plan]'), top('.qf-card__price'), top('[data-qf-timing]'), top('[data-qf-call]'), top('[data-qf-apply]')], h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width),
        };
      }),
    );
    for (const c of d) {
      assert(c.bg === 'rgb(255, 255, 255)' && c.bTop === '8px' && c.bTopC === GREEN && c.bSide > 0 && c.bSide <= 2 && c.bSideC === GREEN && c.radius >= 8, `card frame ${JSON.stringify(c)}`);
      assert(c.cat === c.timing && c.cat !== 'rgba(0, 0, 0, 0)' && c.cat !== 'rgb(255, 255, 255)', `sage panels ${c.cat} ${c.timing}`);
      assert(c.apply === GREEN && c.amt >= 40 && c.per < c.amt / 2, `button/premium ${JSON.stringify(c)}`);
    }
    assert(new Set(d.map((c) => c.logoH)).size === 1, 'logo areas differ in size');
    if (name === 'desktop') {
      assert(new Set(d.map((c) => c.w)).size === 1 && new Set(d.map((c) => c.y)).size === 1, `not three equal cards in a row ${JSON.stringify(d.map((c) => [c.x, c.y, c.w]))}`);
      assert(new Set(d.map((c) => c.h)).size === 1, `card heights differ ${d.map((c) => c.h)}`);
      for (let k = 0; k < 6; k++) assert(new Set(d.map((c) => c.rows[k])).size === 1, `row ${k} not aligned ${JSON.stringify(d.map((c) => c.rows))}`);
    } else {
      assert(d.every((c, i) => i === 0 || c.y > d[i - 1].y), 'mobile cards not stacked');
      assert((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, 'horizontal scroll');
    }
  });

  await check(`${name}: Call Us With Questions (orange tel: link above green Text Us With Questions, CTA V1.5) with first-party attribution and no personal data`, async () => {
    const b = await page.$$eval('.qf-card', (els) =>
      els.map((e) => {
        const call = e.querySelector('[data-qf-call]');
        const apply = e.querySelector('[data-qf-apply]');
        const cr = call.getBoundingClientRect();
        const ar = apply.getBoundingClientRect();
        const timing = e.querySelector('[data-qf-timing]');
        const tr = timing.getBoundingClientRect();
        return { href: call.getAttribute('href'), text: call.textContent.replace(/\s+/g, ' ').trim(), icon: !!call.querySelector('svg'), bg: getComputedStyle(call).backgroundColor, applyText: apply.textContent.trim(), applyIcon: getComputedStyle(apply.querySelector('svg')).display !== 'none', applyHref: apply.getAttribute('href'), applyBg: getComputedStyle(apply).backgroundColor, applyFg: getComputedStyle(apply).color, applyCentered: (() => { const range = document.createRange(); range.selectNodeContents(apply); const t = range.getBoundingClientRect(); return Math.abs(t.top + t.height / 2 - (ar.top + ar.height / 2)) <= 1.5 && Math.abs(t.left + t.width / 2 - (ar.left + ar.width / 2)) <= 1.5; })(), fg: getComputedStyle(call).color, above: cr.bottom <= ar.top, ch: Math.round(cr.height), ah: Math.round(ar.height), cw: Math.round(cr.width), aw: Math.round(ar.width), th: Math.round(tr.height), tLines: Math.round((tr.height - 10) / parseFloat(getComputedStyle(timing).lineHeight)), tOver: timing.scrollWidth - timing.clientWidth, gap: Math.round(cr.top - tr.bottom) };
      }),
    );
    for (const c of b) {
      assert(c.href === 'tel:+18886564648' && c.text === 'Call Us With Questions' && c.icon && c.bg === ORANGE, `call button ${JSON.stringify(c)}`);
      assert(c.applyText === 'Text Us With Questions' && c.applyIcon && c.applyBg === GREEN && c.applyFg === 'rgb(255, 255, 255)' && c.above && c.ch >= 46 && c.ch <= 48 && (name === 'desktop' ? c.ah >= 34 && c.ah <= 36 : c.ah >= 44) && c.ch > c.ah && c.cw === c.aw && c.applyCentered, `apply button ${JSON.stringify(c)}`);
      assert(c.bg === HOME_ORANGE && c.fg === 'rgb(255, 255, 255)', `call colors ${JSON.stringify(c)}`);
      assert((name === 'desktop' ? c.th >= 26 && c.th <= 28 : c.th <= 30) && c.tLines === 1 && c.tOver === 0 && c.gap <= 10, `timing panel ${JSON.stringify(c)}`);
    }
    assert(!/Apply Now|instant approval|guaranteed approval/i.test(await page.textContent('.qf-cards')), 'old or overpromising wording');
    await page.evaluate(() => {
      window.__funnel = [];
      window.addEventListener('ff:funnel', (e) => window.__funnel.push(e.detail));
      document.addEventListener('click', (e) => { if (e.target.closest('a[href^="tel:"]')) e.preventDefault(); }, true);
    });
    await page.click('[data-qf-card="lowest-preferred"] [data-qf-call]');
    await page.waitForTimeout(500);
    const ev = await page.evaluate(() => window.__funnel.filter((d) => d.name === 'quote_call_click'));
    assert(ev.length === 1, `${ev.length} call events`);
    const d = ev[0];
    const exp = expected({ age: 60, gender: 'female', tobacco: false, coverage: 10000 });
    assert(d.category === 'lowest-preferred' && d.carrier === 'Mutual of Omaha' && d.product === 'Living Promise' && d.coverage === 10000 && `$${d.premium}` === exp['lowest-preferred'] && /^[A-Za-z0-9]{16}$/.test(d.quoteRef) && !Number.isNaN(Date.parse(d.at)), JSON.stringify(d));
    const keys = Object.keys(d).sort().join(',');
    // v5.8: the entry type (a direct visit here: no article path) rides on every funnel event.
    assert(keys === 'at,carrier,category,coverage,entryType,name,premium,product,quoteRef' && d.entryType === 'direct', `unexpected event fields ${keys}`);
    const raw = JSON.stringify(d);
    assert(!raw.includes('Mary') && !raw.includes(PHONES[name].replace(/\D/g, '').slice(-4)) && !/Ohio/.test(raw), 'personal information in the analytics event');
    const recs = await (await fetch(`${BASE}/__evidence/`)).json();
    const mine = recs.find((r) => (r.callClicks ?? []).some((c) => c.quoteRef === d.quoteRef));
    assert(mine && mine.callClicks.at(-1).carrier === 'Mutual of Omaha' && mine.callClicks.at(-1).product === 'Living Promise', 'call tap not in the lead record');
    await page.click('[data-qf-card="guaranteed-acceptance"] [data-qf-call]');
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => window.__funnel.filter((x) => x.name === 'quote_call_click').at(-1));
    assert(g.carrier === 'Gerber Life' && g.product === 'Guaranteed Life', `Gerber attribution keeps the official product name ${JSON.stringify(g)}`);
    return `${d.carrier} / ${d.product} $${d.premium}`;
  });
  await check(`${name}: repricing without another code; accurate premiums; layout groups intact`, async () => {
    await page.click('.qf-adjust label:has(input[name="gender"][value="male"])');
    await page.waitForFunction(() => document.querySelector('[data-qf-card="guaranteed-acceptance"] [data-qf-amount]')?.textContent === '$63.89', null, { timeout: 5000 });
    const exp = expected({ age: 60, gender: 'male', tobacco: false, coverage: 10000 });
    assert((await amount(page, 'lowest-preferred')) === exp['lowest-preferred'] && (await amount(page, 'average-standard')) === exp['average-standard'], 'male premiums');
    await page.click('.qf-adjust label:has(input[name="tobacco"][value="yes"])');
    const exp2 = expected({ age: 60, gender: 'male', tobacco: true, coverage: 10000 });
    await page.waitForFunction((b) => document.querySelector('[data-qf-card="average-standard"] [data-qf-amount]')?.textContent === b, exp2['average-standard'], { timeout: 5000 });
    await page.selectOption('#qf-adj-age', '87');
    await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.getAttribute('data-state') === 'unavailable' && document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 5000 });
    assert(await page.isHidden('[data-qf-card="lowest-preferred"] [data-qf-timing]') || !(await page.textContent('[data-qf-card="lowest-preferred"] [data-qf-timing]')), 'timing shown for an unavailable product');
    const boxes = await page.$$eval('.qf-group', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { y: Math.round(r.y) }; }));
    if (name === 'desktop') assert(boxes[0].y === boxes[1].y && boxes[1].y === boxes[2].y && boxes[3].y > boxes[0].y, 'desktop layout');
    else assert(boxes.every((b, i) => i === 0 || b.y > boxes[i - 1].y), 'mobile stack');
    const seg = await page.$$eval('.qf-adjust .qf-seg__opt', (els) => els.map((l) => { const sp = l.querySelector('span'); const cs = getComputedStyle(sp); return { on: l.querySelector('input').checked, bg: cs.backgroundColor, fg: cs.color, border: cs.borderTopColor }; }));
    const CHAR = 'rgb(69, 75, 73)';
    assert(seg.filter((x) => x.on).length === 3 && seg.every((x) => (x.on ? x.bg === CHAR && x.fg === 'rgb(255, 255, 255)' && x.border === CHAR : x.bg === 'rgb(255, 255, 255)' && x.fg === 'rgb(74, 80, 78)' && x.border === 'rgb(111, 118, 115)')), `selection colors ${JSON.stringify(seg)}`);
    const titles = await page.$$eval('.qf-adjust .qf-group__title', (els) => els.map((e) => getComputedStyle(e).color));
    assert(titles.every((c) => c === 'rgb(74, 80, 78)'), `label colors ${titles}`);
    const greens = await page.evaluate(() => {
      const isGreen = (c) => { const m = c.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/); if (!m || m[4] === '0') return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; return g - Math.max(r, b) > 8; };
      const els = [document.querySelector('[data-qf-adjust-intro]'), ...document.querySelectorAll('[data-qf-adjust], [data-qf-adjust] *')];
      const bad = [];
      for (const e of els) {
        if (!e.getClientRects().length) continue;
        const cs = getComputedStyle(e);
        for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'outlineColor', 'accentColor'])
          if (isGreen(cs[prop]) && !(prop.startsWith('border') && cs.borderTopStyle === 'none' && parseFloat(cs.borderTopWidth) === 0)) bad.push(`${e.tagName}.${e.className}:${prop}=${cs[prop]}`);
      }
      return bad;
    });
    assert(greens.length === 0, `green in the adjustment section: ${greens.slice(0, 5).join('; ')}`);
    const pads = await page.$$eval('.qf-adjust .qf-group', (gs) => gs.map((g) => { const r = g.getBoundingClientRect(); const t = g.querySelector('.qf-group__title').getBoundingClientRect(); const kids = [...g.querySelectorAll('select, .qf-seg__opts')].map((k) => k.getBoundingClientRect()); const bottom = Math.max(...kids.map((k) => k.bottom)); return { top: Math.round(t.top - r.top), bottom: Math.round(r.bottom - bottom) }; }));
    assert(pads.every((x) => Math.abs(x.top - x.bottom) <= 2 && x.top <= 10), `group padding ${JSON.stringify(pads)}`);
    if (OUT) await page.locator('[data-qf-adjust]').screenshot({ path: `${OUT}/v37c-${name}-adjust.png` });
    const q = await page.$$eval('[data-step="1"] .qf-person, [data-step="3"] .qf-opt', (els) => els.map((e) => getComputedStyle(e).backgroundColor));
    assert(!q.includes(CHAR), 'charcoal leaked into the questionnaire');
    const heights = await page.$$eval('.qf-adjust .qf-control', (els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)));
    assert(Math.max(...heights) - Math.min(...heights) <= 2 && (name === 'desktop' ? Math.min(...heights) >= 34 && Math.max(...heights) <= 37 : Math.min(...heights) >= 44), `control heights ${heights}`);
    assert((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, 'horizontal scroll');
    await page.selectOption('#qf-adj-age', '70');
    await page.click('.qf-adjust label:has(input[name="tobacco"][value="no"])');
    await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.getAttribute('data-state') === 'ok', null, { timeout: 5000 });
  });

  await check(`${name}: reload during the visit keeps the prices`, async () => {
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-step="8"]:not([hidden])') && document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 6000 });
    assert((await page.inputValue('#qf-adj-age')) === '70', 'selection not kept');
  });
  // 12-hour quote access (Randy, November 2026): the same browser returns to its unlocked quote.
  await check(`${name}: within 12 hours a new tab, or closing and reopening the browser, returns to the unlocked quote`, async () => {
    const tab = await ctx.newPage();
    await tab.goto(URL_);
    await tab.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    assert((await priceStatus(tab)) === 200, 'new tab lost the quote');
    await tab.close();
    const state = await ctx.storageState();
    const cookie = state.cookies.find((c) => c.name.startsWith('ff_') || c.path === '/api/');
    assert(cookie && cookie.expires > Date.now() / 1000 + 11 * 3600 && cookie.expires <= Date.now() / 1000 + 12 * 3600 + 5, `cookie lifetime ${JSON.stringify(cookie)}`);
    const reopened = await browser.newContext({ ...opts, storageState: state });
    const p2 = await reopened.newPage();
    await p2.goto(URL_);
    await p2.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await reopened.close();
  });
  await check(`${name}: another browser (the cookie without this browser's saved visit) starts fresh`, async () => {
    const state = await ctx.storageState();
    const ctx2 = await browser.newContext({ ...opts, storageState: { cookies: state.cookies, origins: [] } });
    const p2 = await ctx2.newPage();
    await p2.goto(URL_);
    await atStart(p2);
    assert((await priceStatus(p2)) === 401, 'another browser got prices');
    await ctx2.close();
  });
  await check(`${name}: Apply Now on each card opens /facebook/ with that card's coverage and estimate (no stale values)`, async () => {
    const results = async () => {
      await page.goto(`${URL_}?utm_source=facebook&utm_campaign=test`);
      await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    };
    const applyAndRead = async (id) => {
      const card = await page.$eval(`[data-qf-card="${id}"]`, (e) => e.querySelector('[data-qf-amount]').textContent.trim());
      const coverage = await page.$eval('.qf-adjust input[name="coverage"]:checked', (e) => e.value);
      await page.click(`[data-qf-card="${id}"] [data-qf-apply]`);
      await page.waitForURL(/\/facebook\//, { timeout: 8000 });
      await page.waitForFunction(() => !document.querySelector('[data-fb-quote]')?.hidden, null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelector('[data-fb-text]')?.getAttribute('href'), null, { timeout: 5000 });
      const fb = await page.evaluate(() => ({
        sms: document.querySelector('[data-fb-text]').getAttribute('href'), smsBody: document.querySelector('[data-fb-text]').dataset.smsBody,
        url: location.pathname + location.search,
        title: document.querySelector('#fb-title').textContent.trim(),
        coverage: document.querySelector('[data-fb-quote-coverage]').textContent.trim(),
        premium: document.querySelector('[data-fb-quote-premium]').textContent.trim(),
        labels: [...document.querySelectorAll('.fb-quote dt, .fb-quote__title')].map((e) => e.textContent.trim()), twelveHours: /remain active for the next 12 hours/i.test(document.body.innerText),
        handoff: JSON.parse(localStorage.getItem('ff:quote-handoff')),
      }));
      return { card, coverage, fb };
    };
    await results();
    const seen = [];
    for (const id of ['average-standard', 'lowest-preferred', 'guaranteed-acceptance']) {
      if (seen.length) await results();
      const r = await applyAndRead(id);
      const cov = `$${Number(r.coverage).toLocaleString('en-US')}`;
      assert(r.fb.url === '/facebook/?utm_source=facebook&utm_campaign=test' && r.fb.title === "Here's What You Selected", `destination ${JSON.stringify(r.fb)}`);
      assert(r.fb.premium === r.card && r.fb.coverage === cov, `${id} summary ${JSON.stringify(r)}`);
      assert(r.fb.labels.join('|') === 'Your Selected Coverage|Estimated Monthly Rate' && !r.fb.twelveHours, `labels ${r.fb.labels}`);
      // Native SMS V1.2: the prewritten text carries this visitor's first name and this card's coverage and premium.
      const prem = r.card.replace(/\.00$/, '');
      const text = `Hi, this is ${NAMES[name].split(' ')[0]}. I have a few questions about my ${cov} final expense insurance quote for ${prem}/month.`;
      // The cell phone button's sms: link (iOS format on the iPhone, ?body= elsewhere) carries this text.
      assert(r.fb.smsBody === text && r.fb.sms === `sms:+18886720762${name === 'desktop' ? '?' : '&'}body=${encodeURIComponent(text)}`, `${id} sms ${r.fb.sms} ${r.fb.smsBody}`);
      const h = r.fb.handoff;
      assert(h.v === 1 && h.selection.tierId === id && `$${h.selection.monthlyPremium}` === r.card && h.selection.coverage === Number(r.coverage) && h.selection.carrier && typeof h.inputs.age === 'number' && ['male', 'female'].includes(h.inputs.gender) && typeof h.inputs.tobacco === 'boolean' && h.attribution.utmSource === 'facebook' && h.attribution.utmCampaign === 'test', `handoff ${JSON.stringify(h)}`);
      assert(!JSON.stringify(h).match(/answer|health|condition/i), 'medical data in the handoff');
      seen.push(r.card);
    }
    // A different selection replaces the earlier one (no stale values).
    await results();
    await page.click('.qf-adjust label:has(input[name="coverage"][value="25000"])');
    await page.waitForFunction(() => document.querySelector('.qf-adjust input[name="coverage"][value="25000"]').checked, null, { timeout: 5000 });
    await page.waitForFunction((b) => document.querySelector('[data-qf-card="lowest-preferred"] [data-qf-amount]').textContent.trim() !== b, seen[1], { timeout: 8000 });
    const later = await applyAndRead('lowest-preferred');
    assert(later.fb.coverage === '$25,000' && later.fb.premium === later.card && later.card !== seen[1], `stale summary ${JSON.stringify(later)}`);
    await minimalCheckFacebook(page, CAMPAIGN);
  });
  await check(`${name}: Apply Now is an application intent only (quote_apply_now; no generate_lead, no Meta Lead, no lead flag); website visitors get the main number`, async () => {
    const logs = [];
    const onLog = (m) => logs.push(m.text());
    page.on('console', onLog);
    // A website visitor (no ad parameters): drop the session's earlier ad landing.
    await page.evaluate(() => sessionStorage.removeItem('fexguy:lead-source'));
    await page.goto(URL_);
    await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await page.evaluate(() => { window.__ffEvents = []; window.addEventListener('ff:funnel', (e) => window.__ffEvents.push(e.detail.name)); window.addEventListener('pagehide', () => sessionStorage.setItem('__ffEvents', JSON.stringify(window.__ffEvents))); });
    await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply]');
    await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
    await page.waitForFunction(() => !document.querySelector('[data-fb-quote]')?.hidden, null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({ pending: sessionStorage.getItem('fexguy:lead-pending'), events: JSON.parse(sessionStorage.getItem('__ffEvents') || '[]') }));
    page.off('console', onLog);
    assert(r.pending === null, 'lead flag set by Apply Now');
    assert(r.events.includes('quote_apply_now'), `events ${r.events}`);
    assert(!logs.some((t) => /generate_lead|'Lead'|\bLead\b/.test(t)), `lead conversion fired: ${logs.filter((t) => /Lead|lead/.test(t)).join(' | ')}`);
    await minimalCheckFacebook(page, MAIN);
  });
  await check(`${name}: every pricing input can be changed on the results screen (no Start New Quote control while the offer is open)`, async () => {
    await page.goto(URL_);
    await page.waitForFunction(() => document.querySelector('[data-step="8"]:not([hidden])'), null, { timeout: 6000 });
    const r = await page.evaluate(() => ({ age: !!document.querySelector('.qf-adjust select[name="age"]'), gender: document.querySelectorAll('.qf-adjust input[name="gender"]').length, tobacco: document.querySelectorAll('.qf-adjust input[name="tobacco"]').length, coverage: document.querySelectorAll('.qf-adjust input[name="coverage"]').length, restart: !!document.querySelector('[data-qf-restart]')?.getClientRects().length }));
    assert(r.age && r.gender === 2 && r.tobacco === 2 && r.coverage >= 6 && !r.restart, JSON.stringify(r));
    assert(errors.length === 0, errors.join('; '));
  });
  await ctx.close();
}
await check('evidence: the two journeys\' leads, consent records, intended use and every Apply Now selection kept; no phone ever marked verified', async () => {
  const recs = await (await fetch(`${BASE}/__evidence/`)).json();
  assert(recs.every((r) => r.verification.phoneVerified === false && !('verifyNotice' in r)), 'a record claims a verified phone');
  const v = recs.filter((r) => (r.applications ?? []).length === 5);
  assert(v.length === 2, `${v.length} journeys`);
  for (const r of v)
    assert(
      (r.firstName === 'Mary Smith' || r.firstName === 'Mary Ann Smith') && r.state === 'Ohio' && r.intendedUse?.label === 'Cremation Expenses' && r.applications[0].intendedUse === 'Cremation Expenses' &&
        r.consent.given === true && r.consent.version === 'ff-quote-consent-v5-2026-11' && r.consent.method === 'button-submission' && r.verification.status === 'not-required' && r.mode === 'test' &&
        r.applications[0].attribution[0] === 'FF-101' && r.applications.length === 5 && r.applications.map((x) => x.categoryId).join() === 'average-standard,lowest-preferred,guaranteed-acceptance,lowest-preferred,lowest-preferred' && r.applications[3].quote.coverage === 25000,
      JSON.stringify(r).slice(0, 300),
    );
  return `${recs.length} lead records (${v.length} full journeys)`;
});
await check('/facebook/ opened directly, or with a stale or invalid handoff, hides the quote summary', async () => {
  const p = await browser.newPage();
  await p.goto(`${BASE}/facebook/`);
  assert(await p.isHidden('[data-fb-quote]'), 'summary shown on a direct visit');
  for (const bad of [
    { v: 1, createdAt: Date.now() - 13 * 60 * 60 * 1000, origin: 'free-quote', selection: { tierId: 'lowest-preferred', tier: 'Lowest Preferred Rate', coverage: 10000, monthlyPremium: '43.76' } },
    // 12-hour quote access ended (expiresAt passed), even though the handoff itself is recent.
    { v: 1, createdAt: Date.now() - 60 * 1000, expiresAt: Date.now() - 1000, origin: 'free-quote', selection: { tierId: 'lowest-preferred', tier: 'Lowest Preferred Rate', coverage: 10000, monthlyPremium: '43.76' } },
    { v: 1, createdAt: Date.now(), origin: 'free-quote', selection: { tierId: 'lowest-preferred', tier: 'Lowest Preferred Rate', coverage: 999999, monthlyPremium: '43.76' } },
    { v: 1, createdAt: Date.now(), origin: 'free-quote', selection: { tierId: 'lowest-preferred', tier: 'Lowest Preferred Rate', coverage: 10000, monthlyPremium: 'abc' } },
  ]) {
    await p.evaluate((h) => localStorage.setItem('ff:quote-handoff', JSON.stringify(h)), bad);
    await p.reload();
    assert(await p.isHidden('[data-fb-quote]'), `summary shown for ${JSON.stringify(bad)}`);
  }
  await minimalCheckFacebook(p, MAIN);
  await p.close();
});
await check('/facebook/ phone by source: direct visit main number and no Lead; utm_source=facebook, fbclid and an earlier ad landing keep the campaign number', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => logs.push(m.text()));
  await p.goto(`${BASE}/facebook/`);
  await minimalCheckFacebook(p, MAIN);
  assert(!logs.some((t) => /generate_lead|\bLead\b/.test(t)), `direct visit counted a lead: ${logs.join(' | ')}`);
  await ctx.close();
  for (const q of ['?utm_source=facebook&utm_medium=paid', '?fbclid=abc123', '?utm_source=ig']) {
    const c = await browser.newContext();
    const pg = await c.newPage();
    await pg.goto(`${BASE}/facebook/${q}`);
    await minimalCheckFacebook(pg, CAMPAIGN);
    await c.close();
  }
  // Source survives the funnel: ad landing on /free-quote/, then /facebook/ without parameters.
  const c2 = await browser.newContext();
  const p2 = await c2.newPage();
  await p2.goto(`${BASE}/free-quote/?fbclid=xyz789`);
  await p2.goto(`${BASE}/facebook/`);
  await minimalCheckFacebook(p2, CAMPAIGN);
  // Other referral sources (e.g. google) get the main number.
  const p3 = await (await browser.newContext()).newPage();
  await p3.goto(`${BASE}/facebook/?utm_source=google`);
  await minimalCheckFacebook(p3, MAIN);
  await c2.close();
  await p3.context().close();
});

// Contact-step regression (V3.3): the page and the server use one phone check, so a number
// accepted on the contact step is never refused; autofill punctuation works; a refused number or
// name keeps every answer, with the field focused. Full journey at 390px and 1440px.
await check('SEE MY RATES works with autofill punctuation (390px and 1440px), refused numbers and names stay correctable, returning visitor keeps prices', async () => {
  const sizes = [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, '214‑837‑9301'], ['1440', { viewport: { width: 1440, height: 900 } }, '‪(214) 837-9302‬']];
  // Own client address per visitor, so this test stays under the per-IP submission limit (5 an hour).
  let ip = 10;
  for (const [w, opts, typed] of sizes) {
    const ctx = await browser.newContext({ ...opts, extraHTTPHeaders: { 'x-real-ip': `203.0.113.${ip++}` } });
    const page = await ctx.newPage();
    await page.goto(URL_);
    // A number the server would refuse is caught on the contact step, with its field.
    await walk(page, '214-555-0123', 'Sms Test');
    assert(await page.isVisible('#qf-phone') && /10-digit/.test(await page.textContent('#qf-phone-error')), `${w}: refused number not caught on the contact step`);
    await page.fill('#qf-phone', typed);
    await page.click('[data-qf-contact] button[type="submit"]');
    await page.waitForFunction(() => ['lowest-preferred', 'average-standard', 'guaranteed-acceptance'].every((c) => document.querySelector(`[data-qf-card="${c}"]`)?.getAttribute('data-state') === 'ok'), null, { timeout: 8000 });
    // Returning visitor (reload): prices stay open, nothing asked again.
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-qf-card="lowest-preferred"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await ctx.close();
  }
  // If the server still refuses the number or the name, the contact step stays with every answer kept.
  for (const [field, msg, name, phone] of [['phone', 'Please enter a valid 10-digit US mobile number.', 'Sms Test', '214-837-9303'], ['name', 'Please enter your full name (first and last name).', 'Pat O’Neil', '214-837-9305']]) {
    const c3 = await browser.newContext({ ...devices['iPhone 13'], extraHTTPHeaders: { 'x-real-ip': `203.0.113.${ip++}` } });
    const p3 = await c3.newPage();
    let refuse = true;
    await p3.route(/\/api\/quote\/$/, async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      if (req.action === 'start' && refuse) { refuse = false; return route.fulfill({ status: 400, json: { status: 'bad-request', field, message: msg } }); }
      return route.fulfill({ response: await route.fetch() });
    });
    await p3.goto(URL_);
    await walk(p3, phone, name);
    const input = field === 'phone' ? 'qf-phone' : 'qf-first';
    await p3.waitForFunction((id) => document.querySelector(`#${id}-error`)?.textContent, input, { timeout: 5000 });
    const kept = await p3.evaluate((id) => ({ step: document.querySelector('[data-step="7"]').hidden, name: document.querySelector('#qf-first').value, phone: document.querySelector('#qf-phone').value, err: document.querySelector(`#${id}-error`).textContent, focus: document.activeElement?.id }), input);
    assert(!kept.step && kept.name === name && kept.phone === phone && kept.err === msg && kept.focus === input, `${field} recovery ${JSON.stringify(kept)}`);
    await p3.click('[data-qf-contact] button[type="submit"]');
    await p3.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await c3.close();
  }
});
// /facebook/ quote box (v1.3; the 12-hour heading was removed in Countdown V2.0): figures twice the former 1.75rem (identical,
// side by side on desktop, stacked on phones), the disclaimer as one-line fine print on desktop.
await check('/facebook/ quote box v1.3: no 12-hour heading, large identical figures, fine-print disclaimer (390px and 1440px)', async () => {
  for (const [w, opts] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/facebook/`);
    await p.evaluate(() => localStorage.setItem('ff:quote-handoff', JSON.stringify({ v: 1, createdAt: Date.now(), expiresAt: Date.now() + 3600e3, origin: 'free-quote', selection: { tierId: 'lowest-preferred', tier: 'Lowest Preferred Rate', carrier: 'Mutual of Omaha', plan: 'Living Promise', coverage: 25000, monthlyPremium: '123.45' }, inputs: { age: 60, gender: 'female', tobacco: false, intendedUse: null, state: null }, attribution: {} })));
    await p.reload();
    await p.waitForSelector('[data-fb-quote]:not([hidden])');
    const r = await p.evaluate(() => {
      const box = document.querySelector('[data-fb-quote]');
      const n = box.querySelector('.fb-quote__note');
      const dd = [...box.querySelectorAll('dd')].map((d) => ({ text: d.textContent.trim(), size: getComputedStyle(d).fontSize, weight: getComputedStyle(d).fontWeight, top: Math.round(d.getBoundingClientRect().top), right: d.getBoundingClientRect().right, scroll: d.scrollWidth <= d.clientWidth + 1 }));
      const ns = getComputedStyle(n);
      return { title: !!box.querySelector('.fb-quote__title'), twelveHours: /remain active for the next 12 hours/i.test(document.body.innerText), dt: [...box.querySelectorAll('dt')].map((d) => d.textContent.trim()), dd, note: n.textContent.trim(), noteSize: parseFloat(ns.fontSize), noteLines: Math.round(n.getBoundingClientRect().height / parseFloat(ns.lineHeight)), boxRight: box.getBoundingClientRect().right, vw: document.documentElement.clientWidth, docW: document.documentElement.scrollWidth };
    });
    assert(!r.title && !r.twelveHours, `${w}: old 12-hour message still shown ${JSON.stringify(r)}`);
    assert(r.dt.join('|') === 'Your Selected Coverage|Estimated Monthly Rate' && r.dd[0].text === '$25,000' && r.dd[1].text === '$123.45', `${w}: values ${JSON.stringify(r)}`);
    assert(r.dd[0].size === r.dd[1].size && r.dd[0].weight === r.dd[1].weight && parseFloat(r.dd[0].size) >= (w === '1440' ? 56 : 42), `${w}: figure sizes ${JSON.stringify(r.dd)}`);
    assert(w === '1440' ? r.dd[0].top === r.dd[1].top : r.dd[0].top < r.dd[1].top, `${w}: layout ${JSON.stringify(r.dd)}`);
    assert(r.dd.every((d) => d.scroll && d.right <= r.boxRight + 1) && r.docW <= r.vw, `${w}: overflow ${JSON.stringify(r)}`);
    assert(r.note === 'Your final premium and coverage are subject to insurance company approval.' && r.noteSize <= 12 && r.noteSize >= 11 && (w === '390' || r.noteLines === 1), `${w}: note ${JSON.stringify(r)}`);
    await ctx.close();
  }
});
// First-question race (Randy, November 2026): an answer given while the page's session check is
// still loading must not be undone when the check returns.
await check('immediate first answer while the session check loads is kept (390px and 1440px)', async () => {
  for (const opts of [{ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { viewport: { width: 1440, height: 900 } }]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.route(/\/api\/quote\/$/, async (route) => {
      const req = JSON.parse(route.request().postData() || '{}');
      if (req.action === 'session') await new Promise((r) => setTimeout(r, 1500));
      return route.fulfill({ response: await route.fetch() });
    });
    await page.goto(URL_, { waitUntil: 'domcontentloaded' });
    await page.click('[data-pick="gender"][data-value="female"]');
    await page.waitForSelector('[data-step="2"]:not([hidden])');
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => ({ step2: !document.querySelector('[data-step="2"]').hidden, step1: !document.querySelector('[data-step="1"]').hidden }));
    assert(r.step2 && !r.step1, `reset to the first question ${JSON.stringify(r)}`);
    await page.click('[data-pick="age"][data-value="60"]');
    await page.waitForSelector('[data-step="3"]:not([hidden])');
    await ctx.close();
  }
});
// Quote lead (V3.3): GA4 generate_lead + Meta Lead once, when the server accepts the lead (on
// production, after Agent CRM delivery). The test server runs in preview test mode (never a lead),
// so the production case marks the start response as the production server does.
const leadLogs = (logs) => logs.filter((t) => /GA4 event generate_lead|Meta track Lead/.test(t));
await check('quote lead: GA4 generate_lead + Meta Lead once when the lead is accepted; never at reload, Apply Now, /facebook/ or in test mode', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-real-ip': '203.0.113.40' } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.route(/\/api\/quote\/$/, async (route) => {
    const req = JSON.parse(route.request().postData() || '{}');
    const res = await route.fetch();
    if (req.action !== 'start') return route.fulfill({ response: res });
    const body = await res.json();
    if (body.status === 'verified') { body.leadConversion = true; body.testMode = false; }
    return route.fulfill({ response: res, json: body });
  });
  await page.goto(URL_);
  await walk(page, '214-867-5377', 'Lead Test');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
  const at = leadLogs(logs);
  assert(at.length === 2 && at.some((t) => /GA4 event generate_lead$/.test(t.trim())) && at.some((t) => /Meta track Lead$/.test(t.trim())), `lead events ${JSON.stringify(at)}`);
  // The same lead id again (e.g. a repeated message) never counts twice in the tab.
  const id = await page.evaluate(() => Object.keys(sessionStorage).find((k) => k.startsWith('lead:quote:'))?.slice('lead:quote:'.length));
  assert(id, 'lead id not remembered');
  await page.evaluate((i) => window.dispatchEvent(new CustomEvent('ff:lead', { detail: { id: i } })), id);
  assert(leadLogs(logs).length === 2, 'duplicate lead counted');
  logs.length = 0;
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
  assert(leadLogs(logs).length === 0, 'revisiting results counted a lead');
  await page.click('[data-qf-card="lowest-preferred"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\//, { timeout: 8000 });
  await page.waitForTimeout(300);
  assert(leadLogs(logs).length === 0, `Apply Now or /facebook/ counted a lead: ${JSON.stringify(leadLogs(logs))}`);
  assert((await page.evaluate(() => sessionStorage.getItem('fexguy:lead-pending'))) === null, 'old /help/ lead flag set');
  await ctx.close();
  // Test mode (the server's real preview response) never counts a lead.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { 'x-real-ip': '203.0.113.41' } });
  const p2 = await ctx2.newPage();
  const logs2 = [];
  p2.on('console', (m) => logs2.push(m.text()));
  await p2.goto(URL_);
  await walk(p2, '214-867-5378', 'Lead Test Two');
  await verify(p2);
  assert(leadLogs(logs2).length === 0, `test mode counted a lead: ${JSON.stringify(leadLogs(logs2))}`);
  await ctx2.close();
});
await check('/facebook/: no phone number shows or can be tapped before this visitor\'s number is set (fallback: the main number)', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.route(/\/_astro\/facebook\.astro_astro_type_script[^/]*\.js$/, (r) => r.abort());
  await p.goto(`${BASE}/facebook/`, { waitUntil: 'domcontentloaded' });
  const hidden = await p.evaluate(() => ({
    tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => getComputedStyle(a).visibility),
    note: getComputedStyle(document.querySelector('.fb-foot__disclaimer')).visibility,
  }));
  assert(hidden.tels.length >= 5 && hidden.tels.every((v) => v === 'hidden') && hidden.note === 'hidden', `shown while loading ${JSON.stringify(hidden)}`);
  await p.waitForFunction(() => !document.documentElement.classList.contains('fb-phone-pending'), null, { timeout: 5000 });
  // The script-failure fallback is the main website number (never the campaign number), links and text alike.
  const fb = await p.evaluate(() => ({ tels: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => [a.getAttribute('href'), getComputedStyle(a).visibility]), text: document.body.innerText }));
  assert(fb.tels.every(([h, v]) => h === 'tel:8888629456' && v === 'visible') && fb.text.includes('888-862-9456') && !/656-4648/.test(fb.text), `fallback ${JSON.stringify(fb.tels)}`);
  await ctx.close();
  // Without JavaScript: the main number at once.
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const pn = await nojs.newPage();
  await pn.goto(`${BASE}/facebook/?utm_source=facebook`);
  const nj = await pn.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')));
  const njText = await pn.innerText('body');
  assert(nj.length >= 5 && nj.every((h) => h === 'tel:8888629456') && !/656-4648/.test(njText), `no-JS numbers ${JSON.stringify(nj)}`);
  await nojs.close();
});

await check('homepage SEE PRICES NOW opens the pricing funnel at the first question (not the old homepage form)', async () => {
  const p = await browser.newPage();
  await p.goto(`${BASE}/`);
  if ((await p.getAttribute('.hero__btn--primary', 'href')) !== '/free-quote/') throw new Error('hero SEE PRICES NOW href');
  if ((await p.innerText('.hero__btn--primary')).trim() !== 'SEE PRICES NOW') throw new Error('hero button wording');
  await p.click('.hero__btn--primary');
  await p.waitForURL(/\/free-quote\/$/);
  await p.waitForSelector('[data-step="1"]:not([hidden])');
  await p.close();
});

await check('v6.2: no Formspark, Turnstile or Resend request from the quote funnel (contact, prices, Apply Now)', async () => {
  if (forbidden.length) throw new Error(forbidden.join('; '));
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} passed, ${results.filter((r) => r.startsWith('FAIL')).length} failed`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
