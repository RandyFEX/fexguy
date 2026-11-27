// @ts-check
// Agent CRM (GoHighLevel) delivery (Randy, November 2026): after a quote lead
// is saved, the server creates or updates its contact through the GoHighLevel
// Contacts API with the Private Integration token in the server-only
// variables AGENT_CRM_TOKEN and AGENT_CRM_LOCATION_ID (contacts.write):
//   1. POST /contacts/upsert    name, phone, state, source (the location's own
//      duplicate rules match an existing contact; empty values are never sent)
//   2. POST /contacts/:id/tags  adds "Funeral Funds - Website Quote" (existing
//      tags are kept)
//   3. POST /contacts/:id/notes the quote details, estimated monthly rates,
//      attribution, consent and verification status, and the lead id
// Without the variables nothing is sent. V3.3 (Randy, November 2026): on the
// production deployment the rates open only after a successful delivery; a
// failure keeps the saved lead, is logged on its events, and the visitor's
// retry re-delivers the same lead (server/quote/handler.js 'start'). The
// token is never logged, returned or sent to the browser.

import { STATE_ABBR, writeComments } from './comments.js';

export const CRM_TAG = 'Funeral Funds - Website Quote';
// V4.42 (Randy, November 2026): leads from /get-rates/ (Facebook ads) get
// their own source and tag, for a separate Agent CRM workflow; /free-quote/
// keeps the website values. One tag per lead, never both.
export const FACEBOOK_CRM_TAG = 'funeral funds - facebook quote';
export const CRM_SOURCE = 'Funeral Funds Website Quote';
export const FACEBOOK_CRM_SOURCE = 'Funeral Funds Facebook Quote';
/** @param {any} record */
const isFacebookFunnel = (record) => record?.funnel === 'get-rates';
/** @param {any} record */
export const crmTag = (record) => (isFacebookFunnel(record) ? FACEBOOK_CRM_TAG : CRM_TAG);
/** V1.9: the original funnel entry, by the funnel validated at SEE MY RATES (never /apply/ or /about/). @param {any} record */
export const funnelSource = (record) => (isFacebookFunnel(record) ? 'Facebook' : 'Website');
/** @param {any} record */
export const funnelUrl = (record) => `https://funeralfunds.com/${isFacebookFunnel(record) ? 'get-rates' : 'free-quote'}/`;
/** @param {any} record */
export const crmSource = (record) => (isFacebookFunnel(record) ? FACEBOOK_CRM_SOURCE : CRM_SOURCE);
const API = 'https://services.leadconnectorhq.com';
const TIMEOUT_MS = 5000;

/** @param {Record<string, unknown>} o */
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** @param {any} record */
export function leadSource(record) {
  const s = record.source ?? {};
  return s.trafficSource || s.utmSource || (s.entryType === 'article-sidebar' ? 'Article sidebar' : '') || 'Website';
}

/** Contact fields for the upsert. @param {any} record @param {string} locationId */
export function crmContact(record, locationId) {
  // V3.7: the visitor's full name as typed (`name`), split into first name and
  // the rest (last name with any suffix, e.g. "Smith Jr."). A first name alone
  // (V1.1) sends no last name (empty values are never sent).
  const full = String(record.firstName ?? '').trim().replace(/\s+/g, ' ');
  const [first, ...rest] = full.split(' ');
  // V1.9 (Randy, November 2026): the native State field gets the two-letter postal code
  // (the format in GoHighLevel's contact API examples, e.g. "TX").
  return compact({ locationId, name: full, firstName: first, lastName: rest.join(' '), phone: record.phone, state: STATE_ABBR[record.state] ?? record.state, source: crmSource(record) });
}

/**
 * The note: everything Randy needs for the call.
 * @param {any} record
 * @param {{ label: string, monthlyPremium?: string | null, status: string }[]} [rates]
 */
