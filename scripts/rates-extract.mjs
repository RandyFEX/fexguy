#!/usr/bin/env node
// Extract carrier rate tables from the supplied PDF rate guides into the
// git-ignored server/rates/private/ datasets (Rate Engine V2.0). Rates are
// copied exactly as printed: nothing is interpolated, smoothed or estimated,
// and a page that doesn't parse into a complete table stops the script.
//
//   npm run rates:extract -- --aetna "2026 AETNA ACCENDO RATE GUIDE.pdf" \
//                           --moo "2026 MOO LIVING PROMISE UNDERWRITING - RATE GUIDE.pdf" \
//                           --gerber "2026 GERBER RATE CARD.pdf"
//
// Needs pdftotext (poppler-utils). The PDFs are producer-only material:
// keep them outside the repository (this repository is public).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PRODUCTS } from '../server/rates/products.js';
import { PRIVATE_DIR, validateDataset } from '../server/rates/engine.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);

const pageText = (pdf, page) => execFileSync('pdftotext', ['-layout', '-f', String(page), '-l', String(page), pdf, '-'], { encoding: 'utf8' });
const sha256 = (pdf) => createHash('sha256').update(readFileSync(pdf)).digest('hex');

/** Aetna/Accendo rate card (page 2): each row is
 *  age | Super Preferred M NS, M S, F NS, F S | Preferred M NS, M S, F NS, F S |
 *  age | Standard M NS, M S, F NS, F S | Modified M NS, M S, F NS, F S (to age 75).
 *  Only the four Standard columns are taken. */
export function parseAetnaStandard(text, page = 2) {
  const records = [];
  const num = '\\d+\\.\\d{2}';
  const row = new RegExp(`(?:^|\\s)(\\d{2})\\s+((?:${num}\\s+){8})(\\d{2})\\s+((?:${num}\\s*){4,8})$`);
  for (const line of text.split('\n')) {
    const m = line.trimEnd().match(row);
    if (!m) continue;
    const [age1, age2] = [Number(m[1]), Number(m[3])];
    if (age1 !== age2) throw new Error(`Aetna row ages differ: ${line.trim()}`);
    const right = m[4].trim().split(/\s+/);
    if (right.length !== 4 && right.length !== 8) throw new Error(`Aetna row has ${right.length} right-hand values: ${line.trim()}`);
    const [mNs, mS, fNs, fS] = right.slice(0, 4);
    records.push(
      { issueAge: age1, gender: 'male', tobacco: 'non-tobacco', annualRatePer1000: mNs, sourcePage: page },
      { issueAge: age1, gender: 'male', tobacco: 'tobacco', annualRatePer1000: mS, sourcePage: page },
      { issueAge: age1, gender: 'female', tobacco: 'non-tobacco', annualRatePer1000: fNs, sourcePage: page },
      { issueAge: age1, gender: 'female', tobacco: 'tobacco', annualRatePer1000: fS, sourcePage: page },
    );
  }
  return records;
}

/** Mutual of Omaha Living Promise (page 3), Level Benefit table only: each
 *  line holds one or two "age | M non-tobacco, M tobacco, F non-tobacco,
 *  F tobacco" groups. The Graded Benefit table is on another page and is
 *  never read. */
export function parseMooLevel(text, page = 3) {
  if (!/LEVEL BENEFIT PLAN/.test(text) || /GRADED BENEFIT/i.test(text))
    throw new Error('MOO page is not the Level Benefit table (or also contains the Graded table)');
  const records = [];
  const group = /(\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})/g;
  for (const line of text.split('\n')) {
    for (const m of line.matchAll(group)) {
      const age = Number(m[1]);
      records.push(
        { issueAge: age, gender: 'male', tobacco: 'non-tobacco', annualRatePer1000: m[2], sourcePage: page },
        { issueAge: age, gender: 'male', tobacco: 'tobacco', annualRatePer1000: m[3], sourcePage: page },
        { issueAge: age, gender: 'female', tobacco: 'non-tobacco', annualRatePer1000: m[4], sourcePage: page },
        { issueAge: age, gender: 'female', tobacco: 'tobacco', annualRatePer1000: m[5], sourcePage: page },
      );
    }
  }
  return records;
}

