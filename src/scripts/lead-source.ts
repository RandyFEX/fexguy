// Where a lead came from, sent with the lead form to Formspark (and so in
// Randy's notification email). Nothing here goes to GA4 or Meta.
//
// On the first page of a browsing session (this tab's sessionStorage), it
// records the landing page (address without its query string), the external
// referrer's host, and any UTM parameters; later pages keep that record, and
// add UTM parameters only if the session had none yet. At submission,
// leadSourceFields() returns the submission page plus that record. Nothing
// else from the address is kept: no other query parameters, no search terms
// (BaseLayout removes ?q/?s first), no referrer paths, and ad click IDs only
// as "present".

const KEY = 'fexguy:lead-source';
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
/** Ad click IDs, reported only as the ad platform (never the ID itself). */
const CLICK_IDS: [string, string][] = [
  ['gclid', 'Google Ads click'],
  ['gbraid', 'Google Ads click'],
  ['wbraid', 'Google Ads click'],
  ['fbclid', 'Facebook/Instagram click'],
  ['msclkid', 'Microsoft Ads click'],
];

type Source = {
  landing: string;
  referrer: string;
  utm: Partial<Record<(typeof UTM)[number], string>>;
  click: string;
};

/** Page address without query string or fragment. */
const pageUrl = () => location.origin + location.pathname;

const clean = (value: string) => value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);

function fromCurrentPage(): Source {
  const params = new URLSearchParams(location.search);
  const utm: Source['utm'] = {};
  for (const key of UTM) {
    const value = params.get(key);
    if (value && clean(value)) utm[key] = clean(value);
  }
  let referrer = '';
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    const own = (host: string) => host.replace(/^www\./, '');
    if (ref && /^https?:$/.test(ref.protocol) && own(ref.hostname) !== own(location.hostname)) {
      referrer = ref.hostname;
    }
  } catch {
    // Unreadable referrer: treated as unknown.
  }
  const click = CLICK_IDS.find(([id]) => params.has(id))?.[1] ?? '';
  return { landing: pageUrl(), referrer, utm, click };
}

function read(): Source | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Source) : null;
  } catch {
    return null;
  }
}

function write(source: Source) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(source));
  } catch {
    // Storage blocked: fields fall back to this page (see leadSourceFields).
  }
}

/** Call once per page view, before the visitor can submit. */
export function recordVisit() {
  const current = fromCurrentPage();
  const stored = read();
  if (!stored) return write(current);
  // A campaign link clicked later in the same session still counts.
  if (!Object.keys(stored.utm).length && Object.keys(current.utm).length) {
    write({ ...stored, utm: current.utm, click: stored.click || current.click });
  }
}

/** The hidden lead-form fields, by field name. Empty values are left out. */
export function leadSourceFields(): Record<string, string> {
  const source = read() ?? fromCurrentPage();
  const { utm } = source;
  let traffic = 'Unknown';
  if (utm.utm_source) traffic = `Campaign: ${[utm.utm_source, utm.utm_medium].filter(Boolean).join(' / ')}`;
  else if (source.click) traffic = source.click;
  else if (source.referrer) traffic = `Referral: ${source.referrer}`;

  return {
    'Submission Page': pageUrl(),
    'Landing Page': source.landing || 'Unknown',
    'Traffic Source': traffic,
    Referrer: source.referrer,
    'UTM Source': utm.utm_source ?? '',
    'UTM Medium': utm.utm_medium ?? '',
    'UTM Campaign': utm.utm_campaign ?? '',
    'UTM Term': utm.utm_term ?? '',
    'UTM Content': utm.utm_content ?? '',
  };
}