export function crmNote(record, rates = []) {
  const q = record.quoteAtSubmission ?? {};
  const s = record.source ?? {};
  const v = record.verification ?? {};
  const money = (/** @type {number} */ n) => `$${Number(n).toLocaleString('en-US')}`;
  const lines = [
    /^\s*test\b/i.test(record.firstName ?? '') ? 'TEST LEAD (not a real customer)' : null,
    'Funeral Funds website quote',
    `Quote page: /${isFacebookFunnel(record) ? 'get-rates' : 'free-quote'}/`,
    // V1.9: the original funnel, kept from the first page for the whole journey.
    `Lead Source: ${funnelSource(record)}`,
    `URL: ${funnelUrl(record)}`,
    `Lead ID: ${record.leadId}`,
    `Submitted: ${record.submittedAt}`,
    q.coverage ? `Coverage requested: ${money(q.coverage)}` : null,
    ...rates.filter((r) => r.status === 'ok' && r.monthlyPremium).map((r) => `Estimated monthly rate, ${r.label}: $${r.monthlyPremium}`),
    q.age ? `Age: ${q.age}` : null,
    q.gender ? `Gender: ${q.gender === 'female' ? 'Female' : 'Male'}` : null,
    typeof q.tobacco === 'boolean' ? `Tobacco: ${q.tobacco ? 'Yes' : 'No'}` : null,
    record.state ? `State: ${record.state}` : null,
    `Lead source: ${leadSource(record)}`,
    s.utmSource ? `UTM source: ${s.utmSource}` : null,
    s.utmMedium ? `UTM medium: ${s.utmMedium}` : null,
    s.utmCampaign ? `UTM campaign: ${s.utmCampaign}` : null,
    s.utmContent ? `UTM content: ${s.utmContent}` : null,
    s.landingPage ? `Landing page: ${s.landingPage}` : null,
    s.originUrl ? `Article: ${s.originUrl}` : null,
    record.firstName ? `Full name: ${String(record.firstName).trim()}` : null,
    record.consent?.given
      ? `Consent to calls/texts: Yes, ${record.consent.method === 'button-submission' ? 'by clicking SEE MY RATES under the disclosure' : 'box checked'} (${record.consent.at}, ${record.consent.version})`
      : 'Consent to calls/texts: Not given',
    record.consent?.given && record.consent.text ? `Consent text: ${record.consent.text}` : null,
    // V3.3: no SMS verification; the number is exactly as the visitor typed it.
    `Phone verification: ${v.provider === 'temporary-public-test-code' ? 'not SMS-verified (temporary access code)' : 'not verified (no SMS verification)'}`,
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {any} record the saved lead record
 * @param {{ label: string, monthlyPremium?: string | null, status: string }[]} [rates]
 * @param {typeof fetch} [fetchImpl]
 * @param {string | null} [lowest10k] the lowest displayed monthly rate for $10,000 ("32.87"), saved on the contact for GoHighLevel's text
 * @param {string | null} [comments] the Comments summary (server/quote/comments.js), written before the tag
 * @returns {Promise<{ sent: boolean, ok?: boolean, step?: string, status?: number, contactId?: string, isNew?: boolean, error?: string, rateField?: number | string | null, customFields?: string | null, commentsField?: string | null }>}
 */
export async function sendLeadToCrm(env, record, rates = [], fetchImpl = fetch, lowest10k = null, comments = null) {
  const token = env.AGENT_CRM_TOKEN ?? '';
  const locationId = env.AGENT_CRM_LOCATION_ID ?? '';
  if (!token || !locationId) return { sent: false };
  const call = async (/** @type {string} */ path, /** @type {unknown} */ body, method = 'POST') => {
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, version: '2021-07-28', 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch {}
    return { res, data };
  };
  let step = 'upsert';
  try {
    // V4.36: coverage_amount and monthly_premium ride on the upsert itself, so
    // they are on the contact before any workflow runs. If GoHighLevel refuses
    // them, the upsert is repeated without them (the lead is never lost).
    const quoteFields = quoteCustomFields(lowest10k, record.quoteAtSubmission);
    let up = await call('/contacts/upsert', quoteFields ? { ...crmContact(record, locationId), customFields: quoteFields } : crmContact(record, locationId));
    // V4.41: whether Agent CRM accepted the custom fields (logged on the lead's events).
    /** @type {string | null} */
    let customFields = quoteFields ? 'accepted' : null;
    if (quoteFields && !up.res.ok) {
      customFields = `refused-${up.res.status}`;
      up = await call('/contacts/upsert', crmContact(record, locationId));
    }
    const contactId = up.data?.contact?.id;
    if (!up.res.ok || typeof contactId !== 'string') return { sent: true, ok: false, step, status: up.res.status };
    // The rate first (best effort), so the tag's workflow can already use it.
    /** @type {number | string | null} */
    let rateField = null;
    if (lowest10k) {
      try {
        const f = await call(`/contacts/${encodeURIComponent(contactId)}`, { customFields: [{ key: RATE_FIELD_KEY, field_value: lowest10k }] }, 'PUT');
        rateField = f.res.status;
      } catch (e) {
        rateField = e instanceof Error ? e.name : 'error';
      }
    }
    // V1.4: the Comments summary (best effort, logged), also before the tag.
    /** @type {string | null} */
    let commentsField = null;
    if (comments) {
      try {
        commentsField = await writeComments(call, locationId, contactId, comments);
      } catch (e) {
        commentsField = e instanceof Error ? e.name : 'error';
      }
    }
    step = 'tags';
    const tag = await call(`/contacts/${encodeURIComponent(contactId)}/tags`, { tags: [crmTag(record)] });
    step = 'note';
    const note = await call(`/contacts/${encodeURIComponent(contactId)}/notes`, { body: crmNote(record, rates) });
    const ok = tag.res.ok && note.res.ok;
    return { sent: true, ok, step: ok ? 'done' : !tag.res.ok ? 'tags' : 'note', status: ok ? up.res.status : !tag.res.ok ? tag.res.status : note.res.status, contactId, isNew: up.data?.new === true, rateField, customFields, commentsField };
  } catch (e) {
    return { sent: true, ok: false, step, error: e instanceof Error ? e.name : 'error' };
  }
}

// Rate text (Randy, November 2026): GoHighLevel sends the first text itself.
// The site saves the lowest displayed monthly rate for $10,000 (e.g. "32.87")
// on the contact's custom field "Lowest 10k Rate" (key contact.lowest_10k_rate)
// right after the upsert and BEFORE the tag is added, so a workflow triggered
// by the tag "Funeral Funds - Website Quote" can send it with
// {{contact.lowest_10k_rate}}. A failure to save the field never blocks the lead.
export const RATE_FIELD_KEY = 'lowest_10k_rate';
export const RATE_FIELD_COVERAGE = 10000;

// V4.36 (Randy, November 2026): the quote's coverage and its lowest monthly
// premium for the Agent CRM fields {{contact.coverage_amount}} and
// {{contact.monthly_premium}} (API keys without the "contact." prefix), from
// the same $10,000 quote as lowest_10k_rate. Plain numbers ("10000",
// "32.87") so number, monetary and text fields all accept them.
export const COVERAGE_FIELD_KEY = 'coverage_amount';
export const PREMIUM_FIELD_KEY = 'monthly_premium';
// V4.41 (Randy, November 2026): Age and Gender (Single Line custom fields
// {{contact.age}} and {{contact.gender}}) from the quote the visitor submitted,
// sent with the same key convention ("age", "gender"; "35", "Male"/"Female").
export const AGE_FIELD_KEY = 'age';
export const GENDER_FIELD_KEY = 'gender';
/** @param {string | null} lowest10k @param {any} [quote] the quote at submission */
export function quoteCustomFields(lowest10k, quote = {}) {
  const q = quote ?? {};
  const fields = [];
  if (Number.isInteger(q.age)) fields.push({ key: AGE_FIELD_KEY, field_value: String(q.age) });
  if (q.gender === 'male' || q.gender === 'female') fields.push({ key: GENDER_FIELD_KEY, field_value: q.gender === 'female' ? 'Female' : 'Male' });
  if (lowest10k) {
    fields.push({ key: COVERAGE_FIELD_KEY, field_value: String(RATE_FIELD_COVERAGE) });
    fields.push({ key: PREMIUM_FIELD_KEY, field_value: lowest10k });
  }
  return fields.length ? fields : null;
}

// Personalized quote vCard (Randy, November 2026; server/quote/vcard.js): the
// first download of a lead's SAVE THIS QUOTE TO YOUR PHONE card updates its
// EXISTING contact once: the tag below (a GoHighLevel workflow on this tag
// can set the dialing status and notify Randy) and a note with the coverage
// and the displayed rates. The contact is the one saved at delivery
// (record.crm.contactId); only an older lead without it is matched by the
// same upsert (the location's duplicate rules), never a new duplicate.
export const QUOTE_DOWNLOADED_TAG = 'Quote Downloaded';

/** @param {any} record @param {{ at: Date, quote: any, lines: string[] }} d */
export function quoteDownloadNote(record, d) {
  const q = d.quote ?? {};
  return [
    /^\s*test\b/i.test(record.firstName ?? '') ? 'TEST LEAD (not a real customer)' : null,
    'Quote Downloaded: the customer downloaded the personalized quote contact card (SAVE THIS QUOTE TO YOUR PHONE).',
    `Downloaded: ${d.at.toISOString()} (${d.at.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' })} Central)`,
    'premium' in q ? `Monthly budget: $${q.premium}` : `Coverage: $${Number(q.coverage).toLocaleString('en-US')}`,
    ...d.lines.map((l) => `Displayed rate, ${l}`),
    `Lead ID: ${record.leadId}`,
    "Saving the contact on the phone can't be confirmed by the website.",
  ].filter(Boolean).join('\n');
}

/**
 * @param {Record<string, string | undefined>} env @param {any} record
 * @param {{ at: Date, quote: any, lines: string[] }} d @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ sent: boolean, ok?: boolean, step?: string, status?: number, contactId?: string, error?: string }>}
 */
export async function sendQuoteDownloadToCrm(env, record, d, fetchImpl = fetch) {
  const token = env.AGENT_CRM_TOKEN ?? '';
  const locationId = env.AGENT_CRM_LOCATION_ID ?? '';
  if (!token || !locationId) return { sent: false };
  const call = async (/** @type {string} */ path, /** @type {unknown} */ body) => {
    const res = await fetchImpl(`${API}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, version: '2021-07-28', 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch {}
    return { res, data };
  };
  let step = 'contact';
  try {
    let contactId = record.crm?.contactId;
    if (typeof contactId !== 'string' || !contactId) {
      const up = await call('/contacts/upsert', crmContact(record, locationId));
      contactId = up.data?.contact?.id;
      if (!up.res.ok || typeof contactId !== 'string') return { sent: true, ok: false, step, status: up.res.status };
    }
    step = 'tags';
    const tag = await call(`/contacts/${encodeURIComponent(contactId)}/tags`, { tags: [QUOTE_DOWNLOADED_TAG] });
    step = 'note';
    const note = await call(`/contacts/${encodeURIComponent(contactId)}/notes`, { body: quoteDownloadNote(record, d) });
    const ok = tag.res.ok && note.res.ok;
    return { sent: true, ok, step: ok ? 'done' : !tag.res.ok ? 'tags' : 'note', status: !tag.res.ok ? tag.res.status : note.res.status, contactId };
  } catch (e) {
    return { sent: true, ok: false, step, error: e instanceof Error ? e.name : 'error' };
  }
}

// 10 Easy Questions (Randy, November 2026; server/quote/application.js; V1.4):
// a submitted questionnaire updates the lead's EXISTING contact once: its
// Comments field gets the extended summary (server/quote/comments.js; never a
// note), and only after that write succeeds the tag below is added (a
// GoHighLevel workflow on it can notify Randy and mark the lead high intent).
export const APPLICATION_TAG = 'Application Questionnaire Completed';

/**
 * @param {Record<string, string | undefined>} env @param {any} record
 * @param {{ comments: string }} d @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ sent: boolean, ok?: boolean, step?: string, status?: number, contactId?: string, error?: string, commentsField?: string }>}
 */
export async function sendApplicationToCrm(env, record, d, fetchImpl = fetch) {
  const token = env.AGENT_CRM_TOKEN ?? '';
  const locationId = env.AGENT_CRM_LOCATION_ID ?? '';
  if (!token || !locationId) return { sent: false };
  const call = async (/** @type {string} */ path, /** @type {unknown} */ body, method = 'POST') => {
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, version: '2021-07-28', 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch {}
    return { res, data };
  };
  let step = 'contact';
  try {
    let contactId = record.crm?.contactId;
    if (typeof contactId !== 'string' || !contactId) {
      const up = await call('/contacts/upsert', crmContact(record, locationId));
      contactId = up.data?.contact?.id;
      if (!up.res.ok || typeof contactId !== 'string') return { sent: true, ok: false, step, status: up.res.status };
    }
    step = 'comments';
    const commentsField = await writeComments(call, locationId, contactId, d.comments);
    if (!commentsField.startsWith('updated')) return { sent: true, ok: false, step, contactId, commentsField };
    step = 'tags';
    const tag = await call(`/contacts/${encodeURIComponent(contactId)}/tags`, { tags: [APPLICATION_TAG] });
    return { sent: true, ok: tag.res.ok, step: tag.res.ok ? 'done' : 'tags', status: tag.res.status, contactId, commentsField };
  } catch (e) {
    return { sent: true, ok: false, step, error: e instanceof Error ? e.name : 'error' };
  }
}
