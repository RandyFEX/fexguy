// @ts-check
// POST /api/quote/ (Quote System v2.2): the phone-verification gate and the
// consent/verification evidence for /final-expense-insurance-prices/.
//
// Actions (JSON body { action, ... }):
//   start    first name, mobile number, state, consent choice, quote inputs
//            -> evidence record, Twilio Verify SMS, pending verification
//   resend   new code for the pending verification (30 s cooldown, 3 max)
//   check    6-digit code -> on approval: verified session cookie, evidence
//   session  is this browser verified? (restores the results after a refresh)
//   apply    Apply Now on a category: server re-prices and records it
//
// Security: same-site Origin only; strict input whitelists; per-IP,
// per-phone and global SMS limits (SMS-pumping protection: US numbers only);
// 5 code attempts per verification; codes expire with Twilio's 10-minute
// window (pending state expires at 10 minutes too); sessions are signed,
// HttpOnly, visit-scoped (12 hours max), and checked against the store on every use. Personal
// data never goes into logs, URLs or analytics.

import { createHmac, randomUUID } from 'node:crypto';
import { CONSENT_VERSIONS, VERIFY_NOTICE_VERSIONS } from './consent.js';
import { displayPhone, maskPhone, toE164US } from './phone.js';
import { verifyClient } from './twilio.js';
import { SESSION_MS, clearCookie, newSid, readCookie, sessionKey, setCookie, sign, unsign, verifiedLead, visitHash, visitOf } from './session.js';
import { allowedOrigin, parseInput } from '../rates/public-pricing.js';
import { CATEGORIES, priceCategories } from '../rates/pricing-categories.js';
import { intakePlan, outcomeOf, publicQuestion } from './intake.js';

export const PENDING_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 30 * 1000;
export const MAX_RESENDS = 3;
export const MAX_ATTEMPTS = 5;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const SMS_LIMITS = { ipHour: 5, ipDay: 15, phoneHour: 4, phoneDay: 6, globalDayDefault: 300 };
const MAX_BODY = 2048;

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];
const SOURCE_KEYS = ['page', 'landingPage', 'trafficSource', 'referrer', 'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'];
/** Intended use (lead information only; never a pricing input). */
export const INTENDED_USES = { burial: 'Burial Expenses', cremation: 'Cremation Expenses', other: 'Other Expenses' };
const NAME_RE = /^[\p{L}][\p{L}\p{M} .'-]{0,39}$/u;

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
  return out;
}

