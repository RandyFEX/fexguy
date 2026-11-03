// @ts-check
// The three pricing categories on /final-expense-insurance-prices/ (Pricing
// Explorer v1.0, Randy, November 2026). Each category is an explicitly
// defined set of verified products; premiums come only from the rate engine
// (createEngine().quote) and nothing is estimated or extrapolated.
//
//   Lowest Preferred Rate       lowest verified premium among the preferred
//                               products in the comparison. None are verified
//                               yet (Trinity Life, Family Benefit Life and
//                               American Amicable are planned), so the
//                               category is "pending".
//   Average Standard Rate       the arithmetic mean of the standard-class
//                               premiums of every product in its set, and
//                               only when every one of them is available for
//                               the inputs (never one carrier labelled as an
//                               average).
//   Guaranteed Acceptance Rate  the verified guaranteed-acceptance product
//                               available for the inputs.
//
// These are price comparisons, not underwriting outcomes. Carrier identities
// stay internal (attribution for the lead), never shown as readable text.

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
/** @param {string} id */
const code = (id) => /** @type {Record<string, string>} */ (ATTRIBUTION_CODES)[id] ?? 'FF-000';
export const COVERAGE = { min: 5000, max: 25000, presets: [5000, 10000, 15000, 20000, 25000], default: 10000 };
export const AGES = { min: 50, max: 89 };

/** @typedef {'lowest' | 'average' | 'guaranteed'} CategoryRule */
export const CATEGORIES = [
  { id: 'lowest-preferred', label: 'Lowest Preferred Rate', rule: /** @type {CategoryRule} */ ('lowest'), products: [] },
  {
    id: 'average-standard',
    label: 'Average Standard Rate',
    rule: /** @type {CategoryRule} */ ('average'),
    products: ['aetna-accendo-standard', 'moo-living-promise-level'],
  },
  { id: 'guaranteed-acceptance', label: 'Guaranteed Acceptance Rate', rule: /** @type {CategoryRule} */ ('guaranteed'), products: ['gerber-guaranteed-life'] },
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
    const base = { id: cat.id, label: cat.label, attribution: [] };
    if (cat.products.length === 0)
      return { ...base, status: 'pending', message: 'Rates for this category are being added.' };

    const quotes = cat.products.map((productId) => engine.quote({ ...applicant, productId }));
    const ok = quotes.filter((q) => q.ok);

    if (cat.rule === 'average') {
      if (ok.length !== cat.products.length) {
        const failed = quotes.find((q) => !q.ok);
        const reason = failed?.reason;
        if (reason === 'rates_not_loaded' || reason === 'rates_invalid') return { ...base, status: 'unavailable', message: 'Prices are not available right now.' };
        return { ...base, status: 'unavailable', message: UNAVAILABLE[/** @type {keyof typeof UNAVAILABLE} */ (reason)] ?? 'Not available for these choices.' };
      }
      const cents = meanCents(ok.map((q) => q.monthlyPremiumCents));
      return { ...base, status: 'ok', monthlyPremiumCents: cents, monthlyPremium: (cents / 100).toFixed(2), attribution: ok.map((q) => code(q.productId)) };
    }

    if (!ok.length) {
      const reason = quotes[0]?.reason;
      if (reason === 'rates_not_loaded' || reason === 'rates_invalid') return { ...base, status: 'unavailable', message: 'Prices are not available right now.' };
      return { ...base, status: 'unavailable', message: UNAVAILABLE[/** @type {keyof typeof UNAVAILABLE} */ (reason)] ?? 'Not available for these choices.' };
    }
    const best = ok.reduce((a, b) => (b.monthlyPremiumCents < a.monthlyPremiumCents ? b : a));
    return { ...base, status: 'ok', monthlyPremiumCents: best.monthlyPremiumCents, monthlyPremium: best.monthlyPremium, attribution: [code(best.productId)] };
  });
}
