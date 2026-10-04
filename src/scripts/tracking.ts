// GA4 + Meta Pixel, loaded directly (no GTM, no Stape, no server-side
// tagging, no Conversions API). Approved event plan:
//
//   page view                         GA4 page_view      Meta PageView
//   verified Fillout form_submit      GA4 generate_lead  Meta Lead
//   click on tel:8888629456           GA4 click_to_call  (nothing to Meta)
//
// Rules:
//  - Runs only on the production hostnames in src/config/lead.ts. Anywhere
//    else (local dev, Vercel previews) every event is logged to the console
//    instead of being sent.
//  - Never send personal information. Fillout's form_submit message carries
//    the visitor's answers; they are ignored.
//  - Meta: Automatic Advanced Matching off (no user data passed to init) and
//    automatic event setup off (autoConfig false).
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
  ga4('config', ga4Id);
  meta('set', 'autoConfig', false, metaPixelId);
  meta('init', metaPixelId);
  meta('track', 'PageView');

  const addScript = (src: string) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.head.append(s);
  };
  const loadVendors = () => {
    addScript(`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`);
    addScript('https://connect.facebook.net/en_US/fbevents.js');
  };
  if (document.readyState === 'complete') loadVendors();
  else window.addEventListener('load', loadVendors, { once: true });
} else {
  const log = (dest: string) => (...args: unknown[]) => console.info(`[tracking disabled on ${location.hostname}] ${dest}`, ...args);
  ga4 = log('GA4');
  meta = log('Meta');
  ga4('config', ga4Id);
  meta('track', 'PageView');
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

// --- Phone: tap on the website number (GA4 only) -----------------------------

document.addEventListener('click', (e) => {
  const link = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
  if (!link) return;
  const digits = (link.getAttribute('href') ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (digits === lead.phone.digits) ga4('event', 'click_to_call');
});
