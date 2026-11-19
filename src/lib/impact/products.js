// Financial Impact Calculator: the products it can compare (PREVIEW, Randy's
// V5.6 assignment, not approved for publication).
//
// Browser-safe: opaque codes, display names, issue ages and the benefit
// schedules only. No rates. Premiums for the rate-engine products come from
// POST /api/impact-calculator/ (server/impact/handler.js). Colonial Penn is
// priced from its published unit price and the verified coverage-per-unit
// table in src/data/colonial-penn-units.json.
//
// Adding a product later (e.g. TruStage, Royal Neighbors): add an entry with
// status 'verified' once its rate table and benefit schedule are verified,
// and a pricing source on the server. Entries with status 'pending' are never
// shown or priced.

/**
 * @typedef {{ months: string, natural: 'face' | 'premiums-plus-10' | 'premiums-plus-contract', note: string }} BenefitPeriod
 * @typedef {{
 *   code: string, carrier: string, plan: string, type: 'Level' | 'Graded' | 'Modified' | 'Guaranteed acceptance',
 *   status: 'verified' | 'pending', ages: { min: number, max: number }, tobacco: boolean,
 *   timing: string, schedule: BenefitPeriod[], source: string, pricing: 'engine' | 'units',
 * }} ImpactProduct
 */

/** @type {ImpactProduct[]} */
export const IMPACT_PRODUCTS = [
  {
    code: 'FF-102',
    carrier: 'Mutual of Omaha',
    plan: 'Living Promise Level',
    type: 'Level',
    status: 'verified',
    ages: { min: 50, max: 85 },
    tobacco: true,
    timing: 'Full benefit from day one',
    schedule: [{ months: '1 onward', natural: 'face', note: 'Full death benefit from the first day.' }],
    source: '2026 Mutual of Omaha Living Promise underwriting and rate guide (Level Benefit, bank draft)',
    pricing: 'engine',
  },
  {
    code: 'FF-103',
    carrier: 'Aetna',
    plan: 'Accendo Final Expense Preferred',
    type: 'Level',
    status: 'verified',
    ages: { min: 50, max: 85 },
    tobacco: true,
    timing: 'Full benefit from day one',
    schedule: [{ months: '1 onward', natural: 'face', note: 'Full death benefit from the first day.' }],
    source: '2026 Aetna Accendo rate guide (Preferred class, EFT)',
    pricing: 'engine',
  },
  {
    code: 'FF-201',
    carrier: 'Gerber Life',
    plan: 'Guaranteed Life',
    type: 'Guaranteed acceptance',
    status: 'verified',
    ages: { min: 50, max: 80 },
    tobacco: false,
    timing: '2-year waiting period',
    schedule: [
      { months: '1 to 24', natural: 'premiums-plus-10', note: 'Death from natural causes: premiums paid plus 10%.' },
      { months: '25 onward', natural: 'face', note: 'Full death benefit.' },
    ],
    source: 'Gerber Life Guaranteed Life rate card GL-RC 0922 (monthly ACH); benefit schedule from the approved Health Question Search record',
    pricing: 'engine',
  },
  {
    code: 'CP-GA',
    carrier: 'Colonial Penn',
    plan: 'Guaranteed Acceptance',
    type: 'Guaranteed acceptance',
    status: 'verified',
    ages: { min: 50, max: 80 },
    tobacco: false,
    timing: '2-year limited benefit period',
    schedule: [
      { months: '1 to 24', natural: 'premiums-plus-contract', note: 'Death from natural causes: premiums paid plus an additional amount set by the policy.' },
      { months: '25 onward', natural: 'face', note: 'Full death benefit.' },
    ],
    source: "$9.95 per unit; coverage per unit by age and sex from Randy's Colonial Penn price list (October 2026); 25-unit maximum",
    pricing: 'units',
  },
  {
    code: 'TS-GA',
    carrier: 'TruStage',
    plan: 'Guaranteed Acceptance Whole Life',
    type: 'Guaranteed acceptance',
    status: 'pending',
    ages: { min: 50, max: 80 },
    tobacco: false,
    timing: 'Waiting period (to be verified)',
    schedule: [],
    source: 'Rate table and benefit schedule not yet supplied',
    pricing: 'engine',
  },
  {
    code: 'RN-GI',
    carrier: 'Royal Neighbors of America',
    plan: 'Guaranteed issue (product to be confirmed)',
    type: 'Guaranteed acceptance',
    status: 'pending',
    ages: { min: 50, max: 80 },
    tobacco: false,
    timing: 'Waiting period (to be verified)',
    schedule: [],
    source: 'Rate table or formula, fee, modal factor and benefit schedule not yet supplied',
    pricing: 'engine',
  },
];

export const VERIFIED_PRODUCTS = IMPACT_PRODUCTS.filter((p) => p.status === 'verified');
export const BENCHMARK_CODE = 'FF-102';
export const CP_UNIT_PRICE = 9.95;
export const CP_MAX_UNITS = 25;

/** The calculator's default comparison (no visitor input needed). */
export const DEFAULT_INPUT = { age: 65, gender: 'female', tobacco: false, coverage: 10000, codes: ['CP-GA', 'FF-201', 'FF-103', 'FF-102'] };

/** Default food assumptions (labeled assumptions, editable by the visitor). */
export const FOOD_DEFAULTS = { mealCost: 10, caloriesPerMeal: 667, caloriesPerDay: 2000 };

export const AGES = { min: 50, max: 85 };
export const COVERAGE_PRESETS = [5000, 10000, 15000, 20000, 25000];
