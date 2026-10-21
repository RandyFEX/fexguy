#!/usr/bin/env node
// Company-review checker (read-only, on demand). See
// docs/editorial/company-review-spec.md and .claude/skills/company-review/SKILL.md.
//
// Compares a company review against an approved baseline commit and reports,
// in one Markdown audit:
//   - every changed block (paragraphs, list items, table rows, Quick Answer,
//     Key Points, metadata fields), grouped by heading;
//   - scope violations (changes outside the authorized sections or fields),
//     review-required items (changes inside an authorized scope that can't be
//     matched to the exact requested edit) and authorized matches;
//   - informational warnings: outline and order, repeated source dates, newly
//     repeated figures, and warning phrases in the Quick Answer, Key Points,
//     titles and headings.
// It never writes a file: it only reads the working tree and runs
// `git show` / `git rev-parse`.
//
//   npm run review-check -- --page /lincoln-heritage-funeral-advantage-review/ \
//     --baseline 825242a [--target <ref>] [--allow "<heading>"|quick-answer|key-points|title|description|h1|structure|...] \
//     [--expect "<scope>=<exact new text>"] [--delete-section "<heading>"] [--approval approval.json]
//
// Without --baseline it runs in new-article mode (outline, dates, figures and
// wording only). Exit code: 1 when there is a scope violation, 2 on a usage
// error, otherwise 0. Warnings never change the exit code.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_FILE = 'docs/editorial/company-review-pages.json';
const QUICK_ANSWERS_FILE = 'src/config/article-pages.ts';

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const FULL_DATE = new RegExp(`\\b(?:${MONTHS})(?: \\d{1,2},)? (?:19|20)\\d\\d\\b`, 'g');
const YEAR = /\b(?:19|20)\d\d\b/g;
const FIGURE = /\$\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?%/g;

// ---------- Reading (working tree or a git commit; never writes) ----------

export function loadConfig(ref = null) {
  const text = readAt(ref, CONFIG_FILE) ?? readAt(null, CONFIG_FILE);
  return JSON.parse(text);
}

export function readAt(ref, file) {
  if (!ref) {
    const p = path.join(ROOT, file);
    return existsSync(p) ? readFileSync(p, 'utf8') : null;
  }
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26,
    });
  } catch {
    return null;
  }
}

