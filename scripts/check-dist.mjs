// Post-build check of dist/: internal links and image references.
//
//   npm run build && npm run verify            report only
//   npm run verify -- --strict                 exit 1 if anything is broken
//
// Links: every internal <a href> must resolve to a built page or file, not
// through a vercel.json redirect and not to a missing (404) URL.
// Images: visible <img src>/<img srcset>/<source srcset>, Open Graph and
// Twitter image meta, and image/logo URLs inside JSON-LD must exist in dist/.
// Search: the pages Pagefind indexes (marked data-pagefind-body) must match
// the search policy (isSearchable in src/lib/pages.ts) — never a redirect,
// noindex, landing, archive or excluded page — and /search/ must stay a
// noindex results page that no redirect points to.
// Redirects: no source may also be a built page, and every internal
// destination must be a built page (no chains, no redirects to 404s).
// Content guards (decisions recorded in CLAUDE.md): no 888-656-4648 (except
// on its own landing page, /roku/), no
// retired Meta Pixel IDs, no third-party video embeds, no Funeral Funds
// social links, no FEXGuy email address, no "licensed in all 50 states",
// no published office hours or old PO Box address, no old consent wording;
// the GA4 and Meta Pixel IDs must still be present.
// Em dashes: none anywhere a visitor could see one - in the built site (pages,
// metadata, JSON-LD, sitemap, llms.txt, scripts) and in the content sources
// (src/content, data), including &mdash; / &#8212; / &#x2014; / \u2014.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const strict = process.argv.includes('--strict');
const redirects = new Map(
  JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).redirects.map((r) => [
    r.source,
    r.destination,
  ]),
);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Local path for an internal URL, or null for external/non-file URLs.
function localPath(raw) {
  let u = decode(raw.trim());
  if (!u || /^(mailto|tel|javascript|sms|data):/i.test(u)) return null;
  const abs = u.match(/^(?:https?:)?\/\/(?:www\.)?fexguy\.com(\/[^\s]*)?$/i);
  if (abs) u = abs[1] || '/';
  else if (/^(?:[a-z]+:)?\/\//i.test(u) || !u.startsWith('/')) return null;
  u = u.split('#')[0].split('?')[0];
  try {
    return decodeURI(u);
  } catch {
    return u;
  }
}

const exists = (p) => existsSync(join(DIST, p)) && statSync(join(DIST, p)).isFile();
const isPage = (p) => exists(p.endsWith('/') ? p + 'index.html' : p + '/index.html');

function linkStatus(p) {
  if (exists(p) || (p.endsWith('/') && isPage(p))) return 'ok';
  if (redirects.has(p)) return 'redirect';
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) {
    if (isPage(p) || redirects.has(p + '/')) return 'missing-slash';
  }
  return 'broken';
}

const pages = walk(DIST).filter((f) => f.endsWith('index.html'));
const links = { total: 0, redirect: [], 'missing-slash': [], broken: [] };
const img = { visible: [], og: [], twitter: [], jsonld: [] };
const okImages = { visible: 0, og: 0, twitter: 0, jsonld: 0 };

for (const file of pages) {
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

  for (const m of body.matchAll(/<a\b[^>]*?\bhref\s*=\s*"([^"]*)"/gi)) {
    const p = localPath(m[1]);
    if (!p) continue;
    links.total++;
    const s = linkStatus(p);
    if (s !== 'ok') links[s].push({ page, href: m[1] });
  }

  const check = (kind, url) => {
    const p = localPath(url);
    if (!p) return;
    if (exists(p)) okImages[kind]++;
    else img[kind].push({ page, path: p });
  };
  for (const m of body.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i);
    if (src && /^<img/i.test(tag)) check('visible', src[1]);
    const srcset = tag.match(/\bsrcset\s*=\s*"([^"]*)"/i);
    if (srcset) for (const c of srcset[1].split(',')) check('visible', c.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = m[0].match(/\b(?:property|name)\s*=\s*"([^"]*)"/i)?.[1] ?? '';
    const content = m[0].match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1];
    if (!content) continue;
    if (/^og:image(:url|:secure_url)?$/.test(key)) check('og', content);
    else if (/^twitter:image(:src)?$/.test(key)) check('twitter', content);
  }
  for (const [, json] of scripts.filter(([tag]) => /application\/ld\+json/i.test(tag))) {
    for (const m of json.matchAll(/"((?:https?:)?\/\/(?:www\.)?fexguy\.com\/[^"]+?\.(?:png|jpe?g|gif|webp|avif|svg))"/gi))
      check('jsonld', m[1]);
  }
}

