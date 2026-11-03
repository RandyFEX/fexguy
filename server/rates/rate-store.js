// @ts-check
// Private, production-ready storage for the rate tables (Rate Engine V2.1).
// The tables are producer-only and this repository is public, so they live
// only in the same Upstash Redis store the Health Question Search uses,
// under their own keys (the search's hqs:* keys are never read or written
// here):
//
//   rates:v1:preview      used by preview deployments and local runs
//   rates:v1:production   used by the production deployment
//
// They are uploaded with `npm run rates:publish` and read here by the
// serverless function, re-validated against the product rules, and cached in
// memory for a few minutes. Anything missing or invalid fails closed: that
// product returns an unavailable result, never an estimated price.

import { createEngine } from './engine.js';
import { PRODUCTS } from './products.js';

export const CACHE_MS = 5 * 60 * 1000;
export const PAYLOAD_FORMAT = 'fexguy-rates-1';

/** @param {Record<string, string | undefined>} env */
export function ratesKey(env) {
  return `rates:v1:${env.VERCEL_ENV === 'production' ? 'production' : 'preview'}`;
}

/**
 * Builds the payload stored in Redis from the private datasets.
 * @param {Record<string, any>} datasets @param {'preview' | 'production'} target
 */
export function buildRatePayload(datasets, target, publishedAt = new Date().toISOString()) {
  const engine = createEngine(datasets);
  const errors = Object.entries(engine.loadProblems).map(([id, p]) => `${id}: ${p.length} problem(s), first: ${p[0]}`);
  const missing = Object.keys(PRODUCTS).filter((id) => !datasets[id]);
  return {
    ok: errors.length === 0 && missing.length === 0,
    errors,
    missing,
    payload: { format: PAYLOAD_FORMAT, target, publishedAt, datasets },
    status: engine.status(),
  };
}

/** Counts only (safe to print): records and printed premiums per product. @param {any} payload */
export function payloadCounts(payload) {
  return Object.fromEntries(
    Object.entries(payload?.datasets ?? {}).map(([id, ds]) => [id, { rates: ds.records?.length ?? 0, printedPremiums: ds.printedPremiums?.length ?? 0, sourceSha256: String(ds.sourceSha256 ?? '').slice(0, 12) }]),
  );
}

/** @type {{ key: string, at: number, value: { engine: ReturnType<typeof createEngine>, publishedAt: string } | null } | null} */
let cache = null;
export function clearRateCache() { cache = null; }

/**
 * Returns the engine built from the published tables, or null when nothing
 * valid is published. Products whose table fails validation stay unloaded.
 * @param {{ get(key: string): Promise<string | null> }} store
 * @param {Record<string, string | undefined>} env
 */
export async function loadRateEngine(store, env, now = Date.now()) {
  const key = ratesKey(env);
  if (cache && cache.key === key && now - cache.at < CACHE_MS) return cache.value;
  let value = null;
  const raw = await store.get(key);
  if (raw) {
    let payload = null;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (payload && payload.format === PAYLOAD_FORMAT && payload.datasets && typeof payload.datasets === 'object') {
      // Only this product list's own datasets are accepted.
      const datasets = Object.fromEntries(Object.keys(PRODUCTS).filter((id) => payload.datasets[id]).map((id) => [id, payload.datasets[id]]));
      const engine = createEngine(datasets);
      if (Object.values(engine.status()).includes('loaded')) value = { engine, publishedAt: String(payload.publishedAt ?? '') };
    }
  }
  cache = { key, at: now, value };
  return value;
}
