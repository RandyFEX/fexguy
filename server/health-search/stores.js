// @ts-check
// Durable store for the search allowance: Upstash Redis over its REST API
// (what Vercel's Redis Marketplace integration provides). Configured only
// through server-side environment variables; nothing here is public.
//
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   (or Vercel's names: KV_REST_API_URL / KV_REST_API_TOKEN)
//
// There is deliberately no in-memory fallback in this file: without a
// configured store the API refuses searches (503) instead of pretending to
// enforce the limit.

/** @param {Record<string, string | undefined>} env */
export function redisConfig(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '';
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
  return url && token && /^https:\/\//.test(url) ? { url: url.replace(/\/+$/, ''), token } : null;
}

/**
 * @param {{ url: string, token: string }} cfg
 * @param {typeof fetch} [fetchImpl]
 * @returns {import('./quota.js').QuotaStore}
 */
export function upstashStore(cfg, fetchImpl = fetch) {
  return {
    async eval(script, keys, args) {
      const res = await fetchImpl(cfg.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', script, String(keys.length), ...keys, ...args.map(String)]),
        signal: AbortSignal.timeout(4000),
      });
      const body = /** @type {{ result?: unknown, error?: string }} */ (await res.json().catch(() => ({})));
      if (!res.ok || body.error !== undefined) throw new Error(`quota store error (${res.status})`);
      return body.result;
    },
  };
}