// ---- Site search (Pagefind) ----------------------------------------------
const CONTENT = new URL('../src/content/pages/', import.meta.url).pathname;
const frontmatter = new Map(); // URL path -> frontmatter text
for (const f of walk(CONTENT).filter((f) => f.endsWith('.md') && !/(^|\/)_/.test(f.slice(CONTENT.length)))) {
  const slug = f.slice(CONTENT.length).replace(/\.md$/, '').replace(/(^|\/)index$/, '');
  frontmatter.set(slug ? `/${slug}/` : '/', readFileSync(f, 'utf8').split(/^---$/m)[1] ?? '');
}
const fm = (text, key) => text.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'))?.[1];
// Mirrors isSearchable(): returns [searchable, reason when not].
function searchPolicy(path) {
  const text = frontmatter.get(path);
  if (text === undefined) return [false, 'not a content page'];
  const flag = fm(text, 'search');
  if (flag === 'true') return [true];
  if (flag === 'false') return [false, 'search: false'];
  if (fm(text, 'draft') === 'true') return [false, 'draft'];
  if (fm(text, 'noindex') === 'true') return [false, 'noindex'];
  if (fm(text, 'sitemap') === 'false') return [false, 'sitemap: false'];
  if (fm(text, 'layout') === 'landing') return [false, 'landing'];
  if (path.startsWith('/category/')) return [false, '/category/ archive'];
  return [true];
}
const search = { problems: [], indexed: [], excluded: {} };
for (const file of pages) {
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const marked = /\sdata-pagefind-body[\s=>]/.test(html);
  const [ok, reason] = searchPolicy(page);
  if (marked) search.indexed.push(page);
  else search.excluded[reason ?? 'unmarked'] = (search.excluded[reason ?? 'unmarked'] ?? 0) + 1;
  if (marked && !ok) search.problems.push(`${page} is in the search index but policy says no (${reason})`);
  if (!marked && ok) search.problems.push(`${page} is searchable by policy but not marked for the index`);
  if (marked && (redirects.has(page) || page === '/search/'))
    search.problems.push(`${page} must never be in the search index`);
}
const entryFile = join(DIST, 'pagefind/pagefind-entry.json');
if (!existsSync(entryFile)) search.problems.push('dist/pagefind/ is missing (run npm run build)');
else {
  const count = Object.values(JSON.parse(readFileSync(entryFile, 'utf8')).languages).reduce((n, l) => n + l.page_count, 0);
  if (count !== search.indexed.length)
    search.problems.push(`Pagefind indexed ${count} pages but ${search.indexed.length} are marked`);
}
const searchHtml = existsSync(join(DIST, 'search/index.html')) ? readFileSync(join(DIST, 'search/index.html'), 'utf8') : '';
if (!searchHtml) search.problems.push('/search/ page is missing');
else if (!/<meta name="robots" content="[^"]*noindex/.test(searchHtml)) search.problems.push('/search/ is not noindex');
for (const f of walk(DIST).filter((f) => /sitemap.*\.xml$|llms\.txt$/.test(f)))
  if (/fexguy\.com\/search\//.test(readFileSync(f, 'utf8'))) search.problems.push(`/search/ is listed in ${f.slice(DIST.length)}`);
for (const [source, dest] of redirects)
  if (/^(https?:\/\/[^/]+)?\/search(\/|\?|$)/.test(dest)) search.problems.push(`redirect ${source} -> ${dest} (no catch-all to /search/)`);

// ---- Redirects ---------------------------------------------------------------
const redirectProblems = [];
for (const [source, dest] of redirects) {
  if (source.endsWith('/') && isPage(source)) redirectProblems.push(`${source} is redirected but also built as a page`);
  if (/^https?:/i.test(dest)) continue;
  const d = dest.split('#')[0].split('?')[0];
  if (redirects.has(d)) redirectProblems.push(`chain: ${source} -> ${dest} -> ${redirects.get(d)}`);
  else if (!(exists(d) || (d.endsWith('/') && isPage(d)))) redirectProblems.push(`${source} -> ${dest} (destination is not a built page)`);
}

// ---- Content guards --------------------------------------------------------------
const GUARDS = [
  ['TV/streaming ad number 888-656-4648', /888[\s.\-)]*656[\s.\-]*4648|8886564648/],
  ['retired Meta Pixel ID', /1757709920950272|422716154769594/],
  ['third-party video embed', /youtube(?:-nocookie)?\.com\/embed|player\.vimeo\.com|adilo\.|bigcommand\.com/i],
  ['Funeral Funds social link', /facebook\.com\/funeralfunds|youtube\.com\/(?:c\/|@)funeralfunds|linkedin\.com\/company\/funeral-funds/i],
  ['FEXGuy email address', /[a-z0-9._%+-]+@(?:www\.)?fexguy\.com|mailto:[^"]*fexguy/i],
  // Randy's/Final Expense Guy's own licensing only (carriers' "licensed in all
  // 50 states" in reviews is about the insurance company and stays).
  ['"licensed in all 50 states" (Randy)', /(?:He’s|He is|I’m|I am|Randy is|Final Expense Guy is|agency|agent|broker)[^.<]{0,40}licensed (?:to (?:sell|operate)[^.<]{0,40})?in (?:all |every )?(?:50 )?states?\b(?! *where)|licensed nationwide|broker operating nationwide|50-state licensed|<br>Licensed in all 50 States|LICENSED<\/strong><br>All 50 States|coverage is available in all 50 states/i],
  ['published office hours', /office hours|9:00 ?am ?(?:to|-) ?5:00 ?pm|\bCTL\b/i],
  ['old PO Box mailing address', /P\.? ?O\.? Box 270179/i],
  ['old consent wording', /By submitting this form, you agree|possibly using automated systems|SMS rates may apply/i],
];
const guardHits = {};
let ga4Found = false;
let metaFound = false;
for (const file of walk(DIST).filter((f) => /\.(html|js|xml|txt)$/.test(f) && !f.includes('/pagefind/'))) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('G-JMYZE458HQ')) ga4Found = true;
  if (text.includes('2351342698972751')) metaFound = true;
  for (const [label, re] of GUARDS) {
    // The CTV ad number is allowed only on its own landing page, /roku/.
    if (label.startsWith('TV/streaming') && file.slice(DIST.length) === 'roku/index.html') continue;
    if (re.test(text)) (guardHits[label] ??= []).push('/' + file.slice(DIST.length));
  }
}
// Retired pages that must stay real 404s (not built, not redirected).
const MUST_404 = ['/gtl/'];
for (const p of MUST_404) {
  if (isPage(p)) (guardHits['retired page is built (must be a real 404)'] ??= []).push(p);
  if (redirects.has(p)) (guardHits['retired page is redirected (must be a real 404)'] ??= []).push(p);
}
// ---- Em dashes -----------------------------------------------------------------
// FEXGUY.com style rule (CLAUDE.md): no em dash (U+2014) in visitor-facing
// content, in any form. Code comments are not visitor-facing and are not
// scanned (the built output covers everything that reaches a visitor).
const EM_DASH = /\u2014|&mdash;|&#0*8212;|&#x0*2014;|\\u2014/gi;
const EM_DASH_MESSAGE =
  'Em dashes are not allowed on FEXGUY.com. Use a regular hyphen or rewrite the punctuation.';
