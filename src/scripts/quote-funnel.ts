// Quote funnel (Quote System v2.2; v3.5 layout and cards) for /free-quote/ (moved from /final-expense-insurance-prices/ in v5.8).
//
// Steps 1-5 collect sex, age, tobacco, coverage and state, one per screen
// (they advance on their own). Step 6 takes first name, mobile number and an
// optional, unchecked consent box; step 7 checks the texted code. The SERVER
// decides whether the phone is verified (api/quote.js sets an HttpOnly
// session cookie); prices come from api/price-explorer.js only for a verified
// session, so nothing here can unlock them. After verification the visitor
// can change age, sex, tobacco and coverage freely; a refresh returns to the
// results while the session lasts (24 hours).
//
// Privacy: the name and phone number stay in memory only (never storage,
// URLs, the console or analytics). Analytics get event names and step
// numbers only (tracking.ts, GA4). Leads are saved in the server's Redis
// record (v6.2); this page makes no Formspark, Turnstile or email requests.
import { lead } from '@/config/lead';
import { leadSourceFields, recordVisit } from '@/scripts/lead-source';
import { entryAnalytics, entrySource, readFunnelEntry } from '@/scripts/quote-entry';
import { saveHandoff } from '@/scripts/quote-handoff';
import { offerExpiresAt, restartQuote, runCountdown } from '@/scripts/quote-offer';
import { toE164US } from '../../server/quote/phone.js';

// The session's traffic source (first landing, UTM, ad click) is kept for
// /facebook/'s phone number and the lead record (src/scripts/lead-source.ts).
recordVisit();

type Gender = 'male' | 'female';
type Quote = { age: number; gender: Gender; tobacco: boolean; coverage: number };
type Category = { id: string; label: string; status: 'ok' | 'pending' | 'unavailable'; monthlyPremium?: string; message?: string; attribution: string[]; carriers?: (Carrier | null)[] };
type Carrier = { carrier: string; plan: string; subtitle?: string; timing?: string; logo?: string | null };

const root = document.querySelector<HTMLElement>('[data-quote-funnel]');
const MIN = 5000;
const MAX = 25000;
const TOTAL = 8;
const STEPS_KEY = 'ff:quote-steps'; // non-personal answers only (sex, age, tobacco, intended use, coverage)
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
// v5.8: where this visit started (article sidebar, campaign or direct); every
// funnel event carries the entry type and the article's path (never personal data).
const arrival = root ? readFunnelEntry() : null;
const track = (name: string, extra: Record<string, unknown> = {}) =>
  window.dispatchEvent(new CustomEvent('ff:funnel', { detail: { name, ...(arrival ? entryAnalytics(arrival.entry) : {}), ...extra } }));

// Visit-scoped verification (v2.7): one random visit id, sent with every
// request; the server only treats a session as verified for the visit it was
// verified in. 12-hour quote access (Randy, November 2026): the id is kept in
// localStorage, so the same browser returns to its unlocked quote for 12
// hours after the original unlock (the server's fixed session expiry), even
// after closing and reopening it.
const VISIT_KEY = 'ff:quote-visit';
let memoryVisit = '';
const newVisitId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32).padEnd(16, '0');
function visitId() {
  try {
    let v = localStorage.getItem(VISIT_KEY) ?? '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      v = newVisitId();
      localStorage.setItem(VISIT_KEY, v);
    }
    return v;
  } catch {
    if (!memoryVisit) memoryVisit = newVisitId();
    return memoryVisit;
  }
}
const jsonHeaders = () => ({ 'Content-Type': 'application/json', Accept: 'application/json', 'X-Quote-Visit': visitId() });

async function api(body: Record<string, unknown>) {
  try {
    const res = await fetch('/api/quote/', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(body), credentials: 'same-origin' });
    return { http: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
  } catch {
    return { http: 0, body: {} as Record<string, any> };
  }
}

