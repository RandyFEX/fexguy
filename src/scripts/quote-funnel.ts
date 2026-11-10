// Quote funnel (Quote System v2.2; v3.5 layout and cards) for /free-quote/ (moved from /final-expense-insurance-prices/ in v5.8).
//
// Steps 1-5 collect sex, age, tobacco, coverage and state, one
// per screen (they advance on their own). Step 6 takes the full name, mobile
// number; clicking SEE MY RATES under the disclosure is the consent (V3.8, no checkbox). V3.3 (Randy, November 2026):
// no SMS verification. SEE MY RATES sends them to the server, which saves the
// lead, delivers it to Agent CRM (production) and sets this visit's HttpOnly
// quote session cookie; the rates then show at once. Prices come from
// api/price-explorer.js only for that session, so nothing here can open them.
// The visitor can change age, sex, tobacco and coverage freely; a refresh
// returns to the results while the session lasts (12 hours).
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
import { previewRequest, previewSession, startPreviewVisit } from '@/scripts/quote-preview';
import { toE164US } from '../../server/quote/phone.js';
import { isFullName } from '../../server/quote/name.js';
import { SMS_NUMBER } from '@/config/phones';
import { isIOS, isMobileDevice, prewrittenText, smsHref } from '@/scripts/sms-link.js';

// Direct preview access (preview and local builds only): ?preview=results
// opens the real results with the fixed sample (src/scripts/quote-preview.ts).
const preview = previewRequest() === 'results' ? startPreviewVisit() : null;

// The session's traffic source (first landing, UTM, ad click) is kept for
// /facebook/'s phone number and the lead record (src/scripts/lead-source.ts).
recordVisit();

type Gender = 'male' | 'female';
type Quote = { age: number; gender: Gender; tobacco: boolean; coverage: number };
// V4.29: the results page can price by a Desired Premium ("50.00") instead of a coverage amount.
type PriceQuote = { age: number; gender: Gender; tobacco: boolean } & ({ coverage: number; premium?: never } | { premium: string; coverage?: never });
type Category = { id: string; label: string; status: 'ok' | 'pending' | 'unavailable'; monthlyPremium?: string; coverage?: number; premium?: string; message?: string; attribution: string[]; carriers?: (Carrier | null)[] };
type Carrier = { carrier: string; plan: string; subtitle?: string; timing?: string; logo?: string | null };

const root = document.querySelector<HTMLElement>('[data-quote-funnel]');
const RESULTS_START_COVERAGE = 10000;
const TOTAL = 5;
const STEPS_KEY = 'ff:quote-steps'; // non-personal answers only (sex, age, tobacco, coverage)
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
// v5.8: where this visit started (article sidebar, campaign or direct); every
// funnel event carries the entry type and the article's path (never personal data).
const arrival = root ? readFunnelEntry() : null;
const track = (name: string, extra: Record<string, unknown> = {}) =>
  window.dispatchEvent(new CustomEvent('ff:funnel', { detail: { name, ...(arrival ? entryAnalytics(arrival.entry) : {}), ...extra } }));

// Visit-scoped sessions (v2.7): one random visit id, sent with every
// request; the server only accepts a quote session for the visit it was
// opened in. 12-hour quote access (Randy, November 2026): the id is kept in
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
/** V4.16 (Randy, November 2026): each card's "Text to Chat or Apply".
 *  Phones and tablets: a direct sms: link to SMS_NUMBER (src/config/phones.ts)
 *  with Randy's approved prewritten text (src/scripts/sms-link.js, the same
 *  text /facebook/ uses). Computers: the /facebook/ handoff page (query string
 *  kept), with its computer instructions and QR code. Active only on a priced
 *  card. */
