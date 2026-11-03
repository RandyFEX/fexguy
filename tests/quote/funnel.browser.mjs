// Quote funnel end-to-end browser test (Quote System v3.5), mobile and
// desktop, against the built site (run `npm run build` first) served by
// tests/quote/funnel-server.mjs in test mode (code 123456, no SMS, Formspark
// intercepted, nothing sent). Needs the private rate tables in
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
const NAMES = { mobile: 'Mary Ann Smith', desktop: 'Mary' };
const GREEN = 'rgb(23, 63, 53)';
const ORANGE = 'rgb(194, 65, 12)';
const TITLES = ['Who Needs Coverage?', 'How Old Are You?', 'Do You Use Tobacco?', 'How Would You Use These Funds?', 'How Much Coverage Would You Like?', 'What State Do You Live In?', 'Your Contact Information'];
const step = (page) => page.evaluate(() => Number(document.querySelector('[data-step]:not([hidden])')?.getAttribute('data-step')));
const amount = (page, id) => page.textContent(`[data-qf-card="${id}"] [data-qf-amount]`);
const atStart = (page) => page.waitForFunction(() => document.querySelector('[data-step="1"]:not([hidden])'), null, { timeout: 6000 });
const priceStatus = (page) =>
  page.evaluate(async () => (await fetch('/api/price-explorer/', { method: 'POST', headers: { 'content-type': 'application/json', 'x-quote-visit': sessionStorage.getItem('ff:quote-visit') ?? 'none-visit-00000000' }, body: JSON.stringify({ age: 60, gender: 'male', tobacco: false, coverage: 10000 }) })).status);
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
      promo: /Compare Quotes From Top Life Insurance Companies|GET QUOTES NOW|Get Your Final Expense Insurance Quote|Olympia Drive|Flower Mound|Mailing Address/i.test(text),
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
  assert(r.logo === 'https://funeralfunds.com/' && r.secure && r.tel === 'tel:8888629456', `header ${JSON.stringify(r)}`);
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
async function verify(page) {
  await page.click('[data-qf-send]');
  await page.waitForSelector('[data-qf-verify]:not([hidden])');
  assert(await page.isVisible('#qf-code'), 'code entry not visible');
  assert(await page.evaluate(() => document.activeElement?.id === 'qf-code'), 'code entry not focused');
  await page.fill('#qf-code', '123456');
  await page.click('[data-qf-verify-btn]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
}

// The homepage GET A QUOTE button is the source of truth for the orange (v4.1).
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
for (const [name, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  const ctx = await browser.newContext(opts);
  await ctx.route('https://submit-form.com/**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await check(`${name}: a new visit starts at Who Needs Coverage? in the minimal quote layout`, async () => {
    await page.goto(URL_);
    await atStart(page);
    assert((await page.textContent('#qf-s1')).trim() === TITLES[0], 'title');
    await minimalLayout(page);
    await page.waitForTimeout(300);
    await shot(page, `v35-${name}-1-start.png`);
  });

  await check(`${name}: exact eight-step sequence, wording, progress and minimal layout on every screen`, async () => {
    for (let s = 1; s <= 7; s++) {
      assert((await step(page)) === s, `expected step ${s}`);
      assert((await page.textContent(`#qf-s${s}`)).trim() === TITLES[s - 1], `step ${s} title`);
      assert((await page.textContent('[data-qf-progress-label]')).trim() === `Step ${s} of 8`, `step ${s} progress`);
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

  await check(`${name}: contact screen shows the selections, reassurance, consent and See My Instant Quotes`, async () => {
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
    const btn = await page.$eval('[data-qf-contact] button[type="submit"]', (b) => [b.textContent.trim(), b.previousElementSibling?.textContent.trim()]);
    assert(btn[0] === 'See My Instant Quotes' && btn[1] === 'Our Promise: No Spam Calls. No Junk Mail.', JSON.stringify(btn));
    const cta = await page.$eval('[data-qf-contact] button[type="submit"]', (b) => [getComputedStyle(b).backgroundColor, getComputedStyle(b).color]);
    assert(cta[0] === HOME_ORANGE && cta[0] === ORANGE && cta[1] === 'rgb(255, 255, 255)', `contact button colors ${cta} vs homepage ${HOME_ORANGE}`);
    const inputs = await page.$$eval('[data-qf-contact] input:not([type="checkbox"]):not([type="hidden"])', (els) => els.map((e) => [e.id, document.querySelector(`label[for="${e.id}"]`)?.textContent.trim(), e.type]));
    assert(JSON.stringify(inputs) === JSON.stringify([['qf-first', 'Your Name', 'text'], ['qf-phone', 'Mobile Phone Number', 'tel']]), `contact inputs ${JSON.stringify(inputs)}`);
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
    const order = await page.$eval('.qf-reassure', (e) => [e.previousElementSibling?.matches('.qf-consent'), e.nextElementSibling?.matches('button[type="submit"]')]);
    assert(order[0] && order[1], 'promise is not between the consent text and the button');
    const consent = await page.$eval('.qf-consent span', (e) => { const cs = getComputedStyle(e); return { fs: parseFloat(cs.fontSize), lines: Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; });
    assert(consent.fs >= 16 && (name !== 'desktop' || consent.lines <= 3), `consent text ${JSON.stringify(consent)}`);
    assert(!(await page.isChecked('[data-qf-consent]')), 'consent pre-checked');
    assert((await page.textContent('.qf-consent span')).trim() === 'I agree Funeral Funds may call or text me at the number I provided about life insurance, including automated messages. Msg & data rates may apply. Reply STOP to opt out. Consent is not required to get prices or buy insurance.', 'consent text');
    assert(!(await page.isChecked('[data-qf-consent]')), 'consent box pre-checked');
    assert((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, 'horizontal scroll');
    await page.fill('#qf-first', NAMES[name]);
    await page.fill('#qf-phone', PHONES[name]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await shot(page, `v35-${name}-3-contact.png`);
    await page.goto(URL_);
  });

  await check(`${name}: before verification: blurred cards, no heading, no real data, compact unlock panel`, async () => {
    await page.goto(URL_);
    await walk(page, PHONES[name]);
    assert((await step(page)) === 8, 'pricing screen');
    await minimalLayout(page);
    const title = await page.$eval('#qf-s8', (e) => ({ t: e.textContent.trim(), h: e.getBoundingClientRect().height }));
    assert(title.t !== 'Your Insurance Quotes' && title.h <= 2, `heading shown ${JSON.stringify(title)}`);
    assert(!(await page.evaluate(() => document.body.innerText.includes('Your Insurance Quotes'))), 'Your Insurance Quotes visible');
    assert(!(await page.evaluate(() => document.body.innerText.includes('Insurance Company Options'))) && (await page.isHidden('[data-qf-results-sub]')), 'subtitle shown before verification');
    const labels = await page.$$eval('.qf-card__label', (els) => els.map((e) => e.textContent));
    assert(labels.join('|') === 'Lowest Preferred Rate|Standard Rate|Guaranteed Acceptance Rate', labels.join('|'));
    const blur = (el) => /blur/.test(getComputedStyle(el).filter);
    const state = await page.$$eval('.qf-card', (els) =>
      els.map((e) => {
        const b = (sel) => { const x = e.querySelector(sel); return !!x && /blur/.test(getComputedStyle(x).filter); };
        return { s: e.dataset.state, amt: b('[data-qf-amount] .qf-blur'), plan: b('[data-qf-plan] .qf-blur'), logo: b('[data-qf-logo] .qf-blur'), img: !!e.querySelector('img'), timing: getComputedStyle(e.querySelector('[data-qf-timing]')).visibility === 'hidden' || e.querySelector('[data-qf-timing]').hidden, timingText: e.querySelector('[data-qf-timing]').textContent, dis: e.querySelector('[data-qf-apply]').disabled, applyText: e.querySelector('[data-qf-apply]').textContent.trim(), call: !!e.querySelector('[data-qf-call]')?.getClientRects().length, bars: !!e.querySelector('.qf-logo-blank'), lock: /🔒|🔐|(?:class|data-[a-z-]+)="[^"]*lock/i.test(e.innerHTML), text: e.textContent };
      }),
    );
    void blur;
    assert(state.every((c) => c.s === 'locked' && c.amt && c.plan && c.logo && !c.img && c.timing && !c.timingText && c.dis && !c.call && c.applyText === 'Unlock to See Rates' && !c.bars && !c.lock), JSON.stringify(state.map(({ text, ...r }) => r)));
    assert(!/Coming soon|Aetna|Omaha|Gerber|Living Promise|Accendo|Guaranteed Life|First-Day|Waiting Period/.test(state.map((c) => c.text).join(' ')), 'real data before verification');
    assert((await priceStatus(page)) === 401, 'pricing endpoint answered an unverified visit');
    const order = await page.evaluate(() => ({ next: document.querySelector('.qf-cards').nextElementSibling?.matches('[data-qf-unlock]'), adjust: !!document.querySelector('[data-qf-adjust]').offsetParent, intro: !!document.querySelector('[data-qf-adjust-intro]').offsetParent }));
    assert(order.next && !order.adjust && !order.intro, JSON.stringify(order));
    assert(!(await page.evaluate(() => !!document.querySelector('[data-qf-ref]').getClientRects().length || /Representative monthly rates/.test(document.body.innerText))), 'rate note shown before verification');
    const u = await page.evaluate(() => {
      const t = document.querySelector('#qf-unlock-title');
      const b = document.querySelector('[data-qf-send]');
      return { title: t.textContent.trim(), color: getComputedStyle(t).color, size: parseFloat(getComputedStyle(t).fontSize), note: document.querySelector('#qf-verify-note').textContent, btn: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, fg: getComputedStyle(b).color, shown: document.querySelector('[data-qf-phone-show]').textContent, change: document.querySelector('[data-qf-edit-phone]').textContent, h: document.querySelector('[data-qf-unlock]').getBoundingClientRect().height };
    });
    assert(u.title === 'Unlock Your Rates' && u.color === 'rgb(185, 28, 28)' && u.size >= 24, JSON.stringify(u));
    const panel = await page.evaluate(() => {
      const parts = ['#qf-unlock-title', '[data-qf-unlock-part="send"]', '[data-qf-unlock-part="explain"]', '[data-qf-unlock-part="change"]', '[data-qf-unlock-part="rates"]'].map((sel) => document.querySelector(sel));
      const cs = (e) => getComputedStyle(e);
      return {
        texts: parts.map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
        tops: parts.map((e) => Math.round(e.getBoundingClientRect().top)),
        bottoms: parts.map((e) => Math.round(e.getBoundingClientRect().bottom)),
        explainLines: (() => { const r = document.createRange(); r.selectNodeContents(parts[2]); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; })(),
        numberLine: (() => { const tn = parts[2].firstChild; const q = document.createRange(); q.setStart(tn, tn.length - 3); q.setEnd(tn, tn.length); const st = parts[2].querySelector('strong').getBoundingClientRect(); return [...q.getClientRects()].some((x) => Math.abs(x.top - st.top) < 2); })(),
        explainCentered: getComputedStyle(parts[2]).textAlign === 'center',
        titleColor: cs(parts[0]).color,
        explain: [Number(cs(parts[2]).fontWeight), cs(parts[2]).color],
        number: [Number(cs(parts[2].querySelector('strong')).fontWeight), cs(parts[2].querySelector('strong')).color],
        rates: [parseFloat(cs(parts[4]).fontSize), cs(parts[4]).color],
        changeIsButton: parts[3].querySelector('[data-qf-edit-phone]')?.tagName === 'BUTTON' && !parts[2].querySelector('[data-qf-edit-phone]'),
        changeCentered: (() => { const b = parts[1].getBoundingClientRect(), c = parts[3].querySelector('button').getBoundingClientRect(); return Math.abs(b.left + b.width / 2 - (c.left + c.width / 2)) <= 1.5; })(),
        between: (() => { const b = parts[1]; let n = b.nextElementSibling; return n === parts[2] && b.previousElementSibling?.hasAttribute('data-qf-phone-field') && b.previousElementSibling.hidden; })(),
        oldText: /Msg & data rates/.test(document.querySelector('[data-qf-unlock]').textContent),
      };
    });
    const last4u = PHONES[name].replace(/\D/g, '').slice(-4);
    assert(JSON.stringify(panel.texts) === JSON.stringify(['Unlock Your Rates', 'Text Me My Access Code', `We'll text a 6-digit verification code to (***) ***-${last4u}.`, 'Change Number', 'Message and data rates may apply.']), `unlock panel wording ${JSON.stringify(panel.texts)}`);
    assert(panel.between && panel.explainCentered && panel.numberLine && (name === 'desktop' ? panel.explainLines === 1 : panel.explainLines <= 2), `unlock sentence layout ${JSON.stringify(panel)}`);
    assert(panel.tops.every((t, k) => k === 0 || t > panel.tops[k - 1]), `unlock panel order ${panel.tops}`);
    assert(panel.titleColor === 'rgb(185, 28, 28)' && panel.explain[0] >= 700 && panel.explain[1] === 'rgb(17, 17, 17)' && panel.number[0] >= 700 && panel.number[1] === 'rgb(17, 17, 17)', `unlock panel styling ${JSON.stringify(panel)}`);
    assert(panel.rates[0] <= 14 && /^rgb\((\d+), \1, \1\)$|^rgb\(91, 101, 96\)$/.test(panel.rates[1]) && panel.changeIsButton && panel.changeCentered && !panel.oldText, `rates line ${JSON.stringify(panel)}`);
    // Change Number still opens the number field (prefilled), then the panel is put back as it was.
    await page.click('[data-qf-edit-phone]');
    const edit = await page.evaluate(() => ({ field: !document.querySelector('[data-qf-phone-field]').hidden, focused: document.activeElement?.id === 'qf-unlock-phone', value: document.querySelector('#qf-unlock-phone').value }));
    assert(edit.field && edit.focused && edit.value.replace(/\D/g, '') === PHONES[name].replace(/\D/g, ''), `Change Number ${JSON.stringify(edit)}`);
    await page.evaluate(() => { document.querySelector('[data-qf-phone-field]').hidden = true; document.querySelector('[data-qf-phone-summary]').hidden = false; });
    assert(u.btn === 'Text Me My Access Code' && u.bg === HOME_ORANGE && u.fg === 'rgb(255, 255, 255)' && u.change === 'Change Number', JSON.stringify(u));
    const digits = PHONES[name].replace(/\D/g, '');
    assert(u.shown.endsWith(digits.slice(6)) && !u.shown.includes(digits.slice(0, 3)), `number shown ${u.shown}`);
    assert(u.h < 300, `unlock panel ${u.h}px tall`);
    assert(await page.isHidden('#qf-unlock-phone'), 'phone asked again');
    await page.waitForTimeout(300);
    await shot(page, `v35-${name}-4-blurred.png`, true);
  });

  await check(`${name}: after verification: revealed in place, exact card content, accurate premiums, scrolled to the results`, async () => {
    await page.evaluate(() => { window.__same = true; });
    await page.click('[data-qf-send]');
    await page.waitForSelector('[data-qf-verify]:not([hidden])');
    const ct = await page.$eval('[data-qf-code-title]', (e) => ({ text: e.textContent.trim(), weight: Number(getComputedStyle(e).fontWeight), color: getComputedStyle(e).color, visible: e.getClientRects().length > 0 }));
    assert(ct.text === 'Enter the 6-digit code' && ct.weight >= 700 && ct.color === 'rgb(17, 17, 17)' && ct.visible, `code heading ${JSON.stringify(ct)}`);
    if (OUT) await page.locator('[data-qf-unlock]').screenshot({ path: `${OUT}/v37c-${name}-code-entry.png` });
    const v = await page.evaluate(() => ({ btn: getComputedStyle(document.querySelector('[data-qf-verify-btn]')).backgroundColor, fg: getComputedStyle(document.querySelector('[data-qf-verify-btn]')).color, resend: !!document.querySelector('[data-qf-resend]').offsetParent, change: !!document.querySelector('[data-qf-change]').offsetParent }));
    assert(v.btn === HOME_ORANGE && v.fg === 'rgb(255, 255, 255)' && v.resend && v.change, JSON.stringify(v));
    await page.fill('#qf-code', '123456');
    await page.click('[data-qf-verify-btn]');
    await page.waitForFunction(() => document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 8000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.qf-card img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 });
    assert(await page.evaluate(() => window.__same === true), 'page reloaded');
    const h = await page.$eval('#qf-s8', (e) => ({ t: e.textContent.trim(), top: e.getBoundingClientRect().top, h: e.getBoundingClientRect().height }));
    assert(h.t === 'Your Insurance Quotes' && h.h > 10, JSON.stringify(h));
    const sub = await page.evaluate(() => {
      const e = document.querySelector('[data-qf-results-sub]'), t = document.querySelector('#qf-s8'), c = document.querySelector('.qf-cards');
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), tr = t.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(e);
      const glyphs = range.getBoundingClientRect();
      return { text: e.textContent.trim(), prev: e.previousElementSibling === t, fs: parseFloat(cs.fontSize), color: cs.color, weight: Number(cs.fontWeight), align: cs.textAlign,
        above: Math.round(r.top - tr.bottom), below: Math.round(cr.top - r.bottom), lines: new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size,
        centered: Math.abs(glyphs.left + glyphs.width / 2 - (cr.left + cr.width / 2)) <= 2,
        heading: [getComputedStyle(t).fontSize, getComputedStyle(t).fontWeight, getComputedStyle(t).color] };
    });
    assert(sub.text === 'Here Are 3 of Your 30+ Insurance Company Options' && sub.prev && sub.fs >= 13 && sub.fs <= 14 && sub.color === GREEN && sub.weight === 500 && sub.align === 'center' && sub.centered, `subtitle ${JSON.stringify(sub)}`);
    assert(sub.above >= 4 && sub.above <= 6 && sub.below >= 8 && sub.below <= 10 && (name === 'desktop' ? sub.lines === 1 : sub.lines <= 2), `subtitle spacing ${JSON.stringify(sub)}`);
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
    assert(await page.isHidden('[data-qf-unlock]'), 'verification panel still shown');
    const intro = await page.textContent('[data-qf-adjust-intro]');
    assert(intro === 'Adjust Your Quote Below', intro);
    const gaps = await page.evaluate(() => { const c = document.querySelector('.qf-cards').getBoundingClientRect(), i = document.querySelector('[data-qf-adjust-intro]'), r = i.getBoundingClientRect(), a = document.querySelector('[data-qf-adjust]').getBoundingClientRect(); return { cards: Math.round(r.top - c.bottom), controls: Math.round(a.top - r.bottom), align: getComputedStyle(i).textAlign }; });
    assert(gaps.cards >= 10 && gaps.cards <= 14 && gaps.controls <= 12 && gaps.align === 'center', `spacing under the cards ${JSON.stringify(gaps)}`);
    const o = await page.evaluate(() => ['.qf-cards', '[data-qf-adjust-intro]', '[data-qf-adjust]', '.qf-ref', '.qf-restart-row'].map((sel) => document.querySelector(sel).getBoundingClientRect().top));
    const ref = await page.$eval('[data-qf-ref]', (e) => ({ visible: e.getClientRects().length > 0, text: e.textContent.trim() }));
    assert(ref.visible && ref.text === 'Representative monthly rates. Actual premiums and availability may vary by state and insurance company.', `rate note after verification ${JSON.stringify(ref)}`);
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

  await check(`${name}: Call to Get Approved (orange tel: link above green Apply Online) with first-party attribution and no personal data`, async () => {
    const b = await page.$$eval('.qf-card', (els) =>
      els.map((e) => {
        const call = e.querySelector('[data-qf-call]');
        const apply = e.querySelector('[data-qf-apply]');
        const cr = call.getBoundingClientRect();
        const ar = apply.getBoundingClientRect();
        const timing = e.querySelector('[data-qf-timing]');
        const tr = timing.getBoundingClientRect();
        return { href: call.getAttribute('href'), text: call.textContent.replace(/\s+/g, ' ').trim(), icon: !!call.querySelector('svg'), bg: getComputedStyle(call).backgroundColor, applyText: apply.textContent.trim(), applyBg: getComputedStyle(apply).backgroundColor, applyFg: getComputedStyle(apply).color, applyCentered: (() => { const range = document.createRange(); range.selectNodeContents(apply); const t = range.getBoundingClientRect(); return Math.abs(t.top + t.height / 2 - (ar.top + ar.height / 2)) <= 1.5 && Math.abs(t.left + t.width / 2 - (ar.left + ar.width / 2)) <= 1.5; })(), fg: getComputedStyle(call).color, above: cr.bottom <= ar.top, ch: Math.round(cr.height), ah: Math.round(ar.height), cw: Math.round(cr.width), aw: Math.round(ar.width), th: Math.round(tr.height), tLines: Math.round((tr.height - 10) / parseFloat(getComputedStyle(timing).lineHeight)), tOver: timing.scrollWidth - timing.clientWidth, gap: Math.round(cr.top - tr.bottom) };
      }),
    );
    for (const c of b) {
      assert(c.href === 'tel:8888629456' && c.text === 'Call to Get Approved' && c.icon && c.bg === ORANGE, `call button ${JSON.stringify(c)}`);
      assert(c.applyText === 'Apply Online Now' && c.applyBg === GREEN && c.applyFg === 'rgb(255, 255, 255)' && c.above && c.ch >= 46 && c.ch <= 48 && (name === 'desktop' ? c.ah >= 34 && c.ah <= 36 : c.ah >= 44) && c.ch > c.ah && c.cw === c.aw && c.applyCentered, `apply button ${JSON.stringify(c)}`);
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

  await check(`${name}: reload during the visit keeps the verified prices`, async () => {
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-step="8"]:not([hidden])') && document.querySelector('[data-qf-card="average-standard"]')?.getAttribute('data-state') === 'ok', null, { timeout: 6000 });
    assert((await page.inputValue('#qf-adj-age')) === '70', 'selection not kept');
  });
  await check(`${name}: a new tab starts fresh at Who Needs Coverage? and cannot get prices`, async () => {
    const tab = await ctx.newPage();
    await tab.goto(URL_);
    await atStart(tab);
    assert((await priceStatus(tab)) === 401, 'new tab got prices with the old cookie');
    await tab.close();
  });
  await check(`${name}: closing and reopening (previous cookie kept) starts fresh`, async () => {
    const state = await ctx.storageState();
    const ctx2 = await browser.newContext({ ...opts, storageState: { cookies: state.cookies, origins: [] } });
    const p2 = await ctx2.newPage();
    await p2.goto(URL_);
    await atStart(p2);
    assert((await priceStatus(p2)) === 401, 'reopened visit got prices');
    await ctx2.close();
  });
  await check(`${name}: Apply Now keeps attribution and runs the carrier questions one at a time`, async () => {
    await page.click('[data-qf-card="average-standard"] [data-qf-apply]');
    await page.waitForFunction(() => !document.querySelector('[data-qf-intake-q]')?.hidden, null, { timeout: 6000 });
    await minimalLayout(page);
    assert(/Question 1 of 22/.test(await page.textContent('[data-qf-intake-count]')), 'count');
    await page.click('[data-qf-answer="no"]');
    await page.waitForFunction(() => /Question 2 of 22/.test(document.querySelector('[data-qf-intake-count]')?.textContent ?? ''));
    await page.click('[data-qf-answer="yes"]');
    await page.waitForFunction(() => !document.querySelector('[data-qf-intake-done]')?.hidden, null, { timeout: 5000 });
    assert(/other coverage/.test(await page.textContent('[data-qf-intake-done-text]')), 'done text');
  });
  await check(`${name}: Start New Quote returns to Who Needs Coverage? and needs a new verification`, async () => {
    await page.goto(URL_);
    await page.waitForFunction(() => document.querySelector('[data-step="8"]:not([hidden])'), null, { timeout: 6000 });
    await page.click('[data-qf-restart]');
    await atStart(page);
    assert((await priceStatus(page)) === 401, 'still verified after restart');
    assert(!(await page.isChecked('[data-qf-consent]')), 'consent carried forward');
    await walk(page, PHONES[name]);
    assert(await page.$$eval('.qf-card', (els) => els.every((e) => e.dataset.state === 'locked')), 'prices visible without verification');
    assert(errors.length === 0, errors.join('; '));
  });
  await ctx.close();
}
await check('evidence: verified leads, consent records, intended use, Apply Now attribution and answers kept', async () => {
  const recs = await (await fetch(`${BASE}/__evidence/`)).json();
  const v = recs.filter((r) => r.verification.status === 'approved');
  assert(v.length === 2, `${v.length} verified`);
  for (const r of v)
    assert(
      (r.firstName === 'Mary' || r.firstName === 'Mary Ann Smith') && r.state === 'Ohio' && r.intendedUse?.label === 'Cremation Expenses' && r.applications[0].intendedUse === 'Cremation Expenses' &&
        r.consent.given === false && r.consent.action && r.verifyNotice.version === 'ff-quote-verify-notice-v4-2026-11' && r.verifyNotice.text === "We'll text a 6-digit verification code to (***) ***-XXXX. Message and data rates may apply." &&
        r.applications[0].attribution[0] === 'FF-101' && r.intakes['average-standard'].answers.length === 2 && r.intakes['average-standard'].flag === 'may-not-qualify',
      JSON.stringify(r).slice(0, 300),
    );
  return `${recs.length} lead records (${v.length} verified)`;
});
await browser.close();
await srv.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} passed, ${results.filter((r) => r.startsWith('FAIL')).length} failed`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