if (root) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const steps = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-step]')).map((el) => [Number(el.dataset.step), el]));
  const back = $<HTMLButtonElement>('[data-qf-back]');
  const progress = $('[data-qf-progress]');
  const progressLabel = $('[data-qf-progress-label]');
  const progressWrap = $('[data-qf-progress-wrap]');
  const testBanner = $('[data-qf-test]');

  const answers: Partial<Quote> & { state?: string; use?: string } = {};
  try {
    Object.assign(answers, JSON.parse(sessionStorage.getItem(STEPS_KEY) ?? '{}'));
  } catch {}
  const saveSteps = () => {
    try {
      const { age, gender, tobacco, use, coverage } = answers;
      sessionStorage.setItem(STEPS_KEY, JSON.stringify({ age, gender, tobacco, use, coverage }));
    } catch {}
  };
  let leadId = '';
  let current = 1;
  let started = false;
  let unlocked = false;

  function show(n: number, focus = true) {
    current = n;
    for (const [i, el] of steps) el.hidden = i !== n;
    const results = (n === 8 && unlocked) || n === 9;
    back.hidden = n === 1 || results;
    root!.querySelector<HTMLElement>('[data-qf-top]')!.hidden = results;
    progressWrap.hidden = results;
    progressLabel.hidden = results;
    progress.style.width = `${(Math.min(n, TOTAL) / TOTAL) * 100}%`;
    progressLabel.textContent = `Step ${Math.min(n, TOTAL)} of ${TOTAL}`;
    if (!focus) return;
    if (n === 7) fillSummary();
    const target = n === 8 && !unlocked ? root!.querySelector<HTMLElement>('#qf-unlock-title') : steps.get(n)?.querySelector<HTMLElement>('.qf-q');
    target?.focus({ preventScroll: true });
    root!.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  /** Step 7: the visitor's own selections (Gender | Age | State | Tobacco | Coverage). */
  function fillSummary() {
    const put = (k: string, v: string) => {
      const el = root!.querySelector<HTMLElement>(`[data-qf-sum="${k}"]`);
      if (el) el.textContent = v;
    };
    put('gender', answers.gender === 'female' ? 'Female' : answers.gender === 'male' ? 'Male' : '');
    put('age', answers.age ? String(answers.age) : '');
    put('state', answers.state ?? '');
    put('tobacco', typeof answers.tobacco === 'boolean' ? (answers.tobacco ? 'Smoker' : 'Non-Smoker') : '');
    put('coverage', answers.coverage ? money(answers.coverage) : '');
  }
  const complete = (step: number) => {
    if (!started) {
      started = true;
      track('quote_funnel_start');
    }
    track('quote_step_complete', { step });
  };
  back.addEventListener('click', () => show(Math.max(1, current - 1)));

  // Steps 1-4: tap to answer and advance.
  root.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-pick]');
    if (!btn) return;
    const { pick, value } = btn.dataset;
    btn.parentElement?.querySelectorAll('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    if (pick === 'gender') answers.gender = value === 'female' ? 'female' : 'male';
    if (pick === 'age') answers.age = Number(value);
    if (pick === 'tobacco') answers.tobacco = value === 'yes';
    if (pick === 'use') answers.use = value;
    if (pick === 'coverage') answers.coverage = Number(value);
    saveSteps();
    complete(current);
    show(current + 1);
  });

  // Step 4: Other amount.
  const otherBox = $('[data-qf-other]');
  const otherInput = $<HTMLInputElement>('#qf-other-input');
  const otherError = $('[data-qf-other-error]');
  const parseAmount = (raw: string) => {
    const s = raw.replace(/[$,\s]/g, '');
    const n = Number(s);
    return s !== '' && Number.isInteger(n) && n >= MIN && n <= MAX ? n : null;
  };
  $('[data-qf-other-open]').addEventListener('click', () => {
    otherBox.hidden = false;
    otherInput.focus();
  });
  const otherNext = () => {
    const n = parseAmount(otherInput.value);
    otherError.hidden = n !== null;
    otherError.textContent = n === null ? `Enter a whole-dollar amount from ${money(MIN)} to ${money(MAX)}.` : '';
    otherInput.setAttribute('aria-invalid', String(n === null));
    if (n === null) return otherInput.focus();
    answers.coverage = n;
    saveSteps();
    complete(5);
    show(6);
  };
  $('[data-qf-other-next]').addEventListener('click', otherNext);
  otherInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') otherNext();
  });

  // Step 5: state (lead information only; never changes prices).
  const stateSelect = $<HTMLSelectElement>('[data-qf-state]');
  stateSelect.addEventListener('change', () => {
    if (!stateSelect.value) return;
    answers.state = stateSelect.value;
    complete(6);
    show(7);
  });


  // Step 7: the visitor's name (first name or full name), mobile number and the optional consent box.
  const contactForm = $<HTMLFormElement>('[data-qf-contact]');
  const firstInput = $<HTMLInputElement>('#qf-first');
  const phoneInput = $<HTMLInputElement>('#qf-phone');
  const consentBox = $<HTMLInputElement>('[data-qf-consent]');
  const unlockPhone = $<HTMLInputElement>('#qf-unlock-phone');
  const fieldError = (input: HTMLInputElement, message: string) => {
    const err = root!.querySelector<HTMLElement>(`#${input.id}-error`)!;
    err.textContent = message;
    err.hidden = !message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
  };
  const setStatus = (el: HTMLElement, text: string, isError = false) => {
    el.textContent = text;
    el.classList.toggle('is-error', isError);
  };
  // The server's own check (server/quote/phone.js), so a number accepted here is never refused there.
  const phoneOk = (v: string) => toE164US(v) !== null;
  const quoteReady = (): Quote | null =>
    answers.gender && answers.age && typeof answers.tobacco === 'boolean' && answers.coverage
      ? { age: answers.age, gender: answers.gender, tobacco: answers.tobacco, coverage: answers.coverage }
      : null;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = firstInput.value.trim();
    fieldError(firstInput, firstName ? '' : 'Please enter your name.');
    fieldError(phoneInput, phoneOk(phoneInput.value) ? '' : 'Please enter a 10-digit US mobile number.');
    if (!firstName) return firstInput.focus();
    if (!phoneOk(phoneInput.value)) return phoneInput.focus();
    if (!quoteReady() || !answers.state || !answers.use) return show(1);
    track('quote_contact_submit');
    complete(7);
    // The pricing screen, blurred, with the number already entered (not asked again).
    unlockPhone.value = phoneInput.value.trim();
    showPhoneSummary();
    lockCards();
    show(8);
  });

  function sourceInfo() {
    const f = leadSourceFields();
    return {
      page: f['Submission Page'], landingPage: f['Landing Page'], trafficSource: f['Traffic Source'], referrer: f['Referrer'],
      utmSource: f['UTM Source'], utmMedium: f['UTM Medium'], utmCampaign: f['UTM Campaign'], utmTerm: f['UTM Term'], utmContent: f['UTM Content'],
      ...(arrival ? entrySource(arrival.entry) : {}),
    };
  }

  // Step 7 (locked): send the code from the pricing screen.
  const unlockPanel = $('[data-qf-unlock]');
  const phoneSummary = $('[data-qf-phone-summary]');
  const phoneShow = $('[data-qf-phone-show]');
  const phoneField = $('[data-qf-phone-field]');
  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return d.length === 10 ? `(***) ***-${d.slice(6)}` : '';
  };
  function showPhoneSummary() {
    phoneShow.textContent = formatPhone(unlockPhone.value);
    phoneSummary.hidden = false;
    phoneField.hidden = true;
  }
  function editPhone() {
    phoneSummary.hidden = true;
    phoneField.hidden = false;
    unlockPhone.focus();
    unlockPhone.select();
  }
  const sendForm = $<HTMLFormElement>('[data-qf-send-form]');
  const sendBtn = $<HTMLButtonElement>('[data-qf-send]');
  const sendStatus = $('[data-qf-send-status]');
  const verifyForm = $<HTMLFormElement>('[data-qf-verify]');
  const codeInput = $<HTMLInputElement>('#qf-code');
  const verifyStatus = $('[data-qf-verify-status]');
  const verifyBtn = $<HTMLButtonElement>('[data-qf-verify-btn]');
  const resendBtn = $<HTMLButtonElement>('[data-qf-resend]');
  // v5.4: temporary access-code mode. Only the server sends this instruction (never in Twilio
  // mode); it replaces the SMS sentence, and no text claims a message was sent.
  let tempCode = false;
  function temporaryCode(note: unknown) {
    if (typeof note !== 'string' || !note) return;
    tempCode = true;
    unlockPanel.dataset.tempCode = '';
    root!.querySelectorAll<HTMLElement>('[data-qf-temp-note]').forEach((p) => { p.textContent = note; p.hidden = false; });
    resendBtn.hidden = true;
  }
  let resendTimer: number | undefined;
  function cooldown(ms: number) {
    window.clearInterval(resendTimer);
    let left = Math.ceil(ms / 1000);
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend Code (${left})`;
    resendTimer = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
      } else resendBtn.textContent = `Resend Code (${left})`;
    }, 1000);
  }

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    fieldError(unlockPhone, phoneOk(unlockPhone.value) ? '' : 'Please enter a 10-digit US mobile number.');
    if (!phoneOk(unlockPhone.value)) return editPhone();
    const quote = quoteReady();
    if (!quote || !answers.state || !answers.use) return show(1);
    sendBtn.disabled = true;
    setStatus(sendStatus, tempCode ? '' : 'Sending your code…');
    const { http, body } = await api({
      action: 'start', firstName: firstInput.value.trim(), phone: unlockPhone.value.trim(), state: answers.state, intendedUse: answers.use, quote,
      consent: consentBox.checked, consentVersion: root!.dataset.consentVersion, verifyNoticeVersion: root!.dataset.verifyVersion,
      source: sourceInfo(),
    });
    sendBtn.disabled = false;
    if (http !== 200 || body.status !== 'sent') {
      // A number the server refuses: show the field so it can be corrected here.
      if (body.field === 'phone') {
        fieldError(unlockPhone, body.message ?? 'Please enter a 10-digit US mobile number.');
        setStatus(sendStatus, '');
        return editPhone();
      }
      // A name the server refuses: back to the contact step, answers kept, at the name field.
      if (body.field === 'name') {
        setStatus(sendStatus, '');
        show(7);
        fieldError(firstInput, body.message ?? 'Please enter your name.');
        return firstInput.focus();
      }
      setStatus(sendStatus, body.message ?? `Sorry, we couldn't send a code. Please call ${lead.phone.display}.`, true);
      sendStatus.focus();
      return;
    }
    track('quote_sms_request');
    leadId = body.lead;
    temporaryCode(body.temporaryCodeNote);
    testBanner.hidden = !body.testMode;
    setStatus(sendStatus, '');
    sendForm.hidden = true;
    verifyForm.hidden = false;
    setStatus(verifyStatus, '');
    codeInput.value = '';
    if (!tempCode) cooldown(body.resendAfterMs ?? 30000);
    codeInput.focus();
  });

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
  });
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codeInput.value)) {
      setStatus(verifyStatus, 'Enter the 6-digit code from the text message.', true);
      return codeInput.focus();
    }
    verifyBtn.disabled = true;
    setStatus(verifyStatus, 'Checking…');
    const { http, body } = await api({ action: 'check', lead: leadId, code: codeInput.value });
    verifyBtn.disabled = false;
    if (http !== 200 || body.status !== 'verified') {
      setStatus(verifyStatus, body.message ?? 'We could not check the code. Please try again.', true);
      codeInput.select();
      return;
    }
    track('quote_sms_verified');
    // Completed quote lead (Randy, November 2026): the conversion (GA4
    // generate_lead, Meta Lead) is counted once, by tracking.ts, when the
    // server reports leadConversion (a real SMS verification, or the
    // temporary code accepted for a saved lead not labeled TEST); never for a
    // code request, Apply Now, /facebook/, a resumed session or preview test mode.
    if (body.leadConversion === true) window.dispatchEvent(new CustomEvent('ff:lead', { detail: { id: leadId } }));
    complete(8);
    setStatus(verifyStatus, '');
    unlock(quoteReady() ?? (body.quote as Quote), body.testMode, body.expiresAt);
  });
  resendBtn.addEventListener('click', async () => {
    resendBtn.disabled = true;
    const { http, body } = await api({ action: 'resend', lead: leadId });
    if (http === 200) {
      setStatus(verifyStatus, 'A new code is on its way.');
      cooldown(body.resendAfterMs ?? 30000);
    } else {
      setStatus(verifyStatus, body.message ?? 'We could not send a new code.', true);
      if (body.resendAfterMs) cooldown(body.resendAfterMs);
      else resendBtn.disabled = false;
    }
  });
  $('[data-qf-change]').addEventListener('click', () => {
    verifyForm.hidden = true;
    sendForm.hidden = false;
    editPhone();
  });
  $('[data-qf-edit-phone]').addEventListener('click', editPhone);

  // Step 7 (unlocked): live prices with free repricing. Carrier names and
  // logos stay blurred; the browser only ever gets attribution codes.
  const adjust = $<HTMLFormElement>('[data-qf-adjust]');
  const adjOther = $('[data-qf-adj-other]');
  const adjOtherInput = $<HTMLInputElement>('#qf-adj-other');
  const adjOtherError = $('[data-qf-adj-other-error]');
  const live = $('[data-qf-live]');
  const applyStatus = $('[data-qf-apply-status]');
  const pricing = steps.get(8)!;
  const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-qf-card]')).map((el) => [el.dataset.qfCard!, el]));
  const cache = new Map<string, Category[]>();
  let shown: { quote: Quote; categories: Category[] } | null = null;
  let timer: number | undefined;
  let seq = 0;
  let firstView = true;

  // Safe stand-ins for the blurred, locked cards: never real prices, carriers or plans.
  const STAND_INS = ['$38.47', '$52.19', '$71.36'];
  const LOGO_STAND_INS = ['Insurance Co.', 'Life Company', 'Insurance Co.'];
  const PLAN_STAND_INS = ['Whole Life Plan', 'Final Expense Plan', 'Life Insurance Plan'];
  const DEFAULT_LABELS = Array.from(cards.values()).map((el) => el.querySelector('.qf-card__label')!.textContent ?? '');
  const resultsTitle = $('[data-qf-results-title]');
  const resultsLead = $('[data-qf-results-lead]');
  const adjustIntro = $('[data-qf-adjust-intro]');
  const refNote = $('[data-qf-ref]');
  const tiers = $('[data-qf-tiers]');
  const blurred = (text: string) => {
    const b = document.createElement('span');
    b.className = 'qf-blur';
    b.setAttribute('aria-hidden', 'true');
    b.textContent = text;
    return b;
  };
  /** The approved card icons: a filled check for first-day coverage, a calendar for a waiting period. */
  function timingIcon(kind: 'check' | 'calendar') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.dataset.icon = kind;
    const shapes =
      kind === 'check'
        ? [['circle', { cx: '12', cy: '12', r: '11', fill: '#0b2e22' }], ['path', { d: 'M6.8 12.4l3.4 3.4 7-7.2', fill: 'none', stroke: '#fff', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]]
        : [['rect', { x: '3', y: '4.5', width: '18', height: '16', rx: '2', fill: 'none', stroke: '#0b2e22', 'stroke-width': '2' }], ['path', { d: 'M3 9.5h18M8 2.5v4M16 2.5v4', fill: 'none', stroke: '#0b2e22', 'stroke-width': '2', 'stroke-linecap': 'round' }], ['rect', { x: '13', y: '13', width: '4', height: '4', rx: '0.5', fill: '#0b2e22' }]];
    for (const [tag, attrs] of shapes as [string, Record<string, string>][]) {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.append(el);
    }
    return svg;
  }
  function lockCards() {
    unlocked = false;
    pricing.dataset.locked = 'true';
    adjust.hidden = true;
    adjustIntro.hidden = true;
    // The representative-rates note shows only with real prices (v4.3).
    refNote.hidden = true;
    tiers.hidden = true;
    unlockPanel.hidden = false;
    // The results headline and its supporting line appear only after verification.
    resultsTitle.textContent = 'Your quote results';
    resultsTitle.classList.add('visually-hidden');
    resultsLead.hidden = true;
    let i = 0;
    for (const el of cards.values()) {
      el.dataset.state = 'locked';
      const amount = el.querySelector<HTMLElement>('[data-qf-amount]')!;
      amount.innerHTML = `<span class="qf-blur" aria-hidden="true">${STAND_INS[i]}</span><span class="visually-hidden">Price shown after you verify your phone number</span>`;
      el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = '';
      const lockedApply = el.querySelector<HTMLButtonElement>('[data-qf-apply]')!;
      lockedApply.disabled = true;
      lockedApply.querySelector('[data-qf-apply-label]')!.textContent = 'Unlock to See Rates';
      delete lockedApply.dataset.ready;
      el.querySelector<HTMLElement>('[data-qf-call]')!.hidden = true;
      el.querySelector<HTMLElement>('[data-qf-plan]')!.replaceChildren(blurred(PLAN_STAND_INS[i]));
      const timing = el.querySelector<HTMLElement>('[data-qf-timing]')!;
      timing.textContent = '';
      timing.hidden = true;
      el.querySelector('.qf-card__label')!.textContent = DEFAULT_LABELS[i];
      const stand = blurred(LOGO_STAND_INS[i]);
      stand.classList.add('qf-logo-stand');
      el.querySelector<HTMLElement>('[data-qf-logo]')!.replaceChildren(stand);
      i++;
    }
  }

  function fillAdjust(q: Quote) {
    ($('#qf-adj-age') as HTMLSelectElement).value = String(q.age);
    adjust.querySelector<HTMLInputElement>(`input[name="gender"][value="${q.gender}"]`)!.checked = true;
    adjust.querySelector<HTMLInputElement>(`input[name="tobacco"][value="${q.tobacco ? 'yes' : 'no'}"]`)!.checked = true;
    const preset = adjust.querySelector<HTMLInputElement>(`input[name="coverage"][value="${q.coverage}"]`);
    if (preset) {
      preset.checked = true;
      adjOther.hidden = true;
    } else {
      adjust.querySelector<HTMLInputElement>('input[name="coverage"][value="other"]')!.checked = true;
      adjOther.hidden = false;
      adjOtherInput.value = q.coverage.toLocaleString('en-US');
    }
  }
  function readAdjust(): Quote | null {
    const val = (n: string) => adjust.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`)?.value;
    const choice = val('coverage');
    adjOther.hidden = choice !== 'other';
    let coverage = Number(choice);
    if (choice === 'other') {
      const raw = adjOtherInput.value.trim();
      const n = parseAmount(raw);
      adjOtherError.hidden = n !== null || raw === '';
      adjOtherError.textContent = n === null && raw !== '' ? `Enter a whole-dollar amount from ${money(MIN)} to ${money(MAX)}.` : '';
      if (n === null) return null;
      coverage = n;
    }
    return { age: Number(($('#qf-adj-age') as HTMLSelectElement).value), gender: val('gender') === 'female' ? 'female' : 'male', tobacco: val('tobacco') === 'yes', coverage };
  }

  function setCard(el: HTMLElement, cat: Category | null, state: string, note: string) {
    el.dataset.state = state;
    el.querySelector<HTMLElement>('[data-qf-amount]')!.textContent =
      state === 'ok' && cat?.monthlyPremium ? `$${cat.monthlyPremium}` : state === 'pending' ? 'Coming soon' : state === 'loading' ? ' ' : 'Not available';
    el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = note;
    el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.disabled = state !== 'ok';
    if (state === 'loading') return;
    // Verified: everything is shown, nothing blurred.
    if (cat?.label) el.querySelector('.qf-card__label')!.textContent = cat.label;
    const names = (cat?.carriers ?? []).filter(Boolean) as Carrier[];
    el.querySelector<HTMLElement>('[data-qf-plan]')!.textContent = names.map((n) => n.subtitle ?? n.plan).join(' / ');
    el.querySelector<HTMLElement>('[data-qf-call]')!.hidden = state !== 'ok';
    el.querySelector('[data-qf-apply] [data-qf-apply-label]')!.textContent = 'Text Us for Help';
    el.querySelector<HTMLElement>('[data-qf-apply]')!.dataset.ready = 'true';
    const timing = el.querySelector<HTMLElement>('[data-qf-timing]')!;
    const timings = [...new Set(names.map((n) => n.timing).filter(Boolean))];
    timing.textContent = state === 'ok' ? timings.join(' / ') : '';
    timing.hidden = !timing.textContent;
    if (!timing.hidden) timing.prepend(timingIcon(/waiting period/i.test(timing.textContent) ? 'calendar' : 'check'));
    el.querySelector<HTMLElement>('[data-qf-logo]')!.replaceChildren(
      ...names.map((n) => {
        if (n.logo) {
          const img = new Image();
          img.src = n.logo;
          img.alt = n.carrier;
          img.decoding = 'async';
          return img;
        }
        // No authentic logo file yet: the company name in plain text.
        const w = document.createElement('span');
        w.className = 'qf-logo-name';
        w.textContent = n.carrier;
        return w;
      }),
    );
  }
  function render(quote: Quote, categories: Category[]) {
    shown = { quote, categories };
    for (const cat of categories) {
      const el = cards.get(cat.id);
      if (el) setCard(el, cat, cat.status, cat.status === 'ok' ? '' : cat.message ?? '');
    }
    const ok = categories.filter((c) => c.status === 'ok').map((c) => `${c.label} $${c.monthlyPremium} per month`);
    live.textContent = ok.length ? `Prices updated. ${ok.join('. ')}.` : 'Prices updated.';
    if (firstView) {
      firstView = false;
      track('quote_pricing_view');
    }
  }
  async function reprice(quote: Quote) {
    if (expired) return;
    const k = JSON.stringify(quote);
    const hit = cache.get(k);
    if (hit) return render(quote, hit);
    const mine = ++seq;
    try {
      const res = await fetch('/api/price-explorer/', { method: 'POST', headers: jsonHeaders(), body: k, credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq) return;
      if (res.status === 401) {
        // The verified session ended: back to the locked pricing screen.
        shown = null;
        lockCards();
        sendForm.hidden = false;
        verifyForm.hidden = true;
        show(8);
        setStatus(sendStatus, 'Please verify your phone number again to see prices.', true);
        return;
      }
      if (!res.ok || body.status !== 'ok') {
        for (const el of cards.values()) setCard(el, null, 'unavailable', body.message ?? 'Prices are not available right now.');
        return;
      }
      cache.set(k, body.categories);
      if (!expired) render(quote, body.categories);
    } catch {
      if (mine === seq) for (const el of cards.values()) setCard(el, null, 'unavailable', 'Prices are not available right now.');
    }
  }
  adjust.addEventListener('change', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const q = readAdjust();
      if (!q) return;
      track('quote_pricing_adjust');
      Object.assign(answers, q);
      saveSteps();
      void reprice(q);
    }, 200);
  });
  adjOtherInput.addEventListener('input', () => adjust.dispatchEvent(new Event('change')));
  adjust.addEventListener('submit', (e) => e.preventDefault());

  /** Reveal prices in place (no navigation, no reload). */
  // When this quote access ends (the server's fixed expiry, 12 hours after the unlock).
  let accessExpiresAt = 0;
  // Results countdown (V2.0): 10:00 from the first time this visit's prices
  // appear; a refresh or a pricing change keeps the same end time. At 0:00
  // the prices are hidden (safe stand-ins, as before verification) and
  // Start New Quote begins a fresh visit.
  const countdown = $('[data-qf-countdown]');
  const restart = $<HTMLButtonElement>('[data-qf-restart]');
  let expired = false;
  let stopCountdown: (() => void) | null = null;
  function expireResults() {
    expired = true;
    window.clearTimeout(timer);
    pricing.dataset.expired = 'true';
    adjust.hidden = true;
    adjustIntro.hidden = true;
    refNote.hidden = true;
    tiers.hidden = true;
    let i = 0;
    for (const el of cards.values()) {
      el.querySelector<HTMLElement>('[data-qf-amount]')!.innerHTML = `<span class="qf-blur" aria-hidden="true">${STAND_INS[i++]}</span><span class="visually-hidden">This offer has expired</span>`;
      el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = '';
      el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.disabled = true;
    }
    restart.hidden = false;
  }
  restart.addEventListener('click', () => {
    restart.disabled = true;
    void restartQuote();
  });
  function unlock(quote: Quote, test: boolean, expiresAt?: unknown) {
    if (typeof expiresAt === 'number') accessExpiresAt = expiresAt;
    unlocked = true;
    pricing.dataset.locked = 'false';
    testBanner.hidden = !test;
    unlockPanel.hidden = true;
    adjust.hidden = false;
    adjustIntro.hidden = false;
    refNote.hidden = false;
    tiers.hidden = false;
    resultsTitle.textContent = 'Call Funeral Funds for Access to Even Lower Rates!';
    resultsTitle.classList.remove('visually-hidden');
    resultsLead.hidden = false;
    stopCountdown?.();
    stopCountdown = runCountdown(countdown, offerExpiresAt('results'), expireResults);
    if (expired) {
      show(8, false);
      return;
    }
    fillAdjust(quote);
    show(8, false);
    // Stay on the page; bring the top of the results into view.
    resultsTitle.focus({ preventScroll: true });
    root!.scrollIntoView({ block: 'start', behavior: 'auto' });
    void reprice(quote);
  }

  // Apply Now -> server records the choice -> carrier-specific questions.
  const intakeTitle = $('[data-qf-intake-title]');
  const intakeSub = $('[data-qf-intake-sub]');
  const intakeQ = $('[data-qf-intake-q]');
  const intakeCount = $('[data-qf-intake-count]');
  const intakeText = $('[data-qf-intake-text]');
  const intakeDone = $('[data-qf-intake-done]');
  const intakeDoneText = $('[data-qf-intake-done-text]');
  const intakeStatus = $('[data-qf-intake-status]');
  let intakeCategory = '';
  let questionId = '';
  let applyNotified = true;
  let completed = false;

  function intakeFinished(reason: string, flag: string | null) {
    intakeQ.hidden = true;
    intakeDone.hidden = false;
    intakeDoneText.textContent =
      reason === 'guaranteed-issue' ? 'No health questions asked. Your selection was saved.'
      : flag === 'may-not-qualify' ? 'Thank you. Your answers were saved, and Funeral Funds can help you find other coverage.'
      : reason === 'no-question-set' ? 'Your selection was saved.'
      : 'Thank you. Your answers were saved.';
  }
  function finish() {
    if (completed) return;
    completed = true;
    // The funnel's lead is counted at verification (ff:lead), never on /help/.
    location.assign(lead.formspark.successPath);
  }
  $('[data-qf-intake-finish]').addEventListener('click', finish);
  /** Apply Now (Randy, November 2026): the temporary phone-assisted
   * application on /facebook/, with the page's own query string (campaign
   * values). Apply Now is an application intent (GA4 quote_apply_now, sent
   * above), never a GA4 generate_lead or Meta Lead. */
  function handoffToApplication() {
    if (completed) return;
    completed = true;
    location.assign(`/facebook/${location.search}`);
  }

  async function intakeStep(body: Record<string, unknown>) {
    setStatus(intakeStatus, '');
    const r = await api(body);
    if (r.http === 401) {
      lockCards();
      show(8);
      return;
    }
    if (r.http !== 200) {
      setStatus(intakeStatus, r.body.message ?? `Sorry, something went wrong. Please call ${lead.phone.display}.`, true);
      return;
    }
    if (r.body.status === 'question') {
      const q = r.body.question;
      questionId = q.id;
      intakeQ.hidden = false;
      intakeDone.hidden = true;
      intakeCount.textContent = `Question ${q.index} of ${q.total}`;
      intakeText.textContent = q.text;
      intakeText.focus?.();
      return;
    }
    intakeFinished(r.body.reason, r.body.flag);
  }
  root.querySelectorAll<HTMLButtonElement>('[data-qf-answer]').forEach((btn) =>
    btn.addEventListener('click', () => intakeStep({ action: 'intake-answer', category: intakeCategory, questionId, answer: btn.dataset.qfAnswer })),
  );

  // "Call to Get Approved" (v3.7): the tel: link dials 888-862-9456 itself;
  // this only records which quote was on the card (a tap, not a call).
  const QUOTE_REF_KEY = 'ff:quote-ref';
  const quoteRef = () => {
    try {
      let r = sessionStorage.getItem(QUOTE_REF_KEY) ?? '';
      if (!/^[A-Za-z0-9]{16}$/.test(r)) {
        r = newVisitId().slice(0, 16);
        sessionStorage.setItem(QUOTE_REF_KEY, r);
      }
      return r;
    } catch {
      return '';
    }
  };
  for (const [id, el] of cards) {
    el.querySelector<HTMLAnchorElement>('[data-qf-call]')!.addEventListener('click', () => {
      if (!shown || !unlocked) return;
      const cat = shown.categories.find((c) => c.id === id);
      if (!cat || cat.status !== 'ok') return;
      const first = (cat.carriers ?? []).find(Boolean) as Carrier | undefined;
      const ref = quoteRef();
      const at = new Date().toISOString();
      track('quote_call_click', { category: id, carrier: first?.carrier, product: first?.plan, coverage: shown.quote.coverage, premium: cat.monthlyPremium, quoteRef: ref, at });
      try {
        void fetch('/api/quote/', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ action: 'call-click', category: id, quote: shown.quote, quoteRef: ref || undefined }), credentials: 'same-origin', keepalive: true }).catch(() => {});
      } catch {}
    });
  }
  for (const [id, el] of cards) {
    el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!shown || !unlocked || expired) return;
      const cat = shown.categories.find((c) => c.id === id);
      if (!cat || cat.status !== 'ok') return;
      btn.disabled = true;
      setStatus(applyStatus, 'Saving your selection…');
      track('quote_apply_now', { category: id });
      const { http, body } = await api({ action: 'apply', category: id, quote: shown.quote });
      btn.disabled = false;
      if (http === 401) {
        lockCards();
        show(8);
        return;
      }
      if (http !== 200 || body.status !== 'ok') {
        setStatus(applyStatus, body.message ?? `Sorry, something went wrong. Please call ${lead.phone.display}.`, true);
        return;
      }
      setStatus(applyStatus, '');
      // v6.2: the lead counts once the server has saved the Apply Now record.
      applyNotified = body.saved === true;
      // The selected card, server-priced, for /facebook/ (quote-handoff.ts).
      const first = cat.carriers?.find((c): c is Carrier => Boolean(c)) ?? null;
      const attribution = Object.fromEntries(Object.entries(sourceInfo()).filter(([, v]) => typeof v === 'string' && v)) as Record<string, string>;
      saveHandoff({
        selection: { tierId: id, tier: String(body.category ?? cat.label), carrier: first?.carrier ?? null, plan: first?.plan ?? null, coverage: shown.quote.coverage, monthlyPremium: String(body.monthlyPremium ?? cat.monthlyPremium) },
        inputs: { age: shown.quote.age, gender: shown.quote.gender, tobacco: shown.quote.tobacco, intendedUse: answers.use ?? null, state: answers.state ?? null },
        attribution,
        ...(accessExpiresAt ? { expiresAt: accessExpiresAt } : {}),
      });
      handoffToApplication();
    });
  }

  // Start: only this tab's own verified visit returns to the live prices;
  // any other (new tab, new visit) starts at the first question.
  // v5.8: the visit's entry; a Male or Female choice made in an article's
  // sidebar is applied here, so the visitor starts at the age question (Back
  // still returns to the choice).
  track('quote_funnel_entry');
  if (arrival?.fromSidebar) track('quote_sidebar_select');
  const preselect = arrival?.preselect ?? null;
  if (preselect) {
    answers.gender = preselect;
    root.querySelectorAll('[data-pick="gender"]').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.value === preselect)));
    saveSteps();
    complete(1);
    show(2);
  }
  (async () => {
    const { http, body } = await api({ action: 'session' });
    temporaryCode(body.temporaryCodeNote);
    if (http === 200 && body.status === 'verified' && body.quote) return unlock(quoteReady() ?? (body.quote as Quote), body.testMode, body.expiresAt);
    // Only if the visitor hasn't already answered (an answer given while this
    // check was loading must not send them back to the first question).
    if (!preselect && current === 1) show(1, false);
  })();
}
