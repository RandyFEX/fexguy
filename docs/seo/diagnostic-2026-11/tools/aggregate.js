// Aggregates results-raw.json into results.json (medians + raw) and prints markdown tables.
const fs = require('fs');
const D = __dirname + '/..';
const raw = JSON.parse(fs.readFileSync(D + '/results-raw.json', 'utf8'));
const lh = fs.existsSync(D + '/lighthouse-summary.json') ? JSON.parse(fs.readFileSync(D + '/lighthouse-summary.json', 'utf8')) : null;
const med = (a) => { const v = a.filter((x) => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const r0 = (x) => (x == null ? '-' : Math.round(x));
const kb = (x) => (x == null ? '-' : (x / 1024).toFixed(0));
const pages = [...new Set(raw.runs.map((r) => r.path))];
const widths = [360, 375, 390, 430];
const summary = {};
let md = '';
for (const p of pages) {
  summary[p] = {};
  md += `\n#### ${p}\n\n| Width | LCP ms | FCP ms | TTFB ms | CLS | TBT ms | INP proxy ms | LCP range (min-max) | Requests | Transfer KB (doc/js/img) |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const w of widths) {
    const rs = raw.runs.filter((r) => r.path === p && r.width === w && !r.fatal);
    if (!rs.length) continue;
    const m = (k) => med(rs.map((r) => r[k]));
    const s = { runs: rs.length, lcp: m('lcp'), fcp: m('fcp'), ttfb: m('ttfb'), cls: m('cls'), tbt: m('tbt'), inpProxy: m('inpProxy'), requests: m('requests'), bytesTotal: m('bytesTotal'), bytesDoc: med(rs.map((r) => r.bytes.document)), bytesJs: med(rs.map((r) => r.bytes.script)), bytesImg: med(rs.map((r) => r.bytes.image)), bytesCss: med(rs.map((r) => r.bytes.css)), bytesFont: med(rs.map((r) => r.bytes.font)), bytesOther: med(rs.map((r) => r.bytes.other)), lcpMin: Math.min(...rs.map((r) => r.lcp)), lcpMax: Math.max(...rs.map((r) => r.lcp)), ttfbMin: Math.min(...rs.map((r) => r.ttfb)), ttfbMax: Math.max(...rs.map((r) => r.ttfb)), lcpEls: [...new Set(rs.map((r) => r.lcpEl && (r.lcpEl.src || r.lcpEl.sel)))], interaction: rs[0].interaction };
    summary[p][w] = s;
    md += `| ${w} | ${r0(s.lcp)} | ${r0(s.fcp)} | ${r0(s.ttfb)} | ${s.cls == null ? '-' : s.cls.toFixed(3)} | ${r0(s.tbt)} | ${r0(s.inpProxy)} | ${r0(s.lcpMin)}-${r0(s.lcpMax)} | ${r0(s.requests)} | ${kb(s.bytesTotal)} (${kb(s.bytesDoc)}/${kb(s.bytesJs)}/${kb(s.bytesImg)}) |\n`;
  }
  const first = raw.runs.find((r) => r.path === p && r.run === 1 && r.width === 390) || raw.runs.find((r) => r.path === p);
  const el = first.lcpEl || {};
  md += `\nLCP element (390px run 1): \`${el.tag} ${el.sel}\` ${el.src ? 'src ' + el.src : 'text "' + (el.text || '').slice(0, 60) + '"'} (${el.w}x${el.h} CSS px, fetchpriority=${el.fetchpriority}, loading=${el.loading}). INP-proxy interaction: ${first.interaction}. Render-blocking in head: ${first.analysis.blockingCss.length} CSS, ${first.analysis.blockingJs.length} sync JS. DOM nodes: ${first.analysis.domNodes}. Third-party hosts requested: ${Object.keys(first.thirdParty).join(', ') || 'none'}.\n`;
  if (lh && lh[p]) md += `Lighthouse 12 (simulated mobile, 1 run): perf ${lh[p].score}, LCP ${r0(lh[p].lcp)} ms, FCP ${r0(lh[p].fcp)} ms, TBT ${r0(lh[p].tbt)} ms, CLS ${lh[p].cls}, SI ${r0(lh[p].si)} ms.\n`;
}
// images
const dims = fs.existsSync(D + '/tools/imgdims.json') ? JSON.parse(fs.readFileSync(D + '/tools/imgdims.json', 'utf8')) : {};
const imgRows = []; const seen = new Set();
for (const r of raw.runs.filter((x) => x.run === 1 && x.imgsScrolled)) {
  const lcpSrc = r.lcpEl && r.lcpEl.src;
  const atLoad = r.analysis.imgs || [];
  for (const im of r.imgsScrolled) {
    const issues = [];
    const l = atLoad.find((a) => a.src === im.src) || im;
    if (l.aboveFold && im.loading === 'lazy') issues.push('above-the-fold but loading=lazy');
    if (lcpSrc && im.currentSrc === lcpSrc && im.fetchpriority !== 'high') issues.push('LCP image without fetchpriority=high');
    const realW = (dims[im.currentSrc] || {}).w || im.naturalW; im.realW = realW; im.fileBytes = (dims[im.currentSrc] || {}).bytes;
    if (im.visible && realW && im.neededW) { if (realW > 1.5 * im.neededW) issues.push(`oversized: file ${realW}px wide vs ${im.neededW}px needed (${(realW / im.neededW).toFixed(1)}x)`); else if (realW < im.neededW - 1) issues.push(`undersized: file ${realW}px wide vs ${im.neededW}px needed`); }
    if (!im.hasWH && !/\.svg/.test(im.currentSrc || '')) issues.push('no width/height attributes');
    if (im.visible && !im.naturalW) issues.push('visible but not loaded after scroll');
    const fmt = ((im.currentSrc || im.src || '').match(/\.(avif|webp|jpe?g|png|svg|gif)(\?|$)/i) || [])[1] || '?';
    if (/png|jpe?g/i.test(fmt) && !im.inPicture && im.visible && realW > 300) issues.push(`legacy format ${fmt} without avif/webp alternative`);
    if (issues.length) { const key = r.path + r.width + im.src; imgRows.push({ path: r.path, width: r.width, src: im.currentSrc || im.src, fmt, realW, neededW: im.neededW, fileBytes: im.fileBytes, loading: im.loading, fetchpriority: im.fetchpriority, aboveFold: l.aboveFold, issues }); }
  }
}
// tap targets / overflow
const layout = raw.runs.filter((x) => x.run === 1).map((r) => ({ path: r.path, width: r.width, scrollWidth: r.analysis.scrollWidth, overflow: r.analysis.horizontalOverflow, overflowEls: r.analysis.overflowElements, targets: r.analysis.tapTargetsInScope, small24: r.analysis.small24Count, small24NonInline: r.analysis.small24NonInline, small24NonInlineNoSpacing: r.analysis.small24NonInlineNoSpacing, small48: r.analysis.small48Count, ex24: (r.analysis.small24 || []).filter((d) => !d.inline).slice(0, 6), ex48: (r.analysis.small48 || []).slice(0, 5), menu: r.menu && { present: r.menu.present, opens: r.menu.opens, closes: r.menu.closes, openOverflow: r.menu.open && r.menu.open.overflowing, openScrollW: r.menu.open && r.menu.open.docScrollW, catOverflow: r.menu.categoryOpen && r.menu.categoryOpen.overflowing, catScrollW: r.menu.categoryOpen && r.menu.categoryOpen.docScrollW, catExpanded: r.menu.categoryOpen && r.menu.categoryOpen.triggerExpanded, menuRect: r.menu.open && r.menu.open.menuRect, error: r.menu.error } }));
const thirdParty = {}; for (const r of raw.runs.filter((x) => x.run === 1)) for (const [h, v] of Object.entries(r.thirdParty)) { thirdParty[h] = thirdParty[h] || { pages: new Set(), failed: 0, n: 0 }; thirdParty[h].pages.add(r.path); thirdParty[h].n += v.n; thirdParty[h].failed += v.blocked; }
for (const h in thirdParty) thirdParty[h].pages = [...thirdParty[h].pages];
const fonts = [...new Set(raw.runs.flatMap((r) => r.fonts || []))];
const cov = raw.coverage || {};
const covSum = {}; for (let [p, list] of Object.entries(cov)) if (Array.isArray(list)) { const site = list.filter((c) => c.url && c.url.includes('funeralfunds.com')); list = site; covSum[p] = { scripts: list.length, totalChars: list.reduce((n, c) => n + c.total, 0), usedChars: list.reduce((n, c) => n + c.used, 0), byScript: list.filter((c) => c.total > 500).map((c) => ({ url: (c.url || '(inline)').replace('https://funeralfunds.com', ''), total: c.total, used: c.used })) }; }
const out = { generated: new Date().toISOString(), method: raw.method || null, started: raw.started, finished: raw.finished, summary, images: imgRows, layout, thirdParty, fonts, jsCoverage: covSum, lighthouse: lh, psi: fs.existsSync(D + '/psi.json') ? JSON.parse(fs.readFileSync(D + '/psi.json', 'utf8')) : null, raw: raw.runs };
fs.writeFileSync(D + '/results.json', JSON.stringify(out, null, 1));
fs.writeFileSync(D + '/tools/tables.md', md);
fs.writeFileSync(D + '/tools/images.json', JSON.stringify(imgRows, null, 1));
fs.writeFileSync(D + '/tools/layout.json', JSON.stringify(layout, null, 1));
console.log(md.length, imgRows.length, JSON.stringify(thirdParty), fonts, JSON.stringify(covSum, null, 0).slice(0, 3000));
