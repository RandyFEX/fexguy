#!/usr/bin/env node
// Live Google SEO documentation system (FuneralFunds.com, Step 1 of the SEO
// process). Retrieves Google's current official SEO documentation directly
// from Google's own sites, discovers related pages through Google's
// documentation navigation and links, verifies every response and makes the
// verified guidance available to the SEO diagnostic. See docs/seo/README.md.
//
//   npm run seo:google-docs                        full live run (discover, retrieve, verify, report)
//   npm run seo:google-docs -- --find "canonical"  search the verified guidance from this session's run
//   npm run seo:google-docs -- --find "anchor text" --topic internal-linking-and-anchor-text
//   npm run seo:google-docs -- --max-pages 60      smaller run
//
// Only the hosts in scripts/google-seo-docs/config.json are ever requested.
// Retrieved text is kept only in the git-ignored runtime cache
// (.cache/google-seo-docs/); the committed docs/seo/google-docs-manifest.json
// holds retrieval metadata only (no documentation content), so a later run can
// report what changed.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkSource, isHub, parseRobots, robotsAllows, extractLinks, verifyHtml, verifyIncidents,
  passages, topicsFor, contentHash, diffManifests, findPassages, CLASSIFICATIONS,
} from './google-seo-docs/lib.mjs';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'scripts/google-seo-docs/config.json'), 'utf8'));
const CACHE_DIR = join(root, '.cache/google-seo-docs');
const CACHE_FILE = join(CACHE_DIR, 'pages.json');
const REPORT_FILE = join(CACHE_DIR, 'report.md');
const MANIFEST_FILE = join(root, 'docs/seo/google-docs-manifest.json');

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);

if (flag('--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n').replace(/^\/\/ ?/gm, ''));
  process.exit(0);
}

// ---------------------------------------------------------------- find

function find() {
  const query = opt('--find', '');
  if (!query) {
    console.error('Usage: --find "<terms>" [--topic <topic>] [--limit <n>]');
    return 2;
  }
  if (!existsSync(CACHE_FILE)) {
    console.error('No verified guidance from this session. Run `npm run seo:google-docs` first (it always retrieves the live documentation).');
    return 1;
  }
  const ageH = (Date.now() - statSync(CACHE_FILE).mtimeMs) / 3600000;
  if (ageH > config.limits.cacheMaxAgeHours) {
    console.error(`The cached retrieval is ${ageH.toFixed(1)} hours old (limit ${config.limits.cacheMaxAgeHours}). Rerun \`npm run seo:google-docs\`: guidance is never assumed current.`);
    return 1;
  }
  const data = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  const topic = opt('--topic', undefined);
  if (topic && !config.topics[topic]) {
    console.error(`Unknown topic "${topic}". Topics: ${Object.keys(config.topics).join(', ')}`);
    return 2;
  }
  const hits = findPassages(data.pages, query, { topic, limit: Number(opt('--limit', 15)) });
  if (!hits.length) {
    console.log(`UNSUPPORTED: no passage in the ${data.pages.length} verified official Google documents retrieved at ${data.generatedAt} matches "${query}"${topic ? ` in topic ${topic}` : ''}. No verified source means no Google-based recommendation.`);
    return 0;
  }
  for (const { page, passage } of hits) {
    console.log([
      `[${passage.classification}] ${page.title}`,
      `  Original URL:  ${page.requestedUrl}`,
      `  Final URL:     ${page.finalUrl}`,
      `  Retrieved:     ${page.retrievedAt} (HTTP ${page.status}; Google's last updated: ${page.lastUpdated ?? 'not stated'})`,
      `  Section:       ${passage.heading}`,
      `  Passage:       "${passage.text.length > 600 ? passage.text.slice(0, 600) + '...' : passage.text}"`,
      '',
    ].join('\n'));
  }
  console.log(`${hits.length} passage(s). Classifications are preliminary, from Google's own wording (${CLASSIFICATIONS.join(', ')}); confirm each against the passage before relying on it.`);
  return 0;
}

// ---------------------------------------------------------------- fetch

let tmp = '';
let seq = 0;

/** One HTTPS GET with curl (honors the system proxy). Never follows redirects itself. */
async function get(url) {
  const n = ++seq;
  const bodyFile = join(tmp, `b${n}`);
  const headFile = join(tmp, `h${n}`);
  const { stdout } = await run('curl', [
    '-sS', '--compressed', '--proto', '=https', '--max-time', String(config.limits.timeoutSeconds),
    '--max-filesize', String(config.limits.maxBytes), '-A', config.userAgent, '-H', 'Accept-Language: en',
    '-D', headFile, '-o', bodyFile, '-w', '%{http_code}\\n%{content_type}\\n%{redirect_url}', url,
  ], { maxBuffer: 1 << 20 }).catch((e) => ({ stdout: `000\n\n`, error: e }));
  const [status, contentType, location] = stdout.split('\n');
  const body = existsSync(bodyFile) ? readFileSync(bodyFile, 'utf8') : '';
  rmSync(bodyFile, { force: true });
  rmSync(headFile, { force: true });
  return { status: Number(status) || 0, contentType: contentType ?? '', location: location ?? '', body };
}

