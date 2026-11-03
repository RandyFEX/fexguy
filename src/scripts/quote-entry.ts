// Where a quote funnel visit started (Randy, Quote System v5.8).
//
// The article sidebar's Get Prices module (src/components/lead/QuoteBox.astro)
// calls rememberSidebarEntry() when a visitor picks Male or Female: the
// article's title and URL, "article sidebar", the choice and the time are
// kept in this tab's sessionStorage, and the visitor goes to
// /free-quote/?gender=...&entry=sidebar&origin=<article path> (plus any UTM
// values on the article URL). The funnel (src/scripts/quote-funnel.ts) calls
// readFunnelEntry() once on load: it settles the entry record (a sidebar
// visit, a campaign visit with UTM values, or a direct visit), removes the
// gender/entry/origin parameters from the address bar (UTM values stay) and
// returns the gender to preselect. The record stays for the whole visit
// (Back, adjustments, Start New Quote) and goes with the contact submission
// into the lead record and Randy's notification. Analytics get only the entry
// type and the article's path, never a name or phone number.
import { leadSourceFields } from '@/scripts/lead-source';

export type EntryType = 'article-sidebar' | 'direct' | 'campaign';
export type Gender = 'male' | 'female';
export type QuoteEntry = { type: EntryType; title?: string; url?: string; gender?: Gender; at: string };

const KEY = 'ff:quote-entry';
const PATH_RE = /^\/[A-Za-z0-9._~\-/]{0,200}$/;
const UTM_RE = /^utm_(source|medium|campaign|term|content)$/;

const load = (): QuoteEntry | null => {
  try {
    const e = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    return e && typeof e === 'object' && typeof e.type === 'string' && typeof e.at === 'string' ? (e as QuoteEntry) : null;
  } catch {
    return null;
  }
};
const save = (e: QuoteEntry) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(e));
  } catch {}
};
const pathOf = (url?: string) => {
  try {
    return url ? new URL(url).pathname : '';
  } catch {
    return '';
  }
};

/** Article sidebar: remember this article and the choice; returns the funnel URL to open. */
export function rememberSidebarEntry(gender: Gender): string {
  const title = (document.querySelector('h1')?.textContent || document.title).replace(/\s+/g, ' ').trim().slice(0, 200);
  save({ type: 'article-sidebar', title, url: `${location.origin}${location.pathname}`, gender, at: new Date().toISOString() });
  const q = new URLSearchParams({ gender, entry: 'sidebar', origin: location.pathname });
  for (const [k, v] of new URLSearchParams(location.search)) if (UTM_RE.test(k) && v) q.set(k, v.slice(0, 200));
  return `/free-quote/?${q}`;
}

/** The funnel page, once on load: the visit's entry record and the gender to preselect. */
export function readFunnelEntry(): { entry: QuoteEntry; preselect: Gender | null; fromSidebar: boolean } {
  const params = new URLSearchParams(location.search);
  const g = params.get('gender');
  const preselect: Gender | null = g === 'male' || g === 'female' ? g : null;
  const origin = params.get('origin') ?? '';
  const now = new Date().toISOString();
  const stored = load();
  let entry: QuoteEntry | null = null;
  let fromSidebar = false;
  if (params.get('entry') === 'sidebar' && PATH_RE.test(origin)) {
    // The record the sidebar saved, when it is this article's (same tab); else
    // the article from the URL (a new tab or window: no title then).
    entry = stored?.type === 'article-sidebar' && pathOf(stored.url) === origin
      ? { ...stored, gender: preselect ?? stored.gender }
      : { type: 'article-sidebar', url: `${location.origin}${origin}`, gender: preselect ?? undefined, at: now };
    fromSidebar = true;
  } else if (preselect && !stored) {
    // A sidebar link followed without JavaScript: the referring article.
    let ref: URL | null = null;
    try {
      ref = document.referrer ? new URL(document.referrer) : null;
    } catch {}
    if (ref && ref.origin === location.origin && PATH_RE.test(ref.pathname) && ref.pathname !== location.pathname) {
      entry = { type: 'article-sidebar', url: `${ref.origin}${ref.pathname}`, gender: preselect, at: now };
      fromSidebar = true;
    }
  }
  if (!entry) entry = stored;
  if (!entry) {
    const utm = [...params.keys()].some((k) => UTM_RE.test(k)) || Boolean(leadSourceFields()['UTM Source']);
    entry = { type: utm ? 'campaign' : 'direct', at: now };
  }
  save(entry);
  if (params.has('gender') || params.has('entry') || params.has('origin')) {
    params.delete('gender');
    params.delete('entry');
    params.delete('origin');
    const rest = params.toString();
    try {
      history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
    } catch {}
  }
  return { entry, preselect, fromSidebar };
}

/** The entry fields sent with the contact submission (stored with the lead). */
export const entrySource = (e: QuoteEntry) => ({
  entryType: e.type,
  originTitle: e.title ?? '',
  originUrl: e.url ?? '',
  entryGender: e.gender ?? '',
  entryAt: e.at,
});

/** Analytics parameters: the entry type and the article's path only. */
export const entryAnalytics = (e: QuoteEntry): Record<string, string> => {
  const path = pathOf(e.url);
  return path ? { entryType: e.type, entryPath: path } : { entryType: e.type };
};
