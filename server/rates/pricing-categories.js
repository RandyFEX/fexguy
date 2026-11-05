// @ts-check
// The three pricing categories on /free-quote/ (Pricing Explorer v1.0;
// V3.9, Randy, November 2026). Premiums come only from the rate engine
// (createEngine().quote); nothing is estimated or extrapolated.
//
//   Lowest Competitive Preferred Rate   the lowest verified premium among the
//                                       competitive products available for the
//                                       visitor's age, gender, tobacco answer
//                                       and coverage (COMPETITIVE_PRODUCTS)
//   Second Competitive Preferred Rate   the second-lowest of them (unavailable
//                                       when fewer than two are available)
//   Guaranteed Acceptance Rate          the verified Gerber guaranteed-acceptance
//                                       product available for the inputs
//
// The category ids stay as before ('lowest-preferred', 'average-standard',
// 'guaranteed-acceptance') so analytics, the Apply Now handoff and the intake
// keep working. These are price comparisons, not underwriting outcomes.

export const REFERENCE_STATE = 'TX';

/** Opaque attribution codes sent to the browser and the lead form instead of
 *  product ids or carrier names (the identity stays internal):
 *    FF-101  Aetna CVS / Accendo Final Expense, Standard class
 *    FF-102  Mutual of Omaha Living Promise, Level Benefit
 *    FF-201  Gerber Life Guaranteed Life (monthly ACH) */
export const ATTRIBUTION_CODES = {
  'aetna-accendo-standard': 'FF-101',
  'moo-living-promise-level': 'FF-102',
  'gerber-guaranteed-life': 'FF-201',
};
/** Carrier and plan names shown only to a verified visitor (never before verification). */
export const CARRIER_DISPLAY = {
  // timing: the coverage timing of the priced benefit tier (Level/Standard
  // pay the full benefit from the first day; Gerber Guaranteed Life is a
  // two-year graded benefit). logo: the carrier's own artwork (CVS/aetna as
  // supplied by Randy; null would show the carrier name in plain text).
  'FF-101': { carrier: 'Aetna', plan: 'Accendo Final Expense', timing: 'First-Day Coverage', logo: '/images/carriers/cvs-aetna-logo.png' },
  'FF-102': { carrier: 'Mutual of Omaha', plan: 'Living Promise', timing: 'First-Day Coverage', logo: '/images/carriers/mutual-of-omaha-logo.jpg' },
  // subtitle (v3.8): the card's consumer-facing line when it differs from the
  // official product name, which stays in plan for records and analytics.
  'FF-201': { carrier: 'Gerber Life', plan: 'Guaranteed Life', subtitle: 'No Health Questions', timing: '2-Year Waiting Period', logo: '/images/carriers/gerber-life-logo.png' },
};
/** @typedef {{ carrier: string, plan: string, subtitle?: string, timing: string, logo: string | null }} CarrierDisplay */
/** @param {string} c */
const display = (c) => /** @type {Record<string, CarrierDisplay>} */ (CARRIER_DISPLAY)[c] ?? null;
/** @param {string} id */
const code = (id) => /** @type {Record<string, string>} */ (ATTRIBUTION_CODES)[id] ?? 'FF-000';
export const COVERAGE = { min: 5000, max: 25000, presets: [5000, 10000, 15000, 20000, 25000], default: 10000 };
export const AGES = { min: 50, max: 89 };

/** An average needs at least this many verified products (kept for the 'average' rule). */
export const MIN_AVERAGE_PRODUCTS = 2;

/** V3.9: the verified competitive products ranked for the first two cards. */
export const COMPETITIVE_PRODUCTS = ['moo-living-promise-level', 'aetna-accendo-standard'];

/** @typedef {'lowest' | 'average' | 'guaranteed' | 'ranked'} CategoryRule */
/** @typedef {{ id: string, label: string, averageLabel?: string, rule: CategoryRule, products: string[], rank?: number }} Category */
/** @type {Category[]} */
export const CATEGORIES = [
  { id: 'lowest-preferred', label: 'Lowest Competitive Preferred Rate', rule: 'ranked', rank: 0, products: COMPETITIVE_PRODUCTS },
  { id: 'average-standard', label: 'Second Competitive Preferred Rate', rule: 'ranked', rank: 1, products: COMPETITIVE_PRODUCTS },
  { id: 'guaranteed-acceptance', label: 'Guaranteed Acceptance Rate', rule: 'guaranteed', products: ['gerber-guaranteed-life'] },
];

