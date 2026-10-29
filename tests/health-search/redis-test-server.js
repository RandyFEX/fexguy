// @ts-check
// Test helper: starts a throwaway local redis-server and exposes the same
// `eval` interface as the production Upstash store, over the Redis protocol.
// Used only by the tests, so the real Lua quota script runs on real Redis.

import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { once } from 'node:events';

/** Encode a command in RESP. @param {(string | number)[]} parts */
function encode(parts) {
  return `*${parts.length}\r\n` + parts.map((p) => { const s = String(p); return `$${Buffer.byteLength(s)}\r\n${s}\r\n`; }).join('');
}

/** Parse one RESP value from buf at i. @param {Buffer} buf @param {number} i @returns {[unknown, number] | null} */
function parse(buf, i) {
  const end = buf.indexOf('\r\n', i);
  if (end < 0) return null;
  const type = String.fromCharCode(buf[i]);
  const line = buf.toString('utf8', i + 1, end);
  const next = end + 2;
  if (type === '+') return [line, next];
  if (type === '-') return [new Error(line), next];
  if (type === ':') return [Number(line), next];
  if (type === '$') {
    const len = Number(line);
    if (len < 0) return [null, next];
    if (buf.length < next + len + 2) return null;
    return [buf.toString('utf8', next, next + len), next + len + 2];
  }
  if (type === '*') {
    const n = Number(line);
    if (n < 0) return [null, next];
    const out = [];
    let pos = next;
    for (let k = 0; k < n; k++) {
      const r = parse(buf, pos);
      if (!r) return null;
      out.push(r[0]); pos = r[1];
    }
    return [out, pos];
  }
  throw new Error(`unexpected RESP type ${type}`);
}

/** One connection per command keeps the helper simple and concurrency-safe. @param {number} port @param {(string | number)[]} parts */
async function command(port, parts) {
  const sock = createConnection({ port, host: '127.0.0.1' });
  await once(sock, 'connect');
  sock.write(encode(parts));
  let buf = Buffer.alloc(0);
  for await (const chunk of sock) {
    buf = Buffer.concat([buf, chunk]);
    const r = parse(buf, 0);
    if (r) { sock.destroy(); if (r[0] instanceof Error) throw r[0]; return r[0]; }
  }
  throw new Error('connection closed');
}

export async function startRedis() {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await command(port, ['PING']); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  return {
    /** @type {import('../../server/health-search/quota.js').QuotaStore} */
    store: { eval: (script, keys, args) => command(port, ['EVAL', script, keys.length, ...keys, ...args]) },
    /** @param {(string | number)[]} parts */
    command: (parts) => command(port, parts),
    stop: () => proc.kill(),
  };
}
