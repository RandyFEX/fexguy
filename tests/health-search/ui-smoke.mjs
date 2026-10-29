// Browser check of the Health Question Search on the built preview page:
//   npm run build && node tests/health-search/ui-smoke.mjs
// Serves dist/ plus the real API handler (local redis-server, fictional
// sample data), then drives Chromium: search, results, three-search limit,
// reopening results, modal keyboard behavior, phone link, mobile layout.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { startRedis } from './redis-test-server.js';
import { handleSearch } from '../../server/health-search/handler.js';
import { sampleDataset } from '../../server/health-search/sample-dataset.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIST = new URL('../../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif' };

const redis = await startRedis();
const env = { HEALTH_SEARCH_SECRET: 'u'.repeat(40) };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health-search/') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: { ...req.headers, 'x-real-ip': '127.0.0.1' }, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
    const r = await handleSearch(request, env, { store: redis.store, dataset: sampleDataset });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let p = join(DIST, decodeURIComponent(url.pathname));
  if (p.endsWith('/')) p = join(p, 'index.html');
  try {
    const body = await readFile(p);
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(`PASS  ${name}`); } catch (e) { results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}`); }
};

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/health-question-search-preview/`);
  const inline = page.locator('section.hqs').first();

  await check('allowance shows 3 searches on load', async () => {
    await inline.locator('[data-hqs-allowance]').filter({ hasText: '3 of 3 searches left today.' }).waitFor({ timeout: 5000 });
  });
  await check('search shows grouped results with direct/related labels and verbatim question', async () => {
    await inline.getByLabel('Health condition, procedure or medication').fill('heart attack');
    await inline.getByRole('button', { name: 'Search' }).click();
    await inline.locator('.hqs-carrier').first().waitFor();
    assert.ok(await inline.locator('.hqs-badge--direct').count() >= 1);
    assert.ok((await inline.locator('.hqs-q__text').first().innerText()).includes('heart attack'));
    assert.match(await inline.locator('.hqs-sample').innerText(), /sample questions/);
    assert.match(await inline.locator('[data-hqs-allowance]').innerText(), /2 of 3/);
  });
  await check('a search with no matches is free and explains what to try', async () => {
    await inline.getByLabel('Health condition, procedure or medication').fill('hip replacement');
    await inline.getByRole('button', { name: 'Search' }).click();
    await inline.locator('.hqs-empty').waitFor();
    assert.match(await inline.locator('[data-hqs-allowance]').innerText(), /2 of 3/);
  });
  await check('third search, then the allowance is exhausted with a prominent call option', async () => {
    for (const q of ['copd', 'insulin']) {
      await inline.getByLabel('Health condition, procedure or medication').fill(q);
      await inline.getByRole('button', { name: 'Search' }).click();
      await inline.locator('.hqs-carrier').first().waitFor();
    }
    await inline.locator('.hqs-callbox--strong').waitFor();
    const call = inline.locator('.hqs-callbox--strong a');
    assert.equal(await call.getAttribute('href'), 'tel:8888629456');
    assert.match(await call.innerText(), /888-862-9456/);
    assert.ok((await inline.locator('.hqs-q__text').first().innerText()).includes('insulin'), 'third result stays visible');
  });
  await check('a fourth new search is blocked; the server agrees after reload', async () => {
    await inline.getByLabel('Health condition, procedure or medication').fill('stroke');
    await inline.getByRole('button', { name: 'Search' }).click();
    assert.ok((await inline.locator('.hqs-q__text').first().innerText()).includes('insulin'));
    await page.reload();
    await page.locator('section.hqs [data-hqs-allowance]').filter({ hasText: 'No searches left' }).waitFor({ timeout: 5000 });
    const res = await page.evaluate(async () => (await fetch('/api/health-search/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: 'stroke' }) })).status);
    assert.equal(res, 429);
  });
  await check('an earlier search can be reopened after exhaustion (not counted)', async () => {
    const inl = page.locator('section.hqs').first();
    await inl.getByLabel('Health condition, procedure or medication').fill('COPD');
    await inl.getByRole('button', { name: 'Search' }).click();
    await inl.locator('.hqs-carrier').first().waitFor();
  });
  await check('modal opens from its button, focuses the field, closes with Escape and returns focus', async () => {
    const open = page.getByRole('button', { name: 'Search health questions' });
    await open.click();
    const dialog = page.locator('dialog.hqs-dialog');
    assert.ok(await dialog.evaluate((d) => d.open));
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'q');
    await page.keyboard.press('Escape');
    assert.ok(!(await dialog.evaluate((d) => d.open)));
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Search health questions');
  });
  await check('keyboard: Tab reaches the field and the Search button', async () => {
    await page.reload();
    const field = page.locator('section.hqs input[name="q"]');
    await field.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Search');
  });
  await check('no JavaScript errors', async () => assert.deepEqual(errors, []));

  const mobile = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true });
  const m = await mobile.newPage();
  await m.goto(`${base}/health-question-search-preview/`);
  await check('mobile 375px: no horizontal scroll, 48px controls, 20px field text', async () => {
    const f = m.locator('section.hqs input[name="q"]');
    await f.fill('copd');
    await m.locator('section.hqs').getByRole('button', { name: 'Search' }).click();
    await m.locator('section.hqs .hqs-carrier').first().waitFor();
    assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'horizontal overflow');
    const btn = await m.locator('section.hqs .hqs__submit').boundingBox();
    assert.ok(btn.height >= 47.5, `button ${btn.height}px`);
    assert.equal(await f.evaluate((e) => getComputedStyle(e).fontSize), '20px');
    if (process.env.SHOT_DIR) await m.screenshot({ path: `${process.env.SHOT_DIR}/hqs-mobile.png`, fullPage: true });
  });
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/hqs-desktop.png`, fullPage: true });
} finally {
  await browser.close();
  server.close();
  redis.stop();
}
console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
