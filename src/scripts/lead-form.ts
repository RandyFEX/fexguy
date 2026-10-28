// The native FEXGuy lead form (markup: src/lib/lead/lead-form.ts).
//
// Flow: validate in the browser (inline, accessible errors) → POST the
// answers to Formspark in the background → only when Formspark confirms the
// submission, set a one-time "pending lead" flag in sessionStorage and go to
// /help/, where tracking.ts fires GA4 generate_lead and Meta Lead once and
// clears the flag. Clicking the button never counts as a lead by itself.
//
// If the request fails: no redirect, the answers stay in the form, the button
// works again, and an inline message offers Randy's phone number.
// Without JavaScript none of this runs: the browser validates the fields and
// the form posts to Formspark normally, which redirects to /help/ (no flag,
// so nothing is counted).
//
// Spam protection: the _honeypot trap (Formspark's challenge provider is
// None, so no CAPTCHA or Turnstile token is requested or sent).
import { lead } from '@/config/lead';
import { LEAD_SOURCE_FIELDS } from '@/lib/lead/lead-form';
import { leadSourceFields, recordVisit } from '@/scripts/lead-source';

// Remember this session's landing page and traffic source (every page).
recordVisit();
const SOURCE_FIELDS = new Set<string>(LEAD_SOURCE_FIELDS);

const PHONE_DIGITS = /^[2-9]\d{9}$/;

/** The visitor-facing error for each field (shown under it). */
const MESSAGES: Record<string, string> = {
  'First Name': 'Please enter your first name.',
  'Last Name': 'Please enter your last name.',
  Email: 'Please enter a valid email address, like name@example.com.',
  'Phone Number': 'Please enter a 10-digit US phone number.',
  State: 'Please select your state.',
  'What can Randy help you with?': 'Please tell Randy what he can help you with.',
};

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const phoneDigits = (value: string) => value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

const isValid = (control: Control) => {
  const value = control.value.trim();
  if (!value) return false;
  if (control.name === 'Phone Number') return PHONE_DIGITS.test(phoneDigits(value));
  // Email format (and anything else the markup declares) via the browser.
  return control.checkValidity();
};

for (const form of document.querySelectorAll<HTMLFormElement>('[data-lead-form]')) {
  // The script takes over validation so errors are shown inline (and read
  // out), rather than as the browser's own bubbles.
  form.noValidate = true;
  const controls = Array.from(form.querySelectorAll<Control>('.lead-form__input'));
  const button = form.querySelector<HTMLButtonElement>('.lead-form__submit');
  const status = form.querySelector<HTMLElement>('[data-lead-status]');
  // The form's own "Prefer to talk?" number (a page may use its own number).
  const phoneLink = form.querySelector<HTMLAnchorElement>('.lead-form__phone');
  const phoneHref = phoneLink?.getAttribute('href') ?? lead.phone.href;
  const phoneText = phoneLink?.textContent ?? lead.phone.display;
  const buttonText = button?.textContent ?? '';
  let attempted = false;
  let sending = false;

  const showError = (control: Control, show: boolean) => {
    const error = form.querySelector<HTMLElement>(`#${control.id}-error`);
    control.setAttribute('aria-invalid', String(show));
    if (!error) return;
    error.textContent = show ? MESSAGES[control.name] ?? 'Please fill in this field.' : '';
    error.hidden = !show;
  };

  const validate = () => {
    let first: Control | undefined;
    for (const control of controls) {
      const ok = isValid(control);
      showError(control, !ok);
      if (!ok && !first) first = control;
    }
    return first;
  };

  // After the first attempt, errors update as the visitor fixes each field.
  for (const control of controls) {
    const recheck = () => {
      if (attempted) showError(control, !isValid(control));
    };
    control.addEventListener('input', recheck);
    control.addEventListener('change', recheck);
  }

  const setStatus = (html: string, isError = false) => {
    if (!status) return;
    status.innerHTML = html;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    attempted = true;
    const invalid = validate();
    if (invalid) {
      setStatus('');
      invalid.focus();
      return;
    }

    sending = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'SENDING…';
    }
    setStatus('Sending your request…');

    // Lead source: the page submitted from, the session's landing page and
    // traffic source, into the hidden fields.
    const source = leadSourceFields();
    for (const name of LEAD_SOURCE_FIELDS) {
      const input = form.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
      if (input) input.value = source[name] ?? '';
    }

    // Every named field except _redirect (only used without JavaScript).
    const data: Record<string, string> = {};
    for (const [name, value] of new FormData(form)) {
      if (name === '_redirect') continue;
      if (SOURCE_FIELDS.has(name) && !String(value).trim()) continue;
      if (typeof value === 'string') data[name] = value.trim();
    }

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 20000);
    let ok = false;
    try {
      const res = await fetch(lead.formspark.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: timeout.signal,
      });
      ok = res.ok;
    } catch {
      ok = false;
    } finally {
      clearTimeout(timer);
    }

    if (ok) {
      // Formspark confirmed the submission: only now is a lead recorded, as a
      // one-time flag that /help/ consumes (see tracking.ts). A filled-in
      // spam trap means a bot (people never see it): never count that.
      try {
        if (!data._honeypot) sessionStorage.setItem(
          lead.formspark.pendingLeadKey,
          JSON.stringify({ id: crypto.randomUUID?.() ?? String(Date.now()), at: Date.now() }),
        );
      } catch {
        // Storage blocked: the lead is still delivered, just not counted.
      }
      setStatus('Thank you! Your request was sent.');
      location.assign(lead.formspark.successPath);
      return;
    }

    sending = false;
    if (button) {
      button.disabled = false;
      button.textContent = buttonText;
    }
    setStatus(
      `Sorry, your request didn’t go through. Please try again, or call Randy at <a href="${phoneHref}">${phoneText}</a>.`,
      true,
    );
    status?.focus();
  });
}
