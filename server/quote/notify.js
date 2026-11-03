// @ts-check
// Quote System v6.1: Randy's lead notifications for /free-quote/, sent from
// the server through Resend's email API (https://resend.com/docs/api-reference/emails/send-email).
// The funnel makes no Formspark or Turnstile requests; the Redis evidence
// record stays the authoritative lead record, and a failed or unconfigured
// email never affects it or the visitor.
//
// Server-side environment variables (never in browser code or the repo):
//   RESEND_API_KEY      Resend API key (re_...); without it nothing is sent
//   QUOTE_NOTIFY_TO     recipient address(es), comma-separated
//   QUOTE_NOTIFY_FROM   optional sender, e.g. "Funeral Funds Quotes <quotes@funeralfunds.com>"
//                       (a domain verified in Resend); default Resend's test
//                       sender, which only delivers to the Resend account's own address
//   QUOTE_NOTIFY_DAILY_LIMIT  optional global daily email cap (default 300)

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const DEFAULT_FROM = 'Funeral Funds Quotes <onboarding@resend.dev>';
export const SEND_TIMEOUT_MS = 5000;
export const NOTIFY_LIMITS = { phoneDay: 6, globalDayDefault: 300 };

/** @param {unknown} v */
const oneLine = (v) => String(v ?? '').replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();

/** Plain-text body: one "Label: value" line per non-empty field. @param {Record<string, string>} fields */
export function emailText(fields) {
  return Object.entries(fields)
    .filter(([, v]) => oneLine(v))
    .map(([k, v]) => `${oneLine(k)}: ${oneLine(v)}`)
    .join('\n');
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export function notifier(env, fetchImpl = fetch) {
  const key = (env.RESEND_API_KEY ?? '').trim();
  const to = (env.QUOTE_NOTIFY_TO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = (env.QUOTE_NOTIFY_FROM ?? '').trim() || DEFAULT_FROM;
  const configured = Boolean(key && to.length);
  return {
    configured,
    /**
     * Never throws. `ok` means Resend accepted the message (not that it was delivered).
     * @param {string} subject @param {Record<string, string>} fields
     * @returns {Promise<{ ok: true, id: string | null } | { ok: false, error: string }>}
     */
    async send(subject, fields) {
      if (!configured) return { ok: false, error: 'not-configured' };
      try {
        const res = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, subject: oneLine(subject).slice(0, 200), text: emailText(fields) }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
        if (!res.ok) return { ok: false, error: `http-${res.status}` };
        const body = await res.json().catch(() => ({}));
        return { ok: true, id: typeof body?.id === 'string' ? body.id : null };
      } catch (e) {
        return { ok: false, error: /** @type {any} */ (e)?.name === 'TimeoutError' ? 'timeout' : 'network-error' };
      }
    },
  };
}
