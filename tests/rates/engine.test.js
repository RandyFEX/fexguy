// Rate engine tests that need no carrier data (this repository is public).
// Every rate below is a made-up test value, not a carrier rate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dec, round, toFixed } from '../../server/rates/decimal.js';
import { createEngine, monthlyPremium, validateDataset } from '../../server/rates/engine.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { parseAetnaStandard, parseMooLevel } from '../../scripts/rates-extract.mjs';

/** A complete fake dataset: rate = age + offset, so every value is distinct. */
function fakeDataset(id, offsets = { 'male|non-tobacco': 0.17, 'male|tobacco': 0.29, 'female|non-tobacco': 0.31, 'female|tobacco': 0.43, 'male|any': 0.57, 'female|any': 0.61 }) {
  const p = PRODUCTS[id];
  const records = [];
  for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
    for (const gender of ['male', 'female'])
      for (const tobacco of p.tobaccoClasses)
        records.push({ issueAge: age, gender, tobacco, annualRatePer1000: (age + offsets[`${gender}|${tobacco}`]).toFixed(2), sourcePage: 1 });
  const ds = { productId: id, extractedAt: 'test', sourceSha256: 'test', records };
  // A product whose card prints premiums needs them, consistent with its rates.
  if (p.printedPremiums)
    ds.printedPremiums = records.flatMap((r) =>
      p.printedPremiums.coverage.map((coverage) => ({
        issueAge: r.issueAge, gender: r.gender, coverage, sourcePage: 1,
        monthlyPremium: toFixed(monthlyPremium({ coverage, annualRatePer1000: r.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2),
      })),
    );
  return ds;
}
const all = () => Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, fakeDataset(id)]));
const engine = createEngine(all());
const q = (o) => engine.quote({ gender: 'male', tobacco: false, coverage: 10000, ...o });

test('formula terms are exactly Randy\'s verified fees and modal factors', () => {
  assert.deepEqual(
    Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.id, [p.policyFee, p.modalFactor, p.issueAges.min, p.issueAges.max]])),
    {
      'aetna-accendo-standard': ['40', '0.0875', 40, 89],
      'moo-living-promise-level': ['36', '0.089', 45, 85],
      'gerber-guaranteed-life': ['11', '0.083334', 50, 80],
    },
  );
  assert.equal(PRODUCTS['aetna-accendo-standard'].planClass, 'Standard');
  assert.equal(PRODUCTS['moo-living-promise-level'].planClass, 'Level Benefit');
  assert.deepEqual(PRODUCTS['gerber-guaranteed-life'].tobaccoClasses, ['any']);
});

test('premium = ROUND(((coverage / 1000 x rate) + fee) x factor, 2), exact decimals', () => {
  // ((12.5 x 81.37) + 36) x 0.089 = 93.728125 -> 93.73
  assert.equal(toFixed(monthlyPremium({ coverage: 12500, annualRatePer1000: '81.37', policyFee: '36', modalFactor: '0.089' }), 2), '93.73');
  // ((10 x 33.41) + 11) x 0.083334 = 28.75856... -> 28.76
  assert.equal(toFixed(monthlyPremium({ coverage: 10000, annualRatePer1000: '33.41', policyFee: '11', modalFactor: '0.083334' }), 2), '28.76');
  // Float arithmetic gives 0.1 + 0.2 != 0.3; the engine doesn't.
  assert.equal(toFixed(monthlyPremium({ coverage: 1000, annualRatePer1000: '0.10', policyFee: '0.2', modalFactor: '1' }), 2), '0.30');
});

test('rounding is half up to the cent (not banker\'s rounding)', () => {
  assert.equal(toFixed(round(dec('0.125'), 2), 2), '0.13');
  assert.equal(toFixed(round(dec('0.135'), 2), 2), '0.14');
  assert.equal(toFixed(round(dec('2.004999'), 2), 2), '2.00');
  // A .xx5 premium: ((1 x 1.00) + 0) x 0.125 = 0.125 -> 0.13
  assert.equal(toFixed(monthlyPremium({ coverage: 1000, annualRatePer1000: '1.00', policyFee: '0', modalFactor: '0.125' }), 2), '0.13');
});

test('a quote uses the product\'s own fee, factor and table', () => {
  const r = q({ productId: 'moo-living-promise-level', age: 70, gender: 'female', tobacco: true });
  assert.equal(r.ok, true);
  assert.equal(r.rate.annualRatePer1000, '70.43');
  assert.equal(r.monthlyPremium, toFixed(monthlyPremium({ coverage: 10000, annualRatePer1000: '70.43', policyFee: '36', modalFactor: '0.089' }), 2));
  assert.equal(r.formula.policyFee, '36');
  assert.equal(r.monthlyPremiumCents, Math.round(Number(r.monthlyPremium) * 100));
});

