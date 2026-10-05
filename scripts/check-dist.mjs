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

const problems =
  links.redirect.length +
  links['missing-slash'].length +
  links.broken.length +
  allMissing.length +
  search.problems.length;
if (strict && problems) process.exit(1);
