// Product definitions for the Funeral Funds rate engine (Randy, November
// 2026, Rate Engine V2.0). Formula terms (policy fee, modal factor), rate
// class and issue ages are Randy's verified instructions, checked against
// the carriers' own guides where a guide was supplied. The rate tables
// themselves are NOT here: they are producer-only material and this
// repository is public, so they live in the git-ignored private/ folder
// (see README.md).
//
// Monthly premium = ROUND(((coverage / 1000 x annual rate) + policy fee)
//                         x monthly modal factor, 2)

/** @typedef {'male' | 'female'} Gender */
/** @typedef {'non-tobacco' | 'tobacco' | 'any'} TobaccoClass */

export const PRODUCTS = {
  'aetna-accendo-standard': {
    id: 'aetna-accendo-standard',
    carrier: 'Aetna CVS / Accendo Insurance Company',
    product: 'Final Expense Whole Life, Level plan',
    planClass: 'Standard',
    policyFee: '40',
    modalFactor: '0.0875',
    modalMode: 'Monthly EFT',
    rounding: 'nearest whole cent (half up)',
    issueAges: { min: 40, max: 89 },
    tobaccoClasses: ['non-tobacco', 'tobacco'],
    // The supplied guide gives no face-amount limits.
    faceAmount: { min: null, max: null, source: null },
    stateRules: {},
    source: {
      document: '2026 AETNA ACCENDO RATE GUIDE.pdf',
      form: 'ACCFE06153 (012021)',
      effective: 'Effective June 2020 (printed on the rate card)',
      ratePage: 2,
      termsPage: 1,
      verification: 'Confirmed by Randy against current agent quoting software (November 2026)',
    },
  },
  'moo-living-promise-level': {
    id: 'moo-living-promise-level',
    carrier: 'Mutual of Omaha (United of Omaha Life Insurance Company)',
    product: 'Living Promise Whole Life, Level Benefit plan',
    planClass: 'Level Benefit',
    policyFee: '36',
    modalFactor: '0.089',
    modalMode: 'Monthly bank draft (BSP)',
    rounding: 'nearest cent (half up)',
    issueAges: { min: 45, max: 85 },
    tobaccoClasses: ['non-tobacco', 'tobacco'],
    faceAmount: { min: 2000, max: 40000, source: 'Guide page 2: Face Amounts $2,000 - $40,000 (in WA, $5,000 - $40,000)' },
    stateRules: {
      // Guide page 3: "In MT only, Unisex rates apply. The male rates listed
      // apply to Unisex rates in MT."
      MT: { genderTable: 'male', note: 'Unisex rates: the male rates apply (guide page 3).' },
      // Guide page 2: WA face amounts $5,000 - $40,000.
      WA: { faceAmount: { min: 5000, max: 40000 }, note: 'WA face amounts $5,000 - $40,000 (guide page 2).' },
      // Guide back page: "United of Omaha does not conduct business in New York."
      NY: { unavailable: true, note: 'United of Omaha does not conduct business in New York (guide back page).' },
    },
    source: {
      document: '2026 MOO LIVING PROMISE UNDERWRITING - RATE GUIDE.pdf',
      form: '461606',
      effective: null,
      ratePage: 3,
      termsPage: 2,
      verification: 'Confirmed by Randy against current agent quoting software (November 2026)',
    },
  },
  'gerber-guaranteed-life': {
    id: 'gerber-guaranteed-life',
    carrier: 'Gerber Life Insurance Company',
    product: 'Guaranteed Life Insurance (whole life)',
    planClass: 'Guaranteed acceptance',
    policyFee: '11',
    modalFactor: '0.083334',
    modalMode: 'Monthly ACH',
    rounding: 'nearest cent (half up)',
    issueAges: { min: 50, max: 80 },
    // One rate per age and gender: smokers and non-smokers pay the same.
    tobaccoClasses: ['any'],
    // The supplied card prints premiums for $5,000 - $25,000 only.
    faceAmount: { min: 5000, max: 25000, source: 'Rate card page 1 prints $5,000 - $25,000 (other amounts: Gerber agent portal)' },
    stateRules: {
      // Rate card footer: "Guaranteed Life is issued in all states except MT.
      // ... Maximum face amount is $15,000 in South Dakota. For New York
      // residents, the maximum issue age is 75."
      MT: { unavailable: true, note: 'Guaranteed Life is not issued in MT (rate card footer).' },
      SD: { faceAmount: { min: 5000, max: 15000 }, note: 'Maximum face amount $15,000 in SD (rate card footer).' },
      NY: { issueAges: { min: 50, max: 75 }, note: 'Maximum issue age 75 in NY (rate card footer).' },
    },
    source: {
      document: '2026 GERBER RATE CARD.pdf',
      form: 'GL-RC (0922)',
      effective: 'Form date 09/2022 (the GL-RC-2 10-25 calculator Randy named was not available)',
      ratePage: 1,
      termsPage: 1,
      verification:
        'The card prints monthly ACH premiums, not annual rates. Each annual rate per $1,000 is the one 2-decimal value that reproduces all five printed premiums with the $11 fee and 0.083334 factor (unique for all 62 age/gender rows). Needs Randy\'s approval.',
    },
    // Randy's verified premiums (age 60, $10,000, monthly ACH).
    benchmarks: [
      { age: 60, gender: 'male', coverage: 10000, monthly: '63.89' },
      { age: 60, gender: 'female', coverage: 10000, monthly: '51.06' },
    ],
  },
};

/** The coverage amounts Randy listed for generated premium tables. Used as
 * the quotable range only where the carrier's own face limits weren't in
 * the supplied source (shown as such in every result). */
export const WORKING_COVERAGE = { min: 5000, max: 25000, amounts: [5000, 10000, 15000, 20000, 25000] };

export const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
