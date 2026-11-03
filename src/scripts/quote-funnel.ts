// Quote funnel (Quote System v2.2) for /final-expense-insurance-prices/.
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
// numbers only (tracking.ts, GA4). Randy's notification goes through the
// existing Formspark website form, with Turnstile, once per verified lead and
// once per Apply Now category (the server decides; never in test mode).
import { lead } from '@/config/lead';
import { leadSourceFields } from '@/scripts/lead-source';
import { turnstileFor } from '@/scripts/turnstile';

type Gender = 'male' | 'female';
type Quote = { age: number; gender: Gender; tobacco: boolean; coverage: number };
type Category = { id: string; label: string; status: 'ok' | 'pending' | 'unavailable'; monthlyPremium?: string; message?: string; attribution: string[]; carriers?: ({ carrier: string; plan: string } | null)[] };

const root = document.querySelector<HTMLElement>('[data-quote-funnel]');
const MIN = 5000;
const MAX = 25000;
const TOTAL = 7;
const STEPS_KEY = 'ff:quote-steps'; // non-personal answers only (sex, age, tobacco, coverage)
const LOGOS: Record<string, string> = { 'FF-102': '/wp-content/uploads/2018/05/Mutual-of-Omaha-Logo.jpg' };
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const track = (name: string, extra: Record<string, unknown> = {}) => window.dispatchEvent(new CustomEvent('ff:funnel', { detail: { name, ...extra } }));

