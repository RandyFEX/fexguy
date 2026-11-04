// GA4 + Meta Pixel, loaded directly (no GTM, no Stape, no server-side
// tagging, no Conversions API). Approved event plan:
//
//   page view                         GA4 page_view      Meta PageView
//   confirmed lead, on /help/         GA4 generate_lead  Meta Lead
//   SMS-verified quote funnel lead    GA4 generate_lead  Meta Lead
//   (native form → Formspark; or a verified Fillout form_submit, rollback)
//   click on tel:8888629456           GA4 click_to_call  (nothing to Meta)
//   click on any call link on a page  GA4 click_to_call  (nothing to Meta)
//   whose <body> has track-page-calls (/facebook/, campaign number)
//   quote funnel steps (Quote System v2.2)  GA4 quote_* events  (nothing to Meta)
//
// Rules:
//  - Runs only on the production hostnames in src/config/lead.ts. Anywhere
//    else (local dev, Vercel previews) every event is logged to the console
//    instead of being sent.
//  - Never send personal information. Fillout's form_submit message carries
//    the visitor's answers; they are ignored.
//  - Meta: Automatic Advanced Matching off (no user data passed to init) and
//    automatic event setup off (autoConfig false).
//  - Site search terms (?q= / ?s=) never reach GA4 or Meta. An inline script
//    in BaseLayout removes them from the address bar before this runs; as a
//    second line of defense GA4 gets an explicit page_location/page_referrer
//    with q and s removed, and Meta (which reads the URL and referrer itself)
//    is skipped on a page view whose URL or referrer still carries them.
//  - The vendor libraries load after the page has finished loading, so they
//    don't compete with the page's own content.
import { lead } from '@/config/lead';

type Fn = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Fn;
    fbq?: Fn & { callMethod?: Fn; queue?: unknown[]; push?: Fn; loaded?: boolean; version?: string };
    _fbq?: unknown;
  }
}

const { ga4Id, metaPixelId, productionHosts } = lead.tracking;
const live = (productionHosts as readonly string[]).includes(location.hostname);

// --- Search-term privacy -----------------------------------------------------

const SEARCH_PARAMS = ['q', 's'];
const hasSearchTerm = (url: string) => {
  try {
    const u = new URL(url);
    return u.origin === location.origin && SEARCH_PARAMS.some((k) => u.searchParams.has(k));
  } catch {
    return false;
  }
};
/** The URL with q and s removed; every other parameter is kept. */
const withoutSearchTerm = (url: string) => {
  try {
    const u = new URL(url);
    if (u.origin !== location.origin) return url;
    for (const k of SEARCH_PARAMS) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
};
const pageLocation = withoutSearchTerm(location.href);
const pageReferrer = withoutSearchTerm(document.referrer);
const metaAllowed = !hasSearchTerm(location.href) && !hasSearchTerm(document.referrer);

// --- Senders --------------------------------------------------------------

let ga4: Fn;
let meta: Fn;

if (live) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js requires the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  ga4 = window.gtag;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    } as NonNullable<Window['fbq']>;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }
  meta = window.fbq!;

  ga4('js', new Date());
  ga4('config', ga4Id, { page_location: pageLocation, page_referrer: pageReferrer });
  if (metaAllowed) {
    meta('set', 'autoConfig', false, metaPixelId);
    meta('init', metaPixelId);
    meta('track', 'PageView');
  }

  const addScript = (src: string) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.head.append(s);
  };
  const loadVendors = () => {
    addScript(`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`);
    if (metaAllowed) addScript('https://connect.facebook.net/en_US/fbevents.js');
  };
  if (document.readyState === 'complete') loadVendors();
  else window.addEventListener('load', loadVendors, { once: true });
} else {
  const log = (dest: string) => (...args: unknown[]) => console.info(`[tracking disabled on ${location.hostname}] ${dest}`, ...args);
  ga4 = log('GA4');
  meta = log('Meta');
  ga4('config', ga4Id, { page_location: pageLocation, page_referrer: pageReferrer });
  if (metaAllowed) meta('track', 'PageView');
}

// --- Lead: verified Fillout submission --------------------------------------

const counted = new Set<string>();
const alreadyCounted = (id: string) => {
  if (counted.has(id)) return true;
  counted.add(id);
  try {
    const key = `lead:${id}`;
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage unavailable: the in-memory set still prevents double counting.
  }
  return false;
};

/** The Fillout iframe on this page that sent the message, if any. */
const filloutFrameFor = (source: MessageEventSource | null, embedId: string) =>
  Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe')).find(
    (f) =>
      f.contentWindow === source &&
      f.src.startsWith(`${lead.fillout.embedOrigin}/`) &&
      new URL(f.src).searchParams.get('fillout-embed-id') === embedId,
  );

window.addEventListener('message', (e: MessageEvent) => {
  if (e.origin !== lead.fillout.embedOrigin) return;
  const data = e.data as { type?: unknown; embedId?: unknown; submissionUuid?: unknown } | null;
  // Exact type match: Fillout's anti-spam widget also posts messages that
  // merely contain the text "form_submit".
  if (!data || typeof data !== 'object' || data.type !== 'form_submit') return;
  if (typeof data.embedId !== 'string' || typeof data.submissionUuid !== 'string') return;
  if (!filloutFrameFor(e.source, data.embedId)) return;
  if (alreadyCounted(data.submissionUuid)) return;
  // Only the fact that a lead happened is sent — never the form answers.
  ga4('event', 'generate_lead');
  meta('track', 'Lead');
});

