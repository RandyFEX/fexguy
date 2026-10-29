// @ts-check
// Three searches per visitor in a rolling 24-hour window, plus a separate
// per-IP abuse limit. Enforced by one Redis Lua script, so the check and the
// increment are atomic: parallel requests cannot slip past the limit.
//
// Stored (all keys are HMACs, never raw cookie values, IPs or search terms;
// everything expires with the window):
//   hqs:v:<visitor>   sorted set of accepted searches (score = time)
//   hqs:q:<visitor>   hash of accepted query fingerprints -> time, so reopening
//                     or paging an already accepted search costs nothing
//   hqs:ip:<ip>       sorted set of search requests from one IP

export const QUOTA = {
  perVisitor: 3,
  windowMs: 24 * 60 * 60 * 1000,
  ipPerHour: 40,
  ipWindowMs: 60 * 60 * 1000,
};

// KEYS[1] visitor set, KEYS[2] visitor query hash, KEYS[3] ip set
// ARGV: now, windowMs, limit, queryFp, ipLimit, ipWindowMs, mode, member
// mode: 'status' (read only), 'search' (count if new), 'nomatch' (ip only)
// Returns { code, used, oldest } where code is
//   'ok' (counted), 'repeat' (already accepted, not counted),
//   'exhausted', 'ip-limited', 'status', 'nomatch'
export const QUOTA_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local fp = ARGV[4]
local ipLimit = tonumber(ARGV[5])
local ipWindow = tonumber(ARGV[6])
local mode = ARGV[7]
local member = ARGV[8]

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local used = redis.call('ZCARD', KEYS[1])
local function oldest()
  local o = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  if o[2] then return tonumber(o[2]) end
  return 0
end

if mode == 'status' then
  return {'status', used, oldest()}
end

local seen = redis.call('HGET', KEYS[2], fp)
if seen and tonumber(seen) > now - window then
  return {'repeat', used, oldest()}
end

redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now - ipWindow)
if redis.call('ZCARD', KEYS[3]) >= ipLimit then
  local o = redis.call('ZRANGE', KEYS[3], 0, 0, 'WITHSCORES')
  return {'ip-limited', used, tonumber(o[2]) + ipWindow - window}
end
redis.call('ZADD', KEYS[3], now, member)
redis.call('PEXPIRE', KEYS[3], ipWindow)

if mode == 'nomatch' then
  return {'nomatch', used, oldest()}
end

if used >= limit then
  return {'exhausted', used, oldest()}
end
redis.call('ZADD', KEYS[1], now, member)
redis.call('HSET', KEYS[2], fp, now)
redis.call('PEXPIRE', KEYS[1], window)
redis.call('PEXPIRE', KEYS[2], window)
return {'ok', used + 1, oldest()}
`;

/** @typedef {{ eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> }} QuotaStore */

/**
 * @param {QuotaStore} store
 * @param {{ visitor: string, ip: string, queryFp: string, now: number, mode: 'status' | 'search' | 'nomatch', member: string }} p
 */
export async function runQuota(store, p) {
  const raw = /** @type {[string, number, number]} */ (await store.eval(
    QUOTA_SCRIPT,
    [`hqs:v:${p.visitor}`, `hqs:q:${p.visitor}`, `hqs:ip:${p.ip}`],
    [p.now, QUOTA.windowMs, QUOTA.perVisitor, p.queryFp, QUOTA.ipPerHour, QUOTA.ipWindowMs, p.mode, p.member],
  ));
  const [code, used, oldest] = [String(raw[0]), Number(raw[1]), Number(raw[2])];
  const remaining = Math.max(0, QUOTA.perVisitor - used);
  // The allowance frees up one search when the oldest accepted one ages out.
  const resetAt = used > 0 && oldest > 0 ? oldest + QUOTA.windowMs : null;
  return { code, used, remaining, resetAt };
}