// Visit-scoped verification (v2.7): one random visit id per browser tab,
// in sessionStorage (gone when the tab closes; a new tab gets a new one). The
// server only treats a session as verified for the visit it was verified in,
// so an earlier visit never skips the questions or unlocks prices.
const VISIT_KEY = 'ff:quote-visit';
let memoryVisit = '';
const newVisitId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32).padEnd(16, '0');
function visitId(fresh = false) {
  try {
    let v = fresh ? '' : sessionStorage.getItem(VISIT_KEY) ?? '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      v = newVisitId();
      sessionStorage.setItem(VISIT_KEY, v);
    }
    return v;
  } catch {
    if (fresh || !memoryVisit) memoryVisit = newVisitId();
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
  const turnstile = turnstileFor(root.querySelector<HTMLElement>('[data-turnstile]'), () => {});

  const answers: Partial<Quote> & { state?: string } = {};
  try {
    Object.assign(answers, JSON.parse(sessionStorage.getItem(STEPS_KEY) ?? '{}'));
  } catch {}
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

  function show(n: number, focus = true) {
    current = n;
    for (const [i, el] of steps) el.hidden = i !== n;
    const results = (n === 7 && unlocked) || n === 8;
    back.hidden = n === 1 || results;
    root!.querySelector<HTMLElement>('[data-qf-top]')!.hidden = results;
    progressWrap.hidden = results;
    progressLabel.hidden = results;
    progress.style.width = `${(Math.min(n, TOTAL) / TOTAL) * 100}%`;
    progressLabel.textContent = `Step ${Math.min(n, TOTAL)} of ${TOTAL}`;
    if (!focus) return;
    steps.get(n)?.querySelector<HTMLElement>('.qf-q')?.focus({ preventScroll: true });
    root!.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (n === 6 || n === 7) turnstile.prepare();
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
    complete(4);
    show(5);
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
    complete(5);
    show(6);
  });


  // Step 6: first name, mobile number and the optional consent box.
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
  const phoneOk = (v: string) => /^[2-9]\d{9}$/.test(v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''));
  const quoteReady = (): Quote | null =>
    answers.gender && answers.age && typeof answers.tobacco === 'boolean' && answers.coverage
      ? { age: answers.age, gender: answers.gender, tobacco: answers.tobacco, coverage: answers.coverage }
      : null;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = firstInput.value.trim();
    fieldError(firstInput, firstName ? '' : 'Please enter your first name.');
    fieldError(phoneInput, phoneOk(phoneInput.value) ? '' : 'Please enter a 10-digit US mobile number.');
    if (!firstName) return firstInput.focus();
    if (!phoneOk(phoneInput.value)) return phoneInput.focus();
    if (!quoteReady() || !answers.state) return show(1);
    track('quote_contact_submit');
    complete(6);
    // The pricing screen, blurred, with the number already filled in.
    unlockPhone.value = phoneInput.value.trim();
    lockCards();
    show(7);
  });

  function sourceInfo() {
    const f = leadSourceFields();
    return {
      page: f['Submission Page'], landingPage: f['Landing Page'], trafficSource: f['Traffic Source'], referrer: f['Referrer'],
      utmSource: f['UTM Source'], utmMedium: f['UTM Medium'], utmCampaign: f['UTM Campaign'], utmTerm: f['UTM Term'], utmContent: f['UTM Content'],
    };
  }

  // Step 7 (locked): send the code from the pricing screen.
  const unlockPanel = $('[data-qf-unlock]');
  const sendForm = $<HTMLFormElement>('[data-qf-send-form]');
  const sendBtn = $<HTMLButtonElement>('[data-qf-send]');
  const sendStatus = $('[data-qf-send-status]');
  const verifyForm = $<HTMLFormElement>('[data-qf-verify]');
  const codeInput = $<HTMLInputElement>('#qf-code');
  const verifyStatus = $('[data-qf-verify-status]');
  const verifyBtn = $<HTMLButtonElement>('[data-qf-verify-btn]');
  const resendBtn = $<HTMLButtonElement>('[data-qf-resend]');
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
    if (!phoneOk(unlockPhone.value)) return unlockPhone.focus();
    const quote = quoteReady();
    if (!quote || !answers.state) return show(1);
    sendBtn.disabled = true;
    setStatus(sendStatus, 'Sending your code…');
    const { http, body } = await api({
      action: 'start', firstName: firstInput.value.trim(), phone: unlockPhone.value.trim(), state: answers.state, quote,
      consent: consentBox.checked, consentVersion: root!.dataset.consentVersion, verifyNoticeVersion: root!.dataset.verifyVersion,
      source: sourceInfo(),
    });
    sendBtn.disabled = false;
    if (http !== 200 || body.status !== 'sent') {
      setStatus(sendStatus, body.message ?? `Sorry, we couldn't send a code. Please call ${lead.phone.display}.`, true);
      sendStatus.focus();
      return;
    }
    track('quote_sms_request');
    leadId = body.lead;
    testBanner.hidden = !body.testMode;
    setStatus(sendStatus, '');
    $('[data-qf-masked]').textContent = body.masked;
    sendForm.hidden = true;
    verifyForm.hidden = false;
    setStatus(verifyStatus, '');
    codeInput.value = '';
    cooldown(body.resendAfterMs ?? 30000);
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
    complete(7);
    setStatus(verifyStatus, '');
    if (body.notify) void notifyRandy(body.notify);
    unlock(quoteReady() ?? (body.quote as Quote), body.testMode);
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
    unlockPhone.focus();
    unlockPhone.select();
  });

  /** Randy's notification through the existing Formspark website form. */
  async function notifyRandy(fields: Record<string, string>) {
    const token = await turnstile.token();
    if (!token) return false;
    const data: Record<string, string> = { ...fields, 'cf-turnstile-response': token };
    for (const [k, v] of Object.entries(leadSourceFields())) if (v) data[k] = v;
    try {
      const res = await fetch(lead.formspark.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      turnstile.reset();
      return res.ok;
    } catch {
      turnstile.reset();
      return false;
    }
  }

  // Step 7 (unlocked): live prices with free repricing. Carrier names and
  // logos stay blurred; the browser only ever gets attribution codes.
  const adjust = $<HTMLFormElement>('[data-qf-adjust]');
  const adjOther = $('[data-qf-adj-other]');
  const adjOtherInput = $<HTMLInputElement>('#qf-adj-other');
  const adjOtherError = $('[data-qf-adj-other-error]');
  const live = $('[data-qf-live]');
  const applyStatus = $('[data-qf-apply-status]');
  const pricing = steps.get(7)!;
  const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-qf-card]')).map((el) => [el.dataset.qfCard!, el]));
  const cache = new Map<string, Category[]>();
  let shown: { quote: Quote; categories: Category[] } | null = null;
  let timer: number | undefined;
  let seq = 0;
  let firstView = true;

  // Safe stand-ins for the blurred, locked cards: never real prices or carriers.
  const STAND_INS = ['$38.47', '$52.19', '$71.36'];
  const NAME_STAND_INS = ['Insurance Company Name', 'Life Insurance Company', 'Insurance Company Plan'];
  const DEFAULT_LABELS = Array.from(cards.values()).map((el) => el.querySelector('.qf-card__label')!.textContent ?? '');
  function lockCards() {
    unlocked = false;
    pricing.dataset.locked = 'true';
    adjust.hidden = true;
    unlockPanel.hidden = false;
    let i = 0;
    for (const el of cards.values()) {
      el.dataset.state = 'locked';
      const amount = el.querySelector<HTMLElement>('[data-qf-amount]')!;
      amount.innerHTML = `<span class="qf-blur" aria-hidden="true">${STAND_INS[i++]}</span><span class="visually-hidden">Price shown after you verify your phone number</span>`;
      el.querySelector<HTMLElement>('[data-qf-note]')!.textContent = '';
      el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.disabled = true;
      const carrier = el.querySelector<HTMLElement>('.qf-card__carrier')!;
      carrier.textContent = NAME_STAND_INS[i - 1];
      carrier.classList.add('qf-blur');
      carrier.setAttribute('aria-hidden', 'true');
      el.querySelector('.qf-card__label')!.textContent = DEFAULT_LABELS[i - 1];
      const blank = document.createElement('span');
      blank.className = 'qf-logo-blank';
      el.querySelector<HTMLElement>('[data-qf-logo]')!.replaceChildren(blank);
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
    const names = (cat?.carriers ?? []).filter(Boolean) as { carrier: string; plan: string }[];
    const carrier = el.querySelector<HTMLElement>('.qf-card__carrier')!;
    carrier.classList.remove('qf-blur');
    carrier.removeAttribute('aria-hidden');
    carrier.textContent = names.map((n) => `${n.carrier} ${n.plan}`).join(' / ');
    const ids = cat?.attribution ?? [];
    el.querySelector<HTMLElement>('[data-qf-logo]')!.replaceChildren(
      ...ids.map((id, k) => {
        if (LOGOS[id]) {
          const img = new Image();
          img.src = LOGOS[id];
          img.alt = names[k]?.carrier ?? '';
          img.decoding = 'async';
          return img;
        }
        // No logo file yet: the company name as a simple wordmark.
        const w = document.createElement('span');
        w.className = 'qf-logo-name';
        w.textContent = names[k]?.carrier ?? '';
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
        show(7);
        setStatus(sendStatus, 'Please verify your phone number again to see prices.', true);
        return;
      }
      if (!res.ok || body.status !== 'ok') {
        for (const el of cards.values()) setCard(el, null, 'unavailable', body.message ?? 'Prices are not available right now.');
        return;
      }
      cache.set(k, body.categories);
      render(quote, body.categories);
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
  function unlock(quote: Quote, test: boolean) {
    unlocked = true;
    pricing.dataset.locked = 'false';
    testBanner.hidden = !test;
    unlockPanel.hidden = true;
    adjust.hidden = false;
    fillAdjust(quote);
    if (current !== 7) show(7);
    else show(7, false);
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
    if (!testMode() && applyNotified) {
      // Lead completed: /help/ counts it once (tracking.ts).
      try {
        sessionStorage.setItem(lead.formspark.pendingLeadKey, JSON.stringify({ id: crypto.randomUUID?.() ?? String(Date.now()), at: Date.now() }));
      } catch {}
    }
    location.assign(lead.formspark.successPath);
  }
  const testMode = () => !testBanner.hidden;
  $('[data-qf-intake-finish]').addEventListener('click', finish);

  async function intakeStep(body: Record<string, unknown>) {
    setStatus(intakeStatus, '');
    const r = await api(body);
    if (r.http === 401) {
      lockCards();
      show(7);
      return;
    }
    if (r.http !== 200) {
      setStatus(intakeStatus, r.body.message ?? `Sorry, something went wrong. Please call ${lead.phone.display}.`, true);
      return;
    }
    if (r.body.notify) void notifyRandy(r.body.notify);
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

  for (const [id, el] of cards) {
    el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!shown || !unlocked) return;
      const cat = shown.categories.find((c) => c.id === id);
      if (!cat || cat.status !== 'ok') return;
      btn.disabled = true;
      setStatus(applyStatus, 'Saving your selection…');
      track('quote_apply_now', { category: id });
      const { http, body } = await api({ action: 'apply', category: id, quote: shown.quote });
      btn.disabled = false;
      if (http === 401) {
        lockCards();
        show(7);
        return;
      }
      if (http !== 200 || body.status !== 'ok') {
        setStatus(applyStatus, body.message ?? `Sorry, something went wrong. Please call ${lead.phone.display}.`, true);
        return;
      }
      setStatus(applyStatus, '');
      applyNotified = body.notify ? await notifyRandy(body.notify) : true;
      intakeCategory = id;
      intakeTitle.textContent = 'Application questions';
      intakeSub.textContent = `${cat.label}: $${cat.monthlyPremium} per month for ${money(shown.quote.coverage)} of coverage.`;
      intakeQ.hidden = true;
      intakeDone.hidden = true;
      show(8);
      await intakeStep({ action: 'intake-next', category: id });
    });
  }

  // Start New Quote: end this visit's session (the lead's records are kept),
  // clear the answers and return to the first question with a new visit id.
  root.querySelectorAll<HTMLButtonElement>('[data-qf-restart]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await api({ action: 'end-session' });
      visitId(true);
      for (const k of Object.keys(answers)) delete (answers as Record<string, unknown>)[k];
      try {
        sessionStorage.removeItem(STEPS_KEY);
      } catch {}
      contactForm.reset();
      consentBox.checked = false;
      unlockPhone.value = '';
      codeInput.value = '';
      sendForm.hidden = false;
      verifyForm.hidden = true;
      testBanner.hidden = true;
      cache.clear();
      shown = null;
      firstView = true;
      leadId = '';
      lockCards();
      root!.querySelectorAll('[aria-pressed]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      stateSelect.value = '';
      show(1);
    }),
  );

  // Start: only this tab's own verified visit returns to the live prices;
  // any other (new tab, new visit) starts at the first question.
  (async () => {
    const { http, body } = await api({ action: 'session' });
    if (http === 200 && body.status === 'verified' && body.quote) return unlock(quoteReady() ?? (body.quote as Quote), body.testMode);
    show(1, false);
  })();
}