const UNAVAILABLE = {
  age_out_of_range: 'Not available at this age.',
  coverage_out_of_range: 'Not available for this coverage amount.',
  unavailable_in_state: 'Not available in this state.',
};

/** Mean of whole-cent premiums, rounded half up to the cent (exact integers). @param {number[]} cents */
export function meanCents(cents) {
  const sum = cents.reduce((a, c) => a + c, 0);
  return Math.floor((2 * sum + cents.length) / (2 * cents.length));
}

/**
 * Quotes every category for one applicant (Texas reference pricing).
 * @param {{ quote: (i: any) => any }} engine
 * @param {{ age: number, gender: 'male' | 'female', tobacco: boolean, coverage: number }} input
 */
export function priceCategories(engine, input) {
  const applicant = { ...input, state: REFERENCE_STATE };
  return CATEGORIES.map((cat) => {
    const averaged = cat.rule === 'average' && cat.products.length >= MIN_AVERAGE_PRODUCTS;
    const label = averaged ? cat.averageLabel ?? cat.label : cat.label;
    const base = { id: cat.id, label, attribution: [], carriers: [] };
    if (cat.products.length === 0) return { ...base, status: 'pending', message: 'Rates for this category are being added.' };

    const quotes = cat.products.map((productId) => engine.quote({ ...applicant, productId }));
    const ok = quotes.filter((q) => q.ok);

    if (averaged) {
      if (ok.length !== cat.products.length) {
        const failed = quotes.find((q) => !q.ok);
        const reason = failed?.reason;
        if (reason === 'rates_not_loaded' || reason === 'rates_invalid') return { ...base, status: 'unavailable', message: 'Prices are not available right now.' };
        return { ...base, status: 'unavailable', message: UNAVAILABLE[/** @type {keyof typeof UNAVAILABLE} */ (reason)] ?? 'Not available for these choices.' };
      }
      const cents = meanCents(ok.map((q) => q.monthlyPremiumCents));
      const codes = ok.map((q) => code(q.productId));
      return { ...base, status: 'ok', monthlyPremiumCents: cents, monthlyPremium: (cents / 100).toFixed(2), attribution: codes, carriers: codes.map(display) };
    }

    // V3.9: the competitive products sorted by premium (cheapest first; ties
    // keep the COMPETITIVE_PRODUCTS order); this card takes its rank.
    if (cat.rule === 'ranked') {
      const sorted = [...ok].sort((a, b) => a.monthlyPremiumCents - b.monthlyPremiumCents);
      const pick = sorted[cat.rank ?? 0];
      if (!pick) {
        const failed = quotes.find((q) => !q.ok);
        const reason = failed?.reason;
        if (reason === 'rates_not_loaded' || reason === 'rates_invalid') return { ...base, status: 'unavailable', message: 'Prices are not available right now.' };
        return { ...base, status: 'unavailable', message: UNAVAILABLE[/** @type {keyof typeof UNAVAILABLE} */ (reason)] ?? 'Not available for these choices.' };
      }
      return { ...base, status: 'ok', monthlyPremiumCents: pick.monthlyPremiumCents, monthlyPremium: pick.monthlyPremium, attribution: [code(pick.productId)], carriers: [display(code(pick.productId))] };
    }

    if (!ok.length) {
      const reason = quotes[0]?.reason;
      if (reason === 'rates_not_loaded' || reason === 'rates_invalid') return { ...base, status: 'unavailable', message: 'Prices are not available right now.' };
      return { ...base, status: 'unavailable', message: UNAVAILABLE[/** @type {keyof typeof UNAVAILABLE} */ (reason)] ?? 'Not available for these choices.' };
    }
    const best = ok.reduce((a, b) => (b.monthlyPremiumCents < a.monthlyPremiumCents ? b : a));
    return { ...base, status: 'ok', monthlyPremiumCents: best.monthlyPremiumCents, monthlyPremium: best.monthlyPremium, attribution: [code(best.productId)], carriers: [display(code(best.productId))] };
  });
}
