// Quote System v5.8/v5.9 browser test: the article's Get Pricing module
// (desktop sticky sidebar, phone in-article copy, CALL NOW)
// hands the Male/Female choice and the article's attribution to the funnel on
// /free-quote/. Built site + real handlers (tests/quote/funnel-server.mjs,
// Preview test mode: code 123456, no SMS, Formspark and Cloudflare
// intercepted, nothing sent). Run after a build:
//   node tests/quote/sidebar-entry.browser.mjs   (screenshots: OUT=<dir>)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
const OUT = process.env.OUT ?? '';
const ARTICLE = '/burial-insurance/cancer/';
const ARTICLE_PATH = ARTICLE;
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
const step = (page) => page.evaluate(() => Number(document.querySelector('[data-step]:not([hidden])')?.getAttribute('data-step')));
const evidence = async () => (await (await fetch(`${srv.base}/__evidence/`)).json());
const svgs = (html) => [...html.matchAll(/<svg viewBox="0 0 120 120"[\s\S]*?<\/svg>/g)].map((m) => m[0].replace(/\s*data-astro-cid-[a-z0-9]+(="")?/g, ''));

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  // v6.2: the funnel never contacts Formspark, Cloudflare Turnstile or Resend; any such request is recorded and fails the test.
  await ctx.route(FORBIDDEN, (r) => { forbidden.push(`${r.request().url()} (from ${r.request().frame()?.url() ?? '?'})`); return r.abort(); });
  await ctx.addInitScript(() => {
    window.__ev = [];
    addEventListener('ff:funnel', (e) => window.__ev.push(e.detail));
  });
  return { ctx, page: await ctx.newPage() };
}
async function finish(page, phone) {
  await page.click('[data-pick="age"][data-value="60"]');
  await page.click('[data-pick="tobacco"][data-value="no"]');
  await page.click('[data-pick="use"][data-value="burial"]');
  await page.click('[data-pick="coverage"][data-value="10000"]');
  await page.selectOption('[data-qf-state]', 'Ohio');
  await page.fill('#qf-first', 'Mary');
  await page.fill('#qf-phone', phone);
  await page.check('[data-qf-consent]');
  await page.click('[data-qf-contact] button[type="submit"]');
  await page.click('[data-qf-send]');
  await page.waitForSelector('[data-qf-verify]:not([hidden])');
  await page.fill('#qf-code', '123456');
  await page.click('[data-qf-verify-btn]');
  await page.waitForFunction(() => [...document.querySelectorAll('.qf-card')].every((c) => c.dataset.state === 'ok'), null, { timeout: 8000 });
}

// The sidebar reuses the funnel's own drawings, byte for byte.
const funnelHtml = readFileSync(new URL('../../dist/free-quote/index.html', import.meta.url), 'utf8');
const articleHtml = readFileSync(new URL(`../../dist${ARTICLE}index.html`, import.meta.url), 'utf8');
await check('the sidebar shows the funnel\'s exact Male and Female illustrations, and no old lead form', async () => {
  const a = svgs(articleHtml.match(/<div class="quote-box[^"]*gp--article-aside"[\s\S]*?data-gp-call/)?.[0] ?? '');
  const f = svgs(funnelHtml);
  assert(a.length === 2 && f.length === 2 && a[0] === f[0] && a[1] === f[1], `illustrations differ (${a.length}/${f.length})`);
  assert(!/data-lead-form|Request Rates or Info/.test(articleHtml), 'old sidebar form still on the article');
  assert(!/data-lead-form|Request a Callback/.test(funnelHtml), 'old callback form still on /free-quote/');
});

const PHONES = { mobile: '214-867-5309', desktop: '972-867-5310' };

await check('/free-quote/: new title, still noindex, canonical kept; the old URL 301s to it', async () => {
  const title = funnelHtml.match(/<title>([^<]*)<\/title>/)?.[1];
  assert(title === 'Free Burial Insurance Quotes | Compare Rates | Funeral Funds', `title ${title}`);
  // noindex pages carry no canonical tag (Seo.astro, by design, as before v5.8); og:url names the page.
  assert(/<meta name="robots" content="[^"]*noindex/.test(funnelHtml) && /<meta property="og:url" content="https:\/\/funeralfunds\.com\/free-quote\/"/.test(funnelHtml), 'robots/og:url');
  const v = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const r = v.redirects.filter((x) => x.source === '/final-expense-insurance-prices/');
  assert(r.length === 1 && r[0].destination === '/free-quote/' && r[0].statusCode === 301 && !v.redirects.some((x) => x.source === '/free-quote/'), JSON.stringify(r));
});

