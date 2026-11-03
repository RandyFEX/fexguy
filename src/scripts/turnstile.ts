// Cloudflare Turnstile helper shared by the native lead form
// (src/scripts/lead-form.ts) and the quote funnel (src/scripts/quote-funnel.ts).
// Moved here unchanged from lead-form.ts (Quote System v2.2).
import { lead } from '@/config/lead';

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
export const turnstileFor = (
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

