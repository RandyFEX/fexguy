// Quota enforcement on a real local Redis (the production Lua script).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startRedis } from './redis-test-server.js';
import { runQuota, QUOTA } from '../../server/health-search/quota.js';

let redis;
before(async () => { redis = await startRedis(); });
after(() => redis.stop());

let n = 0;
const ids = () => ({ visitor: `v${++n}`, ip: `ip${n}` });
const run = (p, extra) => runQuota(redis.store, { queryFp: 'q', now: 1_000_000, mode: 'search', member: `${Math.random()}`, ...p, ...extra });

const L = QUOTA.perVisitor;

test(`${L} new searches are accepted, the next one is refused`, async () => {
  const p = ids();
  for (let i = 1; i <= L; i++) {
    const r = await run(p, { queryFp: `q${i}`, now: 1_000_000 + i });
    assert.equal(r.code, 'ok');
    assert.equal(r.remaining, L - i);
  }
  const r = await run(p, { queryFp: 'over', now: 1_000_100 });
  assert.equal(r.code, 'exhausted');
  assert.equal(r.remaining, 0);
  assert.equal(r.resetAt, 1_000_001 + QUOTA.windowMs);
});

test('repeating or paging an accepted search is not counted, even after exhaustion', async () => {
  const p = ids();
  for (let i = 0; i < L; i++) await run(p, { queryFp: `f${i}` });
  const again = await run(p, { queryFp: `f${L - 1}` });
  assert.equal(again.code, 'repeat');
  assert.equal(again.remaining, 0);
});

test('searches with no matches are not counted', async () => {
  const p = ids();
  const r = await run(p, { queryFp: 'zz', mode: 'nomatch' });
  assert.equal(r.code, 'nomatch');
  assert.equal(r.remaining, L);
});

test('status reads without counting', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  const s = await run(p, { mode: 'status' });
  assert.equal(s.code, 'status');
  assert.equal(s.remaining, L - 1);
});

test('rolling window: a slot frees up when the oldest search turns 24 hours old', async () => {
  const p = ids();
  const t0 = 5_000_000;
  for (let i = 0; i < L; i++) await run(p, { queryFp: `r${i}`, now: t0 + i * 1000 });
  assert.equal((await run(p, { queryFp: 'new', now: t0 + QUOTA.windowMs - 1 })).code, 'exhausted');
  const later = await run(p, { queryFp: 'new', now: t0 + QUOTA.windowMs + 1 });
  assert.equal(later.code, 'ok');
  assert.equal(later.remaining, 0);
  // The previously accepted first search aged out too, so it now counts as new.
  assert.equal((await run(p, { queryFp: 'r0', now: t0 + QUOTA.windowMs + 2 })).code, 'exhausted');
});

test('parallel requests cannot exceed the allowance (atomic)', async () => {
  const p = ids();
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => run(p, { queryFp: `p${i}`, now: 9_000_000 + i })));
  assert.equal(results.filter((r) => r.code === 'ok').length, L);
  assert.equal(results.filter((r) => r.code === 'exhausted').length, 25 - L);
});

test('IP hourly search limit is separate from the per-visitor allowance', async () => {
  const ip = `shared-${++n}`;
  // Many visitors behind one IP (an office, a phone network), 30 seconds apart
  // so the 10-minute burst limit is not what stops them...
  for (let i = 0; i < QUOTA.ipPerHour; i++) {
    assert.equal((await run({ visitor: `office-${n}-${i}`, ip }, { queryFp: 'q', now: 20_000_000 + i * 30_000 })).code, 'ok');
  }
  // ...until the IP reaches its hourly search limit.
  const blocked = await run({ visitor: `office-${n}-x`, ip }, { queryFp: 'q', now: 20_000_000 + QUOTA.ipPerHour * 30_000 });
  assert.equal(blocked.code, 'ip-limited');
  assert.ok(blocked.resetAt && blocked.resetAt > 20_000_000);
  // An hour later the IP is clear again.
  assert.equal((await run({ visitor: `office-${n}-y`, ip }, { queryFp: 'q', now: 20_000_000 + QUOTA.ipWindowMs + QUOTA.ipPerHour * 30_000 })).code, 'ok');
});

test('burst limit: any request type from one IP, including status checks', async () => {
  const ip = `burst-${++n}`;
  const t = 40_000_000 * 1; // start of a 10-minute block
  const block0 = Math.floor(t / QUOTA.burstWindowMs) * QUOTA.burstWindowMs;
  for (let i = 0; i < QUOTA.burstPerIp; i++) {
    assert.notEqual((await run({ visitor: `b${n}-${i}`, ip }, { mode: 'status', now: block0 + i })).code, 'ip-limited');
  }
  const over = await run({ visitor: `b${n}-x`, ip }, { mode: 'status', now: block0 + 100 });
  assert.equal(over.code, 'ip-limited');
  assert.equal(over.resetAt, block0 + QUOTA.burstWindowMs);
  // The next 10-minute block starts fresh.
  assert.equal((await run({ visitor: `b${n}-y`, ip }, { mode: 'status', now: block0 + QUOTA.burstWindowMs })).code, 'status');
});

test('keys expire with the window (no long-term storage)', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  const ttl = await redis.command(['PTTL', `hqs:v:${p.visitor}`]);
  assert.ok(ttl > 0 && ttl <= QUOTA.windowMs);
  const ipTtl = await redis.command(['PTTL', `hqs:ip:${p.ip}`]);
  assert.ok(ipTtl > 0 && ipTtl <= QUOTA.ipWindowMs);
  const burstKeys = await redis.command(['KEYS', `hqs:b:${p.ip}:*`]);
  const burstTtl = await redis.command(['PTTL', burstKeys[0]]);
  assert.ok(burstTtl > 0 && burstTtl <= QUOTA.burstWindowMs);
});

test('query fingerprints older than 24 hours are deleted, even for a visitor who keeps searching', async () => {
  const p = ids();
  const t0 = 9_000_000;
  await run(p, { queryFp: 'old', now: t0 });
  await run(p, { queryFp: 'new', now: t0 + QUOTA.windowMs - 1000 });
  await run(p, { mode: 'status', now: t0 + QUOTA.windowMs + 1 });
  const fields = await redis.command(['HKEYS', `hqs:q:${p.visitor}`]);
  assert.deepEqual(fields, ['new']);
  const members = await redis.command(['ZCARD', `hqs:v:${p.visitor}`]);
  assert.equal(members, 1);
});

test('the IP record expires one hour after its last use', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  const ttl = await redis.command(['PTTL', `hqs:ip:${p.ip}`]);
  assert.ok(ttl > 0 && ttl <= QUOTA.ipWindowMs, String(ttl));
  const vttl = await redis.command(['PTTL', `hqs:v:${p.visitor}`]);
  assert.ok(vttl > 0 && vttl <= QUOTA.windowMs, String(vttl));
});