/** GET with manual redirects: every hop must itself be an approved, in-scope source. */
async function retrieve(src) {
  let current = src;
  for (let hop = 0; hop <= config.limits.maxRedirects; hop++) {
    const res = await get(current.url);
    if (res.status >= 300 && res.status < 400 && res.location) {
      const next = checkSource(res.location, config, current.url);
      if (!next.ok) {
        const why = /^https:\/\/(www\.)?google\.com\/sorry\//.test(res.location)
          ? 'rate-limited by Google (redirected to a captcha page); retry in a later run'
          : `redirect to an unapproved or out-of-scope URL (${res.location.split('?')[0]}): ${next.reason}`;
        return { ...res, rejected: why, final: current };
      }
      current = next;
      continue;
    }
    return { ...res, final: current };
  }
  return { status: 0, rejected: 'too many redirects', final: current, body: '' };
}

const robotsCache = new Map();
async function robotsRules(host) {
  if (!robotsCache.has(host)) {
    const res = await get(`https://${host}/robots.txt`);
    // An unreachable robots.txt (5xx/000) means: crawl nothing on that host (RFC 9309); 4xx means no rules.
    robotsCache.set(host, res.status === 200 ? parseRobots(res.body, config.userAgent) : res.status >= 400 && res.status < 500 ? [] : null);
  }
  return robotsCache.get(host);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- crawl

async function crawl() {
  const started = new Date().toISOString();
  const maxPages = Number(opt('--max-pages', config.limits.maxPages));
  const queue = [];
  const seen = new Set();
  const enqueue = (raw, base, depth, from) => {
    const src = checkSource(raw, config, base);
    if (!src.ok || seen.has(src.url)) return;
    seen.add(src.url);
    queue.push({ ...src, depth, from });
  };
  for (const s of config.seeds) {
    const src = checkSource(s, config);
    if (!src.ok) {
      console.error(`Seed rejected by the source policy: ${s} (${src.reason})`);
      return 1;
    }
    enqueue(s, undefined, 0, 'seed');
  }

  const pages = [];
  const failures = [];
  const robotsBlocked = [];
  const incidents = [];
  let attempted = 0;

  let active = 0;
  const hostNext = new Map();
  const worker = async () => {
    while (attempted < maxPages && (queue.length || active)) {
      if (!queue.length) {
        await sleep(50);
        continue;
      }
      const src = queue.shift();
      attempted++;
      active++;
      try {
        await handle(src);
      } finally {
        active--;
      }
    }
  };
  const handle = async (src) => {
    {
      const rules = await robotsRules(src.host);
      const u = new URL(src.url);
      if (rules === null || !robotsAllows(rules, u.pathname + u.search)) {
        robotsBlocked.push(src.url);
        return;
      }
      // Polite pacing per host (some hosts ask for a slower rate in config).
      const gap = config.hosts[src.host].delayMs ?? config.limits.delayMs;
      const at = Math.max(Date.now(), (hostNext.get(src.host) ?? 0));
      hostNext.set(src.host, at + gap);
      await sleep(at - Date.now() + gap);
      const res = await retrieve(src);
      const retrievedAt = new Date().toISOString();
      const record = { requestedUrl: src.url, finalUrl: res.final.url, host: res.final.host, status: res.status, retrievedAt, depth: src.depth, discoveredFrom: src.from };
      if (res.rejected) {
        failures.push({ ...record, reason: res.rejected });
        return;
      }
      const isFeed = res.final.path.endsWith('.json');
      const v = isFeed ? verifyIncidents(res) : verifyHtml(res, res.final, config);
      if (!v.ok) {
        failures.push({ ...record, reason: v.reason });
        return;
      }
      if (v.incidents) incidents.push(...v.incidents);
      const hub = isHub(res.final, config);
      const topics = topicsFor(res.final.url, v.doc.title, config);
      pages.push({
        url: res.final.url, ...record, title: v.doc.title, lastUpdated: v.doc.lastUpdated, role: config.hosts[res.final.host].role,
        hub, topics, words: v.doc.words, contentHash: contentHash(v.doc), sections: v.doc.sections, passages: passages(v.doc),
      });
      if (!isFeed && src.depth < config.limits.maxDepth) for (const href of extractLinks(res.body)) enqueue(href, res.final.url, src.depth + 1, res.final.url);
      if (pages.length % 25 === 0) console.error(`  ${pages.length} verified, ${failures.length} rejected, ${queue.length} queued`);
    }
  };
  tmp = mkdtempSync(join(tmpdir(), 'gseo-'));
  console.error(`Retrieving live Google documentation (max ${maxPages} pages, depth ${config.limits.maxDepth})...`);
  await Promise.all(Array.from({ length: config.limits.concurrency }, worker));
  // One delayed retry for transient failures (Google rate limiting, timeouts, 5xx).
  const isTransient = (f) => /rate-limited|^HTTP (0|5[0-9]{2})$/.test(f.reason);
  const retry = failures.filter(isTransient);
  if (retry.length) {
    console.error(`  retrying ${retry.length} transient failure(s) after a pause...`);
    await sleep(20000);
    for (const f of retry) {
      failures.splice(failures.indexOf(f), 1);
      const src = checkSource(f.requestedUrl, config);
      await handle({ ...src, depth: f.depth, from: f.discoveredFrom });
    }
    // Pages recovered by the retry can link to pages not seen yet: crawl those too.
    if (queue.length) await Promise.all(Array.from({ length: config.limits.concurrency }, worker));
  }
  rmSync(tmp, { recursive: true, force: true });

  // Same final URL reached from two requested URLs: keep one.
  const byFinal = new Map();
  for (const p of pages) if (!byFinal.has(p.url)) byFinal.set(p.url, p);
  const verified = [...byFinal.values()].sort((a, b) => a.url.localeCompare(b.url));
  const notRetrieved = queue.length;
  const finished = new Date().toISOString();

  // Coverage and required test topics.
  const coverage = Object.keys(config.topics).map((t) => ({ topic: t, pages: verified.filter((p) => p.topics.includes(t)).length }));
  const gaps = coverage.filter((c) => c.pages === 0).map((c) => c.topic);
  const testResults = Object.entries(config.requiredTestTopics).map(([topic, url]) => {
    const page = verified.find((p) => p.url === checkSource(url, config).url);
    const ok = Boolean(page && page.topics.includes(topic) && page.passages.length > 0);
    return { topic, url, ok, title: page?.title ?? null, passages: page?.passages.length ?? 0 };
  });

  // Change report against the previous committed manifest.
  const prev = existsSync(MANIFEST_FILE) ? JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) : null;
  const manifest = {
    _about: 'Retrieval metadata only (no documentation content), written by `npm run seo:google-docs`. Used to report documentation changes on the next run.',
    generatedAt: finished,
    counts: { discovered: seen.size, attempted, verified: verified.length, duplicates: pages.length - verified.length, rejected: failures.length, robotsBlocked: robotsBlocked.length, notRetrievedLimit: notRetrieved },
    pages: verified.map((p) => ({ url: p.url, title: p.title, lastUpdated: p.lastUpdated, contentHash: p.contentHash, topics: p.topics, retrievedAt: p.retrievedAt })),
    failures: failures.map((f) => ({ url: f.requestedUrl, status: f.status, reason: f.reason })),
    incidents: incidents.map(({ title, begin, end, url }) => ({ title, begin, end, url })),
  };
  // A page that failed only transiently this run is not reported as removed:
  // its previous metadata is carried forward, marked as not retrieved.
  const transientUrls = new Set(failures.filter(isTransient).map((f) => f.requestedUrl));
  const carried = (prev?.pages ?? []).filter((p) => transientUrls.has(p.url) && !manifest.pages.some((m) => m.url === p.url));
  manifest.pages.push(...carried.map((p) => ({ ...p, notRetrievedThisRun: true })));
  const diff = diffManifests(prev, manifest);
  const complete = notRetrieved === 0;

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify({ generatedAt: finished, startedAt: started, pages: verified, failures, robotsBlocked, incidents }, null, 1));
  const updatesPage = verified.find((p) => p.url === 'https://developers.google.com/search/updates');
  const report = buildReport({ duplicates: pages.length - verified.length, started, finished, seen, attempted, verified, failures, robotsBlocked, notRetrieved, coverage, gaps, testResults, diff, complete, incidents, updatesPage });
  writeFileSync(REPORT_FILE, report);
  if (!flag('--no-manifest')) {
    // Removed pages are only meaningful after a complete crawl.
    if (!complete) manifest.pages.push(...(prev?.pages ?? []).filter((p) => !manifest.pages.some((m) => m.url === p.url)).map((p) => ({ ...p, notRetrievedThisRun: true })));
    manifest.pages.sort((a, b) => a.url.localeCompare(b.url));
    mkdirSync(dirname(MANIFEST_FILE), { recursive: true });
    // ASCII-only JSON (titles can contain dashes or other symbols; the repository keeps none literally).
    writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2).replace(/[\u007f-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '\n');
  }
  console.log(report);
  const failed = testResults.filter((t) => !t.ok);
  if (failed.length) {
    console.error(`FAILED: required documentation not verified for ${failed.map((t) => t.topic).join(', ')}. Do not proceed with Google-based SEO recommendations for these topics.`);
    return 1;
  }
  return 0;
}

