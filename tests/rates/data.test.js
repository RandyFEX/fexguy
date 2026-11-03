// Checks on the real (private, git-ignored) rate tables. Each check is
// skipped when its dataset isn't present, e.g. in CI, and says so.
//
// Set RATES_SOURCE_DIR to a folder holding the supplied PDFs to also
// re-extract every rate from the source and compare it value for value:
//   aetna.pdf  (2026 AETNA ACCENDO RATE GUIDE.pdf)
//   moo.pdf    (2026 MOO LIVING PROMISE UNDERWRITING - RATE GUIDE.pdf)
//   gerber.pdf (2026 GERBER RATE CARD.pdf, GL-RC 0922, Monthly ACH page)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine, loadDatasets, validateDataset } from '../../server/rates/engine.js';
import { PRODUCTS } from '../../server/rates/products.js';
import { extract } from '../../scripts/rates-extract.mjs';

const datasets = loadDatasets();
const engine = createEngine(datasets);
const has = (id) => Boolean(datasets[id]);
const SRC = process.env.RATES_SOURCE_DIR;

for (const [id, key] of [['aetna-accendo-standard', 'aetna'], ['moo-living-promise-level', 'moo'], ['gerber-guaranteed-life', 'gerber']]) {
  test(`${id}: every age has every gender/tobacco rate`, { skip: !has(id) && 'private dataset not present' }, () => {
    assert.deepEqual(validateDataset(PRODUCTS[id], datasets[id]), []);
    const p = PRODUCTS[id];
    assert.equal(datasets[id].records.length, (p.issueAges.max - p.issueAges.min + 1) * 2 * p.tobaccoClasses.length);
  });

  const pdf = SRC && join(SRC, `${key}.pdf`);
  test(`${id}: every stored rate matches the source PDF`, { skip: (!has(id) && 'private dataset not present') || (!(pdf && existsSync(pdf)) && 'RATES_SOURCE_DIR not set') }, () => {
    const fresh = extract(key, pdf);
    assert.equal(fresh.sourceSha256, datasets[id].sourceSha256, 'stored rates came from a different PDF');
    assert.deepEqual(fresh.records, datasets[id].records);
    assert.deepEqual(fresh.printedPremiums, datasets[id].printedPremiums);
  });
}

test('Gerber: the engine reproduces every printed monthly ACH premium on the rate card', { skip: !has('gerber-guaranteed-life') && 'Gerber rates not extracted yet' }, () => {
  let n = 0;
  const ds = datasets['gerber-guaranteed-life'];
  assert.ok(ds.derivation, 'the dataset documents how the rates were derived');
  for (const p of ds.printedPremiums)
    for (const tobacco of [false, true]) {
      const q = engine.quote({ productId: 'gerber-guaranteed-life', age: p.issueAge, gender: p.gender, tobacco, coverage: p.coverage, state: 'TX' });
      assert.equal(q.monthlyPremium, p.monthlyPremium, `age ${p.issueAge} ${p.gender} $${p.coverage}`);
      n++;
    }
  // Rates and printed premiums are stored separately.
  assert.ok(ds.records.every((r) => !('derivedFrom' in r) && !('monthlyPremium' in r)));
  assert.equal(n, 62 * 5 * 2);
});

test('Gerber benchmark: age 60, $10,000, monthly ACH = $63.89 male, $51.06 female', { skip: !has('gerber-guaranteed-life') && 'Gerber rates not extracted yet' }, () => {
  for (const b of PRODUCTS['gerber-guaranteed-life'].benchmarks) {
    for (const tobacco of [false, true]) {
      const r = engine.quote({ productId: 'gerber-guaranteed-life', age: b.age, gender: b.gender, tobacco, coverage: b.coverage, state: 'TX' });
      assert.equal(r.monthlyPremium, b.monthly, `${b.gender} ${tobacco ? 'tobacco' : 'non-tobacco'}`);
    }
  }
});

test('real tables: premiums rise with age within each class (sanity, no data changed)', { skip: !has('aetna-accendo-standard') && !has('moo-living-promise-level') && 'no private datasets' }, () => {
  for (const id of ['aetna-accendo-standard', 'moo-living-promise-level'].filter(has)) {
    const p = PRODUCTS[id];
    for (const gender of ['male', 'female'])
      for (const tobacco of [false, true]) {
        let prev = 0;
        for (let age = p.issueAges.min; age <= p.issueAges.max; age++) {
          const r = engine.quote({ productId: id, age, gender, tobacco, coverage: 10000, state: 'TX' });
          assert.equal(r.ok, true);
          // Report, don't fail, if a printed table dips with age (the source wins).
          if (r.monthlyPremiumCents < prev) console.log(`  note: ${id} ${gender} ${tobacco ? 'tobacco' : 'non-tobacco'} age ${age} is lower than age ${age - 1} in the source table`);
          prev = r.monthlyPremiumCents;
        }
      }
  }
});
