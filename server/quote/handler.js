// @ts-check
// POST /api/quote/: the lead submission, the quote session and the lead
// record for /free-quote/.
//
// Actions (JSON body { action, ... }):
//   start    full name, mobile number, state, quote inputs (consent: the button click, V3.8)
//            -> lead record, Agent CRM delivery (production), quote session
//            (V3.3, Randy, November 2026: no SMS verification, no code)
//   session  does this visit have a quote session? (restores the results after a refresh)
//   apply    Apply Now on a category: server re-prices and records it
//
// v6.2: no notifications. The funnel makes no Formspark, Turnstile or email
// requests; every lead (contact details, quote, attribution, consent) is
// saved in the Redis evidence record, which is the lead record.
//
// Security: same-site Origin only; strict input whitelists; per-IP,
// per-phone and global submission limits (US numbers only); sessions are
// signed, HttpOnly, visit-scoped (12 hours max), and checked against the
// store on every use. The phone number is never verified, and nothing says
// it is. Personal data never goes into logs, URLs or analytics.

import { createHmac, randomUUID } from 'node:crypto';
import { CONSENT_METHOD, CONSENT_VERSION, CONSENT_VERSIONS } from './consent.js';
import { firstNameOf, isFullName } from './name.js';
import { toE164US } from './phone.js';
import { RATE_FIELD_COVERAGE, sendLeadToCrm } from './crm.js';
import { SESSION_MS, clearCookie, newSid, readCookie, sessionKey, setCookie, sign, unsign, verifiedLead, visitHash, visitOf } from './session.js';
import { allowedOrigin, parseInput, parsePricingInput } from '../rates/public-pricing.js';
import { CATEGORIES, priceCategories } from '../rates/pricing-categories.js';
import { intakePlan, outcomeOf, publicQuestion } from './intake.js';

/** Direct preview access (preview/local only): the one fixed sample record and its quote. */
export const PREVIEW_SAMPLE_LEAD = '00000000-0000-4000-8000-000000000000';
export const PREVIEW_SAMPLE_QUOTE = Object.freeze({ age: 60, gender: 'male', tobacco: false, coverage: 10000 });
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Abuse and duplicate protection (the former SMS limits, kept as submission limits).
export const SUBMIT_LIMITS = { ipHour: 5, ipDay: 15, phoneHour: 4, phoneDay: 6, globalDayDefault: 300 };
// v5.8: room for the entry fields (article title and URL) in the start request.
const MAX_BODY = 4096;

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];
const SOURCE_KEYS = ['page', 'landingPage', 'trafficSource', 'referrer', 'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent',
  // v5.8: where the funnel visit started (src/scripts/quote-entry.ts).
  'entryType', 'originTitle', 'originUrl', 'entryGender', 'entryAt'];
const ENTRY_LABELS = { 'article-sidebar': 'Article sidebar', direct: 'Direct funnel entry', campaign: 'Campaign' };
// V3.7: the funnel's own phone number (Randy's advertising number on /free-quote/).
const FUNNEL_PHONE = '888-656-4648';

/** @param {number} status @param {Record<string, unknown>} body @param {Record<string, string>} [headers] */
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}
const bad = (message = 'Please check your answers and try again.') => json(400, { status: 'bad-request', message });

/** @param {Request} request */
const clientIp = (request) =>
  (request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';

/** @param {unknown} s @param {number} max */
const clean = (s, max) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '');

/** @param {any} src */
function parseSource(src) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const key of SOURCE_KEYS) {
    const v = clean(src[key], 300);
    if (v) out[key] = v;
  }
  if (out.entryType && !Object.hasOwn(ENTRY_LABELS, out.entryType)) delete out.entryType;
  if (out.entryGender && !['male', 'female'].includes(out.entryGender)) delete out.entryGender;
  if (out.originUrl && !/^https?:\/\/[^\s]+$/.test(out.originUrl)) delete out.originUrl;
  return out;
}

/**
 * @typedef {ReturnType<typeof import('./store.js').quoteStore>} QuoteStore
 * @typedef {{ store: QuoteStore | null, raw?: { get(key: string): Promise<string | null> } | null, getEngine?: () => Promise<{ engine: any } | null>, fetchImpl?: typeof fetch, now?: () => number }} Deps
 * @param {Request} request @param {Record<string, string | undefined>} env @param {Deps} deps
 */
