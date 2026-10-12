// GET /api/connectivity[?test=ga4|gsc]: proves read-only GA4 and Search
// Console access from this deployment. Server-side only: no credential or
// token is ever returned. Requires `Authorization: Bearer <SEO_MONITOR_TOKEN>`
// (a random value set in the Vercel project), so the data isn't public;
// without that variable the endpoint stays closed.
import { timingSafeEqual } from 'node:crypto';
import { missingEnv } from '../lib/config.js';
import { AuthStageError, getGoogleAccessToken } from '../lib/google-auth.js';
import { testGa4 } from '../lib/ga4.js';
import { testGsc } from '../lib/gsc.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

const authorized = (request: Request) => {
  const expected = process.env.SEO_MONITOR_TOKEN;
  if (!expected) return false;
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  if (!process.env.SEO_MONITOR_TOKEN) {
    return json(503, { ok: false, error: 'SEO_MONITOR_TOKEN is not set in this Vercel project; the endpoint is closed.' });
  }
  if (!authorized(request)) return json(401, { ok: false, error: 'Unauthorized.' });

  const missing = missingEnv();
  if (missing.length) return json(500, { ok: false, stage: 'configuration', missingEnvironmentVariables: missing });

  const environment = process.env.VERCEL_ENV ?? 'unknown';
  let token: string;
  try {
    token = await getGoogleAccessToken();
  } catch (error) {
    const e = error instanceof AuthStageError ? error : new AuthStageError('unknown', String(error), '');
    return json(502, { ok: false, environment, stage: e.stage, error: e.message, hint: e.hint });
  }

  const which = new URL(request.url).searchParams.get('test');
  const [ga4, gsc] = await Promise.all([
    which === 'gsc' ? undefined : testGa4(token).catch((e) => ({ ok: false, error: String(e) })),
    which === 'ga4' ? undefined : testGsc(token).catch((e) => ({ ok: false, error: String(e) })),
  ]);
  const ok = [ga4, gsc].filter(Boolean).every((r) => r!.ok);
  return json(ok ? 200 : 502, { ok, environment, checkedAt: new Date().toISOString(), authentication: 'ok', ga4, gsc });
}