function buildReport(r) {
  const L = [];
  const cmp = (a, b) => (a < b ? -1 : 1);
  L.push('# Google SEO documentation retrieval', '');
  L.push(`Started ${r.started}, finished ${r.finished}. Sources: ${Object.keys(config.hosts).join(', ')} only.`, '');
  L.push('## Counts', '');
  L.push(`- Official in-scope URLs discovered: ${r.seen.size}`);
  L.push(`- Requested: ${r.attempted}`);
  L.push(`- Retrieved and verified: ${r.verified.length} (${r.verified.filter((p) => p.role === 'primary').length} Search Central / Search Console Help)`);
  L.push(`- Redirected to a page already retrieved (counted once): ${r.duplicates}`);
  L.push(`- Rejected: ${r.failures.length}`);
  L.push(`- Blocked by robots.txt: ${r.robotsBlocked.length}`);
  L.push(`- Discovered but not retrieved (page limit): ${r.notRetrieved}`);
  L.push('');
  L.push(r.complete
    ? 'Coverage: every in-scope page reachable from the seeds through Google\'s navigation and links within the depth limit was retrieved. Pages Google does not link from that navigation are not covered.'
    : `Coverage: INCOMPLETE. The page limit stopped the crawl with ${r.notRetrieved} discovered URLs not retrieved. Rerun with a higher --max-pages.`, '');
  L.push('## Required documentation checks', '');
  for (const t of r.testResults) L.push(`- ${t.ok ? 'PASS' : 'FAIL'} ${t.topic}: ${t.title ?? t.url} (${t.passages} passages)`);
  L.push('', '## Topic coverage', '');
  for (const c of r.coverage) L.push(`- ${c.topic}: ${c.pages} page(s)`);
  if (r.gaps.length) L.push('', `Coverage gaps (no verified page): ${r.gaps.join(', ')}`);
  L.push('', '## Documentation changes since the previous run', '');
  if (!r.diff.hasPrevious) L.push('- No prior metadata: this run is the baseline.');
  else {
    L.push(`- New pages: ${r.diff.added.length}`);
    for (const p of r.diff.added.slice(0, 40)) L.push(`  - ${p.title} (${p.url})`);
    L.push(`- Changed pages: ${r.diff.changed.length}`);
    for (const p of r.diff.changed.slice(0, 60)) L.push(`  - ${p.title} (${p.url}); Google's last updated ${p.previousLastUpdated ?? '?'} -> ${p.lastUpdated ?? '?'}`);
    L.push(`- Pages not found this run: ${r.complete ? r.diff.removed.length : 'not reported (incomplete crawl)'}`);
    if (r.complete) for (const p of r.diff.removed.slice(0, 40)) L.push(`  - ${p.title} (${p.url})`);
  }
  if (r.updatesPage) {
    L.push('', '## Latest entries on Google\'s documentation updates page', '');
    for (const s of r.updatesPage.sections.filter((s) => s.level <= 3).slice(0, 8)) L.push(`- ${s.heading}: ${s.text.split('\n')[0].slice(0, 200)}`);
  }
  if (r.incidents.length) {
    L.push('', '## Google Search Status Dashboard (latest incidents)', '');
    for (const i of [...r.incidents].sort((a, b) => cmp(b.begin, a.begin)).slice(0, 10)) L.push(`- ${i.begin.slice(0, 10)}: ${i.title}${i.end ? ` (ended ${String(i.end).slice(0, 10)})` : ' (ongoing)'}`);
  }
  if (r.failures.length) {
    L.push('', '## Retrieval failures', '');
    for (const f of r.failures.slice(0, 60)) L.push(`- ${f.requestedUrl}: ${f.reason}`);
  }
  if (r.robotsBlocked.length) {
    L.push('', '## Blocked by robots.txt (not retrieved)', '');
    for (const u of r.robotsBlocked.slice(0, 30)) L.push(`- ${u}`);
  }
  L.push('', `Verified guidance is in .cache/google-seo-docs/pages.json for this session. Search it with \`npm run seo:google-docs -- --find "<terms>"\`.`);
  return L.join('\n') + '\n';
}

// Run (after all declarations above).
if (flag('--find')) process.exit(find());
process.exit(await crawl());
