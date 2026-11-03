// Live end-to-end check of a deployed preview (real Vercel Function + the
// private Upstash store), after `npm run rates:publish -- --target preview`:
//
//   RATES_BASE=https://<preview>.vercel.app \
//   VERCEL_AUTOMATION_BYPASS_SECRET=... RATE_ENGINE_API_KEY=... \
//     node tests/rates/live-preview.mjs
//
// Prints PASS/FAIL lines and the benchmark premiums only: never keys, rate
// tables or annual rates. When the private tables exist locally it also
// compares every API premium for a sample grid with the local engine.
import assert from 'node:assert/strict';
import { createEngine, loadDatasets } from '../../server/rates/engine.js';
import { PRODUCTS } from '../../server/rates/products.js';

const base = (process.env.RATES_BASE ?? '').replace(/\/$/, '');
const key = process.env.RATE_ENGINE_API_KEY ?? '';
if (!base || !key) { console.error('Set RATES_BASE and RATE_ENGINE_API_KEY (and VERCEL_AUTOMATION_BYPASS_SECRET for a protected preview).'); process.exit(2); }
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const common = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
const api = `${base}/api/rate-quote/`;

const post = async (body, { withKey = true, method = 'POST' } = {}) => {
  const res = await fetch(api, {
    method,
    headers: { ...common, 'content-type': 'application/json', ...(withKey ? { 'x-rate-engine-key': key } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  return { http: res.status, headers: res.headers, text: await res.text() };
};
const quote = async (o) => {
  const r = await post({ age: 60, gender: 'male', tobacco: false, coverage: 10000, state: 'TX', ...o });
  assert.equal(r.http, 200, `HTTP ${r.http}`);
  return JSON.parse(r.text);
};

const results = [];
const check = async (name, fn) => {
  try { const note = await fn(); results.push(`PASS  ${name}${note ? ` (${note})` : ''}`); } catch (e) { results.push(`FAIL  ${name}: ${String(e.message).split('\n')[0]}`); }
};

await check('no key: 401; GET: 405 or 401; nothing cached', async () => {
  const r = await post({}, { withKey: false });
  assert.equal(r.http, 401);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.ok([401, 405].includes((await post(null, { method: 'GET' })).http));
});

await check('premiums come from the secure store (all three tables loaded)', async () => {
  const b = await quote({});
  assert.equal(b.status, 'ok');
  assert.ok(b.ratesVersion, 'ratesVersion present');
  assert.deepEqual(b.results.map((r) => r.ok), [true, true, true]);
  return `rates published ${b.ratesVersion}`;
});

await check('Gerber benchmark: age 60, $10,000 monthly ACH = $63.89 male, $51.06 female', async () => {
  const out = [];
  for (const [gender, expected] of [['male', '63.89'], ['female', '51.06']])
    for (const tobacco of [false, true]) {
      const g = (await quote({ gender, tobacco, products: ['gerber-guaranteed-life'] })).results[0];
      assert.equal(g.monthlyPremium, expected, `${gender} tobacco=${tobacco}`);
      out.push(`${gender} $${g.monthlyPremium}`);
    }
  return [...new Set(out)].join(', ');
});

await check('gender and tobacco classes change Aetna and MOO premiums', async () => {
  const a = (await quote({})).results;
  const f = (await quote({ gender: 'female' })).results;
  const s = (await quote({ tobacco: true })).results;
  for (const i of [0, 1]) {
    assert.notEqual(a[i].monthlyPremium, f[i].monthlyPremium);
    assert.notEqual(a[i].monthlyPremium, s[i].monthlyPremium);
  }
});

await check('state and coverage rules: unavailable results with reasons', async () => {
  assert.equal((await quote({ state: 'MT' })).results[2].reason, 'unavailable_in_state');
  assert.equal((await quote({ state: 'NY' })).results[1].reason, 'unavailable_in_state');
  assert.equal((await quote({ state: 'SD', coverage: 20000 })).results[2].reason, 'coverage_out_of_range');
  assert.equal((await quote({ state: 'NY', age: 78 })).results[2].reason, 'age_out_of_range');
  assert.equal((await quote({ coverage: 50000 })).results[1].reason, 'coverage_out_of_range');
  assert.equal((await quote({ age: 90 })).results[0].reason, 'age_out_of_range');
  assert.equal((await quote({})).results[0].availability.verified, false);
});

await check('responses never expose tables, rates or printed premiums', async () => {
  const r = await post({ age: 70, gender: 'female', tobacco: true, coverage: 15000, state: 'TX' });
  for (const banned of ['annualRatePer1000', 'records', 'printedPremiums', 'policyFee', 'modalFactor', 'sourceSha256', 'fexguyRateData'])
    assert.ok(!r.text.includes(banned), banned);
  assert.equal((await post({ age: 60, dump: true })).http, 400);
});

const local = loadDatasets();
if (Object.keys(local).length === 3) {
  await check('API premiums equal the local engine for a sample grid', async () => {
    const engine = createEngine(local);
    let n = 0;
    for (const age of [50, 60, 70, 80])
      for (const gender of ['male', 'female'])
        for (const tobacco of [false, true])
          for (const coverage of [5000, 12000, 25000]) {
            const api = (await quote({ age, gender, tobacco, coverage })).results;
            Object.keys(PRODUCTS).forEach((productId, i) => {
              const l = engine.quote({ productId, age, gender, tobacco, coverage, state: 'TX' });
              assert.equal(api[i].ok, l.ok);
              if (l.ok) assert.equal(api[i].monthlyPremium, l.monthlyPremium, `${productId} ${age} ${gender} ${tobacco} ${coverage}`);
              n++;
            });
          }
    return `${n} comparisons`;
  });
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