const emDashHits = [];
const emSnippet = (text, i) => text.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ');
const scanEmDashes = (text, where) => {
  for (const m of text.matchAll(EM_DASH)) {
    const line = text.slice(0, m.index).split('\n').length;
    emDashHits.push(`${where}:${line}  "${emSnippet(text, m.index)}"`);
  }
};
for (const file of walk(DIST).filter((f) => /\.(html|js|xml|txt|json|webmanifest)$/.test(f) && !f.includes('/pagefind/')))
  scanEmDashes(readFileSync(file, 'utf8'), 'dist/' + file.slice(DIST.length));
const ROOT = new URL('../', import.meta.url).pathname;
for (const dir of ['src/content', 'data'])
  for (const file of walk(join(ROOT, dir)).filter((f) => /\.(md|mdx|json|csv|ya?ml|txt)$/.test(f)))
    scanEmDashes(readFileSync(file, 'utf8'), file.slice(ROOT.length));

const guardProblems = Object.entries(guardHits).map(([label, files]) => `${label}: ${files.slice(0, 5).join(' ')}${files.length > 5 ? ` (+${files.length - 5} more)` : ''}`);
if (!ga4Found) guardProblems.push('GA4 measurement ID G-JMYZE458HQ not found in the build');
if (!metaFound) guardProblems.push('Meta Pixel ID 2351342698972751 not found in the build');
if (emDashHits.length) guardProblems.push(`em dash (${emDashHits.length}): ${EM_DASH_MESSAGE}`);
// Not a failure before launch: the legal pages' effective dates are set to the
// actual publication date at launch (CLAUDE.md "Prelaunch checklist").
const effectiveDatePending = ['privacy-policy', 'terms-of-use'].filter((p) =>
  existsSync(join(DIST, p, 'index.html')) && readFileSync(join(DIST, p, 'index.html'), 'utf8').includes('To be set at launch'),
);

