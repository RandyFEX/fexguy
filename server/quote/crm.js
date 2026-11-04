// @ts-check
// Agent CRM (GoHighLevel) delivery (Randy, November 2026, v1.2): each quote
// lead is POSTed as JSON to the Agent CRM Inbound Webhook named in the
// server-only variable AGENT_CRM_WEBHOOK_URL, after the lead record is saved.
// The workflow behind the webhook creates or updates the contact and adds the
// tag. Without the variable nothing is sent. A failure never stops the
// visitor (rates still unlock); the outcome is logged on the lead's events
// so a failed delivery can be resent. One delivery per lead (sent once, at
// contact submission, when the lead id is created). The URL is never logged,
// returned or sent to the browser.

const TIMEOUT_MS = 4000;

/** @param {string} e164 */
const nationalPhone = (e164) => e164.replace(/^\+1/, '');

/**
 * The webhook body: flat keys so Agent CRM can map them. Empty values are left
 * out, so the CRM never overwrites a contact's details with blanks.
 * @param {any} record the saved lead record
 */
export function crmPayload(record) {
  const name = String(record.firstName ?? '').trim();
  const [first, ...rest] = name.split(/\s+/);
  const s = record.source ?? {};
  const q = record.quoteAtSubmission ?? {};
  /** @type {Record<string, unknown>} */
  const out = {
    lead_id: record.leadId,
    phone: nationalPhone(record.phone),
    first_name: first,
    last_name: rest.join(' '),
    state: record.state,
    coverage_amount: q.coverage,
    estimated_monthly_rate: record.estimatedMonthlyRate,
    lead_source: s.trafficSource || s.utmSource || (s.entryType === 'article-sidebar' ? 'Article sidebar' : '') || 'Website',
    utm_source: s.utmSource,
    utm_medium: s.utmMedium,
    utm_campaign: s.utmCampaign,
    landing_page: s.landingPage,
    age: q.age,
    gender: q.gender,
    tobacco: typeof q.tobacco === 'boolean' ? (q.tobacco ? 'yes' : 'no') : undefined,
    intended_use: record.intendedUse?.label,
    consent_given: record.consent?.given ? 'yes' : 'no',
    consent_at: record.consent?.given ? record.consent.at : undefined,
    phone_verified: 'no',
    submitted_at: record.submittedAt,
    test_lead: /^\s*test\b/i.test(name) ? 'yes' : undefined,
  };
  for (const [k, v] of Object.entries(out)) if (v === undefined || v === null || v === '') delete out[k];
  return out;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {any} record
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ sent: boolean, ok?: boolean, status?: number, error?: string }>}
 */
export async function sendLeadToCrm(env, record, fetchImpl = fetch) {
  const url = env.AGENT_CRM_WEBHOOK_URL ?? '';
  if (!/^https:\/\/[^\s]+$/.test(url)) return { sent: false };
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(crmPayload(record)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { sent: true, ok: res.ok, status: res.status };
  } catch (e) {
    return { sent: true, ok: false, error: e instanceof Error ? e.name : 'error' };
  }
}