/** @param {{ age: number, gender: string, tobacco: boolean, coverage: number }} q */
const quoteFields = (q) => ({
  'Quote Age': String(q.age),
  'Quote Sex': q.gender === 'female' ? 'Female' : 'Male',
  'Quote Tobacco': q.tobacco ? 'Smoker' : 'Non-Smoker',
  'Quote Coverage': `$${q.coverage.toLocaleString('en-US')}`,
});

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
  const verify = verifyClient(env, deps.fetchImpl);
  if (!store || !key || verify.mode === 'off')
    return json(503, { status: 'unavailable', message: 'Phone verification is not available right now. Please call 888-862-9456.' });
  const now = (deps.now ?? Date.now)();
  const iso = new Date(now).toISOString();
  const hash = (/** @type {string} */ s) => createHmac('sha256', secret).update(s).digest('hex').slice(0, 32);
  const ipHash = hash(`ip:${clientIp(request)}`);
  const test = verify.mode === 'test';

  switch (body.action) {
    case 'start': {
      const firstName = clean(body.firstName, 40);
      const phone = toE164US(body.phone);
      const state = typeof body.state === 'string' && US_STATES.includes(body.state) ? body.state : null;
      const quote = parseInput(body.quote);
      if (!firstName || !NAME_RE.test(firstName)) return bad('Please enter your first name.');
      if (!phone) return bad('Please enter a valid 10-digit US mobile number.');
      if (!state) return bad('Please choose your state.');
      const intendedUse = typeof body.intendedUse === 'string' && Object.hasOwn(INTENDED_USES, body.intendedUse) ? /** @type {keyof typeof INTENDED_USES} */ (body.intendedUse) : null;
      if (!intendedUse) return bad('Please choose what the insurance money will be used for.');
      if (!quote) return bad();
      if (typeof body.consent !== 'boolean') return bad();
      if (body.consent && !CONSENT_VERSIONS[/** @type {keyof typeof CONSENT_VERSIONS} */ (body.consentVersion)]) return bad();
      if (!VERIFY_NOTICE_VERSIONS[/** @type {keyof typeof VERIFY_NOTICE_VERSIONS} */ (body.verifyNoticeVersion)]) return bad();

      const phoneHash = hash(`phone:${phone}`);
      const globalDay = Number(env.QUOTE_SMS_DAILY_LIMIT) > 0 ? Number(env.QUOTE_SMS_DAILY_LIMIT) : SMS_LIMITS.globalDayDefault;
      const over = await store.limit([
        { key: `ip:h:${ipHash}:${Math.floor(now / HOUR)}`, limit: SMS_LIMITS.ipHour, windowMs: HOUR },
        { key: `ip:d:${ipHash}:${Math.floor(now / DAY)}`, limit: SMS_LIMITS.ipDay, windowMs: DAY },
        { key: `ph:h:${phoneHash}:${Math.floor(now / HOUR)}`, limit: SMS_LIMITS.phoneHour, windowMs: HOUR },
        { key: `ph:d:${phoneHash}:${Math.floor(now / DAY)}`, limit: SMS_LIMITS.phoneDay, windowMs: DAY },
        { key: `all:d:${Math.floor(now / DAY)}`, limit: globalDay, windowMs: DAY },
      ]);
      if (over) return json(429, { status: 'rate-limited', message: 'Too many verification requests. Please try again later or call 888-862-9456.' }, { 'Retry-After': '3600' });

      const leadId = randomUUID();
      const consentText = body.consent ? CONSENT_VERSIONS[/** @type {keyof typeof CONSENT_VERSIONS} */ (body.consentVersion)] : null;
      /** The evidence record (durable; see store.js). */
      const record = {
        leadId,
        mode: verify.mode,
        firstName,
        phone,
        state,
        intendedUse: { value: intendedUse, label: INTENDED_USES[intendedUse] },
        submittedAt: iso,
        consent: {
          given: body.consent,
          // The consent box is never pre-checked; this is the visitor's own choice.
          action: body.consent ? 'checked consent box' : 'left consent box unchecked',
          at: iso,
          version: body.consent ? body.consentVersion : null,
          text: consentText,
        },
        verifyNotice: { version: body.verifyNoticeVersion, text: VERIFY_NOTICE_VERSIONS[/** @type {keyof typeof VERIFY_NOTICE_VERSIONS} */ (body.verifyNoticeVersion)] },
        verification: { status: 'pending', requestedAt: iso, verifiedAt: null, provider: test ? 'test-mode' : 'twilio-verify', startSid: null, checkSid: null },
        quoteAtSubmission: quote,
        source: parseSource(body.source),
        client: { ip: clientIp(request), userAgent: clean(request.headers.get('user-agent'), 400) },
        applications: [],
      };
      const sent = await verify.start(phone);
      record.verification.startSid = sent.ok ? sent.sid : null;
      if (!sent.ok) record.verification.status = 'send-failed';
      await store.putLead(leadId, record);
      await store.indexPhone(phoneHash, leadId);
      await store.event(leadId, { at: iso, type: sent.ok ? 'sms-sent' : 'sms-send-failed', provider: record.verification.provider, sid: sent.ok ? sent.sid : null, error: sent.ok ? null : sent.error });
      if (!sent.ok) return json(502, { status: 'send-failed', message: 'We could not send a code to that number. Please check it or call 888-862-9456.' });
      await store.putPending(leadId, { phone, phoneHash, attempts: 0, resends: 0, lastSentAt: now }, PENDING_MS);
      return json(200, { status: 'sent', lead: leadId, masked: maskPhone(phone), resendAfterMs: RESEND_COOLDOWN_MS, testMode: test });
    }

    case 'resend': {
      const leadId = typeof body.lead === 'string' && /^[0-9a-f-]{36}$/.test(body.lead) ? body.lead : null;
      const pending = leadId ? await store.getPending(leadId) : null;
      if (!leadId || !pending) return json(410, { status: 'expired', message: 'This code request has expired. Please start again.' });
      if (now - pending.lastSentAt < RESEND_COOLDOWN_MS) return json(429, { status: 'cooldown', message: 'Please wait a few seconds before asking for a new code.', resendAfterMs: RESEND_COOLDOWN_MS - (now - pending.lastSentAt) });
      if (pending.resends >= MAX_RESENDS) return json(429, { status: 'rate-limited', message: 'Too many codes requested. Please call 888-862-9456.' });
      const globalDay = Number(env.QUOTE_SMS_DAILY_LIMIT) > 0 ? Number(env.QUOTE_SMS_DAILY_LIMIT) : SMS_LIMITS.globalDayDefault;
      const over = await store.limit([
        { key: `ph:h:${pending.phoneHash}:${Math.floor(now / HOUR)}`, limit: SMS_LIMITS.phoneHour, windowMs: HOUR },
        { key: `ph:d:${pending.phoneHash}:${Math.floor(now / DAY)}`, limit: SMS_LIMITS.phoneDay, windowMs: DAY },
        { key: `all:d:${Math.floor(now / DAY)}`, limit: globalDay, windowMs: DAY },
      ]);
      if (over) return json(429, { status: 'rate-limited', message: 'Too many codes requested. Please try again later or call 888-862-9456.' });
      const sent = await verify.start(pending.phone);
      await store.event(leadId, { at: iso, type: sent.ok ? 'sms-resent' : 'sms-send-failed', sid: sent.ok ? sent.sid : null });
      if (!sent.ok) return json(502, { status: 'send-failed', message: 'We could not send a new code. Please try again or call 888-862-9456.' });
      await store.putPending(leadId, { ...pending, resends: pending.resends + 1, lastSentAt: now }, PENDING_MS);
      return json(200, { status: 'sent', resendAfterMs: RESEND_COOLDOWN_MS, testMode: test });
    }

    case 'check': {
      const leadId = typeof body.lead === 'string' && /^[0-9a-f-]{36}$/.test(body.lead) ? body.lead : null;
      const code = typeof body.code === 'string' && /^\d{6}$/.test(body.code) ? body.code : null;
      if (!code) return bad('Enter the 6-digit code from the text message.');
      // The session will belong to this visit (tab) only.
      const visit = visitOf(request);
      if (!visit) return bad('Please reload the page and try again.');
      const pending = leadId ? await store.getPending(leadId) : null;
      if (!leadId || !pending) return json(410, { status: 'expired', message: 'This code has expired. Please ask for a new code.' });
      if (pending.attempts >= MAX_ATTEMPTS) return json(429, { status: 'too-many-attempts', message: 'Too many incorrect codes. Please ask for a new code.' });
      await store.putPending(leadId, { ...pending, attempts: pending.attempts + 1 }, PENDING_MS);
      const result = await verify.check(pending.phone, code);
      if (!result.ok) return json(502, { status: 'check-failed', message: 'We could not check the code. Please try again.' });
      if (result.status !== 'approved') {
        await store.event(leadId, { at: iso, type: 'code-rejected', attempt: pending.attempts + 1, status: result.status });
        const left = MAX_ATTEMPTS - pending.attempts - 1;
        if (result.status === 'expired') return json(410, { status: 'expired', message: 'This code has expired. Please ask for a new code.' });
        return json(400, { status: 'wrong-code', message: left > 0 ? 'That code is not right. Please check the text message and try again.' : 'Too many incorrect codes. Please ask for a new code.', attemptsLeft: left });
      }

      const record = await store.getLead(leadId);
      if (!record) return json(410, { status: 'expired', message: 'Please start again.' });
      record.verification = { ...record.verification, status: 'approved', verifiedAt: iso, checkSid: result.sid };
      await store.putLead(leadId, record);
      await store.dropPending(leadId);
      await store.event(leadId, { at: iso, type: 'verified', provider: record.verification.provider, sid: result.sid, outcome: 'approved' });

      const sid = newSid();
      const exp = now + SESSION_MS;
      await store.putSession(sid, { lid: leadId, createdAt: iso, visit: visitHash(visit) }, SESSION_MS);
      const cookie = setCookie(sign(key, { sid, lid: leadId, exp }));
      // One notification per verified lead, never for test-mode leads.
      const notify = !test && (await store.once(leadId, 'verified'))
        ? {
            'Quote Event': 'Verified quote request',
            'Quote Lead ID': leadId,
            'First Name': record.firstName,
            'Phone Number': displayPhone(record.phone),
            State: record.state,
            'Phone Verified': `Yes (${iso})`,
            'Intended Use': record.intendedUse?.label ?? '',
            'Contact Consent': record.consent.given ? `Yes (${record.consent.version})` : 'No',
            ...quoteFields(record.quoteAtSubmission),
          }
        : null;
      return json(200, { status: 'verified', quote: record.quoteAtSubmission, testMode: test, notify }, { 'Set-Cookie': cookie });
    }

    case 'session': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(200, { status: 'not-verified' });
      const record = await store.getLead(v.leadId);
      if (!record) return json(200, { status: 'not-verified' });
      return json(200, { status: 'verified', quote: record.lastQuote ?? record.quoteAtSubmission, testMode: record.mode === 'test' });
    }

    case 'apply': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(401, { status: 'verify-required' });
      const category = CATEGORIES.find((c) => c.id === body.category);
      const quote = parseInput(body.quote);
      if (!category || !quote) return bad();
      const loaded = deps.getEngine ? await deps.getEngine().catch(() => null) : null;
      if (!loaded) return json(503, { status: 'unavailable', message: 'Prices are not available right now.' });
      // Re-priced on the server: the browser's displayed price is never trusted.
      const priced = priceCategories(loaded.engine, quote).find((c) => c.id === category.id);
      if (!priced || priced.status !== 'ok') return json(409, { status: 'unavailable', message: 'This price is not available for these choices.' });
      const record = await store.getLead(v.leadId);
      if (!record) return json(401, { status: 'verify-required' });
      const application = { at: iso, categoryId: category.id, category: priced.label, monthlyPremium: priced.monthlyPremium, quote, attribution: priced.attribution, intendedUse: record.intendedUse?.label ?? null };
      record.applications = [...(record.applications ?? []), application];
      record.lastQuote = quote;
      await store.putLead(v.leadId, record);
      await store.event(v.leadId, { at: iso, type: 'apply-now', ...application });
      const notify = record.mode !== 'test' && (await store.once(v.leadId, `apply:${category.id}`))
        ? {
            'Quote Event': 'Apply Now',
            'Quote Lead ID': v.leadId,
            'First Name': record.firstName,
            'Phone Number': displayPhone(record.phone),
            State: record.state,
            'Intended Use': record.intendedUse?.label ?? '',
            'Quote Category': priced.label,
            'Quote Monthly Premium': `$${priced.monthlyPremium}`,
            'Quote Product Codes': priced.attribution.join(', '),
            ...quoteFields(quote),
          }
        : null;
      const plan = deps.raw ? await intakePlan(deps.raw, env, priced.attribution[0]) : { mode: 'none', reason: 'no-question-set' };
      const intake = plan.mode === 'questions' ? { mode: 'questions', total: plan.questions.length } : { mode: 'none', reason: plan.reason };
      return json(200, { status: 'ok', category: priced.label, monthlyPremium: priced.monthlyPremium, testMode: record.mode === 'test', notify, intake });
    }

    // "Call to Get Approved" tap on a revealed card (v3.7): a first-party
    // record of the tap only (never a completed call or an approval). The
    // price is re-calculated here; the browser's value is never trusted.
    case 'call-click': {
      const v = await verifiedLead(request, env, store, now);
      if (!v) return json(401, { status: 'verify-required' });
      const category = CATEGORIES.find((c) => c.id === body.category);
      const quote = parseInput(body.quote);
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
      const click = { at: iso, type: 'call-click', categoryId: category.id, category: priced.label, carrier: shown?.carrier ?? null, product: shown?.plan ?? null, coverage: quote.coverage, monthlyPremium: priced.monthlyPremium, quote, attribution: priced.attribution, quoteRef: ref };
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
      const intake = (record.intakes[category.id] ??= { code, carrierId: plan.carrierId ?? null, startedAt: iso, status: 'in-progress', flag: null, intendedUse: record.intendedUse?.label ?? null, quote: applied.quote, answers: [] });
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
        const notify = record.mode !== 'test' && (await store.once(v.leadId, `intake:${category.id}`))
          ? {
              'Quote Event': 'Health questions answered',
              'Quote Lead ID': v.leadId,
              'First Name': record.firstName,
              'Phone Number': displayPhone(record.phone),
              'Quote Category': applied.category,
              'Intended Use': record.intendedUse?.label ?? '',
              'Health Answers': intake.answers.map((a) => `${a.section} ${a.number}: ${a.answer.toUpperCase()}`).join('; '),
              'Health Review': intake.flag === 'may-not-qualify' ? 'A YES answer may rule out this plan: review other coverage' : 'No answer ruled out this plan',
            }
          : null;
        return json(200, { status: 'done', reason: intake.status, flag: intake.flag, notify });
      }
      const next = plan.questions[intake.answers.length];
      return json(200, { status: 'question', question: publicQuestion(next, intake.answers.length + 1, plan.questions.length) });
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
