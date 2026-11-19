// Lab measurement of funeralfunds.com mobile performance (read-only).
// usage: node measure.js <outfile.json> [runs] [pagesCsv] [widthsCsv]
const { chromium } = require('playwright');
const fs = require('fs');

const ORIGIN = 'https://funeralfunds.com';
const PAGES = (process.argv[4] || '/,/burial-insurance/copd/,/aetna-burial-insurance-review/,/burial-insurance/,/a-z-health/,/colonial-penn-burial-insurance-review/,/12-step-final-planning-guide/,/funeral-cost-map/,/life-insurance-health-questions/,/free-quote/,/reviews/,/about/,/burial-insurance-calculator/').split(',');
const WIDTHS = (process.argv[5] || '360,375,390,430').split(',').map(Number);
const RUNS = Number(process.argv[3] || 3);
const OUT = process.argv[2];
const HEIGHT = { 360: 780, 375: 812, 390: 844, 430: 932 };
const UA = 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
// Analytics beacons are blocked so the lab runs never add pageviews/events to
// Randy's GA4/Meta data. The vendor libraries themselves still download/run.
const BLOCKED = ['*google-analytics.com/g/collect*', '*analytics.google.com/g/collect*', '*google-analytics.com/collect*', '*facebook.com/tr*', '*google.com/ccm/collect*', '*doubleclick.net/*', '*google.com/pagead/*'];

const INIT = () => {
  const P = (window.__perf = { lcp: [], shifts: [], longtasks: [], events: [], paints: [] });
  const obs = (type, cb, opts = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true, ...opts }); } catch (e) { P['err_' + type] = String(e); } };
  const desc = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    let sel = el.tagName.toLowerCase();
    if (el.id) sel += '#' + el.id;
    if (el.className && typeof el.className === 'string') sel += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
    return { tag: el.tagName, sel, src: el.currentSrc || el.src || null, text: (el.textContent || '').trim().slice(0, 80), w: Math.round(r.width), h: Math.round(r.height), fetchpriority: el.getAttribute && el.getAttribute('fetchpriority'), loading: el.getAttribute && el.getAttribute('loading') };
  };
  obs('largest-contentful-paint', (e) => P.lcp.push({ t: e.startTime, size: e.size, url: e.url, el: desc(e.element) }));
  obs('layout-shift', (e) => P.shifts.push({ t: e.startTime, v: e.value, hadRecentInput: e.hadRecentInput, sources: (e.sources || []).slice(0, 3).map((s) => desc(s.node)) }));
  obs('longtask', (e) => P.longtasks.push({ t: e.startTime, d: e.duration }));
  obs('paint', (e) => P.paints.push({ name: e.name, t: e.startTime }));
  obs('event', (e) => P.events.push({ name: e.name, t: e.startTime, d: e.duration, id: e.interactionId, pd: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart, target: e.target ? desc(e.target).sel : null }), { durationThreshold: 16 });
};

