#!/usr/bin/env node
// Build the Funeral Funds pricing workbook (Rate Engine V2.0) from the
// private rate datasets: one sheet per carrier rate table, every monthly
// premium for $5,000-$25,000 as live formulas that point at those tables
// (change a rate or fee and every premium updates), and the sources and
// validation results. Written to the git-ignored server/rates/private/
// folder: it holds producer-only rates and never goes in the repository.
//
//   npm run rates:workbook [-- --source-dir <folder with aetna.pdf, moo.pdf>]
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createEngine, loadDatasets, monthlyPremium, PRIVATE_DIR, validateDataset } from '../server/rates/engine.js';
import { toFixed } from '../server/rates/decimal.js';
import { PRODUCTS, WORKING_COVERAGE } from '../server/rates/products.js';
import { buildXlsx, ref, S } from '../server/rates/xlsx.js';
import { extract } from './rates-extract.mjs';

const argv = process.argv.slice(2);
const sourceDir = argv.includes('--source-dir') ? argv[argv.indexOf('--source-dir') + 1] : process.env.RATES_SOURCE_DIR;

const datasets = loadDatasets();
const engine = createEngine(datasets);

const SHEETS = {
  'aetna-accendo-preferred': 'Aetna CVS Preferred',
  'moo-living-promise-level': 'MOO Living Promise Level',
  'gerber-guaranteed-life': 'Gerber Guaranteed Life',
};
const FIRST_DATA_ROW = 5; // 0-based row index of the first age
const FEE_CELL = ref(1, 1); // B2
const FACTOR_CELL = ref(3, 1); // D2
const CLASS_COLUMNS = {
  'non-tobacco|male': 1, 'tobacco|male': 2, 'non-tobacco|female': 3, 'tobacco|female': 4,
  'any|male': 1, 'any|female': 2,
};
const q = (name) => `'${name.replace(/'/g, "''")}'`;
const num = (s) => Number(s);

// ---- Rate sheets -------------------------------------------------------
const rateSheets = Object.entries(PRODUCTS).map(([id, p]) => {
  const ds = datasets[id];
  const gerber = p.tobaccoClasses.includes('any');
  // Gerber's card prints monthly ACH premiums; they're shown beside the
  // derived rates so each rate can be checked against the card.
  const printedAmounts = [5000, 10000, 15000, 20000, 25000];
  const header = gerber
    ? ['Issue age', 'Male rate (all tobacco classes)', 'Female rate (all tobacco classes)',
       ...printedAmounts.map((a) => `Male printed ACH $${a / 1000}k`), ...printedAmounts.map((a) => `Female printed ACH $${a / 1000}k`)]
    : ['Issue age', 'Male non-tobacco', 'Male tobacco', 'Female non-tobacco', 'Female tobacco'];
  const rows = [
    [{ v: `${p.carrier}: ${p.product} (${p.planClass} rates, annual per $1,000)`, s: S.title }],
    ['Annual policy fee', { v: num(p.policyFee), s: S.money }, `${p.modalMode} factor`, { v: num(p.modalFactor), s: S.factor }],
    [`Source: ${p.source.document}${p.source.ratePage ? `, page ${p.source.ratePage}` : ''}; ${p.source.form ?? ''}; ${p.source.verification}`],
    [ds ? `${ds.records.length} rates extracted ${ds.extractedAt.slice(0, 10)}; source SHA-256 ${ds.sourceSha256}` : 'RATES NOT EXTRACTED: the source document was not available in this workspace. No values are filled in.'],
    header.map((h) => ({ v: h, s: S.bold })),
  ];
  for (let age = p.issueAges.min; age <= p.issueAges.max; age++) {
    const row = [age];
    if (ds)
      for (const r of ds.records.filter((x) => x.issueAge === age))
        row[CLASS_COLUMNS[`${r.tobacco}|${r.gender}`]] = { v: num(r.annualRatePer1000), s: S.rate };
    if (ds?.printedPremiums)
      for (const pp of ds.printedPremiums.filter((x) => x.issueAge === age))
        row[3 + (pp.gender === 'female' ? 5 : 0) + printedAmounts.indexOf(pp.coverage)] = { v: num(pp.monthlyPremium), s: S.money };
    rows.push(row);
  }
  return { id, name: SHEETS[id], rows, widths: gerber ? [12, 18, 18, ...Array(10).fill(14)] : [12, 24, 24, 24, 24], freezeRow: FIRST_DATA_ROW };
});

