// Browser test for the cruise ship ash scattering guide preview (Version 1.3,
// /scattering-ashes-from-a-cruise-ship/). Serves the built site (dist/)
// locally and drives it with Playwright: the full directory is in the HTML,
// works without JavaScript, the filters narrow it by name and status and
// announce the count, Clear filters restores it, and the page has no
// horizontal scroll at 320px. Run after `npm run build`:
// node tests/cruise-ashes/directory.browser.mjs (needs Playwright installed).
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
const total = data.operators.length;

const html = readFileSync(join(DIST, PAGE, 'index.html'), 'utf8');
assert.equal((html.match(/class="cra-card"/g) ?? []).length, total, 'every operator is in the HTML');
assert.match(html, /<meta name="robots" content="noindex, nofollow"/, 'preview is noindex, nofollow');
assert.ok(!/\u2014/.test(html), 'no em dashes');

const browser = await chromium.launch();
let failed = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`not ok - ${name}\n  ${e.message}`); }
};
try {
  await check('without JavaScript: form hidden, every card visible', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(base + PAGE);
    assert.equal(await p.locator('[data-cra-filters]').isVisible(), false);
    assert.equal(await p.locator('.cra-card:visible').count(), total);
    await ctx.close();
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(base + PAGE);

  await check('filters appear with JavaScript', async () => {
    assert.equal(await p.locator('[data-cra-filters]').isVisible(), true);
    assert.equal(await p.locator('[data-cra-count]').textContent(), `Showing all ${total} cruise lines.`);
  });
  await check('search by name narrows the list and announces the count', async () => {
    await p.fill('#cra-q', 'carnival');
    const shown = await p.locator('.cra-card:visible').count();
    assert.ok(shown >= 1 && shown < total, `shown ${shown}`);
    for (const n of await p.locator('.cra-card:visible .cra-card__name').allTextContents()) assert.match(n.toLowerCase(), /carnival/);
    assert.equal(await p.locator('[data-cra-count]').textContent(), `Showing ${shown} of ${total} cruise lines.`);
    assert.equal(await p.locator('[data-cra-count]').getAttribute('aria-live'), 'polite');
  });
  await check('status filter shows only the chosen statuses', async () => {
    await p.click('[data-cra-reset]');
    for (const v of ['conditionally-permitted', 'not-permitted', 'unverified']) await p.uncheck(`[data-cra-status][value="${v}"]`);
    const statuses = await p.locator('.cra-card:visible').evaluateAll((els) => els.map((e) => e.dataset.status));
    assert.ok(statuses.length > 0 && statuses.every((s) => s === 'officially-permitted'), statuses.join());
  });
  await check('no match shows the empty message', async () => {
    await p.fill('#cra-q', 'zzzz-no-such-line');
    assert.equal(await p.locator('[data-cra-empty]').isVisible(), true);
    assert.equal(await p.locator('.cra-card:visible').count(), 0);
  });
  await check('Clear filters restores every card and focuses the search', async () => {
    await p.click('[data-cra-reset]');
    assert.equal(await p.locator('.cra-card:visible').count(), total);
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'cra-q');
  });
  await check('detail links point at sections on the page', async () => {
    const targets = new Set(await p.locator('.cra-card__more').evaluateAll((els) => els.map((e) => e.getAttribute('href'))));
    for (const t of targets) assert.equal(await p.locator(t).count(), 1, `missing ${t}`);
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