/** Exact cents of ROUND(((units x rate) + fee) x factor, 2) for integer
 *  cents/thousandths inputs (half up). */
function premiumCents(coverage, rateCents, feeCents, factorMillionths) {
  const num = BigInt(coverage / 1000) * BigInt(rateCents) + BigInt(feeCents);
  const scaled = num * BigInt(factorMillionths);
  const q = scaled / 1000000n;
  return Number(scaled % 1000000n >= 500000n ? q + 1n : q);
}

/** Gerber Guaranteed Life rate card GL-RC (0922), page 1: monthly ACH
 *  premiums for $5,000-$25,000, male and female groups on one line. The card
 *  prints no annual rate, so the rate per $1,000 is the single 2-decimal value
 *  that reproduces all five printed premiums with the $11 fee and 0.083334
 *  factor; a row with no such value, or more than one, stops the script. */
export function parseGerberAch(text, page = 1) {
  if (!/Monthly ACH Premiums/.test(text)) throw new Error('Gerber page is not the Monthly ACH premiums table');
  const amounts = [5000, 10000, 15000, 20000, 25000];
  const group = /(\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})\s+\$(\d+\.\d{2})/g;
  const records = [];
  for (const line of text.split('\n')) {
    let i = 0;
    for (const m of line.matchAll(group)) {
      const gender = i++ === 0 ? 'male' : 'female';
      const printed = m.slice(2, 7);
      const target = printed.map((v) => Math.round(Number(v) * 100));
      const fits = [];
      for (let rc = 1; rc < 100000; rc++) if (amounts.every((c, k) => premiumCents(c, rc, 1100, 83334) === target[k])) fits.push(rc);
      if (fits.length !== 1) throw new Error(`Gerber age ${m[1]} ${gender}: ${fits.length} annual rates reproduce the printed premiums`);
      records.push({
        issueAge: Number(m[1]),
        gender,
        tobacco: 'any',
        annualRatePer1000: (fits[0] / 100).toFixed(2),
        sourcePage: page,
        derivedFrom: Object.fromEntries(amounts.map((c, k) => [c, printed[k]])),
      });
    }
  }
  return records;
}

const EXTRACTORS = {
  aetna: { productId: 'aetna-accendo-standard', page: 2, parse: parseAetnaStandard },
  moo: { productId: 'moo-living-promise-level', page: 3, parse: parseMooLevel },
  gerber: { productId: 'gerber-guaranteed-life', page: 1, parse: parseGerberAch },
};

export function extract(key, pdf) {
  const { productId, page, parse } = EXTRACTORS[key];
  const records = parse(pageText(pdf, page), page).sort(
    (a, b) => a.issueAge - b.issueAge || a.gender.localeCompare(b.gender) || a.tobacco.localeCompare(b.tobacco),
  );
  const dataset = {
    fexguyRateData: true,
    productId,
    sourceDocument: PRODUCTS[productId].source.document,
    sourcePage: page,
    sourceSha256: sha256(pdf),
    extractedAt: new Date().toISOString(),
    records,
  };
  const problems = validateDataset(PRODUCTS[productId], dataset);
  if (problems.length) throw new Error(`${productId}: ${problems.length} problems\n  ${problems.slice(0, 20).join('\n  ')}`);
  return dataset;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const keys = Object.keys(EXTRACTORS).filter((k) => args[k]);
  if (!keys.length) {
    console.error('Usage: npm run rates:extract -- --aetna <pdf> --moo <pdf> --gerber <pdf>');
    process.exit(1);
  }
  mkdirSync(PRIVATE_DIR, { recursive: true });
  for (const k of keys) {
    const ds = extract(k, args[k]);
    writeFileSync(new URL(`${ds.productId}.json`, PRIVATE_DIR), JSON.stringify(ds, null, 2) + '\n');
    const ages = new Set(ds.records.map((r) => r.issueAge));
    console.log(`${ds.productId}: ${ds.records.length} rates, ages ${Math.min(...ages)}-${Math.max(...ages)} (page ${ds.sourcePage}, sha256 ${ds.sourceSha256.slice(0, 12)})`);
  }
}