// ---- Calculated premiums -----------------------------------------------
const premiumRows = [
  [{ v: 'Calculated monthly premiums: =ROUND(((Coverage / 1000 x Annual rate) + Policy fee) x Monthly factor, 2)', s: S.title }],
  ['Each rate, fee and factor cell links to its rate sheet, so editing a rate there updates these premiums.'],
  ['Carrier', 'Product', 'Rate class', 'Issue age', 'Gender', 'Tobacco', 'Coverage', 'Annual rate per $1,000', 'Annual policy fee', 'Monthly factor', 'Monthly premium', 'Engine check'].map((h) => ({ v: h, s: S.bold })),
];
let generated = 0;
let mismatches = 0;
for (const [id, p] of Object.entries(PRODUCTS)) {
  if (!datasets[id]) continue;
  const sheet = q(SHEETS[id]);
  for (let age = p.issueAges.min; age <= p.issueAges.max; age++)
    for (const gender of ['male', 'female'])
      for (const tobacco of p.tobaccoClasses.includes('any') ? [false] : [false, true])
        for (const coverage of WORKING_COVERAGE.amounts) {
          const res = engine.quote({ productId: id, age, gender, tobacco, coverage });
          if (!res.ok) continue;
          const r = premiumRows.length;
          const rateCell = `${sheet}!${ref(CLASS_COLUMNS[`${res.rate.tobacco}|${gender}`], FIRST_DATA_ROW + age - p.issueAges.min)}`;
          const check = toFixed(monthlyPremium({ coverage, annualRatePer1000: res.rate.annualRatePer1000, policyFee: p.policyFee, modalFactor: p.modalFactor }), 2);
          if (check !== res.monthlyPremium) mismatches++;
          premiumRows.push([
            p.carrier, p.product, p.planClass, age, gender === 'male' ? 'Male' : 'Female',
            p.tobaccoClasses.includes('any') ? 'Any (same rate)' : tobacco ? 'Tobacco' : 'Non-tobacco',
            { v: coverage, s: S.money },
            { f: rateCell, v: num(res.rate.annualRatePer1000), s: S.rate },
            { f: `${sheet}!${FEE_CELL}`, v: num(p.policyFee), s: S.money },
            { f: `${sheet}!${FACTOR_CELL}`, v: num(p.modalFactor), s: S.factor },
            { f: `ROUND(((${ref(6, r)}/1000*${ref(7, r)})+${ref(8, r)})*${ref(9, r)},2)`, v: num(res.monthlyPremium), s: S.boldMoney },
            { v: num(res.monthlyPremium), s: S.money },
          ]);
          generated++;
        }
}

// ---- Sources and validation --------------------------------------------
const checks = [];
for (const [id, p] of Object.entries(PRODUCTS)) {
  const ds = datasets[id];
  if (!ds) {
    checks.push([p.carrier, 'Rate table', 'NOT AVAILABLE', 'Source document not available in the workspace; nothing extracted or estimated.']);
    continue;
  }
  const problems = validateDataset(p, ds);
  checks.push([p.carrier, 'All ages x gender x tobacco present, valid values', problems.length ? 'FAIL' : 'PASS', problems.length ? problems.slice(0, 3).join('; ') : `${ds.records.length} rates`]);
  const key = id.startsWith('aetna') ? 'aetna' : id.startsWith('moo') ? 'moo' : 'gerber';
  const pdf = sourceDir && key && join(sourceDir, `${key}.pdf`);
  if (pdf && existsSync(pdf)) {
    const fresh = extract(key, pdf);
    const same = fresh.sourceSha256 === ds.sourceSha256 && JSON.stringify(fresh.records) === JSON.stringify(ds.records)
      && JSON.stringify(fresh.printedPremiums) === JSON.stringify(ds.printedPremiums);
    checks.push([p.carrier, 'Every rate re-extracted from the source PDF and compared', same ? 'PASS' : 'FAIL', `page ${ds.sourcePage}`]);
  } else checks.push([p.carrier, 'Every rate re-extracted from the source PDF and compared', 'NOT RUN', 'Source PDF not given to this run']);
}
checks.push(['All', 'Workbook premiums equal the engine (exact decimal math)', mismatches ? 'FAIL' : 'PASS', `${generated} premiums, ${mismatches} differences`]);
for (const b of PRODUCTS['gerber-guaranteed-life'].benchmarks) {
  const r = engine.quote({ productId: 'gerber-guaranteed-life', age: b.age, gender: b.gender, tobacco: false, coverage: b.coverage });
  checks.push(['Gerber Life', `Benchmark age ${b.age} ${b.gender} $${b.coverage.toLocaleString('en-US')} = $${b.monthly}`, r.ok ? (r.monthlyPremium === b.monthly ? 'PASS' : `FAIL ($${r.monthlyPremium})`) : 'NOT RUN', r.ok ? '' : 'Gerber rates not extracted']);
}

