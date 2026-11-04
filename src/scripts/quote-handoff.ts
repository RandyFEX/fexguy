// Apply Now handoff (Randy, November 2026): a temporary phone-assisted
// application. When a verified visitor clicks Apply Now on a /free-quote/
// pricing card, the funnel saves the selected quote here and opens
// /facebook/, which shows it ("Your Selected Coverage") above the call
// button.
//
// Storage: this tab's sessionStorage only (no database, service or cookie);
// gone when the tab closes, replaced by every new Apply Now, ignored when
// older than MAX_AGE_MS or malformed. Nothing medical is stored: the selected
// card (tier, carrier, plan, coverage, server-priced monthly premium), the
// non-medical quote inputs and the visit's existing attribution. The record
// is versioned and structured for a future CRM integration; nothing here
// sends it anywhere. (The server already keeps the Apply Now selection in the
// visitor's Redis lead record, as before.)

export const HANDOFF_KEY = 'ff:quote-handoff';
export const HANDOFF_VERSION = 1;
export const MAX_AGE_MS = 60 * 60 * 1000;
const TIERS: Record<string, string[]> = {
  'lowest-preferred': ['Lowest Preferred Rate'],
  'average-standard': ['Standard Rate', 'Average Standard Rate'],
  'guaranteed-acceptance': ['Guaranteed Acceptance Rate'],
};

export type QuoteHandoff = {
  v: number;
  createdAt: number;
  origin: 'free-quote';
  selection: { tierId: string; tier: string; carrier: string | null; plan: string | null; coverage: number; monthlyPremium: string };
  inputs: { age: number; gender: 'male' | 'female'; tobacco: boolean; intendedUse: string | null; state: string | null };
  attribution: Record<string, string>;
};

/** Saves the selected quote for /facebook/. Never throws. */
export function saveHandoff(record: Omit<QuoteHandoff, 'v' | 'createdAt' | 'origin'>): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ v: HANDOFF_VERSION, createdAt: Date.now(), origin: 'free-quote', ...record }));
  } catch {}
}

/** The saved quote if it is present, recent and valid; otherwise null. */
export function readHandoff(now = Date.now()): QuoteHandoff | null {
  let r: any;
  try {
    r = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) ?? 'null');
  } catch {
    return null;
  }
  if (!r || typeof r !== 'object' || r.v !== HANDOFF_VERSION || r.origin !== 'free-quote') return null;
  if (typeof r.createdAt !== 'number' || now - r.createdAt < 0 || now - r.createdAt > MAX_AGE_MS) return null;
  const s = r.selection;
  if (!s || typeof s !== 'object' || !TIERS[s.tierId]?.includes(s.tier)) return null;
  if (!Number.isInteger(s.coverage) || s.coverage < 5000 || s.coverage > 25000) return null;
  if (typeof s.monthlyPremium !== 'string' || !/^\d{1,4}\.\d{2}$/.test(s.monthlyPremium) || Number(s.monthlyPremium) <= 0) return null;
  return r as QuoteHandoff;
}
