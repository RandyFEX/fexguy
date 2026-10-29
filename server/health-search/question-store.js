// @ts-check
// The private question records live only in the search store (Upstash
// Redis), never in this public repository or the public site. They are
// uploaded with `npm run health-search:publish` and read here by the
// serverless function, re-validated, and cached in memory for a few minutes.
//
//   hqs:questions:preview      used by preview deployments and local runs
//   hqs:questions:production   used by the production deployment

import { validateDataset } from './validate.js';

export const CACHE_MS = 5 * 60 * 1000;

/** @param {Record<string, string | undefined>} env */
export function questionsKey(env) {
  return `hqs:questions:${env.VERCEL_ENV === 'production' ? 'production' : 'preview'}`;
}

/**
 * @typedef {{ format: 1, target: string, publishedAt: string, total: number, complete: boolean,
 *   questions: (import('./validate.js').Question & { carrierId: string })[] }} QuestionPayload
 * @typedef {{ get(key: string): Promise<string | null> }} DataStore
 */

/**
 * Checks a payload against the public configuration (the same inventory
 * rules the publish script applies).
 * @param {QuestionPayload} payload
 * @param {{ expectedQuestionTotal: number, carriers: any[], concepts: any[] }} config
 */
export function checkPayload(payload, config) {
  if (!payload || payload.format !== 1 || !Array.isArray(payload.questions)) {
    return { ok: false, complete: false, errors: ['not a question payload (format 1)'] };
  }
  /** @type {Map<string, any[]>} */
  const byCarrier = new Map();
  for (const q of payload.questions) {
    if (!byCarrier.has(q.carrierId)) byCarrier.set(q.carrierId, []);
    byCarrier.get(q.carrierId)?.push(q);
  }
  const questionFiles = [...byCarrier].map(([carrierId, questions]) => ({ carrierId, status: 'complete', source: 'published', questions }));
  const r = validateDataset(
    { carriers: { expectedQuestionTotal: config.expectedQuestionTotal, carriers: config.carriers }, questionFiles, concepts: { concepts: config.concepts } },
    { configOnly: true },
  );
  return { ok: r.errors.length === 0, complete: r.complete, errors: r.errors, counts: r.counts, total: r.total };
}

/** @type {{ key: string, at: number, dataset: import('./search.js').Dataset | null } | null} */
let cache = null;
export function clearCache() { cache = null; }

/**
 * Returns the dataset to search, or null when none may be served.
 * Production: only a complete, valid 88-question payload.
 * Preview/local: any valid published payload, else the fictional sample.
 * @param {DataStore} store
 * @param {Record<string, string | undefined>} env
 * @param {{ expectedQuestionTotal: number, carriers: any[], concepts: any[] }} config
 * @param {import('./search.js').Dataset} sample
 * @param {number} [now]
 */
export async function loadDataset(store, env, config, sample, now = Date.now()) {
  const key = questionsKey(env);
  if (cache && cache.key === key && now - cache.at < CACHE_MS) return cache.dataset;
  const production = env.VERCEL_ENV === 'production';
  /** @type {import('./search.js').Dataset | null} */
  let dataset = null;
  try {
    const raw = await store.get(key);
    const payload = raw ? JSON.parse(raw) : null;
    const check = payload ? checkPayload(payload, config) : null;
    if (payload && check?.ok && (check.complete || !production)) {
      dataset = { carriers: config.carriers, concepts: config.concepts, questions: payload.questions };
    }
  } catch (e) {
    // Store unreachable: keep serving the last good copy if there is one.
    if (cache && cache.key === key && cache.dataset) return cache.dataset;
    throw e;
  }
  if (!dataset && !production) dataset = sample;
  cache = { key, at: now, dataset };
  return dataset;
}
