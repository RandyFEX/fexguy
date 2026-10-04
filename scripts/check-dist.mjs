// Post-build check of dist/: internal links and image references.
//
//   npm run build && npm run verify            report only
//   npm run verify -- --strict                 exit 1 if anything is broken
//
// Links: every internal <a href> must resolve to a built page or file, not
// through a vercel.json redirect and not to a missing (404) URL.
// Images: visible <img src>/<img srcset>/<source srcset>, Open Graph and
// Twitter image meta, and image/logo URLs inside JSON-LD must exist in dist/.
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

const problems =
  links.redirect.length + links['missing-slash'].length + links.broken.length + allMissing.length;
if (strict && problems) process.exit(1);
