// Browser test for the cruise ship ash scattering guide preview (Version 1.7,
// /scattering-ashes-from-a-cruise-ship/). Serves the built site (dist/)
// locally and drives it with Playwright: the primary comparison lists every
// line with an established policy, the lines with no published policy are a
// compact list that is fully in the HTML and works without JavaScript, the
// search narrows it and announces the count, every profile and contact link
// is present, and the page has no horizontal scroll at 320px. Run after
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
    assert.equal(await p.locator('.cra__table').first().locator('tbody tr').count(), established.length);
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

await check('no horizontal scroll at 320px', async () => {
    const c = await browser.newContext({ viewport: { width: 320, height: 800 } });
    const m = await c.newPage();
    await m.goto(base + PAGE);
    const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `page overflows by ${over}px`);
    await c.close();
  });
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`${failed} check(s) failed`); process.exit(1); }
console.log('All cruise ashes directory checks passed.');
