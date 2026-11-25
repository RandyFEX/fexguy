// Video introduction over the quote results (Randy, November 2026, v1.2;
// src/scripts/quote-intro.ts). Serves dist/ with a mocked /api/quote/ and
// /api/price-explorer/ (no rate data, nothing sent anywhere). Chromium runs
// with --autoplay-policy=user-gesture-required, the strict per-element rule
// that iPhones and Android WebViews (Facebook in-app) apply, and the lead
// request is held 6 seconds, longer than Chrome's 5-second click window, so
// sound can only play because SEE MY RATES unlocked the video element.
// This is headless Chromium only; it is not a test on a real phone.
// Run after a build: node tests/quote/video-intro.browser.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  const file = join(DIST, p);
  try {
    const s = await stat(file);
    const body = await readFile(file);
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '');
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Number(range[2]) : s.size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${s.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return res.end(body.subarray(start, end + 1));
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const OUT = process.env.OUT ?? ''; // screenshots, if set
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${String(e.message).split('\n')[0]}`);
  }
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

async function open({ breakVideo = false, delay = 6000, blockSound = false, staleOffer = false, prices = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // A browser that refuses sound outside a user action, even on a video
  // unlocked earlier (the strictest case): play() is refused unless the page
  // has an active user action at that moment.
  if (blockSound)
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (!navigator.userActivation.isActive) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
        return play.call(this);
      };
    });
  // An earlier quote in this browser, same saved visit id, whose 10-minute
  // results window ran out a day ago.
  if (staleOffer)
    await page.addInitScript(() => {
      if (localStorage.getItem('ff:quote-visit')) return;
      localStorage.setItem('ff:quote-visit', 'stalevisit0000000001');
      localStorage.setItem('ff:quote-offer-results', JSON.stringify({ visit: 'stalevisit0000000001', expiresAt: Date.now() - 86400e3 }));
    });
  await page.addInitScript(() => {
    window.__ev = [];
    window.addEventListener('ff:funnel', (e) => window.__ev.push(e.detail));
  });
  let session = false;
  await page.route('**/api/quote/', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.action === 'start') {
      await new Promise((r) => setTimeout(r, delay));
      session = true;
      return route.fulfill({ json: { status: 'verified', lead: 'L'.repeat(20), expiresAt: Date.now() + 3600e3 } });
    }
    if (body.action === 'session' && session) return route.fulfill({ json: { status: 'verified', quote: { age: 68, gender: 'female', tobacco: false, coverage: 10000 }, firstName: 'Pat', expiresAt: Date.now() + 3600e3 } });
    return route.fulfill({ json: { status: 'none' } });
  });
  await page.route('**/api/price-explorer/', (route) => {
    prices.push(route.request().postData());
    // A definite refusal (not retried); retries are tested in pricing-reliability.browser.mjs.
    return route.fulfill({ status: 429, json: { status: 'rate-limited' } });
  });
  if (breakVideo) await page.route(/\/videos\/quote-intro\//, (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto(`${BASE}/free-quote/`);
  await page.waitForSelector('[data-step="1"]:not([hidden])');
  for (const s of ['[data-pick="gender"][data-value="female"]', '[data-pick="age"][data-value="68"]', '[data-pick="tobacco"][data-value="no"]']) await page.click(s);
  await page.selectOption('[data-qf-state]', 'Texas');
  await page.waitForSelector('[data-step="6"]:not([hidden])');
  await page.fill('#qf-first', 'Pat Smith');
  await page.fill('#qf-phone', '214-867-5315');
  return { ctx, page };
}
const names = (page) => page.evaluate(() => window.__ev.filter((d) => d.name.startsWith('quote_video_')).map((d) => d.name));
const state = (page) =>
  page.evaluate(() => {
    const v = document.querySelector('[data-qv] video');
    return { open: !document.querySelector('[data-qv]').hidden, paused: v.paused, muted: v.muted, t: v.currentTime, results: !document.querySelector('[data-step="7"]').hidden, play: !document.querySelector('[data-qv-play]').hidden, focus: document.activeElement?.getAttribute('data-qv-close') !== null ? 'close' : document.activeElement?.id };
  });

await check('contact step preloads the video; SEE MY RATES (6 s lead request) opens the overlay over the results and plays with sound', async () => {
  const { ctx, page } = await open();
  assert(await page.$eval('[data-qv] video', (v) => v.preload === 'auto'), 'not preloading at the contact step');
  await page.click('[data-qf-submit]');
  await page.waitForTimeout(1000);
  assert(!(await state(page)).open, 'overlay opened before the rates');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('[data-qv] video').currentTime > 0.5, null, { timeout: 8000 });
  const s = await state(page);
  assert(s.results && !s.paused && !s.muted && !s.play && s.focus === 'close', JSON.stringify(s));
  assert((await names(page)).join() === 'quote_video_start', (await names(page)).join());
  if (OUT) await page.screenshot({ path: `${OUT}/video-playing.png` });
  // Ends on its own: jump near the end and wait.
  await page.$eval('[data-qv] video', (v) => { v.currentTime = v.duration - 1; });
  await page.waitForSelector('[data-qv]', { state: 'hidden', timeout: 6000 });
  const after = await state(page);
  assert(after.results && after.focus === 'qf-s7' && after.paused, JSON.stringify(after));
  assert((await names(page)).join() === 'quote_video_start,quote_video_complete', (await names(page)).join());
  const html = await page.evaluate(() => document.documentElement.className);
  assert(!html.includes('qv-open'), 'scroll lock left on');
  // Once per quote session: a reload returns to the results without the video.
  await page.reload();
  await page.waitForSelector('[data-step="7"]:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(800);
  assert(!(await state(page)).open, 'video shown again after reload');
  await ctx.close();
});

await check('close button stops playback at once and records quote_video_dismiss with the position (no personal data)', async () => {
  const { ctx, page } = await open({ delay: 500 });
  await page.click('[data-qf-submit]');
  await page.waitForFunction(() => document.querySelector('[data-qv] video').currentTime > 1, null, { timeout: 10000 });
  await page.click('[data-qv-close]');
  const s = await state(page);
  assert(!s.open && s.paused && s.results, JSON.stringify(s));
  const ev = await page.evaluate(() => window.__ev.filter((d) => d.name === 'quote_video_dismiss'));
  assert(ev.length === 1 && Number.isInteger(ev[0].position) && ev[0].videoId === 'test-v1', JSON.stringify(ev));
  assert(!JSON.stringify(await page.evaluate(() => window.__ev)).match(/Pat|867-?5315/), 'personal data in events');
  await ctx.close();
});

await check('Escape closes the overlay', async () => {
  const { ctx, page } = await open({ delay: 300 });
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 8000 });
  await page.keyboard.press('Escape');
  assert(!(await state(page)).open, 'still open');
  await ctx.close();
});

await check('blocked sound: Play With Sound shows and stays until tapped, then plays with sound', async () => {
  const { ctx, page } = await open({ delay: 6000, blockSound: true });
  await page.click('[data-qf-submit]'); // the 6 s lead request outlasts the click's window
  await page.waitForFunction(() => !document.querySelector('[data-qv-play]').hidden, null, { timeout: 10000 });
  await page.waitForTimeout(13000); // longer than the start limit: blocked is not a failure
  if (OUT) await page.screenshot({ path: `${OUT}/video-blocked.png` });
  let s = await state(page);
  assert(s.open && s.play && s.paused, JSON.stringify(s));
  await page.click('[data-qv-play]');
  await page.waitForFunction(() => document.querySelector('[data-qv] video').currentTime > 0.5, null, { timeout: 8000 });
  s = await state(page);
  assert(s.open && !s.paused && !s.muted && !s.play, JSON.stringify(s));
  assert((await names(page)).join() === 'quote_video_autoplay_blocked,quote_video_start', (await names(page)).join());
  await ctx.close();
});

await check('video fails to load: no overlay is left over the results', async () => {
  const { ctx, page } = await open({ breakVideo: true, delay: 300 });
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-step="7"]:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const s = await state(page);
  assert(!s.open && s.results, JSON.stringify(s));
  await ctx.close();
});

await check('video fails after the overlay opened: it closes and records quote_video_error', async () => {
  const { ctx, page } = await open({ delay: 300 });
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 8000 });
  await page.$eval('[data-qv] video', (v) => v.dispatchEvent(Object.defineProperty(new Event('error'), 'target', { value: v })) || true);
  await page.$eval('[data-qv] video', (v) => { Object.defineProperty(v, 'error', { get: () => ({ code: 3 }) }); v.dispatchEvent(new Event('error')); });
  await page.waitForSelector('[data-qv]', { state: 'hidden', timeout: 3000 });
  assert((await names(page)).includes('quote_video_error'), (await names(page)).join());
  await ctx.close();
});

await check('an earlier expired quote in this browser: a new SEE MY RATES opens a fresh 10-minute window and requests prices (cards never left blurred)', async () => {
  const prices = [];
  const { ctx, page } = await open({ delay: 300, staleOffer: true, prices });
  await page.click('[data-qf-submit]');
  await page.waitForSelector('[data-qv]:not([hidden])', { timeout: 8000 });
  await page.click('[data-qv-close]');
  await page.waitForFunction(() => document.querySelector('[data-qf-card]').dataset.state !== 'locked', null, { timeout: 5000 });
  const s = await page.evaluate(() => ({
    countdown: document.querySelector('[data-qf-countdown]').textContent,
    restart: !document.querySelector('[data-qf-restart]').hidden,
    blurred: document.querySelectorAll('[data-qf-card] .qf-blur').length,
  }));
  assert(prices.length === 1 && /^(10:00|9:5\d)$/.test(s.countdown) && !s.restart && s.blurred === 0, JSON.stringify({ prices: prices.length, ...s }));
  // A refresh keeps the same window (it is not reset without a new submission).
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ff:quote-offer-results')).expiresAt);
  assert(stored > Date.now() + 9 * 60e3, 'window not renewed');
  await ctx.close();
});

await browser.close();
server.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
