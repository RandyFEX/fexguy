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
// Spam protection: the _honeypot trap, plus Cloudflare Turnstile (Managed
// mode). Cloudflare's script is loaded only when the form comes near the
// screen or is used, and its widget stays hidden unless Cloudflare needs the
// visitor to click. Each submission carries a fresh token as
// cf-turnstile-response; Formspark verifies it (and rejects the submission
// if it fails, so no success is shown). Tokens are single-use: after a failed
// attempt the widget is reset so the retry gets a new one.
import { lead } from '@/config/lead';

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

// --- Cloudflare Turnstile ----------------------------------------------------

/** The parts of Cloudflare's window.turnstile API used here. */
interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  getResponse(widgetId: string): string | undefined;
  isExpired(widgetId: string): boolean;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** How long a submission waits for the background check to produce a token.
 * It never runs while Cloudflare is showing the visitor a check to click:
 * then only Cloudflare's own timeout or error ends the wait. */
const TOKEN_WAIT_MS = 60000;

let scriptLoading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page. A failed load is forgotten, so
 * the next attempt tries again. */
const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = lead.formspark.turnstile.script;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'));
    script.onerror = () => {
      script.remove();
      scriptLoading = null;
      reject(new Error('turnstile'));
    };
    document.head.append(script);
  });
  return scriptLoading;
};

/** One Turnstile widget per form: renders it on demand and hands out tokens. */
const turnstileFor = (
  container: HTMLElement | null,
  onInteractive: (needed: boolean) => void,
) => {
  let api: TurnstileApi | undefined;
  let widgetId: string | undefined;
  let rendering: Promise<void> | null = null;
  let token = '';
  let failed = false;
  /** Cloudflare is showing the visitor a check to click. */
  let interactive = false;
  type Waiter = { done: (token: string) => void; timer?: ReturnType<typeof setTimeout> };
  const waiters = new Set<Waiter>();

  const settle = (value: string) => {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.done(value);
    }
    waiters.clear();
  };

  /** The background-check deadline (off while the visitor has a check). */
  const startTimer = (waiter: Waiter) => {
    clearTimeout(waiter.timer);
    waiter.timer = interactive
      ? undefined
      : setTimeout(() => {
          waiters.delete(waiter);
          waiter.done('');
        }, TOKEN_WAIT_MS);
  };

  const ensure = () => {
    if (!container) return Promise.reject(new Error('turnstile'));
    rendering ??= loadTurnstile()
      .then((turnstile) => {
        api = turnstile;
        widgetId = turnstile.render(container, {
          sitekey: container.dataset.sitekey,
          theme: 'light',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (value: string) => {
            token = value;
            failed = false;
            interactive = false;
            onInteractive(false);
            settle(value);
          },
          'expired-callback': () => {
            token = '';
          },
          'error-callback': () => {
            token = '';
            failed = true;
            interactive = false;
            settle('');
            return true;
          },
          'timeout-callback': () => {
            token = '';
            failed = true;
            interactive = false;
            settle('');
          },
          'before-interactive-callback': () => {
            // The widget becomes visible: give it room (global.css).
            container.classList.add('is-shown');
            interactive = true;
            for (const waiter of waiters) startTimer(waiter);
            onInteractive(true);
          },
          'after-interactive-callback': () => {
            interactive = false;
            for (const waiter of waiters) startTimer(waiter);
            onInteractive(false);
          },
        });
        if (widgetId === undefined) throw new Error('turnstile');
      })
      .catch((error) => {
        rendering = null;
        throw error;
      });
    return rendering;
  };

  return {
    /** Start loading early so a token is usually ready by submit time. */
    prepare: () => {
      ensure().catch(() => {});
    },
    /** A current token, or '' if none could be obtained. */
    token: async () => {
      try {
        await ensure();
      } catch {
        return '';
      }
      if (!api || widgetId === undefined) return '';
      if (api.isExpired(widgetId)) {
        token = '';
        interactive = false;
        api.reset(widgetId);
      } else if (failed) {
        failed = false;
        interactive = false;
        api.reset(widgetId);
      } else {
        const current = token || api.getResponse(widgetId) || '';
        if (current) return current;
      }
      return new Promise<string>((resolve) => {
        const waiter: Waiter = { done: resolve };
        waiters.add(waiter);
        startTimer(waiter);
      });
    },
    /** Tokens are single-use: get a fresh one for the next attempt. */
    reset: () => {
      token = '';
      interactive = false;
      if (api && widgetId !== undefined) api.reset(widgetId);
    },
  };
};

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
  const buttonText = button?.textContent ?? '';
  let attempted = false;
  let sending = false;
  let awaitingCheck = false;
  let checkNeeded = false;
  const CHECK_MESSAGE = 'Please complete the quick security check above the button.';

  const turnstile = turnstileFor(
    form.querySelector<HTMLElement>('[data-turnstile]'),
    (needed) => {
      // Cloudflare wants a click: say so while a submission waits for it.
      checkNeeded = needed;
      if (awaitingCheck && needed) setStatus(CHECK_MESSAGE);
    },
  );

  // Load Turnstile once the form is near the screen or someone starts using it.
  const prepare = () => {
    observer?.disconnect();
    form.removeEventListener('focusin', prepare);
    turnstile.prepare();
  };
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) prepare();
        }, { rootMargin: '300px' })
      : null;
  if (observer) observer.observe(form);
  else prepare();
  form.addEventListener('focusin', prepare);

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

    // Cloudflare Turnstile token (usually ready already; otherwise this waits
    // for it, including a click on the check if Cloudflare asks for one).
    awaitingCheck = true;
    if (checkNeeded) setStatus(CHECK_MESSAGE);
    const token = await turnstile.token();
    awaitingCheck = false;
    if (!token) {
      sending = false;
      if (button) {
        button.disabled = false;
        button.textContent = buttonText;
      }
      setStatus(
        `Sorry, we couldn’t complete the security check. Your answers are still here: please press the button again, or call Randy at <a href="${lead.phone.href}">${lead.phone.display}</a>.`,
        true,
      );
      status?.focus();
      return;
    }
    setStatus('Sending your request…');

    // Every named field except _redirect (only used without JavaScript) and
    // the widget's own token field; the current token is added explicitly.
    const data: Record<string, string> = {};
    for (const [name, value] of new FormData(form)) {
      if (name === '_redirect' || name === 'cf-turnstile-response') continue;
      if (typeof value === 'string') data[name] = value.trim();
    }
    data['cf-turnstile-response'] = token;

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

    // The token was used (or rejected): the retry needs a fresh one.
    turnstile.reset();
    sending = false;
    if (button) {
      button.disabled = false;
      button.textContent = buttonText;
    }
    setStatus(
      `Sorry, your request didn’t go through. Please try again, or call Randy at <a href="${lead.phone.href}">${lead.phone.display}</a>.`,
      true,
    );
    status?.focus();
  });
}