function median(a) { const v = a.filter((x) => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }

async function interact(page, path) {
  // Returns a description of the interaction performed.
  if (path === '/life-insurance-health-questions/') {
    const inp = page.locator('.hqs__input').first();
    await inp.tap(); await page.keyboard.type('COPD', { delay: 120 });
    await page.locator('.hqs__submit').first().tap();
    return 'tap health-search input, type "COPD", tap Search';
  }
  if (path === '/free-quote/') {
    await page.locator('button[data-pick="gender"][data-value="male"]').first().tap();
    return 'tap quote funnel first choice (Male)';
  }
  if (path === '/funeral-cost-map/') {
    await page.locator('[data-fcm-tab="costs"]').first().tap();
    return 'tap map tab "costs" ([data-fcm-tab=costs])';
  }
  const t = page.locator('.nav__toggle');
  if (await t.count() && await t.first().isVisible()) { await t.first().tap(); return 'tap Menu (.nav__toggle)'; }
  return null;
}

async function menuTest(page) {
  const t = page.locator('.nav__toggle');
  if (!(await t.count()) || !(await t.first().isVisible())) return { present: false };
  const state = () => page.evaluate(() => {
    const b = document.querySelector('.nav__toggle'); const m = document.getElementById(b.getAttribute('aria-controls'));
    const r = m ? m.getBoundingClientRect() : null; const cs = m ? getComputedStyle(m) : null;
    const visible = !!(m && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none');
    let overflowing = [];
    if (visible) m.querySelectorAll('*').forEach((el) => { const q = el.getBoundingClientRect(); if (q.width && (q.right > innerWidth + 1 || q.left < -1)) overflowing.push((el.tagName + '.' + (el.className || '')).slice(0, 60) + ` [${Math.round(q.left)},${Math.round(q.right)}]`); });
    return { expanded: b.getAttribute('aria-expanded'), visible, menuRect: r && { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }, docScrollW: document.documentElement.scrollWidth, innerW: innerWidth, overflowing: overflowing.slice(0, 8) };
  });
  const before = await state();
  if (before.expanded !== 'true') await t.first().tap();
  await page.waitForTimeout(500);
  const open = await state();
  // try opening first category on phone
  let cat = null;
  const trig = page.locator('#site-menu .nav__trigger').first();
  if (open.visible && await trig.count() && await trig.isVisible()) { await trig.tap(); await page.waitForTimeout(400); cat = await state(); cat.triggerExpanded = await trig.getAttribute('aria-expanded'); }
  await page.locator('.nav__toggle').first().tap({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const closed = await state();
  return { present: true, before, open, categoryOpen: cat, closed, opens: open.visible && open.expanded === 'true', closes: !closed.visible && closed.expanded === 'false' };
}

const PAGE_ANALYSIS = () => {
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio;
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/).filter((c) => !c.startsWith('astro-')).slice(0, 2).join('.'); return s; };
  const path = (el) => { const parts = []; let e = el; for (let i = 0; e && e.nodeType === 1 && i < 4; i++, e = e.parentElement) parts.unshift(sel(e)); return parts.join(' > '); };
  // overflow
  const over = [];
  if (document.documentElement.scrollWidth > W) {
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect(); if (!r.width || r.right <= W + 1) return;
      // skip if clipped by an ancestor with overflow other than visible
      let a = el.parentElement, clipped = false; while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') { clipped = true; break; } a = a.parentElement; }
      if (clipped) return;
      // outermost only
      const p = el.parentElement; if (p && p.getBoundingClientRect().right > W + 1 && p !== document.body) return;
      over.push({ el: path(el), right: Math.round(r.right), width: Math.round(r.width) });
    });
  }
  // tap targets within first 3 screens (page scrolled to top)
  const T = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button]')].filter((el) => vis(el) && !el.closest('[hidden]'));
  const rects = T.map((el) => { const r = el.getBoundingClientRect(); return { el, r: { l: r.left, t: r.top + scrollY, w: r.width, h: r.height } }; });
  const inScope = rects.filter((x) => x.r.t < 3 * H);
  const inline = (el) => { if (el.tagName !== 'A') return false; const p = el.closest('p, li, td, dd, figcaption, blockquote'); if (!p) return false; return (p.textContent || '').trim().length > (el.textContent || '').trim().length + 15; };
  const spacingOk = (x) => { const cx = x.r.l + x.r.w / 2, cy = x.r.t + x.r.h / 2; return rects.every((o) => { if (o === x) return true; const dx = Math.max(o.r.l - cx, 0, cx - (o.r.l + o.r.w)); const dy = Math.max(o.r.t - cy, 0, cy - (o.r.t + o.r.h)); return Math.hypot(dx, dy) >= 12; }); };
  const small24 = [], small48 = [];
  inScope.forEach((x) => {
    const d = { el: path(x.el), text: ((x.el.innerText || x.el.value || x.el.getAttribute('aria-label') || '') + '').trim().slice(0, 50), w: Math.round(x.r.w), h: Math.round(x.r.h), inline: inline(x.el) };
    if (x.r.w < 24 || x.r.h < 24) { d.spacingException = spacingOk(x); small24.push(d); }
    else if (x.r.w < 48 || x.r.h < 48) small48.push(d);
  });
  // images
  const imgs = [...document.images].map((img) => {
    const r = img.getBoundingClientRect(); const v = vis(img);
    const pic = img.parentElement && img.parentElement.tagName === 'PICTURE';
    return { src: img.getAttribute('src'), currentSrc: img.currentSrc, alt: img.getAttribute('alt'), inPicture: pic, sources: pic ? [...img.parentElement.querySelectorAll('source')].map((s) => s.type || s.media || 'source') : [], srcset: !!img.getAttribute('srcset'), sizes: img.getAttribute('sizes'), naturalW: img.naturalWidth, naturalH: img.naturalHeight, cssW: Math.round(r.width * 10) / 10, cssH: Math.round(r.height * 10) / 10, neededW: Math.round(r.width * dpr), visible: v, aboveFold: v && r.top + scrollY < H && r.bottom + scrollY > 0, loading: img.getAttribute('loading'), fetchpriority: img.getAttribute('fetchpriority'), decoding: img.getAttribute('decoding'), hasWH: img.hasAttribute('width') && img.hasAttribute('height'), complete: img.complete };
  });
  // head render-blocking
  const head = document.head;
  const blockingCss = [...head.querySelectorAll('link[rel~=stylesheet]')].filter((l) => !l.media || l.media === 'all' || matchMedia(l.media).matches).map((l) => l.href);
  const blockingJs = [...head.querySelectorAll('script[src]')].filter((s) => !s.async && !s.defer && s.type !== 'module').map((s) => s.src);
  const inlineStyleBytes = [...document.querySelectorAll('style')].reduce((n, s) => n + s.textContent.length, 0);
  const inlineScriptBytes = [...document.querySelectorAll('script:not([src])')].filter((s) => !s.type || /javascript|module/.test(s.type)).reduce((n, s) => n + s.textContent.length, 0);
  const jsonScriptBytes = [...document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]')].reduce((n, s) => n + s.textContent.length, 0);
  return { W, H, dpr, scrollWidth: document.documentElement.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > W, overflowElements: over.slice(0, 15), tapTargetsInScope: inScope.length, small24Count: small24.length, small24NonInline: small24.filter((d) => !d.inline).length, small24NonInlineNoSpacing: small24.filter((d) => !d.inline && !d.spacingException).length, small24, small48Count: small48.length, small48: small48.slice(0, 15), imgs, blockingCss, blockingJs, inlineStyleBytes, inlineScriptBytes, jsonScriptBytes, domNodes: document.getElementsByTagName('*').length, htmlChars: document.documentElement.outerHTML.length };
};

