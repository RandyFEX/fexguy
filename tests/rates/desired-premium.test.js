// V4.29 Desired Premium: the coverage a monthly premium buys, from the
// engine's own formula reversed exactly (made-up rates always; the real
// private tables when present, skipped in CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, loadDatasets, monthlyPremium } from '../../server/rates/engine.js';
import { toFixed } from '../../server/rates/decimal.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { AGES, priceCategories, parsePremium } from '../../server/rates/pricing-categories.js';
import { handlePriceExplorer, parseInput, parsePricingInput } from '../../server/rates/public-pricing.js';

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
const fakeEngine = createEngine(Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, fake(id)])));
const real = loadDatasets();
const realEngine = Object.keys(real).length === Object.keys(PRODUCTS).length ? createEngine(real) : null;

/** The most coverage at or under the premium, checked against the forward formula. */
function checkMaximal(engine, productId, i) {
  const q = engine.coverageForPremium({ productId, ...i, state: 'TX' });
  if (!q.ok) return q;
  const c = q.inputs.coverage;
  assert.ok(Number.isInteger(c), 'whole dollars');
  assert.ok(Number(q.monthlyPremium) <= Number(i.premium), `${productId} ${JSON.stringify(i)}: $${c} costs ${q.monthlyPremium}`);
  const next = engine.quote({ productId, ...i, state: 'TX', coverage: c + 1 });
  if (next.ok) assert.ok(Number(next.monthlyPremium) > Number(i.premium), `${productId} ${JSON.stringify(i)}: $${c + 1} also fits`);
  return q;
}

for (const [name, engine] of [['made-up rates', fakeEngine], ['real tables', realEngine]])
  test(`${name}: each product's coverage is the most its premium buys, to the whole dollar`, { skip: !engine && 'private tables not present' }, () => {
    let ok = 0;
    for (let age = AGES.min; age <= AGES.max; age += 5)
      for (const gender of ['male', 'female'])
        for (const tobacco of [false, true])
          for (const premium of ['25.00', '50.00', '73.45', '120.00'])
            for (const id of Object.keys(PRODUCTS)) if (checkMaximal(engine, id, { age, gender, tobacco, premium }).ok) ok++;
    assert.ok(ok > 100, `${ok} results checked`);
  });

test('categories: competitive cards ranked by coverage (most first); each carries coverage, premium and the exact cost', () => {
  const i = { age: 65, gender: 'male', tobacco: false, premium: '50.00' };
  const cats = priceCategories(fakeEngine, i);
  assert.deepEqual(cats.map((c) => c.id), ['lowest-preferred', 'average-standard', 'guaranteed-acceptance']);
  for (const c of cats) {
    assert.equal(c.status, 'ok');
    assert.equal(c.premium, '50.00');
    assert.ok(Number.isInteger(c.coverage) && c.coverage % 5000 !== 0, `not a preset: ${c.coverage}`);
    assert.ok(Number(c.monthlyPremium) <= 50);
  }
  assert.ok(cats[0].coverage >= cats[1].coverage);
  // Preset coverage pricing is unchanged.
  const preset = priceCategories(fakeEngine, { age: 65, gender: 'male', tobacco: false, coverage: 10000 });
  assert.ok(preset.every((c) => c.coverage === undefined && c.premium === undefined && c.status === 'ok'));
});

test('premiums too small or too large for a product\'s existing limits show no amount', () => {
  for (const premium of ['1.00', '3.00']) {
    const cats = priceCategories(fakeEngine, { age: 65, gender: 'male', tobacco: false, premium });
    assert.ok(cats.every((c) => c.status === 'unavailable' && !c.coverage && /below/.test(c.message)), premium);
  }
  const big = priceCategories(fakeEngine, { age: 50, gender: 'female', tobacco: false, premium: '9999.00' });
  assert.ok(big.every((c) => c.status === 'unavailable' && !c.coverage && /above/.test(c.message)));
});

test('input: a Desired Premium replaces coverage only where allowed', () => {
  assert.equal(parsePremium('50'), '50.00');
  assert.equal(parsePremium('49.5'), '49.50');
  for (const bad of [50, '0', '0.99', '-5', '50.123', '10000', '', 'abc', '1e3']) assert.equal(parsePremium(bad), null, String(bad));
  assert.deepEqual(parsePricingInput({ age: 65, gender: 'male', tobacco: false, premium: '50' }), { age: 65, gender: 'male', tobacco: false, premium: '50.00' });
  assert.equal(parsePricingInput({ age: 65, gender: 'male', tobacco: false, premium: '50', coverage: 10000 }), null);
  assert.equal(parsePricingInput({ age: 90, gender: 'male', tobacco: false, premium: '50' }), null);
  // The contact submission still takes coverage only.
  assert.equal(parseInput({ age: 65, gender: 'male', tobacco: false, premium: '50' }), null);
});

test('endpoint: prices a Desired Premium for a verified session', async () => {
  const store = { eval: async () => 1 };
  const res = await handlePriceExplorer(new Request('https://funeralfunds.com/api/price-explorer/', {
    method: 'POST', headers: { origin: 'https://funeralfunds.com', 'content-type': 'application/json' },
    body: JSON.stringify({ age: 65, gender: 'male', tobacco: false, premium: '50' }),
  }), { PRICE_EXPLORER_SECRET: 's'.repeat(40) }, { store, getEngine: async () => ({ engine: fakeEngine, publishedAt: 'v' }), isVerified: async () => true });
  assert.equal(res.status, 200);
  const b = await res.json();
  assert.ok(b.categories.every((c) => c.status === 'ok' && c.coverage > 0 && c.premium === '50.00'));
  assert.ok(!JSON.stringify(b).includes('annualRatePer1000'), 'no rates');
});
