// @ts-check
// Twilio Verify (official REST API, https://verify.twilio.com/v2). Server-side
// only: credentials come from environment variables and never reach the
// browser.
//
//   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN      (or TWILIO_API_KEY_SID +
//   TWILIO_API_KEY_SECRET with TWILIO_ACCOUNT_SID)
//   TWILIO_VERIFY_SERVICE_SID                   the Verify Service (VA...)
//
// Modes:
//   'twilio'  credentials present: real SMS codes.
//   'test'    PREVIEW ONLY (VERCEL_ENV !== 'production') when credentials are
//             missing, or QUOTE_VERIFY_MODE=test outside production. No SMS
//             is sent; the code is TEST_CODE; every record is marked test.
//   'public-test'  TEMPORARY (Randy, Quote System v5.3, November 2026):
//             production without Twilio credentials, ONLY when
//             QUOTE_PUBLIC_TEST_CODE=on is set explicitly (Randy, November
//             2026: production never falls back to a universal code by
//             itself) and PUBLIC_TEST_CODE_ENABLED is true. No SMS is sent; TEST_CODE
//             unlocks that visitor's own quotes only. The phone is never
//             recorded as SMS-verified, and the records are real leads
//             (Randy is notified). It switches off by itself once the
//             Twilio variables are set ('twilio' wins), or at once by
//             removing QUOTE_PUBLIC_TEST_CODE=on.
//   'off'     production without credentials and without
//             QUOTE_PUBLIC_TEST_CODE=on: verification is refused (503, with
//             the phone number to call).

export const TEST_CODE = '123456';
/** TEMPORARY public test code in production until Twilio is connected (v5.3). */
export const PUBLIC_TEST_CODE_ENABLED = true;
/** Facebook ad launch (Randy, November 2026): the temporary code is switched on
 * in production here, explicitly, until Twilio is connected. Twilio credentials
 * still win automatically; QUOTE_PUBLIC_TEST_CODE=off or setting this to false
 * switches it off at once. */
export const PUBLIC_TEST_CODE_LAUNCH = true;
/** v5.4: the instruction shown in 'public-test' mode only (sent by the server, never in the page HTML). */
export const PUBLIC_TEST_CODE_NOTE = `Temporary access code: ${TEST_CODE}. Text message verification is temporarily unavailable, and entering this code does not verify that you own this phone number.`;

/** @param {Record<string, string | undefined>} env */
export function verifyMode(env) {
  const production = env.VERCEL_ENV === 'production';
  const sid = env.TWILIO_ACCOUNT_SID ?? '';
  const service = env.TWILIO_VERIFY_SERVICE_SID ?? '';
  const hasAuth = Boolean(env.TWILIO_AUTH_TOKEN || (env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET));
  const configured = /^AC[0-9a-f]{32}$/i.test(sid) && /^VA[0-9a-f]{32}$/i.test(service) && hasAuth;
  if (!production && env.QUOTE_VERIFY_MODE === 'test') return 'test';
  if (configured) return 'twilio';
  if (!production) return 'test';
  const on = env.QUOTE_PUBLIC_TEST_CODE === 'on' || (PUBLIC_TEST_CODE_LAUNCH && env.QUOTE_PUBLIC_TEST_CODE !== 'off');
  return PUBLIC_TEST_CODE_ENABLED && on ? 'public-test' : 'off';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export function verifyClient(env, fetchImpl = fetch) {
  const mode = verifyMode(env);
  if (mode === 'test' || mode === 'public-test')
    return {
      mode,
      /** @param {string} _to */
      start: async (_to) => ({ ok: true, sid: `TEST-${Date.now().toString(36)}`, status: 'pending' }),
      /** @param {string} _to @param {string} code */
      check: async (_to, code) => (code === TEST_CODE ? { ok: true, sid: 'TEST-check', status: 'approved' } : { ok: true, sid: 'TEST-check', status: 'pending' }),
    };
  if (mode === 'off')
    return { mode, start: async () => ({ ok: false, error: 'not-configured' }), check: async () => ({ ok: false, error: 'not-configured' }) };

  const user = env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET ? env.TWILIO_API_KEY_SID : env.TWILIO_ACCOUNT_SID;
  const pass = env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET ? env.TWILIO_API_KEY_SECRET : env.TWILIO_AUTH_TOKEN;
  const auth = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  const base = `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}`;
  /** @param {string} path @param {Record<string, string>} form */
  const post = async (path, form) => {
    const res = await fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(8000),
    });
    const body = /** @type {any} */ (await res.json().catch(() => ({})));
    return { res, body };
  };
  return {
    mode,
    /** @param {string} to */
    start: async (to) => {
      try {
        const { res, body } = await post('/Verifications', { To: to, Channel: 'sms' });
        if (!res.ok) return { ok: false, error: `twilio-${res.status}`, code: body.code ?? null };
        return { ok: true, sid: String(body.sid ?? ''), status: String(body.status ?? '') };
      } catch {
        return { ok: false, error: 'twilio-unreachable' };
      }
    },
    /** @param {string} to @param {string} code */
    check: async (to, code) => {
      try {
        const { res, body } = await post('/VerificationCheck', { To: to, Code: code });
        // 404: no pending verification (expired, already approved or too many attempts).
        if (res.status === 404) return { ok: true, sid: '', status: 'expired' };
        if (!res.ok) return { ok: false, error: `twilio-${res.status}`, code: body.code ?? null };
        return { ok: true, sid: String(body.sid ?? ''), status: String(body.status ?? '') };
      } catch {
        return { ok: false, error: 'twilio-unreachable' };
      }
    },
  };
}
