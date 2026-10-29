// Live check of a deployed preview (real Vercel Function + Upstash store):
//   HQS_BASE=https://<preview>.vercel.app VERCEL_AUTOMATION_BYPASS_SECRET=... \
//     node tests/health-search/live-preview.mjs
// Uses about 10 searches of the per-IP hourly allowance. Prints PASS/FAIL
// lines only: never question wording, cookies or secrets. When the local
// private copy exists it also confirms no question reaches the page or its
// scripts.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const base = (process.env.HQS_BASE ?? '').replace(/\/$/, '');
if (!base) { console.error('Set HQS_BASE to the preview URL.'); process.exit(2); }
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const common = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
const api = `${base}/api/health-search/`;

/** One visitor: keeps its own ff_hqs cookie. */
function visitor() {
  let cookie = '';
  return async (body, { origin = base, method = 'POST' } = {}) => {
    const res = await fetch(api, {
      method,
      headers: { ...common, origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie')?.match(/ff_hqs=[^;]+/);
    if (set) cookie = set[0];
    return { http: res.status, body: await res.json().catch(() => ({})) };
  };
}

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(`PASS  ${name}`); } catch (e) { results.push(`FAIL  ${name}: ${String(e.message).split('\n')[0]}`); }
};
const shown = (b) => (b.groups ?? []).flatMap((g) => g.questions.map((q) => ({ ...q, carrier: g.carrier })));

await check('preview page loads and is noindex', async () => {
  const res = await fetch(`${base}/health-question-search-preview/`, { headers: common });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /noindex/);
});

await check('no question wording in the page or its scripts', async () => {
  const dir = new URL('../../server/health-search/private/questions/', import.meta.url);
  if (!existsSync(dir)) return;
  const texts = readdirSync(dir).flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).questions.map((q) => q.text));
  const html = await (await fetch(`${base}/health-question-search-preview/`, { headers: common })).text();
  const scripts = [...html.matchAll(/src="(\/[^"]+\.js)"/g)].map((m) => m[1]);
  const bodies = [html, ...(await Promise.all(scripts.map(async (s) => (await fetch(base + s, { headers: common })).text())))];
  for (const t of texts) assert.ok(!bodies.some((b) => b.includes(t)), 'a question appears in public files');
});

await check('only same-site POST requests are accepted', async () => {
  const v = visitor();
  assert.equal((await v({}, { method: 'GET' })).http, 405);
  assert.equal((await v({ q: 'COPD' }, { origin: 'https://example.com' })).http, 403);
});

const a = visitor();
await check('real records are served (not the sample), 3 searches available', async () => {
  const s = await a({ action: 'status' });
  assert.equal(s.http, 200, JSON.stringify(s.body.status));
  assert.equal(s.body.sample, false);
  assert.equal(s.body.remaining, 3);
});

await check('COPD: grouped results, CICA Life Insurance named, no internal fields, counted once', async () => {
  const r = await a({ q: 'COPD' });
  assert.equal(r.http, 200);
  assert.equal(r.body.counted, true);
  assert.equal(r.body.remaining, 2);
  assert.ok(r.body.directCount > 0);
  const text = JSON.stringify(r.body);
  for (const f of ['"search"', '"id"', '"sharedKey"', '"source"', '"carrierId"', '"corrections"']) assert.ok(!text.includes(f), f);
  const pages = [r.body, ...(await Promise.all(Array.from({ length: r.body.totalPages - 1 }, (_, i) => a({ q: 'COPD', page: i + 2 }))).then((x) => x.map((y) => y.body)))];
  assert.ok(pages.every((p) => p.counted === false || p === r.body), 'paging is free');
  const cica = pages.flatMap(shown).filter((q) => q.carrier === 'CICA Life Insurance');
  assert.ok(cica.some((q) => q.variant === 'D-1') && cica.some((q) => q.variant === 'D-2'), 'D-1 and D-2');
  assert.ok(cica.every((q) => /age, state and product eligibility/.test(q.yes.explanation)));
  assert.ok(pages.some((p) => (p.guaranteedIssue ?? []).some((g) => /Gerber/.test(g.carrier))), 'Gerber card');
});

await check('a repeated search is not counted', async () => {
  const r = await a({ q: 'COPD' });
  assert.equal(r.body.counted, false);
  assert.equal(r.body.remaining, 2);
});

await check('third search uses the last one; the fourth new search is refused', async () => {
  assert.equal((await a({ q: 'heart attack' })).body.remaining, 1);
  assert.equal((await a({ q: 'stroke' })).body.remaining, 0);
  const fourth = await a({ q: 'insulin' });
  assert.equal(fourth.http, 429);
  assert.equal(fourth.body.status, 'exhausted');
});

await check('an earlier search still reopens after the limit', async () => {
  const r = await a({ q: 'heart attack' });
  assert.equal(r.http, 200);
  assert.equal(r.body.counted, false);
});

await check('bulk paging is refused', async () => {
  assert.equal((await a({ q: 'COPD', page: 99 })).http, 400);
});

await check('Aflac Part A 3A outcome names Aflac', async () => {
  const b = visitor();
  const r = await b({ q: 'oxygen' });
  const pages = [r.body, ...(await Promise.all(Array.from({ length: r.body.totalPages - 1 }, (_, i) => b({ q: 'oxygen', page: i + 2 }))).then((x) => x.map((y) => y.body)))];
  const q = pages.flatMap(shown).find((x) => x.carrier === 'Aflac' && x.number === '3A');
  assert.ok(q, 'Aflac 3A shown');
  assert.match(q.yes.explanation, /AFLAC/);
  assert.doesNotMatch(q.yes.explanation, /Aetna/);
});

console.log(results.join('\n'));
if (results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