test('ages outside the issue ages are rejected', () => {
  for (const [productId, lo, hi] of [['aetna-accendo-standard', 40, 89], ['moo-living-promise-level', 45, 85], ['gerber-guaranteed-life', 50, 80]]) {
    assert.equal(q({ productId, age: lo }).ok, true);
    assert.equal(q({ productId, age: hi }).ok, true);
    assert.equal(q({ productId, age: lo - 1 }).reason, 'age_out_of_range');
    assert.equal(q({ productId, age: hi + 1 }).reason, 'age_out_of_range');
  }
  assert.equal(q({ productId: 'aetna-accendo-standard', age: 60.5 }).reason, 'invalid_age');
});

test('coverage outside the permitted limits is rejected', () => {
  const moo = 'moo-living-promise-level';
  assert.equal(q({ productId: moo, age: 60, coverage: 2000 }).ok, true);
  assert.equal(q({ productId: moo, age: 60, coverage: 40000 }).ok, true);
  assert.equal(q({ productId: moo, age: 60, coverage: 1999 }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: moo, age: 60, coverage: 40001 }).reason, 'coverage_out_of_range');
  // Products without carrier limits in their source use the working range.
  const a = q({ productId: 'aetna-accendo-standard', age: 60, coverage: 25000 });
  assert.equal(a.ok, true);
  assert.match(a.limits.basis, /working range/);
  assert.equal(q({ productId: 'aetna-accendo-standard', age: 60, coverage: 25001 }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: 'aetna-accendo-standard', age: 60, coverage: 4999 }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: moo, age: 60, coverage: 0 }).reason, 'invalid_coverage');
});

test('state exceptions: MOO unisex in MT, $5,000 minimum in WA, unavailable in NY', () => {
  const moo = 'moo-living-promise-level';
  const mt = q({ productId: moo, age: 60, gender: 'female', state: 'MT' });
  assert.equal(mt.ok, true);
  assert.equal(mt.rate.gender, 'male');
  assert.equal(mt.monthlyPremium, q({ productId: moo, age: 60, gender: 'male', state: 'MT' }).monthlyPremium);
  assert.notEqual(mt.monthlyPremium, q({ productId: moo, age: 60, gender: 'female', state: 'TX' }).monthlyPremium);
  assert.equal(q({ productId: moo, age: 60, coverage: 4000, state: 'WA' }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: moo, age: 60, coverage: 4000, state: 'TX' }).ok, true);
  assert.equal(q({ productId: moo, age: 60, state: 'NY' }).reason, 'unavailable_in_state');
  assert.equal(q({ productId: 'aetna-accendo-standard', age: 60, gender: 'female', state: 'MT' }).rate.gender, 'female');
  assert.equal(q({ productId: moo, age: 60, state: 'ZZ' }).reason, 'invalid_state');
});

test('Gerber state rules: not issued in MT, $15,000 maximum in SD, issue age 75 maximum in NY', () => {
  const g = 'gerber-guaranteed-life';
  assert.equal(q({ productId: g, age: 60, state: 'MT' }).reason, 'unavailable_in_state');
  assert.equal(q({ productId: g, age: 60, coverage: 15000, state: 'SD' }).ok, true);
  assert.equal(q({ productId: g, age: 60, coverage: 20000, state: 'SD' }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: g, age: 75, state: 'NY' }).ok, true);
  assert.equal(q({ productId: g, age: 76, state: 'NY' }).reason, 'age_out_of_range');
  assert.equal(q({ productId: g, age: 80, state: 'TX' }).ok, true);
  assert.equal(q({ productId: g, age: 60, coverage: 25001 }).reason, 'coverage_out_of_range');
  assert.equal(q({ productId: g, age: 60, coverage: 4999 }).reason, 'coverage_out_of_range');
});

test('Gerber: tobacco status never changes the premium; gender does', () => {
  for (const age of [50, 60, 70, 80]) {
    const ns = q({ productId: 'gerber-guaranteed-life', age, tobacco: false });
    const s = q({ productId: 'gerber-guaranteed-life', age, tobacco: true });
    assert.equal(ns.monthlyPremium, s.monthlyPremium);
    assert.equal(ns.rate.tobacco, 'any');
    assert.notEqual(ns.monthlyPremium, q({ productId: 'gerber-guaranteed-life', age, gender: 'female' }).monthlyPremium);
  }
});

test('no tier substitution: a product only quotes from its own complete table', () => {
  // A table missing one class is refused as a whole, not filled from another.
  const broken = fakeDataset('aetna-accendo-standard');
  broken.records = broken.records.filter((r) => !(r.issueAge === 60 && r.tobacco === 'tobacco' && r.gender === 'female'));
  const e = createEngine({ 'aetna-accendo-standard': broken });
  assert.equal(e.quote({ productId: 'aetna-accendo-standard', age: 50, gender: 'male', tobacco: false, coverage: 10000 }).reason, 'rates_invalid');
  assert.match(e.loadProblems['aetna-accendo-standard'][0], /missing rate: age 60, female, tobacco/);
  // Another product's table is never accepted.
  assert.deepEqual(validateDataset(PRODUCTS['aetna-accendo-standard'], fakeDataset('moo-living-promise-level')), ['dataset is not for aetna-accendo-standard']);
  // Gerber data with smoker classes is rejected (it has one rate per age and gender).
  const g = fakeDataset('aetna-accendo-standard');
  g.productId = 'gerber-guaranteed-life';
  assert.ok(validateDataset(PRODUCTS['gerber-guaranteed-life'], g).some((p) => /tobacco class not used/.test(p)));
  // No loaded table: an unavailable result, never a price.
  const none = createEngine({});
  assert.equal(none.quote({ productId: 'gerber-guaranteed-life', age: 60, gender: 'male', tobacco: false, coverage: 10000 }).reason, 'rates_not_loaded');
  assert.equal(none.quote({ productId: 'nope', age: 60 }).reason, 'unknown_product');
});

