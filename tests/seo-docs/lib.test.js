// Offline tests for the live Google SEO documentation system
// (scripts/google-seo-docs/lib.mjs): source policy, robots.txt, verification
// and rejection rules, extraction, classification and change detection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkSource, parseRobots, robotsAllows, extractArticle, extractLinks, verifyHtml, verifyIncidents,
  classify, passages, topicsFor, contentHash, diffManifests, findPassages,
} from '../../scripts/google-seo-docs/lib.mjs';

const config = JSON.parse(readFileSync(new URL('../../scripts/google-seo-docs/config.json', import.meta.url), 'utf8'));

const devsite = (body, { title = 'Link best practices for Google', updated = '2025-12-10' } = {}) => `<!doctype html><html><head><title>${title} | Google Search Central</title></head><body>
<devsite-book-nav><a href="/search/docs/essentials">Search Essentials</a><a href="/maps/docs">Maps</a></devsite-book-nav>
<header>Site header text that must not be extracted</header>
<article><h1 class="devsite-page-title">${title}</h1>
<div class="devsite-article-body clearfix">${body}</div>
<devsite-content-footer><p>Last updated ${updated} UTC.</p></devsite-content-footer></article>
<footer>Footer text that must not be extracted</footer>
<script>var x = "script text";</script></body></html>`;
const longBody = `<p>Google uses links as a signal when determining the relevancy of pages
  and to find new pages to crawl. ${'Learn how to make your links crawlable. '.repeat(20)}</p>
<h2 id="crawlable">Make your links crawlable</h2><p>Generally, Google can only crawl your link if it's an <code>&lt;a&gt;</code> HTML element with an href attribute.</p>
<ul><li>You should use descriptive anchor text for every internal link on the page.</li></ul>
<script>ignored()</script>`;
const ok = (body) => ({ status: 200, contentType: 'text/html; charset=utf-8', body });

test('only approved official Google hosts and in-scope paths are accepted', () => {
  for (const u of [
    'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
    'https://developers.google.com/search/docs/appearance/ai-features/',
    'https://support.google.com/webmasters/answer/9128668?hl=fr',
    'https://web.dev/articles/vitals',
    'https://developer.chrome.com/docs/crux',
    'https://status.search.google.com/incidents.json',
  ]) assert.ok(checkSource(u, config).ok, u);
  for (const [u, why] of [
    ['https://moz.com/learn/seo/canonicalization', /host not approved/],
    ['https://developers.google.com.evil.example/search/docs/x', /host not approved/],
    ['https://developers-google.com/search/docs/x', /host not approved/],
    ['https://searchengineland.com/google-core-update', /host not approved/],
    ['https://www.reddit.com/r/SEO/', /host not approved/],
    ['http://developers.google.com/search/docs/essentials', /not https/],
    ['https://developers.google.com/maps/documentation', /out of scope/],
    ['https://support.google.com/youtube/answer/1', /out of scope/],
    ['https://web.dev/articles/some-unrelated-css-trick', /out of scope/],
    ['https://user:pw@developers.google.com/search/docs/essentials', /credentials/],
    ['not a url', /invalid|out of scope/],
  ]) {
    const r = checkSource(u, config);
    assert.equal(r.ok, false, u);
    assert.match(r.reason, why, u);
  }
});

test('URLs are normalized: no fragments, no tracking queries, one trailing-slash form, English Help pages', () => {
  assert.equal(checkSource('https://developers.google.com/search/docs/essentials/?utm_source=x#top', config).url, 'https://developers.google.com/search/docs/essentials');
  assert.equal(checkSource('https://support.google.com/webmasters/answer/9128668?hl=de&x=1', config).url, 'https://support.google.com/webmasters/answer/9128668?hl=en');
  assert.equal(checkSource('../essentials', config, 'https://developers.google.com/search/docs/fundamentals/x').url, 'https://developers.google.com/search/docs/essentials');
});

