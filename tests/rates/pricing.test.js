// Pricing Explorer v1.0: the three categories and the public endpoint.
// Made-up rates always; the real private tables when present (skipped in CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, loadDatasets, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { CATEGORIES, meanCents, priceCategories } from '../../server/rates/pricing-categories.js';
import { allowedOrigin, handlePriceExplorer, LIMITS, parseInput } from '../../server/rates/public-pricing.js';

function fake(id) {
  const p = PRODUCTS[id];
  const records = [];
  for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
    for (const gender of ['male', 'female'])
      for (const tobacco of p.tobaccoClasses)
        records.push({ issueAge: age, gender, tobacco, annualRatePer1000: (age + (gender === 'male' ? 0.37 : 0.53) + (tobacco === 'tobacco' ? 9 : 0) + (id.startsWith('moo') ? 3.11 : 0)).toFixed(2), sourcePage: 1 });
  const ds = { productId: id, extractedAt: 't', sourceSha256: 't', records };
  if (p.printedPremiums)
    ds.printedPremiums = records.flatMap((r) => p.printedPremiums.coverage.map((coverage) => ({
      issueAge: r.issueAge, gender: r.gender, coverage, sourcePage: 1,
      monthlyPremium: toFixed(monthlyPremium({ coverage, annualRatePer1000: r.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2),
    })));
  return ds;
}
const engine = createEngine(Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, fake(id)])));
const byId = (cats) => Object.fromEntries(cats.map((c) => [c.id, c]));
const input = (o = {}) => ({ age: 65, gender: 'male', tobacco: false, coverage: 10000, ...o });

test('exact labels, in order', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.label), ['Lowest Preferred Rate', 'Standard Rate', 'Guaranteed Acceptance Rate']);
});

test('mean of cents rounds half up', () => {
  assert.equal(meanCents([100, 101]), 101);
  assert.equal(meanCents([100, 103]), 102);
  assert.equal(meanCents([5000, 5000]), 5000);
});

test('Lowest Preferred Rate is Mutual of Omaha Living Promise Level (exact engine premium, its own limits)', () => {
  const c = byId(priceCategories(engine, input()))['lowest-preferred'];
  const m = engine.quote({ productId: 'moo-living-promise-level', ...input(), state: 'TX' });
  assert.equal(c.status, 'ok');
  assert.equal(c.monthlyPremium, m.monthlyPremium);
  assert.deepEqual(c.attribution, ['FF-102']);
  // Smokers and women use their own MOO tables.
  const s = engine.quote({ productId: 'moo-living-promise-level', ...input({ tobacco: true, gender: 'female' }), state: 'TX' });
  assert.equal(byId(priceCategories(engine, input({ tobacco: true, gender: 'female' })))['lowest-preferred'].monthlyPremium, s.monthlyPremium);
  // MOO issues to age 85: ages 86-89 are unavailable, never forced.
  assert.equal(byId(priceCategories(engine, input({ age: 86 })))['lowest-preferred'].status, 'unavailable');
});

test('Standard Rate is Aetna Standard (one verified standard product, its own premium, never called an average)', () => {
  for (const age of [50, 65, 89]) {
    const c = byId(priceCategories(engine, input({ age })))['average-standard'];
    const a = engine.quote({ productId: 'aetna-accendo-standard', ...input({ age }), state: 'TX' });
    assert.equal(c.status, 'ok');
    assert.equal(c.label, 'Standard Rate');
    assert.equal(c.monthlyPremium, a.monthlyPremium);
    assert.deepEqual(c.attribution, ['FF-101']);
  }
  assert.deepEqual(CATEGORIES.find((c) => c.id === 'average-standard').products, ['aetna-accendo-standard']);
});

test('Guaranteed Acceptance uses Gerber where available; tobacco never changes it', () => {
  const g = byId(priceCategories(engine, input()))['guaranteed-acceptance'];
  const s = byId(priceCategories(engine, input({ tobacco: true })))['guaranteed-acceptance'];
  assert.equal(g.status, 'ok');
  assert.equal(g.monthlyPremium, s.monthlyPremium);
  assert.deepEqual(g.attribution, ['FF-201']);
  assert.equal(byId(priceCategories(engine, input({ age: 81 })))['guaranteed-acceptance'].status, 'unavailable');
});

test('verified results carry carrier names but never product ids, rates or fees', () => {
  const cats = priceCategories(engine, input());
  assert.deepEqual(cats.map((c) => c.carriers[0].carrier), ['Mutual of Omaha', 'Aetna', 'Gerber Life']);
  const text = JSON.stringify(cats);
  for (const banned of ['moo-', 'aetna-accendo', 'gerber-guaranteed', 'annualRatePer1000', 'policyFee', 'modalFactor']) assert.ok(!text.includes(banned), banned);
  assert.ok(!cats.some((c) => c.status === 'pending'), 'no Coming soon when every product is available');
});

