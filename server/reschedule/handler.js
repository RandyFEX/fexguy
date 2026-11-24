// @ts-check
// Reschedule Follow-Up (Randy, November 2026, V3): a private callback
// scheduling form at /reschedule/ (vercel.json rewrites it to
// api/reschedule.js). Not a page of the static site: it is served only by this
// function, behind its own one-field password page (Randy, November 2026: no
// user name, no browser popup). The server-only password RESCHEDULE_PASSWORD
// (without it the URL answers 404) unlocks a signed HttpOnly cookie that lasts
// a year on that browser; changing the password signs every browser out.
// noindex/nofollow, out of the sitemap and navigation.
//
// On submit, through the existing Agent CRM (GoHighLevel) integration
// (AGENT_CRM_TOKEN, AGENT_CRM_LOCATION_ID; server/quote/crm.js):
//   1. POST /contacts/upsert: name and the normalized phone, with the three
//      number fields callback_delay_hours, callback_frequency_hours and
//      callback_duration_days (a refusal stops here: nothing else is changed)
//   2. rescheduling cleanup: the contact is removed from the callback workflow
//      (CALLBACK_WORKFLOW_ID, optional) and the "Callback Scheduled" tag is
//      removed, so re-adding it starts exactly one new sequence
//   3. POST /contacts/:id/notes: the comments and the schedule, appended
//   4. POST /contacts/:id/tags: "Callback Scheduled", last, which starts the
//      GoHighLevel workflow (all waiting and calling logic lives there)
// CRM writes happen only on the production deployment (VERCEL_ENV=production);
// previews validate and answer with a dry run, so nothing reaches Agent CRM.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { toE164US } from '../quote/phone.js';
import { renderLoginPage, renderReschedulePage } from './page.js';

const API = 'https://services.leadconnectorhq.com';
const TIMEOUT_MS = 8000;

export const CALLBACK_TAG = 'Callback Scheduled';
/** Agent CRM workflow "2026 Callback Follow-Up" (Randy, November 2026). Not a
 * secret (it only works with the server-side token); the environment variable
 * CALLBACK_WORKFLOW_ID overrides it. */
export const DEFAULT_CALLBACK_WORKFLOW_ID = '4689ea7a-83cd-4c27-a0c3-bff8363248a7';
export const FIELD_DELAY = 'callback_delay_hours';
export const FIELD_FREQUENCY = 'callback_frequency_hours';
export const FIELD_DURATION = 'callback_duration_days';
/** Allowed follow-up frequencies, in hours (labels shown on the form). */
export const FREQUENCIES = /** @type {const} */ ([
  { hours: 2, label: 'Every 2 hours' },
  { hours: 3, label: 'Every 3 hours' },
  { hours: 24, label: 'Once a day' },
  { hours: 48, label: 'Every other day' },
]);
export const DURATIONS = /** @type {const} */ ([7, 14, 30, 45, 60]);
export const DEFAULTS = { days: 1, hours: 0, frequency: 3, duration: 30 };
const MAX_DAYS = 365;
const MAX_HOURS = 999;

const HEADERS = {
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'no-store',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
};

/** @param {number} status @param {unknown} body */
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, 'content-type': 'application/json; charset=utf-8' } });

const digest = (/** @type {string} */ s) => createHash('sha256').update(s).digest();

export const COOKIE = 'ff_rs';
const COOKIE_DAYS = 365;
const key = (/** @type {string} */ password) => digest(`ff-reschedule:${password}`);
const sign = (/** @type {string} */ password, /** @type {string} */ exp) => createHmac('sha256', key(password)).update(exp).digest('hex');

/** True when the password matches RESCHEDULE_PASSWORD (constant time). @param {unknown} given @param {string} password */
export const passwordMatches = (given, password) => typeof given === 'string' && given.length <= 200 && timingSafeEqual(digest(given), digest(password));

/** The Set-Cookie value that keeps this browser signed in. @param {string} password @param {number} nowMs */
export function loginCookie(password, nowMs) {
  const exp = String(Math.floor(nowMs / 1000) + COOKIE_DAYS * 86400);
  return `${COOKIE}=${exp}.${sign(password, exp)}; Max-Age=${COOKIE_DAYS * 86400}; Path=/reschedule/; HttpOnly; Secure; SameSite=Strict`;
}