// Article summary structure: at most one Quick Answer and one key-points box,
// in that order, above "In This Article", and neither label repeated as
// ordinary text in the article body. Pages outside the article template that
// still show the key-points label as body text are listed, not failed.
const SUMMARY_LABELS = /Key Points|Here[’']s What This Means for You|Here[’']s the Bottom Line|Quick Answer/;
const structureProblems = [];
const strandedSummaries = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  const bodies = [...html.matchAll(/<div class="prose wp-content art-body[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
  if (!bodies.length) {
    const prose = html.match(/data-pagefind-body[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
    if (/<strong>Here[’']s What This Means for You/.test(prose)) strandedSummaries.push(page);
    continue;
  }
  const answers = [...html.matchAll(/<section class="summary__answer/g)].map((m) => m.index);
  const points = [...html.matchAll(/<section class="summary__points/g)].map((m) => m.index);
  const toc = html.indexOf('In This Article');
  if (answers.length > 1) structureProblems.push(`${page} has ${answers.length} Quick Answer boxes`);
  if (points.length > 1) structureProblems.push(`${page} has ${points.length} key-points boxes`);
  if (answers.length && points.length && answers[0] > points[0]) structureProblems.push(`${page} shows its key points before its Quick Answer`);
  if (answers.length && toc >= 0 && answers[0] > toc) structureProblems.push(`${page} shows its Quick Answer below "In This Article"`);
  if (bodies.some((b) => SUMMARY_LABELS.test(b.replace(/<[^>]+>/g, ''))))
    structureProblems.push(`${page} repeats a summary label ("Quick Answer" / key points) in the article body`);
}

// Tables of contents (Randy, October 2026): every article table of contents
// uses bullets, never numbers. A list counts as a table of contents when it
// has at least 3 entries and nearly all of them are a single in-page link
// (#anchor); ordinary numbered lists in article text are not affected. Fails
// on: the shared component rendering an <ol>, any other <ol> of in-page links,
// and a run of in-page links typed with numbers ("1. ", "2: ") in front.
const tocProblems = [];
const ANCHOR_ONLY = /^\s*(?:<(?:strong|b|em|span)\b[^>]*>\s*)*<a\b[^>]*href="#[^"]+"[^>]*>[\s\S]*?<\/a>\s*(?:<\/(?:strong|b|em|span)>\s*)*$/;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  if (/<ol\b[^>]*class="[^"]*toc__list/.test(html)) tocProblems.push(`${page}: the "In This Article" list is numbered (<ol>)`);
  for (const m of html.matchAll(/<ol\b(?![^>]*toc__list)[^>]*>([\s\S]*?)<\/ol>/g)) {
    const items = [...m[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((x) => x[1]);
    if (items.length >= 3 && items.filter((i) => ANCHOR_ONLY.test(i)).length / items.length >= 0.8)
      tocProblems.push(`${page}: a table of contents uses a numbered list (<ol>)`);
  }
  const typed = [...html.matchAll(/(?:^|>|<br\s*\/?>)\s*(?:<strong>\s*)?\d{1,2}[.:]\s*(?:<\/strong>\s*)?<a\b[^>]*href="#/g)].length;
  if (typed >= 3) tocProblems.push(`${page}: ${typed} in-page links are preceded by typed numbers (numbered table of contents)`);
  // Entries are Title Case, never ALL CAPS (Randy, October 2026). Covers the
  // shared "In This Article" list and every manual table of contents (a list
  // or table whose entries are in-page links). Acronyms are tolerated: an
  // entry counts as ALL CAPS only when at least 3 of its words (3+ letters)
  // are capitals and they are more than half of its words.
  const lists = [
    ...html.matchAll(/<ul\b[^>]*class="[^"]*toc__list[^"]*"[^>]*>([\s\S]*?)<\/ul>/g),
    ...[...html.matchAll(/<(ul|ol)\b(?![^>]*toc__list)[^>]*>([\s\S]*?)<\/\1>/g)]
      .filter((m) => {
        const items = [...m[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((x) => x[1]);
        return items.length >= 3 && items.filter((i) => ANCHOR_ONLY.test(i)).length / items.length >= 0.8;
      })
      .map((m) => [m[0], m[2]]),
    ...[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].filter((m) => (m[1].match(/<a\b[^>]*href="#/g) ?? []).length >= 3),
  ];
  const seen = new Set();
  for (const m of lists) {
    for (const a of m[1].matchAll(/<a\b[^>]*href="#[^"]+"[^>]*>([\s\S]*?)<\/a>/g)) {
      const text = a[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').trim();
      if (seen.has(text)) continue;
      seen.add(text);
      const words = (text.match(/[\p{L}’'.-]{3,}/gu) ?? []).filter((x) => /\p{L}{3,}/u.test(x));
      const caps = words.filter((x) => x === x.toUpperCase());
      if (caps.length >= 3 && caps.length > words.length / 2) tocProblems.push(`${page}: table of contents entry in ALL CAPS: "${text}"`);
    }
  }
}

// Article standard (Randy, October 2026). Every built page is classified:
// an editorial article carries data-article-layout (the article template, or
// ContentLayout for the pages in src/config/content-articles.ts); every other
// page carries data-page-type with a reason. An editorial article must open
// with, in this order: one H1, the shared byline (once), the Quick Answer (or
// an A–Z hub's guide summary), Key Points, a bulleted table of contents when
// it has 3 or more sections, then the body. A missing element is allowed only
// when the page declares it in data-article-exceptions (from a documented
// hold); a declared exception whose element is present fails too. No second
// logo or loose "Written by" / "last updated" lines between the H1 and the
// first section, and every table-of-contents link must reach a section.
const PART = (name) => new RegExp(`data-article-part="${name}"`, 'g');
const articleProblems = [];
const articleStats = { template: 0, content: 0, exceptions: [], other: {} };
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  const layout = html.match(/data-article-layout="(template|content)"/)?.[1];
  if (!layout) {
    const type = html.match(/data-page-type="([a-z]+)"/)?.[1];
    const reason = html.match(/data-page-reason="([^"]*)"/)?.[1];
    if (!type || !reason) articleProblems.push(`${page}: page is not classified (no data-article-layout, or data-page-type without a reason)`);
    else articleStats.other[type] = (articleStats.other[type] ?? 0) + 1;
    continue;
  }
  articleStats[layout]++;
  const fail = (msg) => articleProblems.push(`${page}: ${msg}`);
  const exc = new Set((html.match(/data-article-exceptions="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean));
  for (const e of exc) articleStats.exceptions.push(`${page} ${e}`);
  const at = (re) => { const m = new RegExp(re.source).exec(html); return m ? m.index : -1; };
  const count = (re) => (html.match(re) ?? []).length;

  const h1 = at(/<h1\b/);
  if (count(/<h1\b/g) !== 1) fail(`has ${count(/<h1\b/g)} H1s (exactly one required)`);
  const h1Text = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, '');
  if ((h1Text.match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !['COPD', 'AARP', 'CICA', 'FEGLI', 'SGLI', 'VGLI', 'NAIC', 'HIPAA', 'USAA'].includes(w)).length >= 2)
    fail('H1 is stored in capitals (Title Case required)');

  const byline = at(PART('byline'));
  if (count(PART('byline')) !== 1) fail(`has ${count(PART('byline'))} author bylines (exactly one required)`);
  else if (byline < h1) fail('author byline comes before the H1');

  const qa = Math.max(at(PART('quick-answer')), at(PART('guide-summary')));
  const nQa = count(PART('quick-answer')) + count(PART('guide-summary'));
  if (nQa > 1) fail('has more than one Quick Answer');
  if (!nQa && !exc.has('quick-answer')) fail('Quick Answer is missing');
  if (nQa && exc.has('quick-answer')) fail('declares no Quick Answer but shows one (remove the hold)');
  const kp = at(PART('key-points'));
  const nKp = count(PART('key-points'));
  if (nKp > 1) fail('has more than one Key Points box');
  if (!nKp && !exc.has('key-points')) fail('Key Points are missing');
  if (nKp && exc.has('key-points')) fail('declares no Key Points but shows them (remove the hold)');

  // Sections: the body's H2s (template: inside data-article-part="body";
  // content pages: the H2s after the H1, without the summary labels).
  let bodyHtml;
  if (layout === 'template') bodyHtml = [...html.matchAll(/data-article-part="body"[^>]*>([\s\S]*?)<\/div>\s*(?=<div|<\/article)/g)].map((m) => m[1]).join('');
  else bodyHtml = html.slice(h1, html.indexOf('<aside class="page__aside"') > h1 ? html.indexOf('<aside class="page__aside"') : html.indexOf('</main>'));
  const sections = [...bodyHtml.matchAll(/<h2\b(?![^>]*summary__label)[^>]*>/g)].length;
  const firstSection = (() => {
    const re = /<h2\b(?![^>]*summary__label)[^>]*>/g;
    re.lastIndex = h1;
    let m;
    while ((m = re.exec(html))) if (m.index > h1 && !/class="[^"]*(author|related)/.test(m[0])) return m.index;
    return html.length;
  })();

  const nToc = count(PART('toc'));
  const toc = at(PART('toc'));
  const component = count(/<nav class="toc" data-article-part="toc"/g);
  if (component > 1 || (component && nToc > component)) fail('has more than one table of contents');
  if (sections >= 3 && !nToc && !exc.has('toc')) fail(`has ${sections} sections but no table of contents`);
  if (nToc && exc.has('toc')) fail('declares no table of contents but shows one (remove the exception)');

  // Order: H1, byline, Quick Answer, Key Points, table of contents, sections.
  const order = [['H1', h1], ['byline', byline], ['Quick Answer', nQa ? qa : -1], ['Key Points', kp], ['table of contents', toc], ['first section', exc.has('toc-position') ? -1 : firstSection]].filter(([, i]) => i >= 0);
  if (exc.has('toc-position') && !nToc) fail('declares a table-of-contents position exception but has no table of contents');
  for (let i = 1; i < order.length; i++)
    if (order[i][1] < order[i - 1][1]) fail(`${order[i][0]} appears before ${order[i - 1][0]}`);

  // Nothing old between the H1 and the first section: no second logo, no
  // loose author or date lines (the byline is the only "Written by").
  const opening = html.slice(h1, firstSection);
  if (/final-expense-guy-logo/.test(opening)) fail('shows a Final Expense Guy logo under the H1');
  if ((opening.match(/Written by/g) ?? []).length > 1 || /last updated on/i.test(opening)) fail('has loose author or date lines under the H1');

  // Table-of-contents links reach a section of the page.
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"')));
  for (const m of html.matchAll(/data-article-part="toc"[\s\S]*?<\/(?:nav|table|ul)>/g))
    for (const [, href] of m[0].matchAll(/href="#([^"]+)"/g)) {
      const id = href.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      if (!ids.has(id) && !ids.has(decodeURIComponent(id))) fail(`table-of-contents link #${href} has no matching section`);
    }
}

const uniq = (list) => [...new Set(list.map((x) => x.path))];
const visiblePages = new Set(img.visible.map((x) => x.page));
const metaRefs = img.og.length + img.twitter.length + img.jsonld.length;
const allMissing = uniq([...img.visible, ...img.og, ...img.twitter, ...img.jsonld]).sort();

console.log(`Pages: ${pages.length}`);
console.log(
  `Internal links: ${links.total} | through redirects: ${links.redirect.length} | ` +
    `missing slash: ${links['missing-slash'].length} | broken: ${links.broken.length}`,
);
for (const k of ['redirect', 'missing-slash', 'broken'])
  for (const x of links[k]) console.log(`  [link ${k}] ${x.page} -> ${x.href}`);
console.log(
  `Visible images: ${okImages.visible + img.visible.length} refs, ${img.visible.length} missing ` +
    `on ${visiblePages.size} pages`,
);
console.log(
  `Metadata images: missing og ${img.og.length}, twitter ${img.twitter.length}, ` +
    `JSON-LD ${img.jsonld.length} (total ${metaRefs})`,
);
console.log(`Missing image files: ${allMissing.length}`);
for (const p of allMissing) {
  const kinds = Object.entries(img)
    .map(([k, v]) => [k, v.filter((x) => x.path === p)])
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k} ${v.length}`)
    .join(', ');
  const on = new Set(Object.values(img).flat().filter((x) => x.path === p).map((x) => x.page));
  const shown = [...on].slice(0, 3).join(' ') + (on.size > 3 ? ` (+${on.size - 3} more)` : '');
  console.log(`  ${p}  [${kinds}]  ${shown}`);
}

console.log(
  `Search index: ${search.indexed.length} pages | not indexed: ` +
    Object.entries(search.excluded)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(', '),
);
for (const p of search.problems) console.log(`  [search] ${p}`);
// Quick Answer repeats (Randy, October 2026): the article's opening text
// (the body before its first substantive heading) must not restate the green
// Quick Answer. A Quick Answer sentence (6+ words) counts as repeated when at
// least 60% of its four-word sequences appear in that opening. Two or more
// repeated sentences, or 35% of the whole Quick Answer, is an error; a single
// repeated sentence is a warning for editorial review. Sections after the
// first heading are never compared, so detailed explanations are not flagged.
// Intentional repeats (e.g. an application-status notice) are listed with a
// reason in src/config/quick-answer-repeats.json; a listed sentence that is
// no longer repeated is reported as stale.
const QA_REPEAT_EXCEPTIONS = JSON.parse(readFileSync(new URL('../src/config/quick-answer-repeats.json', import.meta.url)));
const qaRepeatProblems = [];
const qaRepeatWarnings = [];
let qaRepeatChecked = 0;
const plainText = (h) =>
  h
    .replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&#8217;/g, '’')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const wordsOf = (t) => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9$%' ]+/g, ' ').split(' ').filter(Boolean);
const grams4 = (w) => new Set(w.slice(0, Math.max(0, w.length - 3)).map((_, i) => w.slice(i, i + 4).join(' ')));
function quickAnswerRepeats(qa, opening) {
  const open = grams4(wordsOf(opening));
  const sentences = qa.split(/(?<=[.!?;])\s+/).filter((x) => x.split(' ').length >= 6);
  const repeated = sentences.filter((x) => {
    const g = [...grams4(wordsOf(x))];
    return g.length && g.filter((y) => open.has(y)).length / g.length >= 0.6;
  });
  const all = [...grams4(wordsOf(qa))];
  const share = all.length ? all.filter((y) => open.has(y)).length / all.length : 0;
  return { repeated, share };
}
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const qaMatch = html.match(/data-article-part="quick-answer"[^>]*>([\s\S]*?)<\/section>/);
  if (!qaMatch) continue;
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  const qa = plainText(qaMatch[1].replace(/<h2\b[\s\S]*?<\/h2>/, ''));
  // The opening: the body (template) or what follows Key Points (content
  // layout), without any table of contents, up to the first heading with text.
  let rest;
  const bodyAt = html.search(/data-article-part="body"/);
  if (bodyAt >= 0) rest = html.slice(html.indexOf('>', bodyAt) + 1);
  else {
    const kp = html.search(/data-article-part="key-points"/);
    rest = html.slice(html.indexOf('</section>', kp >= 0 ? kp : qaMatch.index) + 10);
  }
  rest = rest
    .replace(/<nav\b[^>]*data-article-part="toc"[\s\S]*?<\/nav>/g, ' ')
    .replace(/<(table|ul)\b[^>]*data-article-part="toc"[\s\S]*?<\/\1>/g, ' ');
  let end = rest.length;
  for (const h of rest.matchAll(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/g)) {
    if (plainText(h[1])) { end = h.index; break; }
  }
  const opening = plainText(rest.slice(0, end));
  qaRepeatChecked++;
  const allowed = QA_REPEAT_EXCEPTIONS[page] ?? [];
  let { repeated, share } = quickAnswerRepeats(qa, opening);
  for (const ex of allowed) {
    const hit = repeated.find((x) => x.startsWith(ex.sentence));
    if (hit) repeated = repeated.filter((x) => x !== hit);
    else qaRepeatWarnings.push(`${page}: stale exception in src/config/quick-answer-repeats.json, "${ex.sentence}" is no longer repeated`);
  }
  if (allowed.length) share = quickAnswerRepeats(qa.split(/(?<=[.!?;])\s+/).filter((x) => !allowed.some((ex) => x.startsWith(ex.sentence))).join(' '), opening).share;
  const quote = (x) => `"${x.length > 90 ? x.slice(0, 87) + '...' : x}"`;
  if (repeated.length >= 2 || share >= 0.35)
    qaRepeatProblems.push(`${page}: the opening text repeats the Quick Answer (${repeated.length} sentence(s), ${Math.round(share * 100)}% of its wording): ${repeated.map(quote).join(' ')}`);
  else if (repeated.length === 1) qaRepeatWarnings.push(`${page}: the opening text repeats one Quick Answer sentence: ${quote(repeated[0])}`);
}

// Article openings (Randy, October 2026): on an article with the green Quick
// Answer, the table of contents (or Key Points, when there is none) is
// followed directly by the first substantive heading. Any article text in
// between, a second introduction, is a problem. Scripts, rules, empty
// paragraphs, images without text and the quote-form slot are template or
// layout elements and don't count. src/config/article-openings.json lists
// documented exceptions (an intentional notice, with its reason) and the
// pages already found with an opening paragraph that wait for Randy's
// decision (reported as warnings); a listed page that no longer has one is
// reported so the list stays current.
const ARTICLE_OPENINGS = JSON.parse(readFileSync(new URL('../src/config/article-openings.json', import.meta.url)));
const openingProblems = [];
const openingWarnings = [];
let openingChecked = 0;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  if (!/data-article-layout="(template|content)"/.test(html) || !/data-article-part="quick-answer"/.test(html)) continue;
  const page = '/' + file.slice(DIST.length).replace(/index\.html$/, '');
  openingChecked++;
  // Where the article's own text starts: the template's body (article text
  // is only ever inside data-article-part="body"; the CTA, header image and
  // table of contents are outside it), or, on content-layout articles, after
  // the table of contents, else after Key Points.
  let from = -1;
  const body = html.search(/data-article-part="body"/);
  const toc = /<(nav|table|ul)\b[^>]*data-article-part="toc"/.exec(html);
  if (/data-article-layout="template"/.test(html) && body >= 0) from = html.indexOf('>', body) + 1;
  else if (toc) from = html.indexOf(`</${toc[1]}>`, toc.index) + toc[1].length + 3;
  else {
    const kp = html.search(/data-article-part="key-points"/);
    if (kp >= 0) from = html.indexOf('</section>', kp) + 10;
  }
  if (from < 0) continue;
  let rest = html.slice(from);
  const heading = /<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/g;
  let end = rest.length;
  for (let m; (m = heading.exec(rest)); ) if (plainText(m[1])) { end = m.index; break; }
  const between = plainText(
    rest
      .slice(0, end)
      .replace(/<div\b[^>]*data-quote-form[^>]*>[\s\S]*?<\/div>/g, ' ')
      .replace(/<figure\b[\s\S]*?<\/figure>/g, (f) => (plainText(f) ? f : ' ')),
  );
  const exception = ARTICLE_OPENINGS.exceptions[page];
  const pending = ARTICLE_OPENINGS.pendingReview[page];
  if (!between) {
    if (exception || pending) openingWarnings.push(`${page}: listed in src/config/article-openings.json but no longer has an opening paragraph; remove it from the list`);
    continue;
  }
  const quote = `"${between.length > 90 ? between.slice(0, 87) + '...' : between}"`;
  if (exception) continue;
  if (pending) openingWarnings.push(`${page}: opening paragraph before the first heading (pending review): ${quote}`);
  else openingProblems.push(`${page}: article text between the table of contents and the first heading (a second introduction): ${quote}`);
}

console.log(`Redirects: ${redirects.size} | problems: ${redirectProblems.length}`);
for (const p of redirectProblems) console.log(`  [redirect] ${p}`);
console.log(`Content guards: ${GUARDS.length} checks + GA4/Meta IDs | problems: ${guardProblems.length}`);
for (const p of guardProblems) console.log(`  [guard] ${p}`);
console.log(`Em dashes (built site + content sources): ${emDashHits.length}`);
for (const h of emDashHits.slice(0, 25)) console.log(`  [em dash] ${h}`);
if (emDashHits.length > 25) console.log(`  [em dash] ... +${emDashHits.length - 25} more`);
if (emDashHits.length) console.log(`  ${EM_DASH_MESSAGE}`);
console.log(`Article summary structure: problems: ${structureProblems.length}`);
for (const p of structureProblems) console.log(`  [summary] ${p}`);
console.log(`Tables of contents (bullets, Title Case): problems: ${tocProblems.length}`);
console.log(`Article openings (no second introduction): ${openingChecked} articles checked | problems: ${openingProblems.length} | warnings: ${openingWarnings.length}`);
console.log(`Quick Answer repeats: ${qaRepeatChecked} articles checked | problems: ${qaRepeatProblems.length} | warnings: ${qaRepeatWarnings.length}`);
console.log(
  `Article standard: ${articleStats.template + articleStats.content} editorial articles (template ${articleStats.template}, content layout ${articleStats.content}), ` +
    `${Object.values(articleStats.other).reduce((a, b) => a + b, 0)} other pages (${Object.entries(articleStats.other).map(([k, v]) => `${k} ${v}`).join(', ')}), ` +
    `${articleStats.exceptions.length} documented exceptions | problems: ${articleProblems.length}`,
);
for (const p of articleProblems) console.log(`  [article] ${p}`);
for (const p of tocProblems) console.log(`  [toc] ${p}`);
for (const p of openingProblems) console.log(`  [opening] ${p}`);
for (const p of openingWarnings) console.log(`  [warning] ${p}`);
for (const p of qaRepeatProblems) console.log(`  [quick-answer] ${p}`);
for (const p of qaRepeatWarnings) console.log(`  [warning] ${p}`);
if (strandedSummaries.length)
  console.log(`  [note] key-points label shown as body text outside the article template: ${strandedSummaries.join(' ')}`);
if (effectiveDatePending.length)
  console.log(`  [prelaunch] effective date still "To be set at launch" on: ${effectiveDatePending.map((p) => `/${p}/`).join(' ')}`);

const problems =
  links.redirect.length +
  links['missing-slash'].length +
  links.broken.length +
  allMissing.length +
  search.problems.length +
  redirectProblems.length +
  guardProblems.length +
  structureProblems.length +
  tocProblems.length +
  qaRepeatProblems.length +
  openingProblems.length +
  articleProblems.length;
if (strict && problems) process.exit(1);
