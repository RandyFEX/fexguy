// Direct preview access (Randy, November 2026, V1.1): PREVIEW AND LOCAL ONLY.
//
//   /free-quote/?preview=results  the real results page, unlocked with a fixed,
//                                 non-personal sample (three cards, live controls)
//   /facebook/?preview=apply      the real Ready to Apply page with that sample's
//                                 Standard Rate selection
//
// Each link starts a fresh visit in this browser (this browser's ff:quote-*
// storage is cleared, so both countdowns start over), asks the server for the
// preview sample session (server/quote/handler.js 'preview-sample': refused on
// the production deployment and whenever real SMS verification is set up),
// and then runs the page's normal code. Nothing is sent to a CRM, no SMS or
// email is sent, and no lead is created: the server keeps one fixed sample
// record (mode 'preview-sample') in the preview store.
//
// __FF_PREVIEW_TOOLS__ is set at build time (astro.config.mjs): false when
// Vercel builds the production deployment, so the production pages never
// carry this entry at all.
import { saveHandoff } from '@/scripts/quote-handoff';

declare const __FF_PREVIEW_TOOLS__: boolean;
const ENABLED = typeof __FF_PREVIEW_TOOLS__ !== 'undefined' && __FF_PREVIEW_TOOLS__;

export type PreviewPage = 'results' | 'apply';

/** The requested preview page, read once; null on production builds or without ?preview=. */
export function previewRequest(): PreviewPage | null {
  if (!ENABLED) return null;
  const v = new URLSearchParams(location.search).get('preview');
  return v === 'results' || v === 'apply' ? v : null;
}

/** A fresh visit: clears this browser's quote storage, sets a new visit id, drops ?preview= from the address. */
export function startPreviewVisit(): string {
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith('ff:quote-')) store.removeItem(k);
    } catch {}
  }
  const visit = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32).padEnd(16, '0');
  try {
    localStorage.setItem('ff:quote-visit', visit);
  } catch {}
  const params = new URLSearchParams(location.search);
  params.delete('preview');
  const rest = params.toString();
  try {
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  } catch {}
  return visit;
}

const post = async (url: string, visit: string, body: unknown) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Quote-Visit': visit }, body: JSON.stringify(body), credentials: 'same-origin' });
  return { http: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
};

/** The preview sample session for this visit (sets the session cookie). */
export const previewSession = (visit: string) => post('/api/quote/', visit, { action: 'preview-sample' });

/** /facebook/?preview=apply: the sample's server-priced Standard Rate selection as the Apply Now handoff. */
export async function preparePreviewApply(): Promise<void> {
  const visit = startPreviewVisit();
  const s = await previewSession(visit).catch(() => null);
  if (!s || s.http !== 200 || s.body.status !== 'verified') return;
  const quote = s.body.quote;
  const p = await post('/api/price-explorer/', visit, quote).catch(() => null);
  const cat = p?.http === 200 ? (p.body.categories ?? []).find((c: any) => c.id === 'average-standard' && c.status === 'ok') : null;
  if (!cat) return;
  const first = (cat.carriers ?? []).find(Boolean) ?? null;
  saveHandoff({
    selection: { tierId: cat.id, tier: cat.label, carrier: first?.carrier ?? null, plan: first?.plan ?? null, coverage: quote.coverage, monthlyPremium: String(cat.monthlyPremium) },
    inputs: { age: quote.age, gender: quote.gender, tobacco: quote.tobacco, intendedUse: 'burial', state: 'Texas' },
    attribution: { preview: 'sample' },
    ...(typeof s.body.expiresAt === 'number' ? { expiresAt: s.body.expiresAt } : {}),
  });
}
