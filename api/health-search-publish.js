// TEMPORARY (Randy, November 2026): one-time publish of the verified health
// question records to the PREVIEW key of the search store. Removed again
// right after use; it must never reach Production (and refuses there).
//
// Safeguards:
// - Runs only when VERCEL_ENV is exactly "preview".
// - The destination key is a constant (hqs:questions:preview). Nothing in the
//   request chooses a key or environment; hqs:questions:production is only
//   ever read (to prove it is unchanged), never written or deleted.
// - Authorization: a single-use bearer secret from the Preview-only
//   environment variable HEALTH_SEARCH_PUBLISH_TOKEN (compared in constant
//   time); the first accepted use is claimed in the store with SET NX, so the
//   secret can't be used twice.
// - Accepts only the verified dataset: complete, valid, 88 questions, and the
//   exact records whose SHA-256 is pinned below. Body limited to 128 KB.
// - One SET replaces the key atomically (a failed request leaves the old
//   value in place), followed by a read-back check.
// - Logs nothing; responses carry counts and short digests only.
import { createHash, timingSafeEqual } from 'node:crypto';
import { redisConfig } from '../server/health-search/stores.js';
import { checkPayload, questionsKey } from '../server/health-search/question-store.js';
import { config } from '../server/health-search/config.generated.js';

const PREVIEW_KEY = 'hqs:questions:preview';
const PRODUCTION_KEY = 'hqs:questions:production';
const CLAIM_KEY = 'hqs:publish:claimed';
const EXPECTED_QUESTIONS_SHA256 = '1fc4e41b7fe882d78c0cca213194df15cf968df6df61c56df7ab44a32a64a52f';
const EXPECTED_TOTAL = 88;
const MAX_BODY = 128 * 1024;

const sha = (s) => createHash('sha256').update(s).digest('hex');
const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
});

export async function POST(request) {
  if (process.env.VERCEL_ENV !== 'preview') return json(403, { status: 'refused' });
  if (PREVIEW_KEY !== questionsKey({ VERCEL_ENV: 'preview' }) || PREVIEW_KEY === questionsKey({ VERCEL_ENV: 'production' })) {
    return json(500, { status: 'key-mismatch' });
  }
  const secret = process.env.HEALTH_SEARCH_PUBLISH_TOKEN ?? '';
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (secret.length < 40 || !given || !timingSafeEqual(Buffer.from(sha(given), 'hex'), Buffer.from(sha(secret), 'hex'))) {
    return json(401, { status: 'unauthorized' });
  }
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { status: 'unsupported-media-type' });
  if (Number(request.headers.get('content-length') ?? MAX_BODY + 1) > MAX_BODY) return json(413, { status: 'too-large' });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { status: 'too-large' });

  let payload;
  try { payload = JSON.parse(raw); } catch { return json(400, { status: 'invalid-json' }); }
  const check = checkPayload(payload, config);
  if (!check.ok || payload?.target !== 'preview' || payload.complete !== true || payload.total !== EXPECTED_TOTAL
    || !Array.isArray(payload.questions) || payload.questions.length !== EXPECTED_TOTAL) {
    return json(422, { status: 'invalid-dataset', errors: check.errors?.length ?? 0 });
  }
  if (sha(JSON.stringify(payload.questions)) !== EXPECTED_QUESTIONS_SHA256) return json(422, { status: 'unexpected-records' });

  const cfg = redisConfig(process.env);
  if (!cfg) return json(503, { status: 'no-store' });
  const run = async (command) => {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error !== undefined) throw new Error('store');
    return body.result;
  };
  const describe = (v) => (v == null ? { exists: false } : { exists: true, bytes: String(v).length, sha256: sha(String(v)).slice(0, 16) });

  try {
    // Single use: claim the secret before writing.
    const claimed = await run(['SET', CLAIM_KEY, sha(given), 'NX', 'PX', String(24 * 3600 * 1000)]);
    if (claimed !== 'OK') return json(409, { status: 'already-used' });

    const productionBefore = describe(await run(['GET', PRODUCTION_KEY]));
    await run(['SET', PREVIEW_KEY, raw]);
    const back = await run(['GET', PREVIEW_KEY]);
    const productionAfter = describe(await run(['GET', PRODUCTION_KEY]));
    let readBack = false;
    try { readBack = sha(JSON.stringify(JSON.parse(back).questions)) === EXPECTED_QUESTIONS_SHA256; } catch { readBack = false; }
    return json(200, {
      status: readBack ? 'published' : 'read-back-mismatch',
      key: PREVIEW_KEY,
      questions: payload.questions.length,
      carriersWithQuestions: new Set(payload.questions.map((q) => q.carrierId)).size,
      publishedAt: payload.publishedAt,
      readBack,
      production: {
        before: productionBefore,
        after: productionAfter,
        unchanged: JSON.stringify(productionBefore) === JSON.stringify(productionAfter),
      },
    });
  } catch {
    return json(502, { status: 'store-error' });
  }
}

export async function GET() {
  return json(405, { status: 'method-not-allowed' });
}
