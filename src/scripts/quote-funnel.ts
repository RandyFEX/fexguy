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
type Category = { id: string; label: string; status: 'ok' | 'pending' | 'unavailable'; monthlyPremium?: string; message?: string; attribution: string[] };

const root = document.querySelector<HTMLElement>('[data-quote-funnel]');
const MIN = 5000;
const MAX = 25000;
const TOTAL = 7;
const STEPS_KEY = 'ff:quote-steps'; // non-personal answers only (sex, age, tobacco, coverage)
const LOGOS: Record<string, string> = { 'FF-102': '/wp-content/uploads/2018/05/Mutual-of-Omaha-Logo.jpg' };
const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const track = (name: string, extra: Record<string, unknown> = {}) => window.dispatchEvent(new CustomEvent('ff:funnel', { detail: { name, ...extra } }));

async function api(body: Record<string, unknown>) {
  try {
    const res = await fetch('/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
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

  function show(n: number, focus = true) {
    current = n;
    for (const [i, el] of steps) el.hidden = i !== n;
    back.hidden = n === 1 || n === 8;
    const results = n === 8;
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
  back.addEventListener('click', () => show(current === 7 ? 6 : Math.max(1, current - 1)));

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

  // Step 6: contact + consent -> send code.
  const contactForm = $<HTMLFormElement>('[data-qf-contact]');
  const firstInput = $<HTMLInputElement>('#qf-first');
  const phoneInput = $<HTMLInputElement>('#qf-phone');
  const consentBox = $<HTMLInputElement>('[data-qf-consent]');
  const contactStatus = $('[data-qf-contact-status]');
  const sendBtn = $<HTMLButtonElement>('[data-qf-send]');
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
  const quoteReady = (): Quote | null =>
    answers.gender && answers.age && typeof answers.tobacco === 'boolean' && answers.coverage
      ? { age: answers.age, gender: answers.gender, tobacco: answers.tobacco, coverage: answers.coverage }
      : null;

  function sourceInfo() {
    const f = leadSourceFields();
    return {
      page: f['Submission Page'], landingPage: f['Landing Page'], trafficSource: f['Traffic Source'], referrer: f['Referrer'],
      utmSource: f['UTM Source'], utmMedium: f['UTM Medium'], utmCampaign: f['UTM Campaign'], utmTerm: f['UTM Term'], utmContent: f['UTM Content'],
    };
  }

  let resendTimer: number | undefined;
  const resendBtn = $<HTMLButtonElement>('[data-qf-resend]');
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

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = firstInput.value.trim();
    const phone = phoneInput.value.trim();
    const digits = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    fieldError(firstInput, firstName ? '' : 'Please enter your first name.');
    fieldError(phoneInput, /^[2-9]\d{9}$/.test(digits) ? '' : 'Please enter a 10-digit US mobile number.');
    if (!firstName) return firstInput.focus();
    if (!/^[2-9]\d{9}$/.test(digits)) return phoneInput.focus();
    const quote = quoteReady();
    if (!quote || !answers.state) return show(1);
    track('quote_contact_submit');
    sendBtn.disabled = true;
    setStatus(contactStatus, 'Sending your code…');
    const { http, body } = await api({
      action: 'start', firstName, phone, state: answers.state, quote,
      consent: consentBox.checked, consentVersion: root!.dataset.consentVersion, verifyNoticeVersion: root!.dataset.verifyVersion,
      source: sourceInfo(),
    });
    sendBtn.disabled = false;
    if (http !== 200 || body.status !== 'sent') {
      setStatus(contactStatus, body.message ?? `Sorry, we couldn't send a code. Please call ${lead.phone.display}.`, true);
      contactStatus.focus();
      return;
    }
    track('quote_sms_request');
    leadId = body.lead;
    testBanner.hidden = !body.testMode;
    setStatus(contactStatus, '');
    $('[data-qf-masked]').textContent = body.masked;
    cooldown(body.resendAfterMs ?? 30000);
    complete(6);
    show(7);
    $<HTMLInputElement>('#qf-code').value = '';
    $<HTMLInputElement>('#qf-code').focus();
  });

  // Step 7: verify.
  const verifyForm = $<HTMLFormElement>('[data-qf-verify]');
  const codeInput = $<HTMLInputElement>('#qf-code');
  const verifyStatus = $('[data-qf-verify-status]');
  const verifyBtn = $<HTMLButtonElement>('[data-qf-verify-btn]');
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
    openResults(body.quote as Quote, body.testMode);
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
    show(6);
    phoneInput.focus();
    phoneInput.select();
  });

  /** Randy's notification through the existing Formspark website form. */
  async function notifyRandy(fields: Record<string, string>) {
    const token = await turnstile.token();
    if (!token) return false;
    const source = leadSourceFields();
    const data: Record<string, string> = { ...fields, 'cf-turnstile-response': token };
    for (const [k, v] of Object.entries(source)) if (v) data[k] = v;
    try {
      const res = await fetch(lead.formspark.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
      turnstile.reset();
      return res.ok;
    } catch {
      turnstile.reset();
      return false;
    }
  }

  // Step 8: results with free repricing.
  const adjust = $<HTMLFormElement>('[data-qf-adjust]');
  const adjOther = $('[data-qf-adj-other]');
  const adjOtherInput = $<HTMLInputElement>('#qf-adj-other');
  const adjOtherError = $('[data-qf-adj-other-error]');
  const live = $('[data-qf-live]');
  const applyStatus = $('[data-qf-apply-status]');
  const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-qf-card]')).map((el) => [el.dataset.qfCard!, el]));
  const cache = new Map<string, Category[]>();
  let shown: { quote: Quote; categories: Category[] } | null = null;
  let timer: number | undefined;
  let seq = 0;
  let firstView = true;
  let testMode = false;

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
    const ids = cat?.attribution?.length ? cat.attribution : [''];
    el.querySelector<HTMLElement>('[data-qf-logo]')!.replaceChildren(
      ...ids.map((id) => {
        if (LOGOS[id]) {
          const img = new Image();
          img.src = LOGOS[id];
          img.alt = '';
          img.decoding = 'async';
          return img;
        }
        const s = document.createElement('span');
        s.className = 'qf-logo-blank';
        return s;
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
    for (const el of cards.values()) if (el.dataset.state !== 'ok') setCard(el, null, 'loading', 'Loading prices…');
    try {
      const res = await fetch('/api/price-explorer/', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: k, credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (mine !== seq) return;
      if (res.status === 401) {
        // The verified session ended: back to the contact step.
        shown = null;
        show(6);
        setStatus(contactStatus, 'Please verify your phone number again to see prices.', true);
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

  function openResults(quote: Quote, test: boolean) {
    testMode = Boolean(test);
    testBanner.hidden = !testMode;
    fillAdjust(quote);
    show(8);
    void reprice(quote);
  }

  for (const [id, el] of cards) {
    el.querySelector<HTMLButtonElement>('[data-qf-apply]')!.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!shown) return;
      const cat = shown.categories.find((c) => c.id === id);
      if (!cat || cat.status !== 'ok') return;
      btn.disabled = true;
      setStatus(applyStatus, 'Saving your selection…');
      track('quote_apply_now', { category: id });
      const { http, body } = await api({ action: 'apply', category: id, quote: shown.quote });
      if (http === 401) {
        show(6);
        setStatus(contactStatus, 'Please verify your phone number again.', true);
        return;
      }
      if (http !== 200 || body.status !== 'ok') {
        btn.disabled = false;
        setStatus(applyStatus, body.message ?? `Sorry, something went wrong. Please call ${lead.phone.display}.`, true);
        return;
      }
      let delivered = true;
      if (body.notify) delivered = await notifyRandy(body.notify);
      if (!body.testMode && delivered) {
        // Lead completed: /help/ counts it once (tracking.ts).
        try {
          sessionStorage.setItem(lead.formspark.pendingLeadKey, JSON.stringify({ id: crypto.randomUUID?.() ?? String(Date.now()), at: Date.now() }));
        } catch {}
      }
      location.assign(lead.formspark.successPath);
    });
  }

  // Start: a verified session goes straight to the results.
  (async () => {
    const { http, body } = await api({ action: 'session' });
    if (http === 200 && body.status === 'verified' && body.quote) return openResults(quoteReady() ?? (body.quote as Quote), body.testMode);
    show(1, false);
  })();
}