function cls(shifts) {
  let max = 0, cur = 0, start = -1, last = -1;
  for (const s of shifts.filter((x) => !x.hadRecentInput).sort((a, b) => a.t - b.t)) {
    if (start < 0 || s.t - last > 1000 || s.t - start > 5000) { cur = 0; start = s.t; }
    cur += s.v; last = s.t; if (cur > max) max = cur;
  }
  return max;
}

async function runOne(browser, path, width, run, opts = {}) {
  const dpr = width >= 390 ? 3 : 2;
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] || 800 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: UA, ignoreHTTPSErrors: false });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  // Network.setBlockedURLs is not used: in this Chromium it cancelled the network throttling rule. GA/Meta hosts are refused by the environment proxy anyway, so no beacon can be sent.
  // Network.emulateNetworkConditions (legacy) did not add latency in this Chromium (153) build; the rule-based API does.
  await cdp.send('Network.emulateNetworkConditionsByRule', { offline: false, matchedNetworkConditions: [{ urlPattern: '', latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }] });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(300);
  const reqs = new Map();
  let loadT = null; const t0 = Date.now();
  cdp.on('Network.requestWillBeSent', (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, ts: e.timestamp, prio: e.request.initialPriority }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.type = e.type; r.protocol = e.response.protocol; const tm = e.response.timing; if (tm) r.wait = tm.receiveHeadersEnd - tm.sendStart; } });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.afterLoad = loadT !== null; } });
  cdp.on('Network.loadingFailed', (e) => { const r = reqs.get(e.requestId); if (r) { r.failed = e.errorText; r.blocked = e.blockedReason || null; } });
  if (opts.coverage) await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: true });
  page.on('load', () => { loadT = Date.now() - t0; });
  let navErr = null;
  try { await page.goto(ORIGIN + path, { waitUntil: 'load', timeout: 120000 }); } catch (e) { navErr = String(e.message).slice(0, 200); }
  await page.waitForTimeout(6000); // let late LCP/shift/longtasks & post-load vendor scripts happen
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { ttfb: n.responseStart, reqStart: n.requestStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, transfer: n.transferSize, decoded: n.decodedBodySize, protocol: n.nextHopProtocol } : null; });
  const perf0 = await page.evaluate(() => JSON.parse(JSON.stringify(window.__perf)));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); // analysis is not timed
  const analysis = await page.evaluate(PAGE_ANALYSIS);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // interaction (INP lab proxy)
  let interaction = null, inp = null, inpEntries = [];
  try {
    const nBefore = perf0.events.length;
    interaction = await interact(page, path);
    await page.waitForTimeout(1500);
    const ev = await page.evaluate(() => window.__perf.events);
    inpEntries = ev.slice(nBefore).filter((e) => e.id > 0);
    if (interaction) inp = inpEntries.length ? Math.max(...inpEntries.map((e) => e.d)) : 0; // 0 = no event >= 16ms
  } catch (e) { interaction = 'error: ' + String(e.message).slice(0, 150); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  let menu = null;
  if (opts.menu) { try { if (path !== '/' && interaction && interaction.startsWith('tap Menu')) { await page.locator('.nav__toggle').first().tap(); await page.waitForTimeout(400); } menu = await menuTest(page); } catch (e) { menu = { error: String(e.message).slice(0, 150) }; } }
  // scrolled image pass
  let imgsScrolled = null;
  if (opts.scrollImages) {
    await page.evaluate(async () => { const H = innerHeight; for (let y = 0; y < document.documentElement.scrollHeight; y += H * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); } scrollTo(0, 0); });
    await page.waitForTimeout(3000);
    imgsScrolled = (await page.evaluate(PAGE_ANALYSIS)).imgs;
  }
  let coverage = null;
  if (opts.coverage) {
    const cov = await page.coverage.stopJSCoverage();
    coverage = cov.map((c) => { const total = (c.source || '').length; let used = 0; for (const f of c.functions) for (const r of f.ranges) if (r.count > 0 && f.isBlockCoverage === false) {} // block-level computed below
      // use top-level ranges: sum of ranges with count>0 minus nested count==0 ranges (approximation via merging)
      const marks = new Uint8Array(total); for (const f of c.functions) for (const r of f.ranges) { const v = r.count > 0 ? 1 : 0; for (let i = r.startOffset; i < Math.min(r.endOffset, total); i++) marks[i] = v; }
      for (let i = 0; i < total; i++) used += marks[i];
      return { url: c.url, total, used };
    });
  }
  const perf = await page.evaluate(() => JSON.parse(JSON.stringify(window.__perf)));
  await ctx.close();
  const fcp = (perf0.paints.find((p) => p.name === 'first-contentful-paint') || {}).t ?? null;
  const lcpLast = perf0.lcp[perf0.lcp.length - 1] || null;
  const tbtEnd = (nav && nav.load ? nav.load : 0) + 6000;
  const tbt = perf0.longtasks.filter((l) => fcp != null && l.t >= fcp && l.t < tbtEnd).reduce((n, l) => n + Math.max(0, l.d - 50), 0);
  const all = [...reqs.values()];
  const host = (u) => { try { return new URL(u).host; } catch { return u.slice(0, 20); } };
  const bucket = (r) => { const t = (r.type || '').toLowerCase(); if (t === 'document') return 'document'; if (t === 'script') return 'script'; if (t === 'stylesheet') return 'css'; if (t === 'image') return 'image'; if (t === 'font') return 'font'; return 'other'; };
  const bytes = { document: 0, script: 0, css: 0, image: 0, font: 0, other: 0 }; const counts = { document: 0, script: 0, css: 0, image: 0, font: 0, other: 0 };
  let bytesBeforeLoad = 0;
  for (const r of all) { if (r.url.startsWith('data:')) continue; const b = bucket(r); counts[b]++; bytes[b] += r.bytes || 0; if (!r.afterLoad) bytesBeforeLoad += r.bytes || 0; }
  const thirdParty = {}; for (const r of all) { const h = host(r.url); if (!h.endsWith('funeralfunds.com') && !r.url.startsWith('data:')) { thirdParty[h] = thirdParty[h] || { n: 0, bytes: 0, blocked: 0 }; thirdParty[h].n++; thirdParty[h].bytes += r.bytes || 0; if (r.failed) thirdParty[h].blocked++; } }
  const fonts = all.filter((r) => bucket(r) === 'font' || /\.(woff2?|ttf|otf)(\?|$)/.test(r.url)).map((r) => r.url);
  return {
    path, width, dpr, run, navErr, reqWaitMedian: median(all.filter((r) => typeof r.wait === 'number' && r.url.includes('funeralfunds.com')).map((r) => r.wait)), docWait: (all.find((r) => r.type === 'Document') || {}).wait, latencyApplied: ((all.find((r) => r.type === 'Document') || {}).wait || 0) >= 140 && median(all.filter((r) => typeof r.wait === 'number' && r.url.includes('funeralfunds.com')).map((r) => r.wait)) >= 140, loadWallMs: loadT,
    ttfb: nav && nav.ttfb, fcp, lcp: lcpLast && lcpLast.t, lcpEl: lcpLast && { ...lcpLast.el, size: lcpLast.size, url: lcpLast.url }, lcpCandidates: perf0.lcp.length,
    cls: cls(perf0.shifts), shifts: perf0.shifts.filter((s) => !s.hadRecentInput).slice(0, 10), tbt, longtasks: perf0.longtasks, dcl: nav && nav.dcl, load: nav && nav.load, protocol: nav && nav.protocol,
    interaction, inpProxy: inp, inpEntries: inpEntries.slice(0, 12),
    requests: all.filter((r) => !r.url.startsWith('data:')).length, bytes, counts, bytesTotal: Object.values(bytes).reduce((a, b) => a + b, 0), bytesBeforeLoad, thirdParty, fonts,
    reqList: opts.keepReqs ? all.map((r) => ({ url: r.url.slice(0, 200), type: r.type, mime: r.mime, bytes: r.bytes, status: r.status, failed: r.failed, afterLoad: r.afterLoad, prio: r.prio })) : undefined,
    analysis: opts.keepAnalysis ? analysis : { scrollWidth: analysis.scrollWidth, horizontalOverflow: analysis.horizontalOverflow, overflowElements: analysis.overflowElements, small24Count: analysis.small24Count, small24NonInline: analysis.small24NonInline, small24NonInlineNoSpacing: analysis.small24NonInlineNoSpacing, small48Count: analysis.small48Count, tapTargetsInScope: analysis.tapTargetsInScope, blockingCss: analysis.blockingCss, blockingJs: analysis.blockingJs, domNodes: analysis.domNodes },
    imgsScrolled, menu, coverage,
  };
}

