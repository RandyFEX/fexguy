// Browser test for the site header navigation (Randy, November 2026,
// navigation V1.0). Serves the built site (dist/) locally and drives it with
// Playwright: desktop hover, click and keyboard behavior, Escape, focus
// leaving a panel, outside clicks, panels inside the viewport, the
// small-screen menu and accordion, the /roku/ compact menu, the landing
// pages' own headers, the phone contact and the no-JavaScript fallback.
// Run after `npm run build`: npm run test:nav (needs Playwright installed).
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
  console.log('Playwright is not installed: skipping the navigation browser test.');
  process.exit(0);
}

const DIST = new URL('../../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failures = 0;
const test = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); }
  catch (e) { failures++; console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`); }
};
const page = async (path, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1280, height: opts.height ?? 800 }, javaScriptEnabled: opts.js ?? true });
  await ctx.route(/^https:\/\//, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + path);
  return p;
};
const expanded = (p, id) => p.getAttribute(`#nav-trigger-${id}`, 'aria-expanded');
const visible = (p, sel) => p.isVisible(sel);
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// ---- Desktop ---------------------------------------------------------------
for (const width of [1024, 1440]) {
  await test(`desktop ${width}: hover opens, moving into the panel keeps it open, leaving closes it`, async () => {
    const p = await page('/about/', { width });
    await p.hover('#nav-trigger-company-reviews');
    assert.equal(await expanded(p, 'company-reviews'), 'true');
    const trig = await p.locator('#nav-trigger-company-reviews').boundingBox();
    const link = await p.locator('#nav-panel-company-reviews a').last().boundingBox();
    // Diagonal path from the button to the last link, through the gap.
    for (let i = 1; i <= 10; i++) await p.mouse.move(trig.x + trig.width / 2 + ((link.x - trig.x) * i) / 10, trig.y + trig.height / 2 + ((link.y - trig.y) * i) / 10);
    await p.waitForTimeout(400);
    assert.equal(await expanded(p, 'company-reviews'), 'true', 'closed while moving into the panel');
    await p.mouse.move(width / 2, 780);
    await p.waitForTimeout(450);
    assert.equal(await expanded(p, 'company-reviews'), 'false', 'did not close after leaving');
    await p.context().close();
  });
  await test(`desktop ${width}: panels fit the viewport, no horizontal scroll`, async () => {
    const p = await page('/about/', { width });
    for (const id of ['life-insurance', 'company-reviews', 'health-eligibility', 'guides-tools', 'about-us']) {
      await p.click(`#nav-trigger-${id}`);
      const b = await p.locator(`#nav-panel-${id}`).boundingBox();
      assert.ok(b && b.x >= 0 && b.x + b.width <= width + 0.5 && b.y + b.height <= 800, `${id} panel outside the viewport`);
      assert.ok(await noHScroll(p), 'horizontal scroll');
    }
    await p.context().close();
  });
}
await test('desktop: click toggles, another category replaces it, outside click closes', async () => {
  const p = await page('/about/');
  await p.click('#nav-trigger-life-insurance');
  assert.equal(await expanded(p, 'life-insurance'), 'true');
  await p.click('#nav-trigger-guides-tools');
  assert.equal(await expanded(p, 'life-insurance'), 'false');
  assert.equal(await expanded(p, 'guides-tools'), 'true');
  await p.waitForTimeout(650);
  await p.click('#nav-trigger-guides-tools');
  assert.equal(await expanded(p, 'guides-tools'), 'false');
  await p.click('#nav-trigger-about-us');
  await p.mouse.click(640, 760);
  assert.equal(await expanded(p, 'about-us'), 'false');
  await p.context().close();
});
await test('desktop: keyboard Enter/Down Arrow/Escape, focus returns, Tab out closes', async () => {
  const p = await page('/about/');
  await p.focus('#nav-trigger-health-eligibility');
  await p.keyboard.press('Enter');
  assert.equal(await expanded(p, 'health-eligibility'), 'true');
  await p.keyboard.press('Escape');
  assert.equal(await expanded(p, 'health-eligibility'), 'false');
  await p.keyboard.press('ArrowDown');
  assert.equal(await expanded(p, 'health-eligibility'), 'true');
  assert.equal(await p.evaluate(() => document.activeElement?.closest('[data-nav-panel]')?.id), 'nav-panel-health-eligibility');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'nav-trigger-health-eligibility');
  await p.keyboard.press('Space');
  const n = await p.locator('#nav-panel-health-eligibility a').count();
  for (let i = 0; i < n; i++) await p.keyboard.press('Tab');
  assert.equal(await expanded(p, 'health-eligibility'), 'true', 'closed too early');
  await p.keyboard.press('Tab');
  assert.equal(await expanded(p, 'health-eligibility'), 'false', 'still open after focus left');
  assert.equal(await p.evaluate(() => document.activeElement?.id), 'nav-trigger-guides-tools');
  await p.context().close();
});
await test('desktop: phone contact unchanged (label, icon, website number)', async () => {
  const p = await page('/about/');
  const links = p.locator('header [data-header-phone]');
  assert.equal(await links.count(), 1);
  assert.equal(await links.getAttribute('href'), 'tel:8888629456');
  assert.match((await links.innerText()).replace(/\s+/g, ' '), /^Speak With a Licensed Agent 888-862-9456$/);
  assert.ok(await visible(p, 'header [data-header-phone] .nav__phone-icon'));
  await p.context().close();
});
await test('desktop without JavaScript: links in the HTML, panels open on hover and focus', async () => {
  const p = await page('/about/', { js: false });
  assert.ok((await p.locator('[data-mega-nav] a').count()) > 60);
  await p.hover('#nav-trigger-life-insurance');
  assert.ok(await visible(p, '#nav-panel-life-insurance'));
  await p.mouse.move(640, 760);
  await p.focus('#nav-trigger-about-us');
  assert.ok(await visible(p, '#nav-panel-about-us'));
  await p.context().close();
});