const sourceRows = [
  [{ v: 'Sources, rules and validation', s: S.title }],
  [],
  ['Product', 'Rate class', 'Source document', 'Rate page', 'Form / version', 'Effective', 'Issue ages', 'Face amounts', 'Policy fee', 'Monthly factor', 'State rules', 'Verification'].map((h) => ({ v: h, s: S.bold })),
  ...Object.values(PRODUCTS).map((p) => [
    `${p.carrier}: ${p.product}`, p.planClass, p.source.url ? `${p.source.document} (${p.source.url})` : p.source.document,
    p.source.ratePage ?? '', p.source.form ?? '', p.source.effective ?? 'Not printed', `${p.issueAges.min}-${p.issueAges.max}`,
    p.faceAmount.min != null ? `$${p.faceAmount.min.toLocaleString('en-US')} - $${p.faceAmount.max.toLocaleString('en-US')}` : `Not in the supplied source (working range $${WORKING_COVERAGE.min.toLocaleString('en-US')} - $${WORKING_COVERAGE.max.toLocaleString('en-US')})`,
    { v: num(p.policyFee), s: S.money }, { v: num(p.modalFactor), s: S.factor },
    Object.entries(p.stateRules).map(([st, r]) => `${st}: ${r.note}`).join(' ') || 'None in the supplied source',
    p.source.verification,
  ].map((v) => (typeof v === 'string' ? { v, s: S.wrap } : v))),
  [],
  ['Product', 'Check', 'Result', 'Detail'].map((h) => ({ v: h, s: S.bold })),
  ...checks,
  [],
  [{ v: 'Sample monthly premiums, $10,000 (for manual review)', s: S.bold }],
  ['Product', 'Gender', 'Tobacco', 'Age 50', 'Age 60', 'Age 70', 'Age 80'].map((h) => ({ v: h, s: S.bold })),
];
for (const [id, p] of Object.entries(PRODUCTS))
  for (const gender of ['male', 'female'])
    for (const tobacco of p.tobaccoClasses.includes('any') ? [false] : [false, true]) {
      const cells = [50, 60, 70, 80].map((age) => {
        const r = engine.quote({ productId: id, age, gender, tobacco, coverage: 10000 });
        return r.ok ? { v: num(r.monthlyPremium), s: S.money } : r.reason === 'age_out_of_range' ? 'Not eligible' : 'Rates not loaded';
      });
      sourceRows.push([p.carrier, gender, p.tobaccoClasses.includes('any') ? 'Any' : tobacco ? 'Tobacco' : 'Non-tobacco', ...cells]);
    }

const workbook = buildXlsx([
  ...rateSheets.map(({ name, rows, widths, freezeRow }) => ({ name, rows, widths, freezeRow })),
  { name: 'Calculated Premiums', rows: premiumRows, widths: [34, 38, 16, 10, 9, 16, 12, 14, 12, 12, 15, 13], freezeRow: 3, filter: `A3:L${premiumRows.length}` },
  { name: 'Sources & Validation', rows: sourceRows, widths: [44, 34, 40, 12, 18, 22, 11, 30, 11, 12, 44, 40] },
]);
const out = new URL('funeral-funds-rate-workbook.xlsx', PRIVATE_DIR);
writeFileSync(out, workbook);
console.log(`Wrote ${out.pathname}: ${generated} premiums; checks: ${checks.map((c) => c[2]).join(', ')}`);