test('Gerber: printed premiums are kept apart from the derived rates and must all be reproduced', () => {
  const good = fakeDataset('gerber-guaranteed-life');
  assert.deepEqual(validateDataset(PRODUCTS['gerber-guaranteed-life'], good), []);
  assert.equal(good.printedPremiums.length, 31 * 2 * 5);
  // A printed premium the derived rate doesn't reproduce: the whole table is refused.
  const off = structuredClone(good);
  off.printedPremiums[7].monthlyPremium = (Number(off.printedPremiums[7].monthlyPremium) + 0.01).toFixed(2);
  const e = createEngine({ 'gerber-guaranteed-life': off });
  assert.equal(e.quote({ productId: 'gerber-guaranteed-life', age: 60, gender: 'male', tobacco: false, coverage: 10000 }).reason, 'rates_invalid');
  assert.ok(e.loadProblems['gerber-guaranteed-life'].some((p) => /does not reproduce the printed premium/.test(p)));
  // Missing printed premiums are refused too.
  const missing = structuredClone(good);
  missing.printedPremiums.pop();
  assert.ok(validateDataset(PRODUCTS['gerber-guaranteed-life'], missing).some((p) => /missing printed premium/.test(p)));
  delete missing.printedPremiums;
  assert.ok(validateDataset(PRODUCTS['gerber-guaranteed-life'], missing).some((p) => /expected 310 printed premiums/.test(p)));
});

test('results flag unverified face limits and state availability instead of assuming them', () => {
  const a = q({ productId: 'aetna-accendo-standard', age: 60, state: 'TX' });
  assert.equal(a.ok, true);
  assert.deepEqual([a.limits.verified, a.limits.increment, a.availability.verified], [false, null, false]);
  assert.match(a.limits.basis, /working range/);
  const m = q({ productId: 'moo-living-promise-level', age: 60, state: 'TX' });
  assert.deepEqual([m.limits.min, m.limits.max, m.limits.verified, m.availability.verified], [2000, 40000, true, false]);
  const g = q({ productId: 'gerber-guaranteed-life', age: 60, state: 'TX' });
  assert.deepEqual([g.limits.verified, g.availability.verified], [true, true]);
});

test('quoteMany returns each product in order with its own status and no tier', () => {
  const res = engine.quoteMany({ age: 82, gender: 'male', tobacco: false, coverage: 10000, state: 'TX' });
  assert.deepEqual(res.map((r) => [r.productId, r.ok]), [
    ['aetna-accendo-standard', true],
    ['moo-living-promise-level', true],
    ['gerber-guaranteed-life', false],
  ]);
  assert.ok(res.every((r) => !('tier' in r)));
});

test('extraction parsers read only the Standard / Level Benefit columns', () => {
  // Made-up line in the Aetna card layout: 8 Super Preferred/Preferred values,
  // the age again, then 4 Standard and 4 Modified values.
  const aetna = '   41   1.01 1.02  1.03 1.04   1.05 1.06  1.07 1.08    41    2.01 2.02   2.03 2.04   3.01 3.02  3.03 3.04';
  const ar = parseAetnaStandard(aetna);
  assert.deepEqual(ar.map((r) => [r.gender, r.tobacco, r.annualRatePer1000]), [
    ['male', 'non-tobacco', '2.01'],
    ['male', 'tobacco', '2.02'],
    ['female', 'non-tobacco', '2.03'],
    ['female', 'tobacco', '2.04'],
  ]);
  assert.throws(() => parseAetnaStandard('   41   1.01 1.02 1.03 1.04 1.05 1.06 1.07 1.08    42    2.01 2.02 2.03 2.04'), /ages differ/);
  const moo = 'LEVEL BENEFIT PLAN*\n 45    $1.10     $1.20     $1.30    $1.40    66    $2.10    $2.20      $2.30    $2.40';
  assert.deepEqual(parseMooLevel(moo).map((r) => [r.issueAge, r.annualRatePer1000]), [
    [45, '1.10'], [45, '1.20'], [45, '1.30'], [45, '1.40'], [66, '2.10'], [66, '2.20'], [66, '2.30'], [66, '2.40'],
  ]);
  assert.throws(() => parseMooLevel('GRADED BENEFIT PLAN*\n 45 $1.10 $1.20 $1.30 $1.40'), /not the Level Benefit/);
});
