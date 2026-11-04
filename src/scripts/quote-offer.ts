// Two-stage countdown timers (Randy, November 2026, V2.0): the /free-quote/
// results screen ("Offer available for: 10:00") and the /facebook/ Ready to
// Apply screen ("Your offer is available for: 2:00").
//
// Each timer starts when its screen first appears in this visit and is kept
// as an expiration timestamp in localStorage, tied to the funnel's visit id
// (ff:quote-visit), so a refresh, a revisit or a pricing change never
// restarts it. At 0:00 the screen's offer view expires and Start New Quote
// begins a fresh visit: it ends the verified session (the existing
// end-session action; the lead's records are kept), clears this browser's
// quote storage and opens /free-quote/ at the first question. The server's
// session, the rate engine and the SMS verification are unchanged.

export type OfferKind = 'results' | 'apply';
export const OFFER_MS: Record<OfferKind, number> = { results: 10 * 60 * 1000, apply: 2 * 60 * 1000 };
const KEYS: Record<OfferKind, string> = { results: 'ff:quote-offer-results', apply: 'ff:quote-offer-apply' };
const VISIT_KEY = 'ff:quote-visit';

const visit = () => {
  try {
    return localStorage.getItem(VISIT_KEY) ?? '';
  } catch {
    return '';
  }
};

/** This visit's expiration time for the timer, set on the screen's first appearance. */
export function offerExpiresAt(kind: OfferKind, now = Date.now()): number {
  const v = visit();
  try {
    const r = JSON.parse(localStorage.getItem(KEYS[kind]) ?? 'null');
    if (r && r.visit === v && typeof r.expiresAt === 'number' && r.expiresAt - now <= OFFER_MS[kind]) return r.expiresAt;
  } catch {}
  const expiresAt = now + OFFER_MS[kind];
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify({ visit: v, expiresAt }));
  } catch {}
  return expiresAt;
}

/** m:ss, e.g. 10:00, 1:59, 0:00. */
export const formatRemaining = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Counts down in `el` every second; calls onExpire once at 0:00. Returns a stop function. */
export function runCountdown(el: HTMLElement, expiresAt: number, onExpire: () => void): () => void {
  let done = false;
  let id: number | undefined;
  const tick = () => {
    const left = expiresAt - Date.now();
    el.textContent = formatRemaining(left);
    if (left <= 0 && !done) {
      done = true;
      window.clearInterval(id);
      onExpire();
    }
  };
  tick();
  if (!done) id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}

/** Start New Quote after an expired offer: end the session, clear quote storage, open the first question. */
export async function restartQuote(): Promise<void> {
  try {
    await fetch('/api/quote/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Quote-Visit': visit() },
      body: JSON.stringify({ action: 'end-session' }),
      credentials: 'same-origin',
    });
  } catch {}
  for (const store of [localStorage, sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith('ff:quote-')) store.removeItem(k);
    } catch {}
  }
  location.assign('/free-quote/');
}
