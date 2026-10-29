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
 * @returns {import('./quota.js').QuotaStore & import('./question-store.js').DataStore & { set(key: string, value: string): Promise<unknown> }}
 */
export function upstashStore(cfg, fetchImpl = fetch) {
  /** @param {(string | number)[]} command @param {number} [timeoutMs] */
  const run = async (command, timeoutMs = 4000) => {
    const res = await fetchImpl(cfg.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command.map(String)),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = /** @type {{ result?: unknown, error?: string }} */ (await res.json().catch(() => ({})));
    // Never echo the command (it may hold data) or the token in errors.
    if (!res.ok || body.error !== undefined) throw new Error(`search store error (${res.status})`);
    return body.result;
  };
  return {
    eval: (script, keys, args) => run(['EVAL', script, keys.length, ...keys, ...args]),
    get: async (key) => /** @type {string | null} */ (await run(['GET', key])),
    set: (key, value) => run(['SET', key, value], 15000),
  };
}
