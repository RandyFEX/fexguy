// Funeral Funds rate engine: monthly premiums from verified carrier rate
// tables. Presentation-free: the pricing comparison tool and a future
// quote wizard call quote() / quoteMany() and render the results.
//
//   const engine = createEngine(loadDatasets());
//   engine.quote({ productId: 'moo-living-promise-level', age: 70,
//                  gender: 'female', tobacco: false, coverage: 10000, state: 'TX' })
//
// A product with no loaded rate table, or an input outside its rules,
// returns { ok: false, reason } and never an estimated price.
import { existsSync, readFileSync } from 'node:fs';
import { dec, add, mul, div10, round, toFixed, toCents, cmp } from './decimal.js';
import { PRODUCTS, WORKING_COVERAGE, STATES } from './products.js';

export const PRIVATE_DIR = new URL('./private/', import.meta.url);

/** Load the private rate datasets that exist (missing products stay unloaded). */
export function loadDatasets(dir = PRIVATE_DIR) {
  const out = {};
  for (const id of Object.keys(PRODUCTS)) {
    const file = new URL(`${id}.json`, dir);
    if (existsSync(file)) out[id] = JSON.parse(readFileSync(file, 'utf8'));
  }
  return out;
}

const keyOf = (age, gender, tobacco) => `${age}|${gender}|${tobacco}`;

/** Check a dataset is complete and well formed for its product. Returns a list of problems. */
export function validateDataset(product, dataset) {
  const problems = [];
  if (!dataset || dataset.productId !== product.id) return [`dataset is not for ${product.id}`];
  const seen = new Map();
  for (const r of dataset.records ?? []) {
    const k = keyOf(r.issueAge, r.gender, r.tobacco);
    if (seen.has(k)) problems.push(`duplicate record ${k}`);
    seen.set(k, r);
    if (!Number.isInteger(r.issueAge) || r.issueAge < product.issueAges.min || r.issueAge > product.issueAges.max)
      problems.push(`age outside the product's issue ages: ${k}`);
    if (!['male', 'female'].includes(r.gender)) problems.push(`bad gender: ${k}`);
    if (!product.tobaccoClasses.includes(r.tobacco)) problems.push(`tobacco class not used by this product: ${k}`);
    if (!/^\d+\.\d{2}$/.test(String(r.annualRatePer1000))) problems.push(`rate is not a 2-decimal string: ${k} = ${r.annualRatePer1000}`);
    else if (Number(r.annualRatePer1000) <= 0) problems.push(`rate is not positive: ${k}`);
  }
  for (let age = product.issueAges.min; age <= product.issueAges.max; age++)
    for (const gender of ['male', 'female'])
      for (const tobacco of product.tobaccoClasses)
        if (!seen.has(keyOf(age, gender, tobacco))) problems.push(`missing rate: age ${age}, ${gender}, ${tobacco}`);
  if (product.printedPremiums) problems.push(...checkPrintedPremiums(product, dataset, seen));
  return problems;
}

const TWO_DP = /^\d+\.\d{2}$/;

/** Products whose card prints premiums (Gerber): every printed premium must
 *  be present and the derived rate must reproduce it to the cent, or the
 *  whole table is refused. */
function checkPrintedPremiums(product, dataset, seen) {
  const problems = [];
  const printed = new Map();
  for (const p of dataset.printedPremiums ?? []) {
    const k = `${p.issueAge}|${p.gender}|${p.coverage}`;
    if (printed.has(k)) problems.push(`duplicate printed premium ${k}`);
    printed.set(k, p);
    if (!TWO_DP.test(String(p.monthlyPremium))) problems.push(`printed premium is not a 2-decimal string: ${k}`);
  }
  const expected = (product.issueAges.max - product.issueAges.min + 1) * 2 * product.printedPremiums.coverage.length;
  if (printed.size !== expected) problems.push(`expected ${expected} printed premiums, found ${printed.size}`);
  for (let age = product.issueAges.min; age <= product.issueAges.max; age++)
    for (const gender of ['male', 'female']) {
      const rec = seen.get(keyOf(age, gender, 'any'));
      for (const coverage of product.printedPremiums.coverage) {
        const p = printed.get(`${age}|${gender}|${coverage}`);
        if (!p) problems.push(`missing printed premium: age ${age}, ${gender}, $${coverage}`);
        else if (rec && TWO_DP.test(String(rec.annualRatePer1000))) {
          const calc = toFixed(monthlyPremium({ coverage, annualRatePer1000: rec.annualRatePer1000, policyFee: product.policyFee, modalFactor: product.modalFactor }), 2);
          if (calc !== p.monthlyPremium)
            problems.push(`derived rate does not reproduce the printed premium: age ${age}, ${gender}, $${coverage} (${calc} vs ${p.monthlyPremium})`);
        }
      }
    }
  return problems;
}

