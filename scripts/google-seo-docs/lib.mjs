// Pure helpers for the live Google SEO documentation system: source policy,
// robots.txt rules, link discovery, main-content extraction, verification and
// guidance classification. No network access here (see ../google-seo-docs.mjs),
// so every rule can be unit-tested offline (tests/seo-docs/).

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------- policy

/**
 * Normalizes a URL for the crawl queue and decides whether it is an approved
 * official Google source inside the configured scope.
 * @returns {{ ok: true, url: string, host: string, path: string } | { ok: false, reason: string }}
 */
export function checkSource(raw, config, base) {
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: `not https (${u.protocol})` };
  if (u.username || u.password || (u.port && u.port !== '443')) return { ok: false, reason: 'credentials or port in URL' };
  const host = u.hostname.toLowerCase();
  const rules = config.hosts[host];
  if (!rules) return { ok: false, reason: `host not approved (${host})` };
  let path = u.pathname.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/') && !rules.keepTrailingSlash) path = path.slice(0, -1);
  if (!rules.include.some((p) => new RegExp(p).test(path) || new RegExp(p).test(path + '/'))) {
    return { ok: false, reason: `path out of scope (${host}${path})` };
  }
  if ((rules.exclude ?? []).some((p) => new RegExp(p).test(path))) return { ok: false, reason: `path excluded (${host}${path})` };
  const query = rules.query ? '?' + new URLSearchParams(rules.query).toString() : '';
  return { ok: true, url: `https://${host}${path}${query}`, host, path };
}

export const isHub = (src, config) => (config.hosts[src.host]?.hubs ?? []).some((p) => new RegExp(p).test(src.path));

// ---------------------------------------------------------------- robots.txt

/** Parses robots.txt into the rule list that applies to `agent` (or *). */
export function parseRobots(text, agent = '*') {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ allow: key === 'allow', path: value });
    }
  }
  const token = agent.toLowerCase().split('/')[0];
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return chosen.flatMap((g) => g.rules).filter((r) => r.path !== '' || r.allow);
}

const robotsPattern = (p) =>
  // `*` matches anything; a trailing `$` anchors the end (RFC 9309).
  new RegExp('^' + p.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$(?!$)/g, '\\$'));

/** Longest matching rule wins; Allow wins a tie (RFC 9309). */
export function robotsAllows(rules, pathAndQuery) {
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    if (robotsPattern(r.path).test(pathAndQuery)) {
      if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
    }
  }
  return !best || best.allow;
}

// ---------------------------------------------------------------- HTML

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', copy: '\u00a9', reg: '\u00ae', trade: '\u2122' };
export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export function htmlToText(html) {
  // Source line breaks are not text breaks (except inside <pre>): collapse
  // whitespace first, then add breaks only at block boundaries.
  return decodeEntities(
    String(html)
      .replace(/<pre\b[\s\S]*?<\/pre>/gi, (m) => m.replace(/\n/g, '\u0001'))
      .replace(/\s+/g, ' ')
      .replace(/\u0001/g, '\n')
      .replace(/<(br|hr)\b[^>]*>/gi, '\n')
      .replace(/<\/(p|div|li|tr|pre|h[1-6]|table|ul|ol|dl|dt|dd|blockquote|section|aside|figure|figcaption)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<(td|th)\b[^>]*>/gi, ' | ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const stripBlocks = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|template|button|iframe|devsite-feedback|devsite-thumb-rating|devsite-toc|devsite-bookmark|devsite-actions|devsite-hats-survey)\b[\s\S]*?<\/\1>/gi, '');

/** Every href in the page (navigation, article and related links) for discovery. */
export function extractLinks(html) {
  const out = new Set();
  for (const m of String(html).matchAll(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const href = decodeEntities(m[2] ?? m[3] ?? '').trim();
    if (href && !href.startsWith('#') && !/^(mailto|javascript|tel):/i.test(href)) out.add(href);
  }
  return [...out];
}

const pageTitleFrom = (html) => {
  const h1 = String(html).match(/<h1\b[^>]*class="[^"]*devsite-page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  // The title slot also holds Google's hidden "save to collection" widget.
  if (h1) return htmlToText(stripBlocks(h1[1].split(/<devsite-actions\b/i)[0]));
  const t = String(html).match(/<title>([\s\S]*?)<\/title>/i);
  return t ? decodeEntities(t[1]).split(/\s+[|\u2013-]\s+/)[0].trim() : '';
};

/**
 * Extracts the main article (no navigation, header, footer or widgets) and
 * splits it into sections by heading.
 * @returns {{ title: string, lastUpdated: string|null, sections: { heading: string, level: number, text: string }[], words: number } | null}
 */
export function extractArticle(html, host) {
  const s = String(html);
  let start = -1;
  let end = -1;
  if (host === 'support.google.com') {
    start = s.search(/<div\b[^>]*class="[^"]*\bcc\b[^"]*"/i);
    if (start >= 0) {
      const rel = s.slice(start).search(/<\/article>|class="[^"]*article-feedback|<footer\b/i);
      end = rel >= 0 ? start + rel : s.length;
    }
  } else {
    start = s.search(/<div\b[^>]*class="[^"]*devsite-article-body[^"]*"/i);
    if (start >= 0) {
      const rel = s.slice(start).search(/<devsite-content-footer\b|<\/article>/i);
      end = rel >= 0 ? start + rel : s.length;
    }
  }
  if (start < 0) return null;
  const body = stripBlocks(s.slice(start, end));
  let title = pageTitleFrom(s);
  if (host === 'support.google.com') {
    const h1 = s.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) title = htmlToText(h1[1]);
  }
  const footer = s.slice(end, end + 20000);
  const lu = footer.match(/Last updated:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Z][a-z]+ [0-9]{1,2}, [0-9]{4})/) ?? s.match(/Last updated:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Z][a-z]+ [0-9]{1,2}, [0-9]{4})/);

  const sections = [];
  const parts = body.split(/(<h[1-4]\b[^>]*>[\s\S]*?<\/h[1-4]>)/i);
  let heading = title;
  let level = 1;
  for (const part of parts) {
    const h = part.match(/^<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>$/i);
    if (h) {
      heading = htmlToText(h[2]);
      level = Number(h[1]);
      continue;
    }
    const text = htmlToText(part);
    if (text) sections.push({ heading, level, text });
  }
  const words = sections.reduce((n, x) => n + x.text.split(/\s+/).filter(Boolean).length, 0);
  return { title, lastUpdated: lu ? lu[1] : null, sections, words };
}

