// Financial Impact Calculator (PREVIEW): math, Colonial Penn units, benefit
// schedules, input validation and endpoint safeguards. Uses a fake engine with
// made-up premiums: no real rates in tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colonialPennUnits, impact, benefitAt } from '../../src/lib/impact/calc.js';
import { IMPACT_PRODUCTS, VERIFIED_PRODUCTS, DEFAULT_INPUT, FOOD_DEFAULTS } from '../../src/lib/impact/products.js';
import { parseImpactInput, priceProfile, handleImpact } from '../../server/impact/handler.js';

const fakeEngine = { quote: ({ productId, coverage }) => ({ ok: true, monthlyPremium: (({ 'moo-living-promise-level': 4, 'aetna-accendo-preferred': 5, 'gerber-guaranteed-life': 6 })[productId] * coverage / 1000).toFixed(2) }) };

test('Colonial Penn: whole units, at least the target, $9.95 each, 25-unit maximum', () => {
  assert.deepEqual(colonialPennUnits({ perUnit: 1258 }, 10000), { units: 8, coverage: 10064, premium: 79.6, overMax: false });
  assert.equal(colonialPennUnits({ perUnit: 426 }, 25000).overMax, true);
});

test('impact: monthly, annual, 5/10/20-year totals, meals, calories and food days', () => {
  const r = impact(79.6, 41.25, { years: 10, ...FOOD_DEFAULTS, monthlyIncome: 2000 });
  assert.equal(r.monthly, 38.35);
  assert.equal(r.annual, 460.2);
  assert.deepEqual(r.totals, { 5: 2301, 10: 4602, 20: 9204 });
  assert.equal(r.period, 4602);
  assert.equal(Math.round(r.meals), 460);
  assert.equal(Math.round(r.calories), Math.round(460.2 * 667));
  assert.equal(Math.round(r.foodDays), Math.round((4602 / 10) * 667 / 2000));
  assert.equal(r.incomeShare.toFixed(4), (38.35 / 2000).toFixed(4));
  assert.equal(impact(50, 40, { years: 5, ...FOOD_DEFAULTS }).incomeShare, null);
});

test('benefit schedules: level pays the face; Gerber pays premiums plus 10% in months 1-24; Colonial Penn at least premiums', () => {
  const [moo, , gerber, cp] = VERIFIED_PRODUCTS;
  assert.deepEqual(benefitAt(moo, 40, 10000, 6), { amount: 10000, kind: 'face' });
  assert.deepEqual(benefitAt(gerber, 60, 10000, 18), { amount: 1188, kind: 'premiums-plus-10' });
  assert.deepEqual(benefitAt(gerber, 60, 10000, 25), { amount: 10000, kind: 'face' });
  assert.deepEqual(benefitAt(cp, 79.6, 10064, 6), { amount: 477.6, kind: 'at-least-premiums' });
});

test('only verified products are compared; pending ones (TruStage, Royal Neighbors) never appear', () => {
  assert.deepEqual(VERIFIED_PRODUCTS.map((p) => p.code), ['FF-102', 'FF-103', 'FF-201', 'CP-GA']);
  assert.ok(IMPACT_PRODUCTS.some((p) => p.code === 'TS-GA' && p.status === 'pending'));
  assert.deepEqual(DEFAULT_INPUT.codes.sort(), ['CP-GA', 'FF-102', 'FF-103', 'FF-201']);
});

test('input validation: exactly four fields, in range, whole thousands', () => {
  assert.deepEqual(parseImpactInput({ age: 65, gender: 'female', tobacco: false, coverage: 10000 }), { age: 65, gender: 'female', tobacco: false, coverage: 10000 });
  for (const bad of [{ age: 49, gender: 'female', tobacco: false, coverage: 10000 }, { age: 65, gender: 'x', tobacco: false, coverage: 10000 }, { age: 65, gender: 'male', tobacco: false, coverage: 10500 }, { age: 65, gender: 'male', tobacco: false, coverage: 10000, extra: 1 }]) assert.equal(parseImpactInput(bad), null);
});

test('pricing: products outside their issue ages are unavailable; engine products are also priced at Colonial Penn coverage', () => {
  const r = priceProfile(fakeEngine, { age: 65, gender: 'female', tobacco: false, coverage: 10000 });
  const cp = r.find((x) => x.code === 'CP-GA');
  assert.equal(cp.units, 8);
  assert.equal(cp.coverage, 10064);
  assert.equal(r.find((x) => x.code === 'FF-102').atColonialPennCoverage.coverage, 10064);
  const old = priceProfile(fakeEngine, { age: 83, gender: 'male', tobacco: false, coverage: 10000 });
  assert.equal(old.find((x) => x.code === 'FF-201').available, false);
  assert.equal(old.find((x) => x.code === 'CP-GA').available, false);
  assert.equal(old.find((x) => x.code === 'FF-102').available, true);
});

test('responses never contain product ids, rates or tables', () => {
  const out = JSON.stringify(priceProfile(fakeEngine, { age: 70, gender: 'male', tobacco: true, coverage: 15000 }));
  assert.doesNotMatch(out, /living-promise|accendo|gerber-guaranteed|annualRate|records|fee|factor/i);
});

test('endpoint: method, origin, body and rate limit safeguards', async () => {
  const env = { HEALTH_SEARCH_SECRET: 'x'.repeat(40), VERCEL_ENV: 'preview' };
  const store = { n: 0, eval: async () => (++store.n > 2 ? 0 : 1) };
  const deps = { store, getEngine: async () => ({ engine: fakeEngine, publishedAt: '2026-11-06T00:00:00Z' }) };
  const req = (body, origin = 'https://fexguy-abc.vercel.app', method = 'POST') => new Request('https://x/api/impact-calculator/', { method, headers: { origin, 'content-type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
  const good = { age: 65, gender: 'female', tobacco: false, coverage: 10000 };
  assert.equal((await handleImpact(req(good, undefined, 'GET'), env, deps)).status, 405);
  assert.equal((await handleImpact(req(good, 'https://example.com'), env, deps)).status, 403);
  assert.equal((await handleImpact(req({ age: 'x' }), env, deps)).status, 400);
  const ok = await handleImpact(req(good), env, deps);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).products.length, 4);
  await handleImpact(req(good), env, deps);
  assert.equal((await handleImpact(req(good), env, deps)).status, 429);
  assert.equal((await handleImpact(req(good), { VERCEL_ENV: 'preview' }, deps)).status, 503, 'no secret, no prices');
});