/** Monthly premium from its parts (strings or numbers), exact. */
export function monthlyPremium({ coverage, annualRatePer1000, policyFee, modalFactor }) {
  const annual = add(mul(div10(dec(coverage), 3), dec(annualRatePer1000)), dec(policyFee));
  return round(mul(annual, dec(modalFactor)), 2);
}

export function createEngine(datasets = {}) {
  const tables = {};
  const loadProblems = {};
  for (const [id, product] of Object.entries(PRODUCTS)) {
    const ds = datasets[id];
    if (!ds) continue;
    const problems = validateDataset(product, ds);
    if (problems.length) {
      loadProblems[id] = problems;
      continue;
    }
    const table = new Map(ds.records.map((r) => [keyOf(r.issueAge, r.gender, r.tobacco), r]));
    tables[id] = { table, meta: { extractedAt: ds.extractedAt, sourceSha256: ds.sourceSha256 } };
  }

  const fail = (reason, message, extra = {}) => ({ ok: false, reason, message, ...extra });

  /** Face-amount limits that apply, and where they come from. */
  function limitsFor(product, state) {
    const rule = state ? product.stateRules[state] : null;
    const increment = product.faceAmount.increment ?? null;
    if (rule?.faceAmount) return { ...rule.faceAmount, increment, verified: true, basis: `carrier (${state})` };
    if (product.faceAmount.min != null)
      return { min: product.faceAmount.min, max: product.faceAmount.max, increment, verified: product.faceAmount.verified !== false, basis: 'carrier' };
    return { min: WORKING_COVERAGE.min, max: WORKING_COVERAGE.max, increment: null, verified: false, basis: 'working range (carrier limits not in the supplied source)' };
  }

  function quote(input) {
    const { productId, age, gender, coverage } = input ?? {};
    const product = PRODUCTS[productId];
    if (!product) return fail('unknown_product', `No product "${productId}".`);
    const base = { productId, carrier: product.carrier, product: product.product, rateClass: product.planClass };
    if (!tables[productId])
      return loadProblems[productId]
        ? fail('rates_invalid', 'The rate table failed validation.', base)
        : fail('rates_not_loaded', 'The rate table for this product has not been loaded.', base);

    const state = input.state == null || input.state === '' ? null : String(input.state).toUpperCase();
    if (state && !STATES.includes(state)) return fail('invalid_state', `Unknown state "${input.state}".`, base);
    const rule = state ? product.stateRules[state] : null;
    if (rule?.unavailable) return fail('unavailable_in_state', rule.note, base);

    if (!Number.isInteger(age)) return fail('invalid_age', 'Age must be a whole number (age last birthday).', base);
    const ages = rule?.issueAges ?? product.issueAges;
    if (age < ages.min || age > ages.max)
      return fail('age_out_of_range', `Issue ages are ${ages.min}-${ages.max}${rule?.issueAges ? ` in ${state}` : ''}.`, base);
    if (!['male', 'female'].includes(gender)) return fail('invalid_gender', 'Gender must be "male" or "female".', base);
    if (typeof input.tobacco !== 'boolean') return fail('invalid_tobacco', 'Tobacco must be true or false.', base);
    if (!Number.isInteger(coverage) || coverage <= 0) return fail('invalid_coverage', 'Coverage must be a whole-dollar amount.', base);
    const limits = limitsFor(product, state);
    if (coverage < limits.min || coverage > limits.max)
      return fail(
        'coverage_out_of_range',
        `Coverage must be $${limits.min.toLocaleString('en-US')} to $${limits.max.toLocaleString('en-US')}.`,
        { ...base, limits },
      );

    // Rate lookup: the product's own tobacco classes only (Gerber has one
    // rate whatever the tobacco answer); a state's unisex rule picks the
    // table's gender.
    const tobaccoClass = product.tobaccoClasses.includes('any') ? 'any' : input.tobacco ? 'tobacco' : 'non-tobacco';
    const tableGender = rule?.genderTable ?? gender;
    const rec = tables[productId].table.get(keyOf(age, tableGender, tobaccoClass));
    if (!rec) return fail('rate_missing', 'No rate for this combination.', base);

    const premium = monthlyPremium({
      coverage,
      annualRatePer1000: rec.annualRatePer1000,
      policyFee: product.policyFee,
      modalFactor: product.modalFactor,
    });
    return {
      ok: true,
      ...base,
      monthlyPremium: toFixed(premium, 2),
      monthlyPremiumCents: toCents(premium),
      inputs: { age, gender, tobacco: input.tobacco, coverage, state },
      rate: { annualRatePer1000: rec.annualRatePer1000, gender: tableGender, tobacco: tobaccoClass, sourcePage: rec.sourcePage },
      formula: { policyFee: product.policyFee, modalFactor: product.modalFactor, modalMode: product.modalMode, rounding: product.rounding },
      limits,
      stateRule: rule?.note ?? null,
      availability: { verified: Boolean(product.availability?.verified), note: product.availability?.note ?? null },
      source: { ...product.source, extractedAt: tables[productId].meta.extractedAt, sourceSha256: tables[productId].meta.sourceSha256 },
    };
  }

  /**
   * V4.29 Desired Premium: the most whole-dollar coverage whose monthly
   * premium (the same formula and rounding as quote()) is at most the given
   * monthly premium, then that coverage's ordinary quote. The product's
   * existing face-amount limits apply as in quote(); nothing is estimated.
   * input: { productId, age, gender, tobacco, state, premium: '50.00' }
   */
  function coverageForPremium(input) {
    const product = PRODUCTS[input?.productId];
    if (!product) return fail('unknown_product', `No product "${input?.productId}".`);
    const state = input.state == null || input.state === '' ? null : String(input.state).toUpperCase();
    const limits = limitsFor(product, state && STATES.includes(state) ? state : null);
    // Validates everything but the amount (rates loaded, state, age, gender, tobacco).
    const probe = quote({ ...input, coverage: limits.min });
    if (!probe.ok) return probe;
    let target;
    try { target = dec(input.premium); } catch { target = null; }
    if (!target || cmp(target, dec('0')) <= 0) return fail('invalid_premium', 'Enter a monthly premium.', { productId: probe.productId });
    const parts = { annualRatePer1000: probe.rate.annualRatePer1000, policyFee: product.policyFee, modalFactor: product.modalFactor };
    const fits = (c) => c > 0 && cmp(monthlyPremium({ ...parts, coverage: c }), target) <= 0;
    // Start from the floating-point estimate, then settle it with exact arithmetic.
    const est = ((Number(input.premium) / Number(product.modalFactor) - Number(product.policyFee)) * 1000) / Number(probe.rate.annualRatePer1000);
    let c = Math.max(0, Math.floor(Number.isFinite(est) ? est : 0));
    while (c > 0 && !fits(c)) c--;
    while (fits(c + 1)) c++;
    const base = { productId: probe.productId, carrier: probe.carrier, product: probe.product, rateClass: probe.rateClass, limits };
    if (c < 1) return fail('premium_too_low', 'This premium is below this plan\'s minimum.', base);
    if (c < limits.min) return fail('premium_below_minimum', 'This premium is below this plan\'s minimum.', base);
    if (c > limits.max) return fail('premium_above_maximum', 'This premium is above this plan\'s maximum coverage.', base);
    return quote({ ...input, coverage: c });
  }

  /** Quote several products for one applicant; unavailable ones keep their reason. No ranking or tier is assigned here. */
  const quoteMany = (input, productIds = Object.keys(PRODUCTS)) => productIds.map((productId) => quote({ ...input, productId }));

  const status = () =>
    Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, tables[id] ? 'loaded' : loadProblems[id] ? 'invalid' : 'not loaded']));

  return { quote, quoteMany, coverageForPremium, status, loadProblems };
}
