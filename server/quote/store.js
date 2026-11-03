// @ts-check
// Quote-funnel storage in the private Upstash Redis (the store the Health
// Question Search and the rate tables use), namespaced by deployment so
// preview test leads never mix with production:
//
//   qe:<ns>:lead:<id>       evidence record (JSON, never expires)
//   qe:<ns>:ev:<id>         append-only event list for the lead (never expires)
//   qe:<ns>:phone:<hash>    set of lead ids for one phone (HMAC), for retrieval
//   qe:<ns>:access          append-only access log of evidence retrievals
//   qv:<ns>:<id>            pending verification (expires after 10 minutes)
//   qs:<ns>:<sid>           verified session (expires with the session)
//   ql:<ns>:...             rate-limit counters (expire with their window)
//   qf:<ns>:<id>:<what>     one-time notification flags
//
// ns = 'production' on the production deployment, 'preview' everywhere else.

/** @param {Record<string, string | undefined>} env */
export const namespace = (env) => (env.VERCEL_ENV === 'production' ? 'production' : 'preview');

// KEYS: counters; ARGV: limit1, ttlMs1, limit2, ttlMs2, ...
// Increments every counter; returns the 1-based index of the first one over
// its limit, or 0.
export const COUNTERS_SCRIPT = `
local over = 0
for i = 1, #KEYS do
  local n = redis.call('INCR', KEYS[i])
  if n == 1 then redis.call('PEXPIRE', KEYS[i], ARGV[i * 2]) end
  if over == 0 and n > tonumber(ARGV[i * 2 - 1]) then over = i end
end
return over
`;
const SET_PX = `if ARGV[2] == '0' then return redis.call('SET', KEYS[1], ARGV[1]) else return redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2]) end`;
const SET_NX = `local r = redis.call('SET', KEYS[1], ARGV[1], 'NX') if r then return 1 else return 0 end`;
const RPUSH = `return redis.call('RPUSH', KEYS[1], ARGV[1])`;
const LRANGE = `return redis.call('LRANGE', KEYS[1], 0, -1)`;
const SADD = `return redis.call('SADD', KEYS[1], ARGV[1])`;
const SMEMBERS = `return redis.call('SMEMBERS', KEYS[1])`;
const DEL = `return redis.call('DEL', KEYS[1])`;

/**
 * @typedef {{ get(key: string): Promise<string | null>, eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> }} RawStore
 * @param {RawStore} raw @param {Record<string, string | undefined>} env
 */
export function quoteStore(raw, env) {
  const ns = namespace(env);
  const k = {
    lead: (/** @type {string} */ id) => `qe:${ns}:lead:${id}`,
    events: (/** @type {string} */ id) => `qe:${ns}:ev:${id}`,
    phone: (/** @type {string} */ h) => `qe:${ns}:phone:${h}`,
    access: () => `qe:${ns}:access`,
    pending: (/** @type {string} */ id) => `qv:${ns}:${id}`,
    session: (/** @type {string} */ sid) => `qs:${ns}:${sid}`,
    limit: (/** @type {string} */ name) => `ql:${ns}:${name}`,
    flag: (/** @type {string} */ id, /** @type {string} */ what) => `qf:${ns}:${id}:${what}`,
  };
  const getJson = async (/** @type {string} */ key) => {
    const v = await raw.get(key);
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  };
  const setJson = (/** @type {string} */ key, /** @type {unknown} */ value, ttlMs = 0) => raw.eval(SET_PX, [key], [JSON.stringify(value), ttlMs]);
  return {
    ns,
    keys: k,
    /** @param {{ key: string, limit: number, windowMs: number }[]} counters returns the 1-based index of the first exceeded counter, or 0 */
    limit: async (counters) =>
      Number(await raw.eval(COUNTERS_SCRIPT, counters.map((c) => k.limit(c.key)), counters.flatMap((c) => [c.limit, c.windowMs]))),
    getLead: (/** @type {string} */ id) => getJson(k.lead(id)),
    putLead: (/** @type {string} */ id, /** @type {any} */ rec) => setJson(k.lead(id), rec),
    event: (/** @type {string} */ id, /** @type {any} */ ev) => raw.eval(RPUSH, [k.events(id)], [JSON.stringify(ev)]),
    events: async (/** @type {string} */ id) => /** @type {string[]} */ ((await raw.eval(LRANGE, [k.events(id)], [])) ?? []).map((s) => JSON.parse(s)),
    indexPhone: (/** @type {string} */ hash, /** @type {string} */ id) => raw.eval(SADD, [k.phone(hash)], [id]),
    leadsForPhone: async (/** @type {string} */ hash) => /** @type {string[]} */ ((await raw.eval(SMEMBERS, [k.phone(hash)], [])) ?? []),
    logAccess: (/** @type {any} */ entry) => raw.eval(RPUSH, [k.access()], [JSON.stringify(entry)]),
    accessLog: async () => /** @type {string[]} */ ((await raw.eval(LRANGE, [k.access()], [])) ?? []).map((s) => JSON.parse(s)),
    getPending: (/** @type {string} */ id) => getJson(k.pending(id)),
    putPending: (/** @type {string} */ id, /** @type {any} */ p, /** @type {number} */ ttlMs) => setJson(k.pending(id), p, ttlMs),
    dropPending: (/** @type {string} */ id) => raw.eval(DEL, [k.pending(id)], []),
    getSession: (/** @type {string} */ sid) => getJson(k.session(sid)),
    putSession: (/** @type {string} */ sid, /** @type {any} */ s, /** @type {number} */ ttlMs) => setJson(k.session(sid), s, ttlMs),
    /** true the first time only */
    once: async (/** @type {string} */ id, /** @type {string} */ what) => Number(await raw.eval(SET_NX, [k.flag(id, what)], [new Date().toISOString()])) === 1,
  };
}