/** Whether the request carries a valid, unexpired sign-in cookie. @param {Request} request @param {string} password @param {number} nowMs */
export function signedIn(request, password, nowMs) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([a-f0-9]{64})(?:;|$)`).exec(request.headers.get('cookie') ?? '');
  if (!m) return false;
  if (Number(m[1]) * 1000 < nowMs) return false;
  return timingSafeEqual(Buffer.from(m[2], 'hex'), Buffer.from(sign(password, m[1]), 'hex'));
}

/** "1 day and 8 hours" @param {number} total hours */
export function describeDelay(total) {
  const d = Math.floor(total / 24);
  const h = total % 24;
  const part = (/** @type {number} */ n, /** @type {string} */ u) => `${n} ${u}${n === 1 ? '' : 's'}`;
  if (!d && !h) return 'right away';
  return [d ? part(d, 'day') : '', h ? part(h, 'hour') : ''].filter(Boolean).join(' and ');
}

/**
 * Validates and normalizes a submission.
 * @param {any} body
 * @returns {{ ok: true, value: { name: string, phone: string, notes: string, delayHours: number, frequencyHours: number, durationDays: number } } | { ok: false, errors: Record<string, string> }}
 */
export function parseSubmission(body) {
  /** @type {Record<string, string>} */
  const errors = {};
  const b = body && typeof body === 'object' ? body : {};
  const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) errors.name = 'Enter the full name.';
  else if (name.length > 100) errors.name = 'The name is too long.';
  const phone = toE164US(typeof b.phone === 'string' ? b.phone : '');
  if (!phone) errors.phone = 'Enter a valid 10-digit US phone number.';
  const notes = typeof b.notes === 'string' ? b.notes.replace(/\r\n?/g, '\n').trim() : '';
  if (notes.length > 20000) errors.notes = 'The notes are too long (20,000 characters at most).';
  const int = (/** @type {unknown} */ v) => (typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : NaN);
  const days = int(b.days);
  const hours = int(b.hours);
  if (!Number.isInteger(days) || days < 0 || days > MAX_DAYS) errors.days = `Days must be a whole number from 0 to ${MAX_DAYS}.`;
  if (!Number.isInteger(hours) || hours < 0 || hours > MAX_HOURS) errors.hours = `Hours must be a whole number from 0 to ${MAX_HOURS}.`;
  const frequencyHours = int(b.frequency);
  if (!FREQUENCIES.some((f) => f.hours === frequencyHours)) errors.frequency = 'Choose a follow-up frequency.';
  const durationDays = int(b.duration);
  if (!DURATIONS.includes(/** @type {any} */ (durationDays))) errors.duration = 'Choose how long to continue.';
  if (b.method !== 'manual') errors.method = 'Choose the calling method.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone: /** @type {string} */ (phone), notes, delayHours: days * 24 + hours, frequencyHours, durationDays } };
}

/** The appended CRM note. @param {ReturnType<typeof parseSubmission> & { ok: true }} p @param {Date} now */
export function rescheduleNote({ value: v }, now) {
  const freq = FREQUENCIES.find((f) => f.hours === v.frequencyHours)?.label ?? `Every ${v.frequencyHours} hours`;
  return [
    'Callback scheduled (Reschedule Follow-Up form)',
    `Submitted: ${now.toISOString()}`,
    `Start calling in: ${describeDelay(v.delayHours)} (${v.delayHours} hours)`,
    `Follow-up frequency: ${freq}`,
    `Continue follow-up for: ${v.durationDays} days`,
    'Calling method: Manual calls / dialer queue',
    v.notes ? `\nComments:\n${v.notes}` : null,
  ].filter((l) => l !== null).join('\n');
}

/**
 * Sends the schedule to Agent CRM. Never throws; the token is never returned or logged.
 * @param {Record<string, string | undefined>} env
 * @param {ReturnType<typeof parseSubmission> & { ok: true }} parsed
 * @param {typeof fetch} fetchImpl
 * @param {Date} now
 * @returns {Promise<{ ok: boolean, step: string, status?: number, error?: string, contactId?: string, isNew?: boolean, commentsField?: string }>}
 */
export async function sendSchedule(env, parsed, fetchImpl, now) {
  const token = env.AGENT_CRM_TOKEN ?? '';
  const locationId = env.AGENT_CRM_LOCATION_ID ?? '';
  if (!token || !locationId) return { ok: false, step: 'config' };
  const v = parsed.value;
  const call = async (/** @type {string} */ path, /** @type {string} */ method, /** @type {unknown} */ body) => {
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
    const [first, ...rest] = v.name.split(' ');
    const up = await call('/contacts/upsert', 'POST', {
      locationId,
      name: v.name,
      firstName: first,
      ...(rest.length ? { lastName: rest.join(' ') } : {}),
      phone: v.phone,
      customFields: [
        { key: FIELD_DELAY, field_value: String(v.delayHours) },
        { key: FIELD_FREQUENCY, field_value: String(v.frequencyHours) },
        { key: FIELD_DURATION, field_value: String(v.durationDays) },
      ],
    });
    const contactId = up.data?.contact?.id;
    if (!up.res.ok || typeof contactId !== 'string') return { ok: false, step, status: up.res.status };
    const id = encodeURIComponent(contactId);
    // Rescheduling: end any running sequence first (best effort: a contact
    // that isn't in the workflow or has no tag answers with an error here).
    step = 'cleanup';
    const workflowId = (env.CALLBACK_WORKFLOW_ID ?? '').trim() || DEFAULT_CALLBACK_WORKFLOW_ID;
    if (workflowId) await call(`/contacts/${id}/workflow/${encodeURIComponent(workflowId)}`, 'DELETE', {}).catch(() => null);
    await call(`/contacts/${id}/tags`, 'DELETE', { tags: [CALLBACK_TAG] }).catch(() => null);
    step = 'note';
    const note = await call(`/contacts/${id}/notes`, 'POST', { body: rescheduleNote(parsed, now) });
    if (!note.res.ok) return { ok: false, step, status: note.res.status, contactId };
    // Comments field (Randy, November 2026): the newest comments go on top of
    // the contact's "Comments" field with the date; older text stays below.
    // Best effort: a failure never blocks the schedule, but is reported.
    step = 'comments';
    /** @type {string} */
    let commentsField = 'skipped';
    if (v.notes) {
      try {
        commentsField = await prependComments(call, locationId, id, v.notes, now);
      } catch (e) {
        commentsField = e instanceof Error ? e.name : 'error';
      }
    }
    step = 'tag';
    const tag = await call(`/contacts/${id}/tags`, 'POST', { tags: [CALLBACK_TAG] });
    if (!tag.res.ok) return { ok: false, step, status: tag.res.status, contactId, commentsField };
    return { ok: true, step: 'done', contactId, isNew: up.data?.new === true, commentsField };
  } catch (e) {
    return { ok: false, step, error: e instanceof Error ? e.name : 'error' };
  }
}

export const COMMENTS_FIELD_KEY = 'comments';
const COMMENTS_MAX = 50000;

/** "11/24/2026 3:52 PM" in Randy's time zone (Central). @param {Date} now */
export const commentStamp = (now) =>
  now.toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', '');

/** New comments on top, then the earlier text. @param {string} comments @param {string} existing @param {Date} now */
export function stackComments(comments, existing, now) {
  const top = `${commentStamp(now)}: ${comments}`;
  const old = existing.trim();
  return (old ? `${top}\n\n${old}` : top).slice(0, COMMENTS_MAX);
}

/**
 * Reads the contact's current Comments value and writes the new comments on top.
 * Returns "updated" or the step that failed ("field-lookup-<status>", "read-<status>", "write-<status>").
 * @param {(path: string, method: string, body?: unknown) => Promise<{ res: Response, data: any }>} call
 * @param {string} locationId @param {string} id encoded contact id @param {string} comments @param {Date} now
 */
async function prependComments(call, locationId, id, comments, now) {
  // The contact's custom fields come back by id, so find the Comments field's id first.
  const defs = await call(`/locations/${encodeURIComponent(locationId)}/customFields?model=contact`, 'GET');
  if (!defs.res.ok) return `field-lookup-${defs.res.status}`;
  const field = (defs.data?.customFields ?? []).find((/** @type {any} */ f) => f?.fieldKey === `contact.${COMMENTS_FIELD_KEY}`);
  if (!field?.id) return 'field-not-found';
  const contact = await call(`/contacts/${id}`, 'GET');
  if (!contact.res.ok) return `read-${contact.res.status}`;
  const current = (contact.data?.contact?.customFields ?? []).find((/** @type {any} */ f) => f?.id === field.id)?.value;
  const value = stackComments(comments, typeof current === 'string' ? current : '', now);
  const put = await call(`/contacts/${id}`, 'PUT', { customFields: [{ id: field.id, field_value: value }] });
  return put.res.ok ? 'updated' : `write-${put.res.status}`;
}

const FAIL_MESSAGES = {
  config: 'Agent CRM is not connected on this deployment. Nothing was saved.',
  upsert: 'Agent CRM did not accept the contact or its scheduling fields. Nothing was scheduled.',
  cleanup: 'Agent CRM could not clear the earlier schedule. Nothing new was scheduled.',
  note: 'The contact and schedule fields were saved, but the note was not. The follow-up was not started. Submit again to retry.',
  tag: 'The contact, fields and note were saved, but the Callback Scheduled tag was not added, so the follow-up was not started. Submit again to retry.',
};

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {{ fetchImpl?: typeof fetch, now?: () => Date, loginDelayMs?: number }} [deps]
 */
export async function handleReschedule(request, env, deps = {}) {
  const password = env.RESCHEDULE_PASSWORD ?? '';
  // Without a configured password the page doesn't exist.
  if (password.length < 8) return new Response('Not found', { status: 404, headers: HEADERS });
  const production = env.VERCEL_ENV === 'production';
  const nowMs = (deps.now ? deps.now() : new Date()).getTime();
  const isIn = signedIn(request, password, nowMs);
  if (request.method === 'GET' || request.method === 'HEAD') {
    const html = isIn ? renderReschedulePage({ preview: !production }) : renderLoginPage();
    return new Response(request.method === 'HEAD' ? null : html, { status: 200, headers: { ...HEADERS, 'content-type': 'text/html; charset=utf-8' } });
  }
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' });
  // Same-origin form posts only.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { status: 'forbidden' });
  /** @type {any} */
  let body = null;
  try { body = await request.json(); } catch { return json(400, { status: 'invalid', errors: { form: 'The form could not be read. Try again.' } }); }
  if (body?.action === 'login') {
    if (!passwordMatches(body.password, password)) {
      // Slows down guessing.
      await new Promise((r) => setTimeout(r, deps.loginDelayMs ?? 1000));
      return json(401, { status: 'wrong-password' });
    }
    return new Response(JSON.stringify({ status: 'signed-in' }), { status: 200, headers: { ...HEADERS, 'content-type': 'application/json; charset=utf-8', 'set-cookie': loginCookie(password, nowMs) } });
  }
  if (!isIn) return json(401, { status: 'login-required', message: 'You were signed out. Reload the page and enter the password.' });
  const parsed = parseSubmission(body);
  if (!parsed.ok) return json(400, { status: 'invalid', errors: parsed.errors });
  const now = deps.now ? deps.now() : new Date();
  if (!production) {
    return json(200, { status: 'scheduled', dryRun: true, summary: { delayHours: parsed.value.delayHours, frequencyHours: parsed.value.frequencyHours, durationDays: parsed.value.durationDays }, note: rescheduleNote(parsed, now) });
  }
  const result = await sendSchedule(env, parsed, deps.fetchImpl ?? fetch, now);
  console.log(JSON.stringify({ event: 'reschedule', ok: result.ok, step: result.step, status: result.status ?? null, error: result.error ?? null, isNew: result.isNew ?? null, commentsField: result.commentsField ?? null }));
  if (!result.ok) return json(502, { status: 'failed', step: result.step, message: FAIL_MESSAGES[/** @type {keyof typeof FAIL_MESSAGES} */ (result.step)] ?? 'Agent CRM could not be reached. Nothing was lost on this form: submit again.' });
  const commentsWarning = result.commentsField && !['updated', 'skipped'].includes(result.commentsField)
    ? `The comments were saved in Notes, but the Comments field could not be updated (${result.commentsField}).`
    : null;
  return json(200, { status: 'scheduled', dryRun: false, commentsWarning });
}
