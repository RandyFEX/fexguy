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

export const CRM_TAG = 'Funeral Funds - Website Quote';
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
  // the rest (last name with any suffix, e.g. "Smith Jr.").
  const full = String(record.firstName ?? '').trim().replace(/\s+/g, ' ');
  const [first, ...rest] = full.split(' ');
  return compact({ locationId, name: full, firstName: first, lastName: rest.join(' '), phone: record.phone, state: record.state, source: 'Funeral Funds Website Quote' });
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
 * @returns {Promise<{ sent: boolean, ok?: boolean, step?: string, status?: number, contactId?: string, isNew?: boolean, error?: string }>}
 */
export async function sendLeadToCrm(env, record, rates = [], fetchImpl = fetch) {
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
  let step = 'upsert';
  try {
    const up = await call('/contacts/upsert', crmContact(record, locationId));
    const contactId = up.data?.contact?.id;
    if (!up.res.ok || typeof contactId !== 'string') return { sent: true, ok: false, step, status: up.res.status };
    step = 'tags';
    const tag = await call(`/contacts/${encodeURIComponent(contactId)}/tags`, { tags: [CRM_TAG] });
    step = 'note';
    const note = await call(`/contacts/${encodeURIComponent(contactId)}/notes`, { body: crmNote(record, rates) });
    const ok = tag.res.ok && note.res.ok;
    return { sent: true, ok, step: ok ? 'done' : !tag.res.ok ? 'tags' : 'note', status: ok ? up.res.status : !tag.res.ok ? tag.res.status : note.res.status, contactId, isNew: up.data?.new === true };
  } catch (e) {
    return { sent: true, ok: false, step, error: e instanceof Error ? e.name : 'error' };
  }
}

// Immediate rate SMS (Randy, November 2026): one text after SEE MY RATES with
// the lowest displayed monthly rate for $10,000, sent through the same
// GoHighLevel location to the contact just created or updated
// (POST /conversations/messages, type SMS; needs the token's
// conversations/message.write scope). Randy's approved wording; $XX.XX is the
// rate.
export const RATE_SMS_COVERAGE = 10000;
/** @param {string} premium e.g. "32.87" */
export const rateSmsText = (premium) =>
  `Funeral Funds: Your lowest monthly rate shown for $10,000 of life insurance is $${premium}, but lower cost plans do exist.\n\n` +
  'So keep playing around with my rate quoter for the remainder of your 10 minutes to find something within your budget.\n\n' +
  "Have questions? Just reply to this text or give me a call. I\u2019ll be happy to help.";

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} contactId
 * @param {string} message
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: boolean, status?: number, messageId?: string, error?: string }>}
 */
export async function sendCrmSms(env, contactId, message, fetchImpl = fetch) {
  const token = env.AGENT_CRM_TOKEN ?? '';
  if (!token || !contactId) return { ok: false, error: 'not-configured' };
  try {
    const res = await fetchImpl(`${API}/conversations/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, version: '2021-04-15', 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ type: 'SMS', contactId, message }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /** @type {any} */
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, messageId: typeof data?.messageId === 'string' ? data.messageId : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : 'error' };
  }
}
