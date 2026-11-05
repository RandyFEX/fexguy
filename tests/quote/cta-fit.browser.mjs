// Quote results CTA V1.2 (Randy, November 2026): on all three cards the orange
// tel: button reads "Call Us for Help Right Now" (phone icon) and the green
// button "Text Us for Help Right Now" (message icon), same actions as before.
// Each icon and label stays on one line inside the unchanged buttons at 320,
// 375, 390, 430, the three-column range and desktop. Built site + real
// handlers in test mode (tests/quote/funnel-server.mjs; code 123456).
//   node tests/quote/cta-fit.browser.mjs
import { createRequire } from 'node:module';
import { startFunnelServer } from './funnel-server.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const srv = await startFunnelServer();
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

// One verified visit; the viewport is then resized (one verification only).
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${srv.base}/free-quote/`);
await page.waitForSelector('[data-step="1"]:not([hidden])');
for (const s of ['[data-pick="gender"][data-value="male"]', '[data-pick="age"][data-value="60"]', '[data-pick="tobacco"][data-value="no"]', '[data-pick="use"][data-value="burial"]', '[data-pick="coverage"][data-value="10000"]']) await page.click(s);
await page.selectOption('[data-qf-state]', 'Texas');
await page.fill('#qf-first', 'Test');
await page.fill('#qf-phone', '214-867-5309');
await page.click('[data-qf-contact] button[type="submit"]');
await page.waitForSelector('[data-step="8"]:not([hidden])');
await page.click('[data-qf-send]');
await page.waitForSelector('[data-qf-verify]:not([hidden])');
await page.fill('#qf-code', '123456');
await page.click('[data-qf-verify-btn]');
await page.waitForFunction(() => [...document.querySelectorAll('.qf-card')].every((c) => c.dataset.state === 'ok'), null, { timeout: 8000 });

for (const w of [320, 375, 390, 430, 832, 1024, 1280]) {
  await check(`${w}px: both labels and icons on one line inside the unchanged buttons, on all three cards`, async () => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => {
      const one = (el) => {
        const lab = el.querySelector('span');
        const text = [...lab.childNodes].find((n) => n.nodeType === 3);
        const rg = document.createRange();
        rg.selectNodeContents(text);
        const tops = new Set([...rg.getClientRects()].map((x) => Math.round(x.top)));
        const b = el.getBoundingClientRect(), t = rg.getBoundingClientRect(), i = el.querySelector('svg').getBoundingClientRect();
        return { text: el.textContent.replace(/\s+/g, ' ').trim(), lines: tops.size, fits: el.scrollWidth <= el.clientWidth && t.left >= b.left && t.right <= b.right && i.left >= b.left, iconLeft: i.right <= t.left + 1 && Math.abs(i.top + i.height / 2 - (t.top + t.height / 2)) <= 3, icon: getComputedStyle(el.querySelector('svg')).display !== 'none', w: Math.round(b.width), h: Math.round(b.height), fs: parseFloat(getComputedStyle(el).fontSize) };
      };
      return {
        cards: [...document.querySelectorAll('.qf-card')].map((c) => ({ cardW: Math.round(c.getBoundingClientRect().width), call: one(c.querySelector('[data-qf-call]')), apply: one(c.querySelector('[data-qf-apply]')), href: c.querySelector('[data-qf-call]').getAttribute('href'), applyTag: c.querySelector('[data-qf-apply]').tagName, applyHref: c.querySelector('[data-qf-apply]').getAttribute('href') })),
        hscroll: document.documentElement.scrollWidth > innerWidth,
        sms: !!document.querySelector('a[href^="sms:"]'),
      };
    });
    assert(r.cards.length === 3 && !r.hscroll && !r.sms, JSON.stringify(r));
    for (const c of r.cards) {
      assert(c.call.text === 'Call Us for Help Right Now' && c.apply.text === 'Text Us for Help Right Now', `labels ${c.call.text} / ${c.apply.text}`);
      assert(c.call.icon && c.apply.icon && c.call.iconLeft && c.apply.iconLeft, `icons ${JSON.stringify(c)}`);
      assert(c.call.lines === 1 && c.apply.lines === 1 && c.call.fits && c.apply.fits, `one line ${JSON.stringify(c)}`);
      // The pre-V1.2 dimensions: both buttons span the card less 34px; 48px orange, 44px (36px desktop) green.
      assert(c.call.w === c.cardW - 34 && c.apply.w === c.call.w && c.call.h === 48 && c.apply.h === (w >= 832 ? 36 : 44), `size ${JSON.stringify(c)}`);
      assert(c.call.fs >= c.apply.fs && c.apply.fs >= (w >= 832 && w < 1000 ? 10 : 13), `type ${c.call.fs}/${c.apply.fs}`);
      // Same actions as before: the orange tel: link and the green Apply button (no link, no sms:).
      assert(c.href === 'tel:8888629456' && c.applyTag === 'BUTTON' && c.applyHref === null, `actions ${JSON.stringify(c)}`);
    }
    return `${r.cards[0].call.fs.toFixed(1)}px / ${r.cards[0].apply.fs.toFixed(1)}px`;
  });
}

await check('the green button still opens the Ready to Apply page (/facebook/) with the card\'s quote', async () => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.click('[data-qf-card="average-standard"] [data-qf-apply]');
  await page.waitForURL(/\/facebook\/$/, { timeout: 8000 });
  assert((await page.textContent('h1')).trim() === 'Ready to Apply for Your Burial Insurance?', 'not the Ready to Apply page');
  await page.waitForSelector('[data-fb-quote]:not([hidden])');
});

await ctx.close();
await browser.close();
await srv.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
