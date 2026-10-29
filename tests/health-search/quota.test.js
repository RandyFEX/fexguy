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

test('three new searches are accepted, the fourth is refused', async () => {
  const p = ids();
  for (let i = 1; i <= 3; i++) {
    const r = await run(p, { queryFp: `q${i}`, now: 1_000_000 + i });
    assert.equal(r.code, 'ok');
    assert.equal(r.remaining, 3 - i);
  }
  const r = await run(p, { queryFp: 'q4', now: 1_000_010 });
  assert.equal(r.code, 'exhausted');
  assert.equal(r.remaining, 0);
  assert.equal(r.resetAt, 1_000_001 + QUOTA.windowMs);
});

test('repeating or paging an accepted search is not counted, even after exhaustion', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  await run(p, { queryFp: 'b' });
  await run(p, { queryFp: 'c' });
  const again = await run(p, { queryFp: 'c' });
  assert.equal(again.code, 'repeat');
  assert.equal(again.remaining, 0);
});

test('searches with no matches are not counted', async () => {
  const p = ids();
  const r = await run(p, { queryFp: 'zz', mode: 'nomatch' });
  assert.equal(r.code, 'nomatch');
  assert.equal(r.remaining, 3);
});

test('status reads without counting', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  const s = await run(p, { mode: 'status' });
  assert.equal(s.code, 'status');
  assert.equal(s.remaining, 2);
});

test('rolling window: a slot frees up when the oldest search turns 24 hours old', async () => {
  const p = ids();
  const t0 = 5_000_000;
  await run(p, { queryFp: 'a', now: t0 });
  await run(p, { queryFp: 'b', now: t0 + 1000 });
  await run(p, { queryFp: 'c', now: t0 + 2000 });
  assert.equal((await run(p, { queryFp: 'd', now: t0 + QUOTA.windowMs - 1 })).code, 'exhausted');
  const later = await run(p, { queryFp: 'd', now: t0 + QUOTA.windowMs + 1 });
  assert.equal(later.code, 'ok');
  assert.equal(later.remaining, 0);
  // The previously accepted 'a' aged out too, so it now counts as new.
  assert.equal((await run(p, { queryFp: 'a', now: t0 + QUOTA.windowMs + 2 })).code, 'exhausted');
});

test('parallel requests cannot exceed the allowance (atomic)', async () => {
  const p = ids();
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => run(p, { queryFp: `p${i}`, now: 9_000_000 + i })));
  assert.equal(results.filter((r) => r.code === 'ok').length, 3);
  assert.equal(results.filter((r) => r.code === 'exhausted').length, 17);
});

test('IP limit is separate from the per-visitor allowance', async () => {
  const ip = `shared-${++n}`;
  // Many different visitors behind one IP each get their own 3 searches...
  for (let v = 0; v < 13; v++) {
    for (let i = 0; i < 3; i++) assert.equal((await run({ visitor: `office-${n}-${v}`, ip }, { queryFp: `q${i}`, now: 20_000_000 + v * 10 + i })).code, 'ok');
  }
  // ...until the IP reaches its hourly abuse limit (40).
  assert.equal((await run({ visitor: `office-${n}-x`, ip }, { queryFp: 'q', now: 20_000_500 })).code, 'ok');
  const blocked = await run({ visitor: `office-${n}-y`, ip }, { queryFp: 'q', now: 20_000_600 });
  assert.equal(blocked.code, 'ip-limited');
  // An hour later the IP is clear again.
  assert.equal((await run({ visitor: `office-${n}-y`, ip }, { queryFp: 'q', now: 20_000_000 + QUOTA.ipWindowMs + 1000 })).code, 'ok');
});

test('keys expire with the window (no long-term storage)', async () => {
  const p = ids();
  await run(p, { queryFp: 'a' });
  const ttl = await redis.command(['PTTL', `hqs:v:${p.visitor}`]);
  assert.ok(ttl > 0 && ttl <= QUOTA.windowMs);
  const ipTtl = await redis.command(['PTTL', `hqs:ip:${p.ip}`]);
  assert.ok(ipTtl > 0 && ipTtl <= QUOTA.ipWindowMs);
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