// Desktop sticky sidebar: follows the scroll, stays in its column, never over the footer,
// and on short laptop screens both choices and the call button stay reachable.
for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720]]) {
  await check(`desktop ${w}x${h}: sticky Get Pricing follows the article, stops above the footer, every option reachable`, async () => {
    const { ctx, page } = await newPage({ viewport: { width: w, height: h } });
    await page.goto(`${srv.base}${ARTICLE}`);
    const geo = () => page.evaluate(() => {
      const b = document.querySelector('[data-get-prices="article-aside"]').getBoundingClientRect();
      const aside = document.querySelector('.art-aside').getBoundingClientRect();
      const main = document.querySelector('.art-main').getBoundingClientRect();
      const foot = document.querySelector('.pre-footer, footer.site-footer')?.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), asideBottom: Math.round(aside.bottom), mainRight: Math.round(main.right), footTop: foot ? Math.round(foot.top) : null };
    });
    await page.evaluate(() => scrollTo(0, document.querySelector('.art-main').offsetTop + 1500));
    await page.waitForTimeout(100);
    const mid = await geo();
    assert(mid.top >= 20 && mid.top <= 28 && mid.left > mid.mainRight, `not sticky mid-article ${JSON.stringify(mid)}`);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    const end = await geo();
    assert(end.bottom <= end.asideBottom + 1 && (end.footTop === null || end.bottom <= end.footTop), `over the footer ${JSON.stringify(end)}`);
    // Every option can be reached: either the module fits, or it scrolls inside itself.
    await page.evaluate(() => scrollTo(0, document.querySelector('.art-main').offsetTop + 1500));
    const reach = await page.evaluate(() => {
      const b = document.querySelector('[data-get-prices="article-aside"]');
      const f = b.querySelector('[data-gp-gender="female"]');
      const c = b.querySelector('[data-gp-call]');
      c.scrollIntoView({ block: 'nearest' });
      const br = b.getBoundingClientRect(), cr = c.getBoundingClientRect(), fr = f.getBoundingClientRect();
      return { fits: b.scrollHeight <= b.clientHeight + 1, callIn: cr.bottom <= Math.min(br.bottom, innerHeight) + 1 && cr.top >= br.top - 1, femaleH: fr.height, h: Math.round(br.height), vh: innerHeight };
    });
    assert(reach.callIn && reach.femaleH > 40 && reach.h <= reach.vh, `not reachable ${JSON.stringify(reach)}`);
    if (OUT && w === 1366) await page.screenshot({ path: `${OUT}/sticky-${w}.png` });
    await ctx.close();
    return reach.fits ? 'fits' : 'scrolls inside';
  });
}
for (const [name, opts] of [['mobile', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  await check(`${name}: direct /free-quote/ starts at Who Needs Coverage? (direct entry)`, async () => {
    const { ctx, page } = await newPage(opts);
    await page.goto(`${srv.base}/free-quote/`);
    await page.waitForSelector('[data-step="1"]:not([hidden])');
    assert((await page.textContent('#qf-s1')).trim() === 'Who Needs Coverage?', 'first screen');
    const ev = await page.evaluate(() => window.__ev.find((e) => e.name === 'quote_funnel_entry'));
    assert(ev && ev.entryType === 'direct' && !ev.entryPath, `entry event ${JSON.stringify(ev)}`);
    await ctx.close();
  });

  for (const gender of ['male', 'female']) {
    await check(`${name}: sidebar ${gender} opens /free-quote/ at the age question with the choice kept`, async () => {
      const { ctx, page } = await newPage(opts);
      await page.goto(`${srv.base}${ARTICLE}?utm_source=newsletter&utm_campaign=fall`);
      // v5.9: one visible copy: the sidebar on desktop, inside the article on phones.
      const visible = await page.$$eval('[data-get-prices]', (els) => els.filter((e) => e.getClientRects().length).map((e) => e.dataset.getPrices));
      assert(visible.join() === (name === 'desktop' ? 'article-aside' : 'inline'), `visible modules ${visible}`);
      const box = page.locator(`[data-get-prices="${visible[0]}"]`);
      await box.scrollIntoViewIfNeeded();
      const t = await box.evaluate((b) => {
        const [m, f] = [...b.querySelectorAll('a.qf-person')].map((a) => a.getBoundingClientRect());
        const call = b.querySelector('[data-gp-call]');
        const cr = call.getBoundingClientRect(), body = b.querySelector('.gp__body').getBoundingClientRect();
        const cs = getComputedStyle(call);
        const prev = b.previousElementSibling;
        let next = b.nextElementSibling;
        while (next && next.tagName === 'SCRIPT') next = next.nextElementSibling;
        return { title: b.querySelector('.quote-box__title').textContent.trim(), q: b.querySelector('.gp__q').textContent.trim(), links: [...b.querySelectorAll('a.qf-person')].map((a) => a.textContent.trim()),
          stacked: f.top >= m.bottom - 1 && Math.abs(f.left - m.left) < 2, sideBySide: Math.abs(f.top - m.top) < 2 && f.left > m.right - 1,
          talk: b.querySelector('.gp__talk')?.textContent.trim(), callText: call.textContent.replace(/\s+/g, ' ').trim(), href: call.getAttribute('href'), icon: !!call.querySelector('svg path'),
          bg: cs.backgroundColor, fg: cs.color, callBelow: cr.top > f.bottom, callH: cr.height, callFull: Math.abs(cr.width - (body.width - 2 * parseFloat(getComputedStyle(b.querySelector('.gp__body')).paddingLeft))) < 2,
          prev: prev?.tagName ?? null, next: next?.tagName ?? null };
      });
      assert(t.title === 'Get Pricing' && t.q === 'Who Needs Coverage?' && t.links.join() === 'Male,Female', JSON.stringify(t));
      assert(name === 'desktop' ? t.stacked : t.sideBySide, `layout ${JSON.stringify(t)}`);
      assert(t.talk === 'Prefer to talk directly?' && t.callText === 'CALL NOW 888-862-9456' && t.href === 'tel:8888629456' && t.icon && t.bg === 'rgb(194, 65, 12)' && t.fg === 'rgb(255, 255, 255)' && t.callBelow && t.callH >= 44, `call button ${JSON.stringify(t)}`);
      if (name === 'mobile') assert(t.callFull && t.next === 'H2' && t.prev !== 'H2', `phone placement ${JSON.stringify(t)}`);
      if (name === 'mobile') {
        const look = await page.evaluate(() => {
          const one = (sel) => { const b = document.querySelector(sel); const g = (q) => getComputedStyle(b.querySelector(q)); const title = b.querySelector('.quote-box__title').getBoundingClientRect(), body = b.querySelector('.gp__body').getBoundingClientRect();
            return { gap: Math.round(body.top - title.bottom), q: [g('.gp__q').fontSize, g('.gp__q').color, g('.gp__q').marginBottom], talk: [g('.gp__talk').fontSize, g('.gp__talk').marginTop, g('.gp__talk').marginBottom], call: [g('[data-gp-call]').color, g('.gp__call-label').color, g('[data-gp-call]').textDecorationLine], person: g('a.qf-person').textDecorationLine }; };
          document.querySelector('[data-get-prices="article-aside"]').style.display = 'block';
          const r = { inline: one('[data-get-prices="inline"]'), aside: one('[data-get-prices="article-aside"]') };
          document.querySelector('[data-get-prices="article-aside"]').style.display = '';
          return r;
        });
        assert(JSON.stringify(look.inline) === JSON.stringify(look.aside) && look.inline.gap === 0 && look.inline.call[1] === 'rgb(255, 255, 255)', `phone copy differs from the sidebar copy ${JSON.stringify(look)}`);
        await box.locator('[data-gp-call]').hover();
        const hoverColor = await box.locator('.gp__call-label').evaluate((e) => getComputedStyle(e).color);
        assert(hoverColor === 'rgb(255, 255, 255)', `CALL NOW text on hover ${hoverColor}`);
      }
      // CALL NOW: a tap is recorded with the article (never as a completed call).
      await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a[href^="tel:"]')) e.preventDefault(); }, true));
      await box.locator('[data-gp-call]').click();
      const callEv = await page.evaluate(() => window.__ev.find((e) => e.name === 'quote_module_call_click'));
      assert(callEv && callEv.entryType === 'article-sidebar' && callEv.entryPath === ARTICLE_PATH && callEv.placement === (name === 'desktop' ? 'sidebar' : 'in-article'), `call event ${JSON.stringify(callEv)}`);
      if (OUT && gender === 'male') await box.screenshot({ path: `${OUT}/sidebar-${name}.png` });
      await box.locator(`[data-gp-gender="${gender}"]`).click();
      await page.waitForURL(/\/free-quote\//);
      await page.waitForSelector('[data-step="2"]:not([hidden])');
      const url = new URL(page.url());
      assert(url.pathname === '/free-quote/' && !url.searchParams.has('gender') && !url.searchParams.has('origin') && url.searchParams.get('utm_source') === 'newsletter' && url.searchParams.get('utm_campaign') === 'fall', `URL ${page.url()}`);
      assert((await page.textContent('#qf-s2')).trim() === 'How Old Are You?', 'not the age question');
      const pressed = await page.getAttribute(`[data-pick="gender"][data-value="${gender}"]`, 'aria-pressed');
      assert(pressed === 'true', 'choice not kept');
      if (OUT && gender === 'male') await page.screenshot({ path: `${OUT}/age-${name}.png` });
      // Back returns to the choice, and the visitor can change it.
      await page.click('[data-qf-back]');
      assert((await step(page)) === 1, 'Back did not return to the choice');
      const other = gender === 'male' ? 'female' : 'male';
      await page.click(`[data-pick="gender"][data-value="${other}"]`);
      assert((await step(page)) === 2, 'changing the choice did not advance');
      await page.click('[data-qf-back]');
      await page.click(`[data-pick="gender"][data-value="${gender}"]`);
      const phone = gender === 'male' ? PHONES[name] : PHONES[name].replace(/9$/, '1').replace(/0$/, '2');
      await finish(page, phone);
      const prices = await page.$$eval('[data-qf-amount]', (els) => els.map((e) => e.textContent.trim()));
      assert(prices.length === 3 && prices.every((p) => /^\$\d+\.\d\d$/.test(p)), `prices ${prices}`);
      // A quote adjustment reprices and keeps the source.
      const before = await page.textContent('[data-qf-card="average-standard"] [data-qf-amount]');
      await page.click('.qf-adjust label:has(input[name="tobacco"][value="yes"])');
      await page.waitForFunction((b) => document.querySelector('[data-qf-card="average-standard"] [data-qf-amount]')?.textContent !== b, before, { timeout: 5000 });
      const ev = await page.evaluate(() => window.__ev);
      assert(ev.some((e) => e.name === 'quote_pricing_adjust'), 'no adjustment event');
      const names = ev.map((e) => e.name);
      assert(names.includes('quote_sidebar_select') && names.includes('quote_funnel_entry') && names.includes('quote_pricing_view'), names.join());
      assert(ev.every((e) => e.entryType === 'article-sidebar' && e.entryPath === ARTICLE), `event source ${JSON.stringify(ev.find((e) => e.entryPath !== ARTICLE))}`);
      assert(!JSON.stringify(ev).includes('Mary') && !JSON.stringify(ev).includes(phone.slice(-4)), 'personal data in analytics');
      const rec = (await evidence()).find((r) => r.phone.endsWith(phone.replace(/\D/g, '').slice(-4)));
      assert(rec, 'no lead record');
      const s = rec.source;
      const h1 = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      assert(s.entryType === 'article-sidebar' && s.originTitle === h1 && s.originUrl === `${srv.base}${ARTICLE}` && s.entryGender === gender && !Number.isNaN(Date.parse(s.entryAt)), `source ${JSON.stringify(s)}`);
      assert(s.page.endsWith('/free-quote/') && s.utmSource === 'newsletter' && s.utmCampaign === 'fall', `campaign ${JSON.stringify(s)}`);
      assert(rec.consent.given === true && rec.consent.text, 'consent not recorded');
      await ctx.close();
      return `${s.originTitle}`;
    });
  }
}

await check('v6.2: no Formspark, Turnstile or Resend request from the quote funnel (contact, code, prices, Apply Now)', async () => {
  if (forbidden.length) throw new Error(forbidden.join('; '));
});

await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