// ---- Small screens ---------------------------------------------------------
for (const width of [320, 375, 390, 768]) {
  await test(`small screen ${width}: Menu opens, accordion, one category open, no horizontal scroll`, async () => {
    const p = await page('/about/', { width });
    assert.ok(!(await visible(p, '#nav-trigger-life-insurance')));
    await p.click('.nav__toggle');
    assert.equal(await p.getAttribute('.nav__toggle', 'aria-expanded'), 'true');
    await p.click('#nav-trigger-life-insurance');
    assert.ok(await visible(p, '#nav-panel-life-insurance a'));
    await p.click('#nav-trigger-company-reviews');
    assert.ok(!(await visible(p, '#nav-panel-life-insurance')));
    assert.ok(await visible(p, '#nav-panel-company-reviews'));
    assert.ok(await noHScroll(p), 'horizontal scroll');
    const small = await p.$$eval('#site-menu a, #site-menu button', (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).length);
    assert.equal(small, 0, 'touch target under 44px');
    await p.keyboard.press('Escape');
    await p.keyboard.press('Escape');
    assert.equal(await p.getAttribute('.nav__toggle', 'aria-expanded'), 'false');
    await p.context().close();
  });
}
await test('small screen: choosing a destination closes the menu and navigates', async () => {
  const p = await page('/about/', { width: 375 });
  await p.click('.nav__toggle');
  await p.click('#nav-trigger-about-us');
  await Promise.all([p.waitForURL(/\/contact\/$/), p.click('#nav-panel-about-us a[href="/contact/"]')]);
  assert.equal(await p.getAttribute('.nav__toggle', 'aria-expanded'), 'false');
  await p.context().close();
});

// ---- Page scope ------------------------------------------------------------
await test('/roku/ keeps its compact menu and campaign number', async () => {
  const p = await page('/roku/');
  assert.equal(await p.locator('[data-mega-nav]').count(), 0);
  assert.equal(await p.getAttribute('header [data-header-phone]', 'href'), 'tel:8886564648');
  await p.click('#nav-trigger-resources');
  assert.ok(await visible(p, '#nav-panel-resources a[href="/iul-book/"]'));
  await p.context().close();
});
for (const path of ['/facebook/', '/free-quote/', '/help/']) {
  await test(`${path} keeps its simplified header`, async () => {
    const p = await page(path);
    assert.equal(await p.locator('header.site-header, [data-nav]').count(), 0);
    assert.equal(await p.locator('[data-header-phone]').count(), 1);
    assert.equal(await p.getAttribute('[data-header-phone]', 'href'), path === '/facebook/' ? 'tel:8886564648' : 'tel:8888629456');
    await p.context().close();
  });
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} navigation test(s) failed` : '\nAll navigation tests passed');
process.exit(failures ? 1 : 0);