// ---------------------------------------------------------------- verification

const BLOCKED_MARKERS = [/unusual traffic from your computer/i, /\bcaptcha\b/i, /\/sorry\/index/i, /Our systems have detected unusual traffic/i];
const NOT_FOUND_TITLE = /^(404|page not found|not found|error)\b/i;

/**
 * Verifies a retrieved response. Returns the extracted document or the reason
 * it was rejected. Status JSON feeds are handled by verifyIncidents().
 */
export function verifyHtml(res, src, config) {
  if (res.status !== 200) return { ok: false, reason: `HTTP ${res.status}` };
  if (!/text\/html/i.test(res.contentType ?? '')) return { ok: false, reason: `unexpected content type (${res.contentType || 'none'})` };
  if (!res.body || res.body.length < 500) return { ok: false, reason: 'empty or truncated response' };
  if (BLOCKED_MARKERS.some((r) => r.test(res.body.slice(0, 20000)))) return { ok: false, reason: 'captcha or block page' };
  if (!/<\/html>\s*$/i.test(res.body.trim())) return { ok: false, reason: 'incomplete HTML (no closing </html>)' };
  if (src.host === 'status.search.google.com') {
    const title = pageTitleFrom(res.body);
    const rows = [...res.body.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((m) => htmlToText(m[0]).replace(/\s*\|\s*/g, ' | ').replace(/\n+/g, ' ').trim()).filter((t) => /20[0-9]{2}/.test(t));
    if (!rows.length) return { ok: false, reason: 'status history page has no incident rows' };
    return { ok: true, doc: { title, lastUpdated: null, sections: [{ heading: title, level: 1, text: rows.join('\n') }], words: rows.join(' ').split(/\s+/).length } };
  }
  const doc = extractArticle(res.body, src.host);
  if (!doc) return { ok: false, reason: 'no main article content found' };
  if (!doc.title) return { ok: false, reason: 'no document title' };
  if (NOT_FOUND_TITLE.test(doc.title)) return { ok: false, reason: `error page (${doc.title})` };
  if (doc.words < config.limits.minWords && !isHub(src, config)) return { ok: false, reason: `too little content (${doc.words} words)` };
  return { ok: true, doc };
}

/** Validates the Search Status Dashboard incidents feed. */
export function verifyIncidents(res) {
  if (res.status !== 200) return { ok: false, reason: `HTTP ${res.status}` };
  if (!/json/i.test(res.contentType ?? '')) return { ok: false, reason: `unexpected content type (${res.contentType || 'none'})` };
  let list;
  try {
    list = JSON.parse(res.body);
  } catch {
    return { ok: false, reason: 'invalid JSON' };
  }
  if (!Array.isArray(list) || !list.every((i) => i && typeof i.external_desc === 'string' && typeof i.begin === 'string')) {
    return { ok: false, reason: 'unexpected incidents format' };
  }
  const lines = list.map((i) => `${i.begin.slice(0, 10)} to ${i.end ? String(i.end).slice(0, 10) : 'ongoing'}: ${i.external_desc} (${i.service_name ?? 'Search'}; https://status.search.google.com/${i.uri ?? ''})`);
  return {
    ok: true,
    doc: { title: 'Google Search Status Dashboard incidents', lastUpdated: list.map((i) => i.modified ?? i.begin).sort().at(-1)?.slice(0, 10) ?? null, sections: [{ heading: 'Incidents', level: 1, text: lines.join('\n') }], words: lines.join(' ').split(/\s+/).length },
    incidents: list.map((i) => ({ title: i.external_desc, begin: i.begin, end: i.end ?? null, service: i.service_name ?? null, url: `https://status.search.google.com/${i.uri ?? ''}` })),
  };
}

// ---------------------------------------------------------------- classification

const RULES = [
  ['ELIGIBILITY', /\b(eligib(le|ility)|to be eligible|required propert(y|ies)|in order to (appear|show|be shown)|to (appear|show) (in|as) (a )?(rich result|search feature)|qualif(y|ies) for)/i],
  ['REQUIRED', /\b(must( not)?|is required|are required|required to|you need to|needs? to be|prohibited|not allowed|violat(e|es|ion|ions)|against (our|the) (spam )?polic(y|ies)|is not supported|aren't supported|isn't supported)\b/i],
  ['RECOMMENDED', /\b(we recommend|recommended|recommend|should|best practices?|consider|it's a good idea|prefer|try to|make sure|ensure|avoid)\b/i],
];

/**
 * Preliminary label for a passage of official guidance, from Google's own
 * wording. The diagnostic confirms it by reading the cited passage; a claim
 * with no supporting passage is UNSUPPORTED.
 */
const NEGATED = /\b(there (are|is) no (additional |special )?(required|requirements?)|no (additional |special )?requirements?|not (a )?requirements?|isn't required|aren't required|is not required|are not required|no required propert(y|ies))\b/i;

export function classify(text) {
  // Google stating that something is NOT required is information, not a rule.
  if (NEGATED.test(text)) return 'INFORMATIONAL';
  for (const [label, re] of RULES) if (re.test(text)) return label;
  return 'INFORMATIONAL';
}

export const CLASSIFICATIONS = ['REQUIRED', 'RECOMMENDED', 'ELIGIBILITY', 'INFORMATIONAL', 'UNSUPPORTED'];

/** Splits sections into passages (paragraphs or list items). */
export function passages(doc) {
  const out = [];
  for (const s of doc.sections) {
    for (const p of s.text.split(/\n+/)) {
      const t = p.replace(/^-\s*/, '').trim();
      if (t.split(/\s+/).length >= 6) out.push({ heading: s.heading, text: t, classification: classify(t) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- topics, hashes

export function topicsFor(url, title, config) {
  const hay = `${url} ${title}`.toLowerCase();
  return Object.entries(config.topics)
    .filter(([, needles]) => needles.some((n) => hay.includes(n.toLowerCase())))
    .map(([t]) => t);
}

export const contentHash = (doc) =>
  createHash('sha256').update(doc.sections.map((s) => `${s.level}|${s.heading}\n${s.text}`).join('\n\n')).digest('hex');

/** Compares this run's manifest entries with the previous manifest. */
export function diffManifests(prev, next) {
  const before = new Map((prev?.pages ?? []).map((p) => [p.url, p]));
  const after = new Map(next.pages.map((p) => [p.url, p]));
  const added = [];
  const changed = [];
  const removed = [];
  for (const [url, p] of after) {
    const old = before.get(url);
    if (!old) added.push(p);
    else if (old.contentHash !== p.contentHash || old.lastUpdated !== p.lastUpdated) changed.push({ ...p, previousLastUpdated: old.lastUpdated, previousHash: old.contentHash });
  }
  for (const [url, p] of before) if (!after.has(url)) removed.push(p);
  return { hasPrevious: Boolean(prev?.pages?.length), added, changed, removed };
}

/** Ranks passages for a query (all terms must appear; phrase hits first). */
export function findPassages(pages, query, { topic, limit = 20 } = {}) {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = [];
  for (const page of pages) {
    if (topic && !page.topics.includes(topic)) continue;
    for (const p of page.passages) {
      const t = p.text.toLowerCase();
      if (!terms.every((term) => t.includes(term) || p.heading.toLowerCase().includes(term))) continue;
      const score = (t.includes(q) ? 10 : 0) + terms.reduce((n, term) => n + t.split(term).length - 1, 0) + (page.role === 'primary' ? 3 : 0);
      hits.push({ score, page, passage: p });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