const ON_PHONE = isMobileDevice(navigator);
function setTextLink(a: HTMLElement, on: boolean, href = '') {
  if (on && href) {
    a.setAttribute('href', href);
    a.removeAttribute('aria-disabled');
  } else {
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
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

  const answers: Partial<Quote> & { state?: string } = {};
  try {
    Object.assign(answers, JSON.parse(sessionStorage.getItem(STEPS_KEY) ?? '{}'));
  } catch {}
  // V4.31: no coverage question; every quote starts at $10,000 (the results page changes it).
  answers.coverage ??= RESULTS_START_COVERAGE;
  const saveSteps = () => {
    try {
      const { age, gender, tobacco, coverage } = answers;
      sessionStorage.setItem(STEPS_KEY, JSON.stringify({ age, gender, tobacco, coverage }));
    } catch {}
  };
  let leadId = '';
  let current = 1;
  let started = false;
  let unlocked = false;
  // V4.16: the visitor's own name (first word goes into the prewritten text).
  let visitorName = '';

  function show(n: number, focus = true) {
    current = n;
    for (const [i, el] of steps) el.hidden = i !== n;
    const results = n >= 7;
    back.hidden = n === 1 || results;
    root!.querySelector<HTMLElement>('[data-qf-top]')!.hidden = results;
    progressWrap.hidden = results;
    progressLabel.hidden = results;
    // V4.31: the coverage question (internal step 4) is gone; the steps after it show one lower.
    const shownStep = Math.min(n > 4 ? n - 1 : n, TOTAL);
    progress.style.width = `${(shownStep / TOTAL) * 100}%`;
    progressLabel.textContent = `Step ${shownStep} of ${TOTAL}`;
    if (!focus) return;
    if (n === 6) fillSummary();
    const target = steps.get(n)?.querySelector<HTMLElement>('.qf-q');
    target?.focus({ preventScroll: true });
    root!.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  /** Step 6: the visitor's own selections (Gender | Age | State | Tobacco | Coverage). */
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
  // V4.31: no coverage question; tobacco (3) is followed by the state question (5).
  const nextStep = (n: number) => (n === 3 ? 5 : n + 1);
  back.addEventListener('click', () => show(Math.max(1, current === 5 ? 3 : current - 1)));

  // Steps 1-3: tap to answer and advance.
  root.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-pick]');
    if (!btn) return;
    const { pick, value } = btn.dataset;
    btn.parentElement?.querySelectorAll('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    if (pick === 'gender') answers.gender = value === 'female' ? 'female' : 'male';
    if (pick === 'age') answers.age = Number(value);
    if (pick === 'tobacco') answers.tobacco = value === 'yes';
    saveSteps();
    complete(current);
    show(nextStep(current));
  });


  // Step 5: state (lead information only; never changes prices).
  const stateSelect = $<HTMLSelectElement>('[data-qf-state]');
  stateSelect.addEventListener('change', () => {
    if (!stateSelect.value) return;
    answers.state = stateSelect.value;
    complete(5);
    show(6);
  });


  // Step 6: the visitor's full name and mobile number (V3.8: no consent checkbox).
  // The funnel's phone number (888-656-4648 on /free-quote/) comes from the page HTML.
  const funnelPhone = root.dataset.funnelPhone || lead.phone.display;
  const contactForm = $<HTMLFormElement>('[data-qf-contact]');
  const firstInput = $<HTMLInputElement>('#qf-first');
  const phoneInput = $<HTMLInputElement>('#qf-phone');
  const submitBtn = $<HTMLButtonElement>('[data-qf-submit]');
  const contactStatus = $('[data-qf-contact-status]');
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

  // A delivery that failed: the retry re-sends the same saved lead (no duplicate).
  let retryLead = '';
  let submitting = false;
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    const firstName = firstInput.value.trim().replace(/\s+/g, ' ');
    const nameOk = isFullName(firstName);
    fieldError(firstInput, nameOk ? '' : 'Please enter your full name (first and last name).');
    fieldError(phoneInput, phoneOk(phoneInput.value) ? '' : 'Please enter a 10-digit US mobile number.');
    if (!nameOk) return firstInput.focus();
    if (!phoneOk(phoneInput.value)) return phoneInput.focus();
    const quote = quoteReady();
    if (!quote || !answers.state) return show(1);
    track('quote_contact_submit');
    submitting = true;
    submitBtn.disabled = true;
    setStatus(contactStatus, 'Getting your rates…');
    const { http, body } = await api({
      action: 'start', firstName, phone: phoneInput.value.trim(), state: answers.state, quote,
      consentVersion: root!.dataset.consentVersion,
      // V4.42: which quote page this is (/free-quote/ or /get-rates/); the server validates it.
      funnel: root!.dataset.funnel,
      source: sourceInfo(), ...(retryLead ? { retry: retryLead } : {}),
    });
    submitting = false;
    submitBtn.disabled = false;
    if (http !== 200 || body.status !== 'verified') {
      // Nothing is lost: the answers and both fields stay as typed.
      if (body.field === 'phone' || body.field === 'name') {
        const input = body.field === 'phone' ? phoneInput : firstInput;
        setStatus(contactStatus, '');
        fieldError(input, body.message ?? (body.field === 'phone' ? 'Please enter a 10-digit US mobile number.' : 'Please enter your full name (first and last name).'));
        return input.focus();
      }
      if (typeof body.lead === 'string') retryLead = body.lead;
      setStatus(contactStatus, body.message ?? `Sorry, we couldn't send your request. Please try again, or call ${funnelPhone}.`, true);
      contactStatus.focus();
      return;
    }
    retryLead = '';
    leadId = body.lead;
    setStatus(contactStatus, '');
    track('quote_lead_accepted');
    // The conversion (GA4 generate_lead, Meta Lead) is counted once, by
    // tracking.ts, when the server reports leadConversion: the lead reached
    // Agent CRM on the production deployment (never on previews, for a name
    // labeled TEST, a resumed session, Apply Now or /facebook/).
    if (body.leadConversion === true) window.dispatchEvent(new CustomEvent('ff:lead', { detail: { id: leadId } }));
    complete(6);
    visitorName = firstName;
    // Randy (November 2026): the results always open at $10,000 for everyone
    // (the amount chosen on the coverage question stays in the lead record).
    answers.coverage = RESULTS_START_COVERAGE;
    saveSteps();
    unlock({ ...quote, coverage: RESULTS_START_COVERAGE }, body.testMode, body.expiresAt);
  });

  function sourceInfo() {
    const f = leadSourceFields();
    return {
      page: f['Submission Page'], landingPage: f['Landing Page'], trafficSource: f['Traffic Source'], referrer: f['Referrer'],
      utmSource: f['UTM Source'], utmMedium: f['UTM Medium'], utmCampaign: f['UTM Campaign'], utmTerm: f['UTM Term'], utmContent: f['UTM Content'],
      ...(arrival ? entrySource(arrival.entry) : {}),
    };
  }

  // Step 7: live prices with free repricing.
  const adjust = $<HTMLFormElement>('[data-qf-adjust]');
  const adjPremium = $('[data-qf-adj-premium]');
  const adjPremiumInput = $<HTMLInputElement>('#qf-adj-premium');
  const adjPremiumError = $('[data-qf-adj-premium-error]');
  /** V4.29: a Desired Monthly Premium as "50.00" ($1 to $9,999.99), or null. */
  const parsePremium = (raw: string) => {
    const t = raw.replace(/[$,\s]/g, '');
    if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return null;
    const n = Number(t);
    return n >= 1 && n <= 9999.99 ? n.toFixed(2) : null;
  };
  /** The coverage a card shows: its own (Desired Premium) or the chosen amount. */
  const cardCoverage = (cat: Category) => cat.coverage ?? shown?.quote.coverage ?? 0;
  const live = $('[data-qf-live]');
  const applyStatus = $('[data-qf-apply-status]');
  const pricing = steps.get(7)!;
  const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-qf-card]')).map((el) => [el.dataset.qfCard!, el]));
  const cache = new Map<string, Category[]>();
  let shown: { quote: PriceQuote; categories: Category[] } | null = null;
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
    // The results headline and its supporting line appear with real prices only.
    resultsTitle.textContent = 'Your quote results';
    resultsTitle.classList.add('visually-hidden');
    resultsLead.hidden = true;
    let i = 0;
    for (const el of cards.values()) {
      el.dataset.state = 'locked';
      const amount = el.querySelector<HTMLElement>('[data-qf-amount]')!;
      amount.innerHTML = `<span class="qf-blur" aria-hidden="true">${STAND_INS[i]}</span><span class="visually-hidden">Loading price</span>`;
      el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = '';
      const lockedApply = el.querySelector<HTMLElement>('[data-qf-apply]')!;
      setTextLink(lockedApply, false);
      lockedApply.querySelector('[data-qf-apply-label]')!.textContent = 'Text to Chat or Apply';
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

  // The quote session ended (or was never opened for this visit): back to the
  // contact step with every answer kept, to submit again.
  function sessionLost() {
    shown = null;
    lockCards();
    show(6);
    setStatus(contactStatus, 'Please confirm your details to see your rates again.', true);
  }

  function fillAdjust(q: PriceQuote) {
    ($('#qf-adj-age') as HTMLSelectElement).value = String(q.age);
    adjust.querySelector<HTMLInputElement>(`input[name="gender"][value="${q.gender}"]`)!.checked = true;
    adjust.querySelector<HTMLInputElement>(`input[name="tobacco"][value="${q.tobacco ? 'yes' : 'no'}"]`)!.checked = true;
    adjust.querySelectorAll<HTMLInputElement>('input[name="coverage"]').forEach((r) => (r.checked = false));
    if (q.premium) {
      adjust.querySelector<HTMLInputElement>('input[name="coverage"][value="premium"]')!.checked = true;
      adjPremiumInput.value = q.premium.replace(/\.00$/, '');
      adjPremium.hidden = false;
      return;
    }
    // A preset is selected; an amount from the coverage question's Other box selects none.
    const preset = adjust.querySelector<HTMLInputElement>(`input[name="coverage"][value="${q.coverage}"]`);
    if (preset) preset.checked = true;
    adjPremium.hidden = true;
  }
  function readAdjust(): PriceQuote | null {
    const val = (n: string) => adjust.querySelector<HTMLInputElement>(`input[name="${n}"]:checked`)?.value;
    const choice = val('coverage');
    adjPremium.hidden = choice !== 'premium';
    const base = { age: Number(($('#qf-adj-age') as HTMLSelectElement).value), gender: (val('gender') === 'female' ? 'female' : 'male') as Gender, tobacco: val('tobacco') === 'yes' };
    if (choice === 'premium') {
      const raw = adjPremiumInput.value.trim();
      const premium = parsePremium(raw);
      adjPremiumError.hidden = premium !== null || raw === '';
      adjPremiumError.textContent = premium === null && raw !== '' ? 'Enter a monthly amount, such as $50.' : '';
      adjPremiumInput.setAttribute('aria-invalid', String(premium === null && raw !== ''));
      return premium === null ? null : { ...base, premium };
    }
    adjPremiumError.hidden = true;
    adjPremiumInput.removeAttribute('aria-invalid');
    // No coverage choice selected (an Other amount from the coverage question): keep it.
    const coverage = choice ? Number(choice) : shown?.quote.coverage ?? answers.coverage;
    return coverage ? { ...base, coverage } : null;
  }

  function textHref(cat: Category): string {
    if (!ON_PHONE) return `/facebook/${location.search}`;
    const body = prewrittenText({ firstName: visitorName, coverage: cardCoverage(cat), monthlyPremium: cat.monthlyPremium ?? '' });
    return body ? smsHref(SMS_NUMBER, body, isIOS(navigator)) : '';
  }
  function setCard(el: HTMLElement, cat: Category | null, state: string, note: string) {
    el.dataset.state = state;
    // V4.29: with a Desired Premium the card shows the coverage it buys, for that premium.
    const byPremium = state === 'ok' && cat?.premium && cat.coverage;
    // A Desired Premium past the plan's maximum: its message only, in small fine print (Randy).
    const fine = state === 'unavailable' && Boolean(cat?.premium);
    el.toggleAttribute('data-fine', fine);
    el.querySelector<HTMLElement>('[data-qf-amount]')!.textContent =
      fine ? '' : byPremium ? money(cat!.coverage!) : state === 'ok' && cat?.monthlyPremium ? `$${cat.monthlyPremium}` : state === 'pending' ? 'Coming soon' : state === 'loading' ? ' ' : 'Not available';
    el.querySelector<HTMLElement>('.qf-card__per')!.textContent = byPremium ? `coverage for $${cat!.premium}/month` : 'per month';
    el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = note;
    setTextLink(el.querySelector<HTMLElement>('[data-qf-apply]')!, state === 'ok', state === 'ok' && cat ? textHref(cat) : '');
    if (state === 'loading') return;
    // Verified: everything is shown, nothing blurred.
    if (cat?.label) el.querySelector('.qf-card__label')!.textContent = cat.label;
    const names = (cat?.carriers ?? []).filter(Boolean) as Carrier[];
    el.querySelector<HTMLElement>('[data-qf-plan]')!.textContent = names.map((n) => n.subtitle ?? n.plan).join(' / ');
    el.querySelector<HTMLElement>('[data-qf-call]')!.hidden = state !== 'ok';
    el.querySelector('[data-qf-apply] [data-qf-apply-label]')!.textContent = 'Text to Chat or Apply';
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
  function render(quote: PriceQuote, categories: Category[]) {
    shown = { quote, categories };
    for (const cat of categories) {
      const el = cards.get(cat.id);
      if (el) setCard(el, cat, cat.status, cat.status === 'ok' ? '' : cat.message ?? '');
    }
    const ok = categories.filter((c) => c.status === 'ok').map((c) => (c.premium && c.coverage ? `${c.label} ${money(c.coverage)} coverage for $${c.premium} per month` : `${c.label} $${c.monthlyPremium} per month`));
    live.textContent = ok.length ? `Prices updated. ${ok.join('. ')}.` : 'Prices updated.';
    if (firstView) {
      firstView = false;
      track('quote_pricing_view');
    }
  }
  async function reprice(quote: PriceQuote) {
    if (expired) return;
    const k = JSON.stringify(quote);
    const hit = cache.get(k);
    if (hit) return render(quote, hit);
    const mine = ++seq;
    try {
      const res = await fetch('/api/price-explorer/', { method: 'POST', headers: jsonHeaders(), body: k, credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq) return;
      if (res.status === 401) return sessionLost();
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
      // The funnel's own answers keep a coverage amount; a Desired Premium is results-page only.
      Object.assign(answers, { age: q.age, gender: q.gender, tobacco: q.tobacco }, q.coverage ? { coverage: q.coverage } : {});
      saveSteps();
      void reprice(q);
    }, 200);
  });
  adjPremiumInput.addEventListener('input', () => adjust.dispatchEvent(new Event('change')));
  // Desired Premium: the input opens (and takes focus) at once.
  adjust.querySelectorAll<HTMLInputElement>('input[name="coverage"]').forEach((r) =>
    r.addEventListener('change', () => {
      adjPremium.hidden = r.value !== 'premium';
      if (r.value === 'premium') adjPremiumInput.focus();
    }),
  );
  adjust.addEventListener('submit', (e) => e.preventDefault());

  /** Reveal prices in place (no navigation, no reload). */
  // When this quote access ends (the server's fixed expiry, 12 hours after the unlock).
  let accessExpiresAt = 0;
  // Results countdown (V2.0): 10:00 from the first time this visit's prices
  // appear; a refresh or a pricing change keeps the same end time. At 0:00
  // the prices are hidden (safe stand-ins, as while loading) and
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
    let i = 0;
    for (const el of cards.values()) {
      el.querySelector<HTMLElement>('[data-qf-amount]')!.innerHTML = `<span class="qf-blur" aria-hidden="true">${STAND_INS[i++]}</span><span class="visually-hidden">This offer has expired</span>`;
      el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = '';
      setTextLink(el.querySelector<HTMLElement>('[data-qf-apply]')!, false);
    }
    restart.hidden = false;
  }
  restart.addEventListener('click', () => {
    restart.disabled = true;
    void restartQuote();
  });
  function unlock(quote: PriceQuote, test: boolean, expiresAt?: unknown) {
    if (typeof expiresAt === 'number') accessExpiresAt = expiresAt;
    unlocked = true;
    pricing.dataset.locked = 'false';
    testBanner.hidden = !test;
    adjust.hidden = false;
    adjustIntro.hidden = false;
    refNote.hidden = false;
    resultsTitle.textContent = 'We guarantee you qualify for at least one of these rates.';
    resultsTitle.classList.remove('visually-hidden');
    resultsLead.hidden = false;
    stopCountdown?.();
    stopCountdown = runCountdown(countdown, offerExpiresAt('results'), expireResults);
    if (expired) {
      show(7, false);
      return;
    }
    fillAdjust(quote);
    show(7, false);
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
    // The funnel's lead is counted when the server accepts it (ff:lead), never on /help/.
    location.assign(lead.formspark.successPath);
  }
  $('[data-qf-intake-finish]').addEventListener('click', finish);

  async function intakeStep(body: Record<string, unknown>) {
    setStatus(intakeStatus, '');
    const r = await api(body);
    if (r.http === 401) return sessionLost();
    if (r.http !== 200) {
      setStatus(intakeStatus, r.body.message ?? `Sorry, something went wrong. Please call ${funnelPhone}.`, true);
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

  // "Call to Get Approved" (v3.7): the tel: link dials the funnel's number itself;
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
      track('quote_call_click', { category: id, carrier: first?.carrier, product: first?.plan, coverage: cardCoverage(cat), premium: cat.monthlyPremium, quoteRef: ref, at });
      try {
        void fetch('/api/quote/', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ action: 'call-click', category: id, quote: shown.quote, quoteRef: ref || undefined }), credentials: 'same-origin', keepalive: true }).catch(() => {});
      } catch {}
    });
  }
  for (const [id, el] of cards) {
    // V4.16: the link itself opens the messaging app on a phone (sms: with the
    // prewritten text) or the /facebook/ handoff page on a computer; the tap is
    // recorded in the background (GA4 quote_apply_now and the server's Apply
    // Now record, keepalive) and the selection is kept for /facebook/
    // (quote-handoff.ts) before the link is followed.
    el.querySelector<HTMLElement>('[data-qf-apply]')!.addEventListener('click', (e) => {
      const cat = shown?.categories.find((c) => c.id === id);
      if (!shown || !unlocked || expired || !cat || cat.status !== 'ok') {
        e.preventDefault();
        return;
      }
      const quote = shown.quote;
      track('quote_apply_now', { category: id });
      const first = cat.carriers?.find((c): c is Carrier => Boolean(c)) ?? null;
      const attribution = Object.fromEntries(Object.entries(sourceInfo()).filter(([, v]) => typeof v === 'string' && v)) as Record<string, string>;
      const keep = (tier: string, monthlyPremium: string) =>
        saveHandoff({
          selection: { tierId: id, tier, carrier: first?.carrier ?? null, plan: first?.plan ?? null, coverage: cardCoverage(cat), monthlyPremium },
          inputs: { age: quote.age, gender: quote.gender, tobacco: quote.tobacco, state: answers.state ?? null },
          attribution,
          ...(accessExpiresAt ? { expiresAt: accessExpiresAt } : {}),
        });
      keep(cat.label, String(cat.monthlyPremium));
      void fetch('/api/quote/', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ action: 'apply', category: id, quote }), credentials: 'same-origin', keepalive: true })
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (body?.status !== 'ok') return;
          // v6.2: the lead counts once the server has saved the Apply Now record.
          applyNotified = body.saved === true;
          keep(String(body.category ?? cat.label), String(body.monthlyPremium ?? cat.monthlyPremium));
        })
        .catch(() => {});
    });
  }

  // Start: only this browser's own quote session returns to the live prices;
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
    if (preview) {
      const r = await previewSession(preview).catch(() => null);
      if (r?.http === 200 && r.body.status === 'verified' && r.body.quote) {
        visitorName = String(r.body.firstName ?? '');
        return unlock(r.body.quote as PriceQuote, true, r.body.expiresAt);
      }
    }
    const { http, body } = await api({ action: 'session' });
    if (http === 200 && body.status === 'verified' && body.quote) {
      visitorName = String(body.firstName ?? '');
      return unlock(quoteReady() ?? (body.quote as PriceQuote), body.testMode, body.expiresAt);
    }
    // Only if the visitor hasn't already answered (an answer given while this
    // check was loading must not send them back to the first question).
    if (!preselect && current === 1) show(1, false);
  })();
}