(async () => {
  const browser = await chromium.launch();
  const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { started: new Date().toISOString(), runs: [] };
  for (const path of PAGES) for (const width of WIDTHS) for (let run = 1, valid = 0; valid < RUNS && run <= RUNS + 4; run++) {
    const first = !results.runs.some((r) => r.path === path && r.width === width && r.latencyApplied && r.analysis && r.analysis.imgs);
    let r;
    const br = await chromium.launch();
    try { r = await runOne(br, path, width, run, { keepAnalysis: first, keepReqs: first, scrollImages: first, menu: first }); }
    catch (e) { r = { path, width, run, fatal: String(e.message).slice(0, 300) }; }
    await br.close();
    results.runs.push(r);
    if (r.latencyApplied) valid++;
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
    console.log(path, width, run, r.fatal || `lat=${r.latencyApplied}/doc${Math.round(r.docWait)}/sub${Math.round(r.reqWaitMedian)} ttfb=${Math.round(r.ttfb)} fcp=${Math.round(r.fcp)} lcp=${Math.round(r.lcp)} cls=${r.cls.toFixed(3)} tbt=${Math.round(r.tbt)} inp=${r.inpProxy} req=${r.requests} kb=${Math.round(r.bytesTotal / 1024)}`);
  }
  // JS coverage pass (separate, unthrottled timing not used), 390px only
  if (!process.env.NO_COV) for (const path of PAGES) {
    if (results.coverage && results.coverage[path]) continue;
    try { const r = await runOne(browser, path, 390, 0, { coverage: true }); results.coverage = results.coverage || {}; results.coverage[path] = r.coverage; } catch (e) { results.coverage = results.coverage || {}; results.coverage[path] = { error: String(e.message) }; }
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
    console.log('coverage', path);
  }
  results.finished = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  await browser.close();
})();
