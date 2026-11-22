// Browser test for the cruise ship ash scattering guide preview (Version 1.7,
// /scattering-ashes-from-a-cruise-ship/). Serves the built site (dist/)
// locally and drives it with Playwright: the primary comparison lists every
// line with an established policy, the lines with no published policy are a
// compact list that is fully in the HTML and works without JavaScript, the
// search narrows it and announces the count, every profile and contact link
// is present, the A to Z finder, jump and regional law links and Back to Top
// work, and the page has no horizontal scroll or nested scroll areas at
// 320, 375 and 430px. Run after
// `npm run build`: node tests/cruise-ashes/directory.browser.mjs
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.log('Playwright is not installed: skipping the cruise ashes browser test.');
  process.exit(0);
}

const DIST = new URL('../../dist/', import.meta.url).pathname;
const PAGE = '/scattering-ashes-from-a-cruise-ship/';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const data = JSON.parse(readFileSync(new URL('../../src/data/cruise-ashes/operators.json', import.meta.url), 'utf8'));
const established = data.operators.filter((o) => o.status !== 'unverified');
const unverified = data.operators.filter((o) => o.status === 'unverified');
const total = unverified.length;

const html = readFileSync(join(DIST, PAGE, 'index.html'), 'utf8');
assert.equal((html.match(/class="cra-row"/g) ?? []).length, total, 'every unverified line is in the compact list');
assert.equal((html.match(/class="cra-card"/g) ?? []).length, 0, 'no full cards for unverified lines');
assert.match(html, /<meta name="robots" content="noindex, nofollow"/, 'preview is noindex, nofollow');
assert.ok(!/\u2014/.test(html), 'no em dashes');
for (const o of established) {
  assert.ok(html.includes(`id="op-${o.id}"`), `profile for ${o.name}`);
  assert.ok(html.includes(`href="#op-${o.id}"`), `comparison row for ${o.name}`);
}
// Version 1.10: every line links to its official customer-service page or homepage, with the exact labels.
const service = unverified.filter((u) => u.contactKind === 'service');
const website = unverified.filter((u) => u.contactKind === 'website');
assert.equal((html.match(/class="cra-row__link"[^>]*>\s*Contact customer service</g) ?? []).length, service.length, 'Contact customer service links');
assert.equal((html.match(/class="cra-row__link"[^>]*>\s*Visit official website</g) ?? []).length, website.length, 'Visit official website links');
assert.deepEqual(unverified.filter((u) => !u.contactUrl).map((u) => u.id).sort(), ['albatros-expeditions', 'heritage-line'], 'only the reported exceptions lack a link');
assert.ok(!/No contact page recorded|Official contact information/.test(html), 'old labels gone');
for (const o of established) assert.ok(html.includes(`href="${o.policyUrl.replace(/&/g, '&amp;')}"`), `policy link kept for ${o.name}`);
for (const o of unverified.filter((u) => u.contactUrl)) assert.ok(html.includes(`href="${o.contactUrl.replace(/&/g, '&amp;')}"`), `contact link for ${o.name}`);
const counts = data.operators.reduce((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
assert.ok(html.includes(`${established.length} cruise lines have an established policy: ${counts['officially-permitted']} officially permitted, ${counts['conditionally-permitted'] ?? 0} conditionally permitted and ${counts['not-permitted'] ?? 0} not permitted. They are compared below. For ${total} other lines`), 'displayed counts match the data');

const browser = await chromium.launch();
let failed = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`not ok - ${name}\n  ${e.message}`); }
};
try {
  await check('without JavaScript: search hidden, every row visible', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(base + PAGE);
    assert.equal(await p.locator('[data-cra-filters]').isVisible(), false);
    assert.equal(await p.locator('.cra-row:visible').count(), total);
    await ctx.close();
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(base + PAGE);

  await check('primary comparison has one row per established line', async () => {
    assert.equal(await p.locator('.cra-cmp__card').count(), established.length);
  });
  await check('search appears with JavaScript', async () => {
    assert.equal(await p.locator('[data-cra-filters]').isVisible(), true);
    assert.equal(await p.locator('[data-cra-count]').textContent(), `Showing all ${total} lines with no published policy.`);
  });
  await check('search by name narrows the list and announces the count', async () => {
    await p.fill('#cra-q', 'viking');
    const shown = await p.locator('.cra-row:visible').count();
    assert.ok(shown >= 1 && shown < total, `shown ${shown}`);
    for (const n of await p.locator('.cra-row:visible .cra-row__name').allTextContents()) assert.match(n.toLowerCase(), /viking/);
    assert.equal(await p.locator('[data-cra-count]').textContent(), `Showing ${shown} of ${total} lines with no published policy.`);
    assert.equal(await p.locator('[data-cra-count]').getAttribute('aria-live'), 'polite');
  });
  await check('no match shows the empty message; clearing restores the list', async () => {
    await p.fill('#cra-q', 'zzzz-no-such-line');
    assert.equal(await p.locator('[data-cra-empty]').isVisible(), true);
    await p.fill('#cra-q', '');
    assert.equal(await p.locator('.cra-row:visible').count(), total);
  });
  await ctx.close();

  await check('A to Z: a letter shows its cruise lines; empty letters are disabled; All resets', async () => {
    const c = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const m = await c.newPage();
    await m.goto(base + PAGE);
    const names = data.operators.map((o) => o.name);
    const first = (n) => (n.match(/[A-Za-z]/)?.[0] ?? '').toUpperCase();
    for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const has = names.some((n) => first(n) === l);
      assert.equal(await m.locator(`.cra-az__btn[data-letter="${l}"]`).isDisabled(), !has, `letter ${l}`);
    }
    await m.click('.cra-az__btn[data-letter="C"]');
    const ops = await m.locator('[data-cra-ops] li:visible a').allTextContents();
    assert.equal(ops.length, names.filter((n) => first(n) === 'C').length);
    assert.ok(ops.every((n) => first(n) === 'C'));
    for (const t of await m.locator('.cra-row:visible .cra-row__name').allTextContents()) assert.equal(first(t), 'C');
    assert.equal(await m.locator('.cra-az__btn[data-letter="C"]').getAttribute('aria-pressed'), 'true');
    await m.click('[data-cra-ops] a[href="#op-carnival-cruise-line"]');
    await m.waitForTimeout(300);
    assert.ok(m.url().endsWith('#op-carnival-cruise-line'));
    const y = await m.evaluate(() => document.getElementById('op-carnival-cruise-line').getBoundingClientRect().top);
    assert.ok(y >= -2 && y < 400, `profile in view (${y})`);
    await m.click('.cra-az__btn[data-letter="all"]');
    assert.equal(await m.locator('[data-cra-ops] li:visible').count(), 0);
    assert.equal(await m.locator('.cra-row:visible').count(), total);
    await m.click('.cra-az__btn[data-letter="V"]');
    await m.fill('#cra-q', 'quark');
    assert.equal(await m.locator('.cra-row:visible').count(), 1);
    await c.close();
  });

  await check('jump to section and regional law links reach their sections', async () => {
    const c = await browser.newContext({ viewport: { width: 430, height: 900 } });
    const m = await c.newPage();
    await m.goto(base + PAGE);
    const hrefs = await m.locator('.cra-jump a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    assert.equal(hrefs.length, 15, `links ${hrefs.length}`);
    for (const h of hrefs) assert.equal(await m.locator(h).count(), 1, `target ${h}`);
    await m.click('.cra-jump--law a[href="#law-europe"]');
    await m.waitForTimeout(300);
    const y = await m.evaluate(() => document.getElementById('law-europe').getBoundingClientRect().top);
    assert.ok(y >= -2 && y < 300, `law section in view (${y})`);
    await c.close();
  });

  await check('back to top appears after scrolling, sits above the call bar, returns to the jump navigation', async () => {
    const c = await browser.newContext({ viewport: { width: 375, height: 700 } });
    const m = await c.newPage();
    await m.goto(base + PAGE);
    assert.equal(await m.locator('[data-cra-top]').isVisible(), false);
    await m.evaluate(() => document.getElementById('law').scrollIntoView());
    await m.waitForTimeout(300);
    const btn = m.locator('[data-cra-top]');
    assert.equal(await btn.isVisible(), true);
    const box = await btn.boundingBox();
    const bar = await m.locator('.call-sticky').boundingBox();
    if (bar) assert.ok(box.y + box.height <= bar.y + 1, `above the call bar (${box.y + box.height} vs ${bar.y})`);
    await btn.focus();
    await m.keyboard.press('Enter');
    await m.waitForTimeout(400);
    const y = await m.evaluate(() => document.getElementById('cra-jump').getBoundingClientRect().top);
    assert.ok(y >= -2 && y < 300, `jump navigation in view (${y})`);
    await c.close();
  });

  for (const w of [320, 375, 430]) {
    await check(`no horizontal scroll and no nested scroll areas at ${w}px`, async () => {
      const c = await browser.newContext({ viewport: { width: w, height: 800 } });
      const m = await c.newPage();
      await m.goto(base + PAGE);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 0, `page overflows by ${over}px`);
      const nested = await m.evaluate(() =>
        [...document.querySelectorAll('main *')]
          .filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 1)
          .map((e) => e.className || e.tagName),
      );
      assert.deepEqual(nested, [], `nested scroll areas: ${nested.join(', ')}`);
      await c.close();
    });
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`${failed} check(s) failed`); process.exit(1); }
console.log('All cruise ashes directory checks passed.');