export async function handleQuote(request, env, deps) {
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' }, { Allow: 'POST' });
  if (!allowedOrigin(request.headers.get('origin'), env)) return json(403, { status: 'forbidden' });
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { status: 'bad-request' });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json(413, { status: 'bad-request' });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { status: 'bad-request' });
  /** @type {any} */
  let body;
  try { body = JSON.parse(text); } catch { return bad(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad();

  const store = deps.store;
  const key = sessionKey(env);
  const secret = env.QUOTE_SESSION_SECRET || env.HEALTH_SEARCH_SECRET || '';
  // V3.3 (Randy, November 2026): no phone verification. Preview and local
  // builds are test mode (records marked test, no Agent CRM delivery); the
  // production deployment delivers every lead to Agent CRM.
  const test = env.VERCEL_ENV !== 'production';
  if (!store || !key)
    return json(503, { status: 'unavailable', message: `Quotes are not available right now. Please call ${FUNNEL_PHONE}.` });
  const now = (deps.now ?? Date.now)();
  const iso = new Date(now).toISOString();
  const hash = (/** @type {string} */ s) => createHmac('sha256', secret).update(s).digest('hex').slice(0, 32);
  const ipHash = hash(`ip:${clientIp(request)}`);

  switch (body.action) {
    // SEE MY RATES: validate, save the lead, deliver it to Agent CRM
    // (production), then open this visit's quote session. A failed delivery
    // keeps the saved lead and returns a recoverable error (no session, no
    // conversion); the visitor's retry sends `retry` (that lead's id) and
    // re-delivers the same lead instead of creating a duplicate.
    case 'start': {
      // V3.7: one Full Name field (server/quote/name.js), stored as typed in `firstName`.
      const firstName = clean(body.firstName, 60).replace(/\s+/g, ' ');
      const phone = toE164US(body.phone);
      const state = typeof body.state === 'string' && US_STATES.includes(body.state) ? body.state : null;
      const quote = parseInput(body.quote);
      if (!isFullName(firstName)) return json(400, { status: 'bad-request', field: 'name', message: 'Please enter your full name (first and last name).' });
      if (!phone) return json(400, { status: 'bad-request', field: 'phone', message: 'Please enter a valid 10-digit US mobile number.' });
      if (!state) return bad('Please choose your state.');
      if (!quote) return bad();
      // V3.8: no checkbox. Clicking SEE MY RATES under the disclosure is the
      // consent; the page must have shown the current disclosure version.
      if (body.consentVersion !== CONSENT_VERSION) return bad('Please reload the page and try again.');
      // The session will belong to this visit (tab) only.
      const visit = visitOf(request);
      if (!visit) return bad('Please reload the page and try again.');

      const phoneHash = hash(`phone:${phone}`);
      const globalDay = Number(env.QUOTE_SMS_DAILY_LIMIT) > 0 ? Number(env.QUOTE_SMS_DAILY_LIMIT) : SUBMIT_LIMITS.globalDayDefault;
      const over = await store.limit([
        { key: `ip:h:${ipHash}:${Math.floor(now / HOUR)}`, limit: SUBMIT_LIMITS.ipHour, windowMs: HOUR },
        { key: `ip:d:${ipHash}:${Math.floor(now / DAY)}`, limit: SUBMIT_LIMITS.ipDay, windowMs: DAY },
        { key: `ph:h:${phoneHash}:${Math.floor(now / HOUR)}`, limit: SUBMIT_LIMITS.phoneHour, windowMs: HOUR },
        { key: `ph:d:${phoneHash}:${Math.floor(now / DAY)}`, limit: SUBMIT_LIMITS.phoneDay, windowMs: DAY },
        { key: `all:d:${Math.floor(now / DAY)}`, limit: globalDay, windowMs: DAY },
      ]);
      if (over) return json(429, { status: 'rate-limited', message: `Too many quote requests. Please try again later or call ${FUNNEL_PHONE}.` }, { 'Retry-After': '3600' });

      const consentText = CONSENT_VERSIONS[CONSENT_VERSION];
      const fields = {
        mode: test ? 'test' : 'direct',
        firstName,
        phone,
        state,
        submittedAt: iso,
        consent: {
          given: true,
          // V3.8: the visitor clicked SEE MY RATES with the disclosure shown directly under it (no checkbox).
          method: CONSENT_METHOD,
          action: 'clicked SEE MY RATES (disclosure shown under the button)',
          at: iso,
          version: CONSENT_VERSION,
          text: consentText,
        },
        // V3.3: the phone number is never verified (no SMS, no code).
        verification: { status: 'not-required', phoneVerified: false, provider: 'none', verifiedAt: null },
        quoteAtSubmission: quote,
        source: parseSource(body.source),
        client: { ip: clientIp(request), userAgent: clean(request.headers.get('user-agent'), 400) },
      };
      // A retry after a failed delivery: the same lead, from the same visit, not yet delivered.
      const retryId = typeof body.retry === 'string' && /^[0-9a-f-]{36}$/.test(body.retry) ? body.retry : null;
      const previous = retryId ? await store.getLead(retryId) : null;
      const reuse = previous && previous.visit === visitHash(visit) && previous.crm?.delivered !== true && previous.leadId !== PREVIEW_SAMPLE_LEAD;
      const leadId = reuse ? retryId : randomUUID();
      /** The evidence record (durable; see store.js); it is the lead record. */
      const record = reuse
        ? { ...previous, ...fields, firstSubmittedAt: previous.firstSubmittedAt ?? previous.submittedAt, attempts: (previous.attempts ?? 1) + 1 }
        : { leadId, ...fields, visit: visitHash(visit), attempts: 1, applications: [], crm: { delivered: false } };
      // The lead is saved before anything else can fail.
      await store.putLead(leadId, record);
      if (!reuse) await store.indexPhone(phoneHash, leadId);
      await store.event(leadId, { at: iso, type: reuse ? 'contact-resubmitted' : 'contact-submitted', attempt: record.attempts });

      // Agent CRM (production only): the contact is created or updated with
      // the three estimated monthly rates. Not configured counts as a failure:
      // a lead is never reported as accepted unless it reached the CRM.
      if (!test) {
        const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
        /** @type {any[]} */
        let rates = [];
        try { rates = loaded ? priceCategories(loaded.engine, quote) : []; } catch {}
        // The lowest displayed monthly rate for $10,000, saved on the contact for
        // GoHighLevel's first text (server/quote/crm.js RATE_FIELD_KEY).
        /** @type {string | null} */
        let lowest10k = null;
        try {
          const at10k = loaded ? priceCategories(loaded.engine, { ...quote, coverage: RATE_FIELD_COVERAGE }).filter((c) => c.status === 'ok' && c.monthlyPremium) : [];
          lowest10k = at10k.sort((a, b) => (a.monthlyPremiumCents ?? 0) - (b.monthlyPremiumCents ?? 0))[0]?.monthlyPremium ?? null;
        } catch {}
        /** @type {{ sent: boolean, ok?: boolean, step?: string, status?: number, contactId?: string, isNew?: boolean, error?: string, rateField?: number | string | null }} */
        const crm = await sendLeadToCrm(env, record, rates, deps.fetchImpl, lowest10k).catch(() => ({ sent: true, ok: false, error: 'error' }));
        const delivered = crm.sent && crm.ok === true;
        await store.event(leadId, { at: iso, type: delivered ? 'crm-delivered' : crm.sent ? 'crm-delivery-failed' : 'crm-not-configured', step: crm.step ?? null, status: crm.status ?? null, contactId: crm.contactId ?? null, isNew: crm.isNew ?? null, error: crm.error ?? null, lowest10k, rateField: crm.rateField ?? null }).catch(() => {});
        record.crm = { delivered, at: iso, contactId: crm.contactId ?? record.crm?.contactId ?? null };
        await store.putLead(leadId, record);
        if (!delivered)
          return json(502, { status: 'delivery-failed', lead: leadId, message: `We could not send your request just now. Please try again, or call ${FUNNEL_PHONE}.` });
      }

      const sid = newSid();
      const exp = now + SESSION_MS;
      await store.putSession(sid, { lid: leadId, createdAt: iso, visit: visitHash(visit) }, SESSION_MS);
      // leadConversion: the lead reached Agent CRM on the production
      // deployment (GA4 generate_lead, Meta Lead), once per lead and never for
      // a name labeled TEST. Never on previews.
      const leadConversion = !test && !/^\s*test\b/i.test(firstName) && (await store.once(leadId, 'conversion'));
      await store.event(leadId, { at: iso, type: 'lead-accepted', conversion: leadConversion });
      return json(200, { status: 'verified', lead: leadId, quote, testMode: test, leadConversion, expiresAt: exp }, { 'Set-Cookie': setCookie(sign(key, { sid, lid: leadId, exp })) });
    }

    case 'session': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(200, { status: 'not-verified' });
      const record = await store.getLead(v.leadId);
      if (!record) return json(200, { status: 'not-verified' });
      // Texting handoff V4.0: the first word of the visitor's own name, for the
      // prewritten text on /facebook/ (this verified visit only; kept in memory there).
      const firstName = firstNameOf(record.firstName);
      return json(200, { status: 'verified', quote: record.lastQuote ?? record.quoteAtSubmission, testMode: record.mode === 'test' || record.mode === 'preview-sample', expiresAt: v.exp, firstName });
    }

    case 'apply': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(401, { status: 'verify-required' });
      const category = CATEGORIES.find((c) => c.id === body.category);
      const quote = parsePricingInput(body.quote);
      if (!category || !quote) return bad();
      const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
      if (!loaded) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
      // Re-priced on the server: the browser's displayed price is never trusted.
      const priced = priceCategories(loaded.engine, quote).find((c) => c.id === category.id);
      if (!priced || priced.status !== 'ok') return json(409, { status: 'unavailable', message: 'This price is not available for these choices.' });
      const record = await store.getLead(v.leadId);
      if (!record) return json(401, { status: 'verify-required' });
      const application = { at: iso, categoryId: category.id, category: priced.label, ...(priced.coverage ? { coverage: priced.coverage } : {}), monthlyPremium: priced.monthlyPremium, quote, attribution: priced.attribution };
      record.applications = [...(record.applications ?? []), application];
      record.lastQuote = quote;
      await store.putLead(v.leadId, record);
      await store.event(v.leadId, { at: iso, type: 'apply-now', ...application });
      const plan = deps.raw ? await intakePlan(deps.raw, env, priced.attribution[0]) : { mode: 'none', reason: 'no-question-set' };
      const intake = plan.mode === 'questions' ? { mode: 'questions', total: plan.questions.length } : { mode: 'none', reason: plan.reason };
      return json(200, { status: 'ok', category: priced.label, ...(priced.coverage ? { coverage: priced.coverage } : {}), monthlyPremium: priced.monthlyPremium, testMode: record.mode === 'test' || record.mode === 'preview-sample', saved: true, intake });
    }

    // "Call to Get Approved" tap on a revealed card (v3.7): a first-party
    // record of the tap only (never a completed call or an approval). The
    // price is re-calculated here; the browser's value is never trusted.
    case 'call-click': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(401, { status: 'verify-required' });
      const category = CATEGORIES.find((c) => c.id === body.category);
      const quote = parsePricingInput(body.quote);
      const ref = typeof body.quoteRef === 'string' && /^[A-Za-z0-9]{12,32}$/.test(body.quoteRef) ? body.quoteRef : null;
      if (!category || !quote) return bad();
      if (await store.limit([{ key: `call:h:${v.leadId}:${Math.floor(now / HOUR)}`, limit: 30, windowMs: HOUR }])) return json(429, { status: 'rate-limited' });
      const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
      if (!loaded) return json(503, { status: 'unavailable' });
      const priced = priceCategories(loaded.engine, quote).find((c) => c.id === category.id);
      if (!priced || priced.status !== 'ok') return json(409, { status: 'unavailable' });
      const record = await store.getLead(v.leadId);
      if (!record) return json(401, { status: 'verify-required' });
      const shown = priced.carriers?.[0] ?? null;
      const click = { at: iso, type: 'call-click', categoryId: category.id, category: priced.label, carrier: shown?.carrier ?? null, product: shown?.plan ?? null, coverage: priced.coverage ?? quote.coverage, monthlyPremium: priced.monthlyPremium, quote, attribution: priced.attribution, quoteRef: ref };
      record.callClicks = [...(record.callClicks ?? []), click].slice(-50);
      await store.putLead(v.leadId, record);
      await store.event(v.leadId, click);
      return json(200, { status: 'ok' });
    }

    // Carrier-specific health questions, one at a time, after Apply Now.
    case 'intake-next':
    case 'intake-answer': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(401, { status: 'verify-required' });
      const category = CATEGORIES.find((c) => c.id === body.category);
      if (!category) return bad();
      const record = await store.getLead(v.leadId);
      if (!record) return json(401, { status: 'verify-required' });
      const applied = [...(record.applications ?? [])].reverse().find((a) => a.categoryId === category.id || a.category === category.label);
      if (!applied) return json(409, { status: 'apply-first' });
      const code = applied.attribution?.[0] ?? '';
      const plan = deps.raw ? await intakePlan(deps.raw, env, code) : { mode: 'none', reason: 'no-question-set', carrierId: null };
      record.intakes = record.intakes ?? {};
      const intake = (record.intakes[category.id] ??= { code, carrierId: plan.carrierId ?? null, startedAt: iso, status: 'in-progress', flag: null, quote: applied.quote, answers: [] });
      if (plan.mode !== 'questions') {
        intake.status = 'no-questions';
        intake.reason = plan.reason;
        await store.putLead(v.leadId, record);
        return json(200, { status: 'done', reason: plan.reason, flag: null });
      }
      if (body.action === 'intake-answer' && intake.status === 'in-progress') {
        const expected = plan.questions[intake.answers.length];
        if (!expected || body.questionId !== String(expected.id) || !['yes', 'no'].includes(body.answer)) return bad();
        const outcome = outcomeOf(plan.carrierId, expected, body.answer);
        intake.answers.push({ at: iso, questionId: String(expected.id), section: expected.section, number: expected.number, text: expected.text, answer: body.answer, outcome });
        await store.event(v.leadId, { at: iso, type: 'intake-answer', category: category.label, questionId: String(expected.id), answer: body.answer, outcome });
        // A YES that the carrier treats as a decline: stop this carrier's
        // questions, keep the lead, and offer other coverage help.
        if (outcome === 'decline') {
          intake.status = 'stopped';
          intake.flag = 'may-not-qualify';
        } else if (intake.answers.length >= plan.questions.length) intake.status = 'complete';
      }
      await store.putLead(v.leadId, record);
      if (intake.status !== 'in-progress') {
        return json(200, { status: 'done', reason: intake.status, flag: intake.flag });
      }
      const next = plan.questions[intake.answers.length];
      return json(200, { status: 'question', question: publicQuestion(next, intake.answers.length + 1, plan.questions.length) });
    }

    // Direct preview access (Randy, November 2026, V1.1): PREVIEW AND LOCAL
    // ONLY. Opens this visit's quote results with a fixed, non-personal
    // sample, without the contact step or a CRM delivery: one fixed
    // sample record (mode 'preview-sample', reset on every use) in the
    // preview store and a normal visit-scoped session. Refused on the
    // production deployment (VERCEL_ENV=production).
    case 'preview-sample': {
      if (env.VERCEL_ENV === 'production') return json(404, { status: 'not-found' });
      const visit = visitOf(request);
      if (!visit) return bad('Please reload the page and try again.');
      const over = await store.limit([{ key: `pv:h:${ipHash}:${Math.floor(now / HOUR)}`, limit: 60, windowMs: HOUR }]);
      if (over) return json(429, { status: 'rate-limited', message: 'Too many preview requests. Please try again later.' });
      const record = {
        leadId: PREVIEW_SAMPLE_LEAD,
        mode: 'preview-sample',
        sample: true,
        firstName: 'Preview Sample',
        phone: null,
        state: 'Texas',
        submittedAt: iso,
        consent: { given: false, action: 'preview sample (no visitor)', at: iso, version: null, text: null },
        verification: { status: 'preview-sample', requestedAt: iso, verifiedAt: null, provider: 'preview-sample', startSid: null, checkSid: null, phoneVerified: false },
        quoteAtSubmission: PREVIEW_SAMPLE_QUOTE,
        source: { entryType: 'direct' },
        client: { ip: null, userAgent: null },
        applications: [],
      };
      await store.putLead(PREVIEW_SAMPLE_LEAD, record);
      const sid = newSid();
      const exp = now + SESSION_MS;
      await store.putSession(sid, { lid: PREVIEW_SAMPLE_LEAD, createdAt: iso, visit: visitHash(visit) }, SESSION_MS);
      return json(200, { status: 'verified', quote: PREVIEW_SAMPLE_QUOTE, testMode: true, sample: true, expiresAt: exp }, { 'Set-Cookie': setCookie(sign(key, { sid, lid: PREVIEW_SAMPLE_LEAD, exp })) });
    }

    // Start New Quote: end this visit's verified session. The lead's
    // evidence and events are kept; only the session record is removed.
    case 'end-session': {
      const claims = unsign(key, readCookie(request), now);
      if (claims) {
        const s = await store.getSession(claims.sid);
        if (s && s.lid === claims.lid) {
          await store.dropSession(claims.sid);
          await store.event(claims.lid, { at: iso, type: 'quote-restarted' });
        }
      }
      return json(200, { status: 'ended' }, { 'Set-Cookie': clearCookie() });
    }

    default:
      return bad();
  }
}