test('input validation: exact fields and ranges only', () => {
  assert.ok(parseInput(input()));
  assert.equal(parseInput(input({ age: 49 })), null);
  assert.equal(parseInput(input({ age: 90 })), null);
  assert.equal(parseInput(input({ coverage: 4999 })), null);
  assert.equal(parseInput(input({ coverage: 25001 })), null);
  assert.equal(parseInput(input({ coverage: 12000.5 })), null);
  assert.equal(parseInput({ ...input(), state: 'NY' }), null);
  assert.equal(parseInput(input({ tobacco: 'no' })), null);
});

test('origins: the live site and previews only', () => {
  assert.equal(allowedOrigin('https://funeralfunds.com', { VERCEL_ENV: 'production' }), true);
  assert.equal(allowedOrigin('https://fexguy-abc-final-expense-guys-projects.vercel.app', { VERCEL_ENV: 'production' }), false);
  assert.equal(allowedOrigin('https://fexguy-abc-final-expense-guys-projects.vercel.app', { VERCEL_ENV: 'preview' }), true);
  assert.equal(allowedOrigin('https://evil.example', { VERCEL_ENV: 'preview' }), false);
  assert.equal(allowedOrigin(null, {}), false);
});

const ENV = { VERCEL_ENV: 'preview', HEALTH_SEARCH_SECRET: 's'.repeat(40) };
const ORIGIN = 'https://fexguy-x-final-expense-guys-projects.vercel.app';
const req = (body, { origin = ORIGIN, method = 'POST' } = {}) =>
  new Request('https://x.test/api/price-explorer/', { method, headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined });
function limitStore() {
  const counts = new Map();
  return { counts, eval: async (_s, keys, args) => { for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1); return counts.get(keys[0]) > args[0] || counts.get(keys[1]) > args[2] ? 0 : 1; } };
}
const deps = (store = limitStore()) => ({ store, getEngine: async () => ({ engine, publishedAt: 'v' }), isVerified: async () => true });

test('endpoint: returns the three categories for a same-site request', async () => {
  const res = await handlePriceExplorer(req(input()), ENV, deps());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const b = await res.json();
  assert.equal(b.state, 'TX');
  assert.deepEqual(b.categories.map((c) => c.label), ['Lowest Preferred Rate', 'Standard Rate', 'Guaranteed Acceptance Rate']);
});

test('endpoint: rejects other origins, methods, bad input; fails closed without store or engine', async () => {
  assert.equal((await handlePriceExplorer(req(input(), { origin: 'https://evil.example' }), ENV, deps())).status, 403);
  assert.equal((await handlePriceExplorer(req(input(), { origin: null }), ENV, deps())).status, 403);
  assert.equal((await handlePriceExplorer(req(null, { method: 'GET' }), ENV, deps())).status, 405);
  assert.equal((await handlePriceExplorer(req({ ...input(), x: 1 }), ENV, deps())).status, 400);
  assert.equal((await handlePriceExplorer(req(input()), ENV, { store: null, isVerified: async () => true })).status, 503);
  assert.equal((await handlePriceExplorer(req(input()), { VERCEL_ENV: 'preview' }, deps())).status, 503, 'no hashing secret');
  assert.equal((await handlePriceExplorer(req(input()), ENV, { store: limitStore(), getEngine: async () => null, isVerified: async () => true })).status, 503);
  // Quote System v2.2: no verified session, no prices.
  assert.equal((await handlePriceExplorer(req(input()), ENV, { ...deps(), isVerified: async () => false })).status, 401);
  assert.equal((await handlePriceExplorer(req(input()), ENV, { ...deps(), isVerified: undefined })).status, 401);
});

test('endpoint: per-IP burst limit', async () => {
  const d = deps();
  for (let i = 0; i < LIMITS.burst; i++) assert.equal((await handlePriceExplorer(req(input()), ENV, d)).status, 200);
  const res = await handlePriceExplorer(req(input()), ENV, d);
  assert.equal(res.status, 429);
  assert.ok([...d.store.counts.keys()].every((k) => /^px:[bd]:[0-9a-f]{32}:\d+$/.test(k)), 'keys hold no raw IP');
});

const real = loadDatasets();
test('real tables: Gerber benchmark shows in the Guaranteed Acceptance card', { skip: !real['gerber-guaranteed-life'] && 'private tables not present' }, () => {
  const e = createEngine(real);
  assert.equal(byId(priceCategories(e, input({ age: 60 })))['guaranteed-acceptance'].monthlyPremium, '63.89');
  assert.equal(byId(priceCategories(e, input({ age: 60, gender: 'female' })))['guaranteed-acceptance'].monthlyPremium, '51.06');
});