export function resolveRef(ref) {
  return execFileSync('git', ['rev-parse', '--short', `${ref}^{commit}`], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function extractQuickAnswer(ts, keys) {
  if (!ts) return '';
  for (const key of keys) {
    const start = ts.indexOf(`'${key}': {`);
    if (start < 0) continue;
    const end = ts.indexOf('\n  },', start);
    const entry = ts.slice(start, end < 0 ? undefined : end);
    const m = entry.match(/quickAnswer:\s*'((?:[^'\\]|\\.)*)'/);
    return m ? m[1].replace(/\\'/g, "'") : '';
  }
  return '';
}

/** Loads a page's article and Quick Answer at a ref (null = working tree). */
export function loadPage(ref, page, pageCfg) {
  const files = [pageCfg.file, ...(pageCfg.aliases?.files ?? [])];
  let md = null;
  let file = null;
  for (const f of files) {
    md = readAt(ref, f);
    if (md != null) { file = f; break; }
  }
  if (md == null) throw new Error(`No article file for ${page} at ${ref ?? 'working tree'} (tried ${files.join(', ')})`);
  const keys = [page, ...(pageCfg.aliases?.quickAnswerKeys ?? [])];
  const qa = extractQuickAnswer(readAt(ref, QUICK_ANSWERS_FILE), keys);
  return { ...parseArticle(md, qa), file };
}

// ---------- Parsing ----------

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const decode = (s) => s
  .replace(/&#8211;/g, '–').replace(/&#8212;/g, '\u2014').replace(/&amp;/g, '&')
  .replace(/&#8217;|&rsquo;/g, '’').replace(/&quot;/g, '"');

/** Plain text for matching: no tags, link targets or emphasis; straight quotes; lower case. */
export const plain = (s) => norm(decode(String(s ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\*\*|`/g, '')
  .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
  .replace(/^\s*(?:[-*•]|\d+\.)\s+/, ''))
  .toLowerCase();

function flatten(value, prefix, out) {
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (value != null) out[prefix] = String(value);
  return out;
}

function parseFrontmatter(fm) {
  const fields = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/);
    if (!m) continue;
    let v = m[2];
    try { v = JSON.parse(v); } catch { /* keep raw */ }
    fields[m[1]] = v;
  }
  const meta = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'headMeta' && Array.isArray(v)) {
      for (const e of v) if (e && (e.property || e.name)) meta[`meta:${e.property || e.name}`] = String(e.content ?? '');
    } else if (k === 'jsonLd' && Array.isArray(v)) {
      v.forEach((s, i) => {
        let obj = s;
        try { obj = typeof s === 'string' ? JSON.parse(s) : s; } catch { /* raw */ }
        const flat = flatten(obj, '', {});
        for (const [p, val] of Object.entries(flat)) meta[`jsonld:${i}:${p}`] = val;
      });
    } else {
      meta[`frontmatter:${k}`] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  return meta;
}

const htmlHeading = (line) => {
  const m = line.match(/^<h([1-3])[^>]*>(.*?)<\/h\1>\s*$/i);
  return m ? { level: Number(m[1]), text: norm(m[2].replace(/<[^>]+>/g, '')) } : null;
};

/**
 * Splits an article into metadata fields and blocks. Each block has a scope
 * (an H2 heading, or quick-answer, key-points, h1, (opening)), a section key
 * ("H2" or "H2 > H3"), a kind and its normalized text.
 */
export function parseArticle(md, quickAnswer = '') {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = m ? parseFrontmatter(m[1]) : {};
  const body = m ? md.slice(m[0].length) : md;
  const blocks = [];
  let h2 = null;
  let h3 = null;
  let para = [];
  let inKeyPoints = false;
  const section = () => (h2 ? (h3 ? `${h2} > ${h3}` : h2) : '(opening)');
  const push = (kind, text, scope) => {
    const t = norm(text);
    if (t) blocks.push({ scope: scope ?? (h2 ?? '(opening)'), section: scope ?? section(), kind, text: t });
  };
  const flush = () => {
    if (!para.length) return;
    const text = para.join(' ');
    para = [];
    if (/Here[’']s the Bottom Line/.test(text) && /<strong>/.test(text) && text.replace(/<[^>]+>/g, '').trim().length < 40) {
      push('label', text, 'key-points');
      inKeyPoints = true;
      return;
    }
    if (inKeyPoints && /^<p>\s*•/.test(text)) {
      for (const item of text.replace(/^<p>|<\/p>$/g, '').split(/<br\s*\/?>/)) push('key-point', item.replace(/^\s*•\s*/, ''), 'key-points');
      inKeyPoints = false;
      return;
    }
    inKeyPoints = false;
    push('paragraph', text);
  };

  for (const raw of body.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const hh = htmlHeading(line);
    const mdh = line.match(/^(#{1,3}) (.*)$/);
    const heading = mdh ? { level: mdh[1].length, text: norm(mdh[2]) } : hh;
    if (heading) {
      flush();
      if (heading.level === 1) { push('h1', heading.text, 'h1'); continue; }
      if (heading.level === 2) { h2 = heading.text; h3 = null; } else { h3 = heading.text; }
      push('heading', heading.text);
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (/^\s*\|/.test(line)) {
      flush();
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) push('table-row', line);
      continue;
    }
    const li = line.match(/^(\s*)(?:[-*]|\d+\.)\s+/);
    if (li) {
      flush();
      push('list-item', line);
      continue;
    }
    if (/^\s{2,}\S/.test(line) && blocks.length && blocks[blocks.length - 1].kind === 'list-item' && !para.length) {
      const last = blocks[blocks.length - 1];
      last.text = norm(`${last.text} ${line}`);
      continue;
    }
    para.push(line.trim());
  }
  flush();
  if (quickAnswer) blocks.unshift({ scope: 'quick-answer', section: 'quick-answer', kind: 'quick-answer', text: norm(quickAnswer) });
  return { meta, blocks };
}

export const h2List = (article) => article.blocks.filter((b) => b.kind === 'heading' && !b.section.includes(' > ')).map((b) => b.text);

// ---------- Diff ----------

const tokens = (s) => new Set(plain(s).split(/[^a-z0-9$%.,]+/).filter(Boolean));
function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function titleGroupFields(base) {
  const fm = base.meta['frontmatter:title'] ?? '';
  const h1 = base.blocks.find((b) => b.kind === 'h1')?.text ?? '';
  return new Set([decode(fm), decode(h1)].filter(Boolean));
}

/** Which approval scope a metadata field belongs to. */
function fieldGroup(key, baseValue, titles) {
  if (['frontmatter:title', 'meta:og:title', 'meta:twitter:title'].includes(key)) return 'title';
  if (['frontmatter:description', 'meta:og:description', 'meta:twitter:description'].includes(key)) return 'description';
  if (/^jsonld:\d+:.*\b(name|headline)$/.test(key) && titles.has(decode(baseValue ?? ''))) return 'title';
  if (key.startsWith('jsonld:')) return 'jsonld';
  return key;
}

/**
 * Compares two parsed articles. Returns a list of changes, each with
 * `scopes` (every scope that must be authorized), `section`, `type`
 * (field, added, removed, changed, moved, renamed, reordered) and text.
 */
export function diffArticles(base, target) {
  const changes = [];
  const titles = titleGroupFields(base);

  for (const key of new Set([...Object.keys(base.meta), ...Object.keys(target.meta)])) {
    const a = base.meta[key];
    const b = target.meta[key];
    if (a === b) continue;
    const group = fieldGroup(key, a, titles);
    changes.push({ type: 'field', field: key, scopes: [group], section: `metadata (${group})`, before: a ?? null, after: b ?? null });
  }

  // Section renames: an H2 that disappeared whose content mostly reappears under a new H2.
  const baseH2 = h2List(base);
  const targetH2 = h2List(target);
  const removedH2 = baseH2.filter((h) => !targetH2.includes(h));
  const addedH2 = targetH2.filter((h) => !baseH2.includes(h));
  const textsUnder = (art, h) => art.blocks.filter((b) => b.scope === h && b.kind !== 'heading').map((b) => b.text);
  const rename = new Map(); // base name -> target name
  for (const a of addedH2) {
    const after = new Set(textsUnder(target, a));
    let best = null;
    let bestScore = 0;
    for (const r of removedH2) {
      if (rename.has(r)) continue;
      const before = textsUnder(base, r);
      if (!before.length) continue;
      const score = before.filter((t) => after.has(t)).length / before.length;
      if (score > bestScore) { best = r; bestScore = score; }
    }
    if (best && bestScore >= 0.5) {
      rename.set(best, a);
      changes.push({ type: 'renamed', scopes: [[best, a]], section: a, before: best, after: a });
    }
  }
  const canon = (scope) => rename.get(scope) ?? scope;
  const aliasOf = new Map([...rename].map(([b, a]) => [a, b]));
  const scopeNames = (scope) => {
    if (scope === 'h1') return ['h1', 'title'];
    return aliasOf.has(scope) ? [aliasOf.get(scope), scope] : [scope];
  };

  // Order of sections present in both versions.
  const common = targetH2.filter((h) => baseH2.map(canon).includes(h));
  const baseOrder = baseH2.map(canon).filter((h) => common.includes(h));
  if (baseOrder.join('\u0000') !== common.join('\u0000')) {
    changes.push({ type: 'reordered', scopes: ['structure'], section: 'structure', before: baseOrder, after: common });
  }

  // Block multiset diff per canonical section (renamed headings are reported above).
  const key = (b) => `${canon(b.scope)}\u0000${b.text}`;
  const renameHeading = (b) => b.kind === 'heading' && !b.section.includes(' > ') && (rename.has(b.text) || aliasOf.has(b.text));
  const pool = new Map();
  for (const b of base.blocks) {
    if (renameHeading(b)) continue;
    const k = key(b);
    pool.set(k, (pool.get(k) ?? 0) + 1);
  }
  const added = [];
  for (const b of target.blocks) {
    if (renameHeading(b)) continue;
    const k = key(b);
    if (pool.get(k) > 0) pool.set(k, pool.get(k) - 1);
    else added.push(b);
  }
  const removed = [];
  const counts = new Map(pool);
  for (const b of base.blocks) {
    if (renameHeading(b)) continue;
    const k = key(b);
    if (counts.get(k) > 0) { removed.push(b); counts.set(k, counts.get(k) - 1); }
  }

  // Moves: identical text removed in one section and added in another.
  const usedR = new Set();
  const usedA = new Set();
  added.forEach((a, ai) => {
    if (a.kind === 'heading' || a.text.length < 25) return;
    const ri = removed.findIndex((r, i) => !usedR.has(i) && r.text === a.text && canon(r.scope) !== a.scope);
    if (ri >= 0) {
      usedR.add(ri); usedA.add(ai);
      const r = removed[ri];
      changes.push({ type: 'moved', scopes: [scopeNames(canon(r.scope)), scopeNames(a.scope)], section: a.section, from: r.section, kind: a.kind, before: r.text, after: a.text });
    }
  });

  // Pair remaining removals and additions in the same section as edits.
  const restR = removed.map((r, i) => ({ r, i })).filter(({ i }) => !usedR.has(i));
  added.forEach((a, ai) => {
    if (usedA.has(ai)) return;
    let best = null;
    let bestScore = 0;
    for (const { r, i } of restR) {
      if (usedR.has(i) || canon(r.scope) !== a.scope || r.kind !== a.kind) continue;
      const s = similarity(r.text, a.text);
      if (s > bestScore) { best = i; bestScore = s; }
    }
    const lone = a.kind === 'quick-answer' || a.kind === 'h1';
    if (best != null && (bestScore >= 0.3 || lone)) {
      usedR.add(best); usedA.add(ai);
      const r = removed[best];
      changes.push({ type: 'changed', scopes: [scopeNames(a.scope)], section: a.section, kind: a.kind, before: r.text, after: a.text });
    }
  });
  // Key Points are a fixed list: pair leftover edits by position.
  added.forEach((a, ai) => {
    if (usedA.has(ai) || a.kind !== 'key-point') return;
    const ri = removed.findIndex((r, i) => !usedR.has(i) && r.kind === 'key-point');
    if (ri < 0) return;
    usedR.add(ri); usedA.add(ai);
    changes.push({ type: 'changed', scopes: [scopeNames(a.scope)], section: a.section, kind: a.kind, before: removed[ri].text, after: a.text });
  });
  added.forEach((a, ai) => {
    if (!usedA.has(ai)) changes.push({ type: 'added', scopes: [scopeNames(a.scope)], section: a.section, kind: a.kind, before: null, after: a.text });
  });
  removed.forEach((r, ri) => {
    if (!usedR.has(ri)) changes.push({ type: 'removed', scopes: [scopeNames(canon(r.scope))], section: r.section, kind: r.kind, before: r.text, after: null });
  });
  return changes;
}

// ---------- Scope classification ----------

/**
 * approval: { allow: [scope...], expect: { scope: [text...] }, deleteSections: [heading...] }
 * Each change gets `status`: violation (a scope isn't authorized), authorized
 * (matched to an exact approved text or an approved section deletion) or
 * review (authorized scope, but not matched to the exact requested edit).
 */
export function classify(changes, approval, target) {
  const allow = new Set((approval.allow ?? []).map(norm));
  const expect = approval.expect ?? {};
  const deleted = new Set((approval.deleteSections ?? []).map(norm));
  const targetH2 = new Set(target ? h2List(target) : []);
  const allowed = (names) => names.some((n) => allow.has(n));
  const expectFor = (names) => names.flatMap((n) => expect[n] ?? []).map(plain).filter(Boolean);

  return changes.map((c) => {
    const groups = c.scopes.map((s) => (Array.isArray(s) ? s : [s]));
    const missing = groups.filter((names) => !allowed(names));
    if (missing.length) return { ...c, status: 'violation', unauthorized: missing.map((n) => n[n.length - 1]) };
    const names = groups.flat();
    if ((c.type === 'removed' || c.type === 'field') && c.after == null && names.some((n) => deleted.has(n) && !targetH2.has(n))) {
      return { ...c, status: 'authorized', matchedBy: 'approved section deletion' };
    }
    if (c.after != null && expectFor(names).some((w) => matchesApproved(c.before, c.after, w))) {
      return { ...c, status: 'authorized', matchedBy: 'exact approved text' };
    }
    return { ...c, status: 'review' };
  });
}

const trimEnd = (s) => s.replace(/[\s.]+$/, '');

/**
 * True when everything that changed in a block lies inside one occurrence of
 * the approved text: the block equals it, or the edited span between the
 * unchanged start and end of the block falls within it. A block that also
 * changes anything outside the approved text does not match.
 */
export function matchesApproved(before, after, want) {
  const A = plain(after);
  const W = trimEnd(plain(want));
  if (!A || !W) return false;
  if (trimEnd(A) === W) return true;
  if (before == null) return W.includes(trimEnd(A));
  const B = plain(before);
  let p = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p += 1;
  let s = 0;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s += 1;
  let start = p;
  let end = A.length - s;
  while (start < end && A[start] === ' ') start += 1;
  end = start + trimEnd(A.slice(start, end)).length;
  for (let i = A.indexOf(W); i >= 0; i = A.indexOf(W, i + 1)) {
    if (start >= i && end <= i + W.length) return true;
  }
  return false;
}

// ---------- Warnings ----------

function pageSectionsForFigures(article) {
  const out = [];
  for (const b of article.blocks) {
    if (b.kind === 'table-row' || b.kind === 'heading' || b.kind === 'h1' || b.kind === 'label') continue;
    out.push({ section: b.scope, text: b.text });
  }
  return out;
}

export function figureSpread(article) {
  const spread = new Map();
  for (const { section, text } of pageSectionsForFigures(article)) {
    for (const f of text.match(FIGURE) ?? []) {
      if (!spread.has(f)) spread.set(f, new Set());
      spread.get(f).add(section);
    }
  }
  return new Map([...spread].map(([f, s]) => [f, s.size]));
}

export function dateCounts(article) {
  const full = new Map();
  const years = new Map();
  for (const b of article.blocks) {
    if (b.kind === 'h1') continue;
    for (const d of b.text.match(FULL_DATE) ?? []) full.set(d, (full.get(d) ?? 0) + 1);
    for (const y of b.text.match(YEAR) ?? []) years.set(y, (years.get(y) ?? 0) + 1);
  }
  return { full, years };
}

function phraseHits(cfg, article) {
  const hits = [];
  const phrases = Object.entries(cfg.warningPhrases ?? {}).flatMap(([type, list]) => list.map((p) => ({ type, p })));
  const places = [];
  const fmTitle = article.meta['frontmatter:title'];
  if (fmTitle) places.push({ where: 'SEO title', text: fmTitle });
  for (const b of article.blocks) {
    if (b.kind === 'quick-answer') places.push({ where: 'Quick Answer', text: b.text, dates: true });
    else if (b.kind === 'key-point') places.push({ where: 'Key Points', text: b.text, dates: true });
    else if (b.kind === 'h1') places.push({ where: 'H1', text: b.text });
    else if (b.kind === 'heading') places.push({ where: `heading "${b.text}"`, text: b.text });
  }
  for (const pl of places) {
    const t = plain(pl.text);
    for (const { type, p } of phrases) {
      const re = new RegExp(`(^|[^a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
      if (re.test(t)) hits.push({ id: `${pl.where}|${p}`, message: `${pl.where} contains ${type} wording "${p}"` });
    }
    if (pl.dates) {
      for (const d of [...(pl.text.match(FULL_DATE) ?? []), ...(pl.text.match(YEAR) ?? [])]) {
        hits.push({ id: `${pl.where}|date|${d}`, message: `${pl.where} contains a date ("${d}")` });
      }
    }
  }
  const seen = new Set();
  return hits.filter((h) => (seen.has(h.id) ? false : seen.add(h.id)));
}

export function outlineFindings(cfg, pageCfg, article) {
  const out = [];
  const map = pageCfg?.headingMap ?? {};
  const extras = new Set((pageCfg?.approvedExtraSections ?? []).map(norm));
  const na = new Set(pageCfg?.notApplicable ?? []);
  const items = new Map(cfg.outline.map((o) => [o.item, o]));
  const mapped = [];
  for (const h of h2List(article)) {
    if (extras.has(h)) continue;
    let item = map[h];
    if (item == null) {
      const lower = h.toLowerCase();
      item = cfg.matchOrder.find((n) => (items.get(n)?.keywords ?? []).some((k) => lower.includes(k)));
    }
    if (item == null) out.push(`Unexpected section "${h}" (not in the outline and not an approved exception)`);
    else mapped.push({ h, item });
  }
  const present = new Set(mapped.map((m) => m.item));
  for (const o of cfg.outline) {
    if (!o.optional && !present.has(o.item) && !na.has(o.item)) out.push(`Missing outline item ${o.item}: ${o.name}`);
  }
  const seen = new Map();
  for (const m of mapped) {
    if (seen.has(m.item)) out.push(`Outline item ${m.item} appears twice ("${seen.get(m.item)}" and "${m.h}")`);
    else seen.set(m.item, m.h);
  }
  for (let i = 1; i < mapped.length; i += 1) {
    if (mapped[i].item < mapped[i - 1].item) {
      out.push(`Order: "${mapped[i].h}" (item ${mapped[i].item}) comes after "${mapped[i - 1].h}" (item ${mapped[i - 1].item})`);
    }
  }
  if (!article.blocks.some((b) => b.kind === 'h1')) out.push('Missing H1');
  if (!article.blocks.some((b) => b.kind === 'quick-answer')) out.push('Missing Quick Answer');
  if (!article.blocks.some((b) => b.kind === 'key-point')) out.push('Missing Key Points');
  const lastH2 = h2List(article).at(-1);
  if (cfg.ctaPhone && !article.blocks.some((b) => b.scope === lastH2 && b.text.includes(cfg.ctaPhone))) {
    out.push(`Closing CTA with ${cfg.ctaPhone} not found in the last section`);
  }
  return out;
}

/** Informational warnings. With a baseline, only what the change introduces or makes worse. */
export function warnings(cfg, pageCfg, target, base = null) {
  const out = [];
  const outlineNow = outlineFindings(cfg, pageCfg, target);
  const outlineBefore = new Set(base ? outlineFindings(cfg, pageCfg, base) : []);
  for (const o of outlineNow) out.push({ type: 'outline', message: outlineBefore.has(o) ? `${o} (also in the baseline)` : o });

  const lim = cfg.dateLimits ?? { sameFullDate: 2, sameYear: 3 };
  const now = dateCounts(target);
  const before = base ? dateCounts(base) : { full: new Map(), years: new Map() };
  for (const [d, n] of now.full) {
    if (n > lim.sameFullDate && (!base || n > (before.full.get(d) ?? 0))) out.push({ type: 'dates', message: `"${d}" appears ${n} times${base ? ` (baseline ${before.full.get(d) ?? 0})` : ''}` });
  }
  for (const [y, n] of now.years) {
    if (n > lim.sameYear && (!base || n > (before.years.get(y) ?? 0))) out.push({ type: 'dates', message: `Year ${y} appears ${n} times${base ? ` (baseline ${before.years.get(y) ?? 0})` : ''}` });
  }

  const spreadNow = figureSpread(target);
  const spreadBefore = base ? figureSpread(base) : new Map();
  const limit = cfg.figureSpreadLimit ?? cfg.figureSectionSpread ?? 3;
  for (const [f, n] of spreadNow) {
    if (n < limit) continue;
    if (!base) out.push({ type: 'figures', message: `${f} appears in ${n} sections (review only)` });
    else if (n > (spreadBefore.get(f) ?? 0)) out.push({ type: 'figures', message: `${f} now appears in ${n} sections (baseline ${spreadBefore.get(f) ?? 0})` });
  }

  const baseHits = new Set(base ? phraseHits(cfg, base).map((h) => h.id) : []);
  for (const h of phraseHits(cfg, target)) if (!baseHits.has(h.id)) out.push({ type: 'wording', message: h.message });
  return out;
}

// ---------- Report ----------

const MANUAL_CHECKS = [
  'Insurance facts, numerical calculations and underwriting descriptions agree with the cited sources (recompute every figure).',
  "Randy's voice and approved professional conclusions are preserved, not softened or strengthened.",
  'No unapproved section, editorial angle, claim or comparison was introduced.',
  'Quick Answer and Key Points give direct, useful answers.',
  'No unnecessary repetition or generic filler in new or changed text.',
  'Every "review required" item is confirmed as approved or presented to Randy for approval.',
  'Unresolved factual questions are listed separately.',
];

const clip = (s) => (s == null ? '(none)' : `"${norm(s)}"`);

export function check({ cfg, page, pageCfg, base, target, approval = {}, labels = {} }) {
  const changes = base ? classify(diffArticles(base, target), approval, target) : [];
  const warn = warnings(cfg, pageCfg, target, base);
  return { changes, warnings: warn, page, labels, approval };
}

export function report(result) {
  const { changes, warnings: warn, page, labels, approval } = result;
  const by = (s) => changes.filter((c) => c.status === s);
  const violations = by('violation');
  const review = by('review');
  const ok = by('authorized');
  const L = [];
  L.push(`# Company review check: ${page}`, '');
  L.push(`- **Baseline:** ${labels.base ?? 'none (new-article mode)'}`);
  L.push(`- **Target:** ${labels.target ?? 'working tree'}`);
  const allow = approval.allow ?? [];
  const nExpect = Object.values(approval.expect ?? {}).flat().length;
  L.push(`- **Authorized scope:** ${allow.length ? allow.map((a) => `\`${a}\``).join(', ') : 'none'}${nExpect ? ` (${nExpect} exact approved texts)` : ''}${(approval.deleteSections ?? []).length ? `; approved deletions: ${approval.deleteSections.map((d) => `"${d}"`).join(', ')}` : ''}`);
  L.push(`- **Result:** ${violations.length} scope violations · ${review.length} review required · ${ok.length} authorized · ${warn.length} warnings`, '');

  const line = (c) => {
    const where = c.type === 'moved' ? `${c.section} (moved from ${c.from})` : c.section;
    const what = c.type === 'field' ? `${c.field}` : `${c.type}${c.kind ? ` ${c.kind}` : ''}`;
    if (c.type === 'reordered') return `- **structure**: sections reordered\n  - before: ${c.before.join(' · ')}\n  - after: ${c.after.join(' · ')}`;
    if (c.type === 'renamed') return `- **${where}**: section renamed from "${c.before}"`;
    return `- **${where}** · ${what}${c.unauthorized ? ` · not authorized: \`${c.unauthorized.join('`, `')}\`` : ''}${c.matchedBy ? ` · ${c.matchedBy}` : ''}\n  - before: ${clip(c.before)}\n  - after: ${clip(c.after)}`;
  };
  if (labels.base) {
    L.push('## Scope violations', '', violations.length ? 'Revert these or get Randy\'s explicit approval.' : 'None.', '', ...violations.map(line), '');
    L.push('## Review required', '', review.length ? 'Inside an authorized scope but not matched to the exact requested edit. Present each one for confirmation; don\'t accept it silently.' : 'None.', '', ...review.map(line), '');
    L.push('## Authorized (matched)', '', ok.length ? '' : 'None.', ...ok.map(line), '');
  }
  L.push('## Warnings (informational; never a reason to change content without approval)', '');
  L.push(...(warn.length ? warn.map((w) => `- ${w.type}: ${w.message}`) : ['None.']), '');
  L.push('## Manual editorial checks', '', ...MANUAL_CHECKS.map((m) => `- [ ] ${m}`), '');
  return L.join('\n');
}

// ---------- CLI ----------

function parseArgs(argv) {
  const a = { allow: [], expect: {}, deleteSections: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    const need = () => { if (v == null) throw new Error(`${k} needs a value`); i += 1; return v; };
    if (k === '--page') a.page = need();
    else if (k === '--baseline') a.baseline = need();
    else if (k === '--target') a.target = need();
    else if (k === '--allow') a.allow.push(need());
    else if (k === '--delete-section') a.deleteSections.push(need());
    else if (k === '--approval') a.approvalFile = need();
    else if (k === '--file') a.file = need();
    else if (k === '--expect') {
      const s = need();
      const eq = s.indexOf('=');
      if (eq < 1) throw new Error('--expect needs "<scope>=<text>"');
      (a.expect[s.slice(0, eq)] ??= []).push(s.slice(eq + 1));
    } else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`Unknown option ${k}`);
  }
  return a;
}

function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (args.help || !args.page) {
    console.error('Usage: npm run review-check -- --page <url path> [--baseline <ref>] [--target <ref>] [--allow <scope>]... [--expect "<scope>=<text>"]... [--delete-section <heading>]... [--approval <file.json>] [--file <article .md for a page not yet listed>]');
    process.exit(args.help ? 0 : 2);
  }
  const cfg = loadConfig();
  const pageCfg = cfg.pages[args.page] ?? (args.file ? { file: args.file } : null);
  if (!pageCfg) { console.error(`${args.page} is not listed in ${CONFIG_FILE}; pass --file for a new article.`); process.exit(2); }
  const approval = { allow: [...args.allow], expect: { ...args.expect }, deleteSections: [...args.deleteSections] };
  if (args.approvalFile) {
    const f = JSON.parse(readFileSync(path.resolve(args.approvalFile), 'utf8'));
    approval.allow.push(...(f.allow ?? []));
    for (const [s, list] of Object.entries(f.expect ?? {})) (approval.expect[s] ??= []).push(...list);
    approval.deleteSections.push(...(f.deleteSections ?? []));
  }
  let labels;
  let base = null;
  let target;
  try {
    labels = {
      base: args.baseline ? `${args.baseline} (${resolveRef(args.baseline)})` : null,
      target: args.target ? `${args.target} (${resolveRef(args.target)})` : 'working tree',
    };
    if (args.baseline) base = loadPage(args.baseline, args.page, pageCfg);
    target = loadPage(args.target ?? null, args.page, pageCfg);
  } catch (e) {
    console.error(e.message || `Unknown git ref: ${args.baseline ?? args.target}`);
    process.exit(2);
  }
  const result = check({ cfg, page: args.page, pageCfg, base, target, approval, labels });
  console.log(report(result));
  process.exit(result.changes.some((c) => c.status === 'violation') ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