test('redirect targets go through the same policy (an off-site redirect is refused)', () => {
  const from = 'https://developers.google.com/search/docs/old';
  assert.equal(checkSource('https://example.com/seo-tips', config, from).ok, false);
  assert.equal(checkSource('/search/docs/new', config, from).url, 'https://developers.google.com/search/docs/new');
});

test('the CLI requests only policy-checked URLs and has no fallback source', () => {
  const src = readFileSync(new URL('../../scripts/google-seo-docs.mjs', import.meta.url), 'utf8');
  assert.equal(src.match(/run\('curl'/g)?.length, 1, 'one fetch path');
  const calls = [...src.matchAll(/(?<![.\w])get\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(calls.sort(), ['`https://${host}/robots.txt`', 'current.url', 'url'].sort());
  assert.match(src, /const next = checkSource\(res\.location, config, current\.url\)/);
  assert.doesNotMatch(src, /\bfetch\(|webcache|archive\.org|bing\.com|duckduckgo/i);
});

test('robots.txt: longest match wins, Allow wins ties, wildcards and end anchors work', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /*?*authuser=\nDisallow: /private/\nAllow: /private/ok\nDisallow: /*.pdf$\n\nUser-agent: OtherBot\nDisallow: /', 'FuneralFunds-SEO-Docs/1.0');
  assert.equal(robotsAllows(rules, '/search/docs/essentials'), true);
  assert.equal(robotsAllows(rules, '/search/docs?authuser=1'), false);
  assert.equal(robotsAllows(rules, '/private/x'), false);
  assert.equal(robotsAllows(rules, '/private/ok'), true);
  assert.equal(robotsAllows(rules, '/guide.pdf'), false);
  assert.equal(robotsAllows(rules, '/guide.pdf.html'), true);
  assert.equal(robotsAllows(parseRobots('User-agent: funeralfunds-seo-docs\nDisallow: /\n', 'FuneralFunds-SEO-Docs/1.0'), '/x'), false);
});

test('extraction keeps only the main article, split into sections, with Google\'s last-updated date', () => {
  const doc = extractArticle(devsite(longBody), 'developers.google.com');
  assert.equal(doc.title, 'Link best practices for Google');
  assert.equal(doc.lastUpdated, '2025-12-10');
  const all = doc.sections.map((s) => s.text).join('\n');
  assert.doesNotMatch(all, /Site header|Footer text|script text|ignored\(\)|Search Essentials|Maps/);
  assert.match(all, /relevancy of pages and to find new pages/, 'source line breaks are not paragraph breaks');
  assert.deepEqual(doc.sections.map((s) => s.heading), ['Link best practices for Google', 'Make your links crawlable']);
  assert.match(all, /<a> HTML element/);
});

test('titles drop Google\'s hidden widget text and zero-width characters', () => {
  const html = devsite(longBody, { title: '\u200brobots.txt report<devsite-actions hidden data-nosnippet><span>Stay organized with collections</span></devsite-actions>' });
  assert.equal(extractArticle(html, 'web.dev').title, 'robots.txt report');
});

test('discovery reads navigation and article links', () => {
  const links = extractLinks(devsite(longBody + '<a href="/search/docs/crawling-indexing/url-structure">URLs</a>'));
  assert.ok(links.includes('/search/docs/essentials'));
  assert.ok(links.includes('/search/docs/crawling-indexing/url-structure'));
});

test('verification rejects errors, captchas, empty, incomplete and non-article responses', () => {
  const src = checkSource('https://developers.google.com/search/docs/crawling-indexing/links-crawlable', config);
  assert.equal(verifyHtml(ok(devsite(longBody)), src, config).ok, true);
  const cases = [
    [{ status: 404, contentType: 'text/html', body: devsite(longBody) }, /HTTP 404/],
    [{ status: 500, contentType: 'text/html', body: '' }, /HTTP 500/],
    [{ status: 200, contentType: 'application/pdf', body: '%PDF' }, /content type/],
    [ok(''), /empty/],
    [ok(devsite(longBody).replace('</html>', '')), /incomplete/],
    [ok(`<html><body>${'x'.repeat(600)} Our systems have detected unusual traffic from your computer network <form action="/sorry/index"></form></body></html>`), /captcha/],
    [ok(`<html><head><title>Search results</title></head><body><div class="g">${'snippet '.repeat(200)}</div></body></html>`), /no main article/],
    [ok(devsite('<p>Short.</p>' + ' '.repeat(600))), /too little content/],
    [ok(devsite(longBody, { title: 'Page not found' })), /error page/],
  ];
  for (const [res, why] of cases) {
    const r = verifyHtml(res, src, config);
    assert.equal(r.ok, false, String(why));
    assert.match(r.reason, why);
  }
});

test('status dashboard incidents feed is validated', () => {
  const feed = JSON.stringify([{ external_desc: 'November 2026 core update', begin: '2026-11-10T18:06:00+00:00', service_name: 'Ranking', uri: 'incidents/abc' }]);
  const r = verifyIncidents({ status: 200, contentType: 'application/json', body: feed });
  assert.equal(r.ok, true);
  assert.equal(r.incidents[0].title, 'November 2026 core update');
  assert.equal(verifyIncidents({ status: 200, contentType: 'application/json', body: '{"a":1}' }).ok, false);
  assert.equal(verifyIncidents({ status: 200, contentType: 'text/html', body: feed }).ok, false);
  assert.equal(verifyIncidents({ status: 200, contentType: 'application/json', body: 'nope' }).ok, false);
});

test('classification follows Google\'s own wording and never upgrades a recommendation', () => {
  assert.equal(classify('The page must return a 200 HTTP status code to be indexed.'), 'REQUIRED');
  assert.equal(classify('Using cloaking is a violation of our spam policies.'), 'REQUIRED');
  assert.equal(classify('We recommend using descriptive anchor text.'), 'RECOMMENDED');
  assert.equal(classify('You should keep URLs simple.'), 'RECOMMENDED');
  assert.equal(classify('To be eligible for review snippets, include the required properties.'), 'ELIGIBILITY');
  assert.equal(classify('Google uses links as a signal when determining relevancy.'), 'INFORMATIONAL');
  assert.equal(classify('There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary.'), 'INFORMATIONAL');
  assert.equal(classify('There are no required properties; instead, add the properties that apply.'), 'INFORMATIONAL');
  const doc = extractArticle(devsite(longBody), 'developers.google.com');
  const ps = passages(doc);
  assert.ok(ps.length >= 2 && ps.every((p) => p.heading && p.text && p.classification));
});

test('topics, hashes, change detection and search', () => {
  assert.deepEqual(topicsFor('https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls', 'How to Specify a Canonical', config).includes('canonicals-and-duplicates'), true);
  assert.ok(topicsFor('https://developers.google.com/search/docs/appearance/ai-features', 'AI Features and Your Website', config).includes('ai-overviews-and-ai-mode'));
  const a = extractArticle(devsite(longBody), 'developers.google.com');
  const b = extractArticle(devsite(longBody + '<p>New guidance paragraph added by Google here today.</p>'), 'developers.google.com');
  assert.notEqual(contentHash(a), contentHash(b));
  const prev = { pages: [{ url: 'u1', contentHash: 'h1', lastUpdated: '2025-01-01' }, { url: 'u2', contentHash: 'h2', lastUpdated: null }] };
  const next = { pages: [{ url: 'u1', contentHash: 'h1b', lastUpdated: '2026-01-01' }, { url: 'u3', contentHash: 'h3', lastUpdated: null }] };
  const d = diffManifests(prev, next);
  assert.deepEqual([d.added.map((p) => p.url), d.changed.map((p) => p.url), d.removed.map((p) => p.url)], [['u3'], ['u1'], ['u2']]);
  assert.equal(diffManifests(null, next).hasPrevious, false);
  const page = { title: 'Links', topics: ['internal-linking-and-anchor-text'], role: 'primary', passages: passages(a) };
  assert.ok(findPassages([page], 'anchor text').length >= 1);
  assert.equal(findPassages([page], 'anchor text', { topic: 'structured-data' }).length, 0);
  assert.equal(findPassages([page], 'keyword density').length, 0);
});
