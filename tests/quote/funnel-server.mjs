// Local stand-in for a Preview, for the quote funnel browser test: serves
// dist/ with the real /api/quote/ and /api/price-explorer/ handlers, a
// throwaway redis-server, the private rate tables (server/rates/private/,
// git-ignored) and test-mode verification (no Twilio credentials, not
// production: code 123456, no SMS, no notification). Aetna's question
// records are replaced by fictional TEST ONLY wording so the intake can be
// driven without the private Health Question Search data.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startRedis } from '../health-search/redis-test-server.js';
import { createEngine, loadDatasets } from '../../server/rates/engine.js';
import { handlePriceExplorer } from '../../server/rates/public-pricing.js';
import { handleQuote } from '../../server/quote/handler.js';
import { quoteStore } from '../../server/quote/store.js';
import { verifiedLead } from '../../server/quote/session.js';
import { config as hqsConfig } from '../../server/health-search/config.generated.js';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.json': 'application/json' };

// production: true runs the handlers as Production without Twilio (the v5.4 temporary
// access-code mode); requests are given the funeralfunds.com origin.
export async function startFunnelServer({ production = false } = {}) {
  const redis = await startRedis();
  const concept = hqsConfig.concepts[0].id;
  const qs = [];
  for (const [sec, n, rule] of [['Part A', 13, 'part-a'], ['Part B', 5, 'part-b'], ['Part C', 4, 'part-c']])
    for (let i = 1; i <= n; i++)
      qs.push({ id: `aetna-${sec.slice(-1).toLowerCase()}${i}`, carrierId: 'aetna', section: sec, number: String(i), text: `TEST ONLY ${sec} question ${i}?`, yes: { rule }, no: { classification: 'none', explanation: 'No effect.' }, search: { direct: [concept], related: [] } });
  await redis.store.set('hqs:questions:preview', JSON.stringify({ format: 1, target: 'preview', publishedAt: 't', total: qs.length, complete: false, questions: qs }));
  const engine = createEngine(loadDatasets());
  const env = { HEALTH_SEARCH_SECRET: 'x'.repeat(40), QUOTE_SESSION_SECRET: 'y'.repeat(40), ...(production ? { VERCEL_ENV: 'production', QUOTE_PUBLIC_TEST_CODE: 'on' } : {}) };
  const store = quoteStore(redis.store, env);
  const getEngine = async () => ({ engine, publishedAt: 'local' });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = async (out) => {
      res.writeHead(out.status, Object.fromEntries(out.headers));
      res.end(await out.text());
    };
    if (url.pathname === '/__evidence/') {
      const ids = await redis.command(['KEYS', `qe:${production ? 'production' : 'preview'}:lead:*`]);
      const records = [];
      for (const k of ids) records.push(JSON.parse(await redis.store.get(k)));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(records));
    }
    if (url.pathname === '/api/quote/' || url.pathname === '/api/price-explorer/') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const headers = /** @type {any} */ ({ ...req.headers, ...(production && req.headers.origin ? { origin: 'https://funeralfunds.com' } : {}) });
      const r = new Request(url, { method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined });
      if (url.pathname === '/api/quote/') return send(await handleQuote(r, env, { store, raw: redis.store, getEngine }));
      return send(await handlePriceExplorer(r, env, {
        store: redis.store, getEngine,
        isVerified: async (q) => (await verifiedLead(q, env, store))?.leadId ?? false,
        onPriced: async (id, input) => { const rec = await store.getLead(id); await store.putLead(id, { ...rec, lastQuote: input }); },
      }));
    }
    let p = join(DIST, decodeURIComponent(url.pathname));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
    res.end(readFileSync(p));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(undefined)));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return {
    base: `http://127.0.0.1:${port}`,
    engine,
    async close() {
      server.close();
      await redis.stop?.();
    },
  };
}