// --- Lead: confirmed native-form (Formspark) submission ---------------------
// src/scripts/lead-form.ts sets a one-time flag only after Formspark confirms
// a submission, then opens the success page (/help/). The flag is removed
// before anything is sent, so a reload, Back/Forward or a later visit can't
// count the same lead again; a direct visit (no flag) never counts. Flags
// older than an hour are discarded rather than counted.

const LEAD_FLAG_MAX_AGE_MS = 60 * 60 * 1000;

if (location.pathname === lead.formspark.successPath) {
  let pending: { id?: unknown; at?: unknown } | null = null;
  try {
    const raw = sessionStorage.getItem(lead.formspark.pendingLeadKey);
    sessionStorage.removeItem(lead.formspark.pendingLeadKey);
    pending = raw ? JSON.parse(raw) : null;
  } catch {
    pending = null;
  }
  const fresh =
    pending &&
    typeof pending.id === 'string' &&
    typeof pending.at === 'number' &&
    Date.now() - pending.at < LEAD_FLAG_MAX_AGE_MS;
  if (fresh && !alreadyCounted(pending!.id as string)) {
    // Only the fact that a lead happened is sent — never the form answers.
    ga4('event', 'generate_lead');
    meta('track', 'Lead');
  }
}

// --- Lead: verified quote funnel lead ----------------------------------------
// src/scripts/quote-funnel.ts sends ff:lead with the lead id only when the
// server reports that this check SMS-verified the lead (never in test or
// temporary-code mode). The server accepts a lead's code once; the id is
// also remembered for the tab, so a repeat never counts twice. The id is
// used only for that and is never sent.

window.addEventListener('ff:lead', (e) => {
  const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id) || alreadyCounted(`quote:${id}`)) return;
  ga4('event', 'generate_lead');
  meta('track', 'Lead');
});

// --- Phone: tap on the website number (GA4 only) -----------------------------

document.addEventListener('click', (e) => {
  const link = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
  if (!link) return;
  const digits = (link.getAttribute('href') ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (digits === lead.phone.digits || document.body.classList.contains('track-page-calls')) ga4('event', 'click_to_call');
});

// --- Quote funnel (GA4 only; Randy, November 2026, Quote System v2.2) ---------
// src/scripts/quote-funnel.ts dispatches `ff:funnel` events on window. Only
// these event names and a step number or category label are sent, never a
// name, phone number, state or any other personal information, and nothing
// goes to Meta.

const FUNNEL_EVENTS = new Set([
  'quote_funnel_start',
  'quote_step_complete',
  'quote_contact_submit',
  'quote_sms_request',
  'quote_sms_verified',
  'quote_pricing_view',
  'quote_pricing_adjust',
  'quote_apply_now',
  'quote_call_click',
  // v5.8: funnel entry (every load of /free-quote/) and an article sidebar choice.
  'quote_funnel_entry',
  'quote_sidebar_select',
  // v5.9: CALL NOW in an article's Get Pricing module (a tap, never a completed call).
  'quote_module_call_click',
]);
const ENTRY_TYPES = new Set(['article-sidebar', 'direct', 'campaign']);
const FUNNEL_CATEGORIES = new Set(['lowest-preferred', 'average-standard', 'guaranteed-acceptance']);

window.addEventListener('ff:funnel', (e) => {
  const detail = (e as CustomEvent<{ name?: unknown; step?: unknown; category?: unknown; carrier?: unknown; product?: unknown; coverage?: unknown; premium?: unknown; quoteRef?: unknown; at?: unknown; entryType?: unknown; entryPath?: unknown; placement?: unknown }>).detail ?? {};
  if (typeof detail.name !== 'string' || !FUNNEL_EVENTS.has(detail.name)) return;
  const params: Record<string, string | number> = {};
  if (typeof detail.step === 'number' && Number.isInteger(detail.step) && detail.step >= 1 && detail.step <= 9) params.funnel_step = detail.step;
  if (typeof detail.category === 'string' && FUNNEL_CATEGORIES.has(detail.category)) params.price_category = detail.category;
  // v5.8: where the visit started: the entry type and the article's path (never personal data).
  if (typeof detail.entryType === 'string' && ENTRY_TYPES.has(detail.entryType)) params.entry_type = detail.entryType;
  if (detail.placement === 'sidebar' || detail.placement === 'in-article') params.module_placement = detail.placement;
  if (typeof detail.entryPath === 'string' && /^\/[A-Za-z0-9._~\-/]{0,200}$/.test(detail.entryPath)) params.entry_path = detail.entryPath;
  // "Call to Get Approved" taps (v3.7): which quote was on the card when the
  // visitor tapped it. A company or plan name, the coverage and premium shown,
  // a random per-visit quote reference and the time; never a name or phone
  // number, and nothing to Meta. A tap is not a completed call.
  if (detail.name === 'quote_call_click') {
    const label = (v: unknown) => (typeof v === 'string' && /^[A-Za-z][A-Za-z .&'/-]{0,59}$/.test(v) ? v : null);
    const carrier = label(detail.carrier);
    const product = label(detail.product);
    if (carrier) params.carrier = carrier;
    if (product) params.product = product;
    if (typeof detail.coverage === 'number' && Number.isInteger(detail.coverage) && detail.coverage >= 5000 && detail.coverage <= 25000) params.coverage_amount = detail.coverage;
    if (typeof detail.premium === 'string' && /^\d{1,4}\.\d{2}$/.test(detail.premium)) params.monthly_premium = Number(detail.premium);
    if (typeof detail.quoteRef === 'string' && /^[A-Za-z0-9]{12,32}$/.test(detail.quoteRef)) params.quote_ref = detail.quoteRef;
    if (typeof detail.at === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(detail.at)) params.event_time = detail.at;
  }
  ga4('event', detail.name, params);
});
