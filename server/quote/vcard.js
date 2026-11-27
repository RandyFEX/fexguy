// @ts-check
// Personalized quote vCard (Randy, November 2026): SAVE QUOTE & CONTACT INFO on
// the quote results downloads Randy's own contact card (the master vCard at
// /randy/randy-vandervaate.vcf, built from src/config/card.ts: name, Funeral
// Funds, phone, email, website, photo) with the visitor's quote in its NOTE.
//
//   1. POST /api/quote/ { action: 'vcard', quote }  (server/quote/handler.js)
//      checks the quote session, re-prices the DISPLAYED quote on the server
//      (the browser's prices are never trusted) and saves a one-time download
//      token for 2 minutes.
//   2. GET /api/quote-vcard/?t=<token>  (api/quote-vcard.js, this file)
//      returns the .vcf (text/vcard, attachment), only to the browser whose
//      quote-session cookie made the token, once. The first download of a lead
//      on the production deployment (never test mode, previews or owner test
//      mode) updates its existing Agent CRM contact once: tag "Quote
//      Downloaded" and a note (server/quote/crm.js sendQuoteDownloadToCrm). A
//      CRM failure never blocks the download.
//
// The URL carries only the random token: no name, quote or CRM id. Tracked as
// Quote Downloaded (GA4 quote_downloaded): the site can't know whether the
// visitor then saves the contact.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readCookie, sessionKey, unsign } from './session.js';
import { sendQuoteDownloadToCrm } from './crm.js';

export const TOKEN_TTL_MS = 2 * 60 * 1000;
export const VCARD_FILENAME = 'Randy-VanderVaate-Funeral-Funds-Quote.vcf';
const MASTER_PATH = 'dist/randy/randy-vandervaate.vcf';
const MASTER_URL = 'https://funeralfunds.com/randy/randy-vandervaate.vcf';
/** The note's closing line: the master card's phone (888-862-9456). */
const CALL_LINE = 'Call Randy directly at 888-862-9456 for possibly lower-cost options available in your state.';
/** The approved representative-rates wording from the quote results. */
const REP_LINE = 'Representative monthly rates. Actual premiums and availability may vary by state and insurance company.';
/** How long the download may wait for Agent CRM before the file is sent anyway. */
const CRM_WAIT_MS = 4000;

export const newToken = () => randomBytes(24).toString('hex');
export const tokenOk = (/** @type {unknown} */ t) => typeof t === 'string' && /^[a-f0-9]{48}$/.test(t);

/** @type {string | null} */
let masterCache = null;
/** The master vCard text: the deployed build's file, else the live card. @param {typeof fetch} [fetchImpl] */
export async function masterVcard(fetchImpl = fetch) {
  if (masterCache) return masterCache;
  let text = await readFile(join(process.cwd(), MASTER_PATH), 'utf8').catch(() => null);
  if (!text) {
    const res = await fetchImpl(MASTER_URL, { signal: AbortSignal.timeout(4000) });
    text = res.ok ? await res.text() : null;
  }
  if (!text || !text.startsWith('BEGIN:VCARD')) throw new Error('master vCard unavailable');
  masterCache = text;
  return text;
}

const esc = (/** @type {string} */ v) => v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
/** RFC 2425 folding (the master's own rule): 75 characters, continuation lines start with a space. */
const fold = (/** @type {string} */ line) => {
  const out = [line.slice(0, 75)];
  for (let rest = line.slice(75); rest.length; rest = rest.slice(74)) out.push(' ' + rest.slice(0, 74));
  return out.join('\r\n');
};

/** The master with its NOTE replaced by `note` (every other line kept as is). @param {string} master @param {string} note */
export function personalizeVcard(master, note) {
  const lines = [];
  for (const l of master.split(/\r?\n/)) {
    if (/^[ \t]/.test(l) && lines.length) lines[lines.length - 1] += l.slice(1);
    else if (l) lines.push(l);
  }
  const out = lines.filter((l) => !/^NOTE[;:]/i.test(l));
  const end = out.findIndex((l) => /^END:VCARD$/i.test(l));
  out.splice(end === -1 ? out.length : end, 0, `NOTE:${esc(note)}`);
  return out.map(fold).join('\r\n') + '\r\n';
}

const money = (/** @type {number} */ n) => `$${Number(n).toLocaleString('en-US')}`;
/** "November 27, 2026" in Randy's time zone. @param {Date} d */
export const quoteDate = (d) => d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' });

/**
 * The quote lines (displayed order): company, monthly premium, and the
 * coverage (premium mode) or a waiting period when the plan has one.
 * @param {any} quote @param {any[]} categories priced on the server
 */
export function quoteLines(quote, categories) {
  return categories
    .filter((c) => c.status === 'ok' && c.monthlyPremium)
    .map((c) => {
      const d = c.carriers?.[0] ?? null;
      const name = d?.carrier ?? c.label;
      const wait = d?.timing && /wait/i.test(d.timing) ? ` (${d.timing.toLowerCase()})` : '';
      return 'premium' in quote && c.coverage ? `${name}: ${money(c.coverage)} coverage for $${c.monthlyPremium}/month${wait}` : `${name}: $${c.monthlyPremium}/month${wait}`;
    });
}

/** The vCard NOTE. @param {{ firstName: string, quote: any, categories: any[], at: Date }} p */
export function vcardNote({ firstName, quote, categories, at }) {
  return [
    `Funeral Funds quote for ${firstName}`,
    `Quote date: ${quoteDate(at)}`,
    'premium' in quote ? `Monthly budget: $${quote.premium}` : `Coverage: ${money(quote.coverage)}`,
    ...quoteLines(quote, categories),
    REP_LINE,
    CALL_LINE,
  ].join('\n');
}

/**
 * GET /api/quote-vcard/?t=<token>
 * @param {Request} request @param {Record<string, string | undefined>} env
 * @param {{ store: any, fetchImpl?: typeof fetch, now?: () => number }} deps store: the quote store this browser uses (owner test or not)
 */
export async function handleVcardDownload(request, env, deps) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
  const gone = () => new Response('This download link has expired. Please go back to your quote and tap SAVE QUOTE & CONTACT INFO again.', { status: 410, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
  const token = new URL(request.url).searchParams.get('t');
  if (!deps.store || !tokenOk(token)) return gone();
  const t = /** @type {string} */ (token);
  const pending = await deps.store.getPending(`vc:${t}`);
  // Only the browser whose quote session made the token (the session cookie).
  const key = sessionKey(env);
  const claims = key ? unsign(key, readCookie(request), (deps.now ?? Date.now)()) : null;
  if (!pending || !claims || claims.sid !== pending.sid || claims.lid !== pending.leadId) return gone();
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers: { ...headers, 'Content-Type': 'text/vcard; charset=utf-8' } });
  await deps.store.dropPending(`vc:${t}`);

  const at = new Date(pending.at);
  let body;
  try {
    body = personalizeVcard(await masterVcard(deps.fetchImpl), pending.note);
  } catch {
    return new Response('Your contact card could not be prepared just now. Please try again in a moment.', { status: 503, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const record = await deps.store.getLead(pending.leadId).catch(() => null);
  if (record) {
    const download = { at: at.toISOString(), quote: pending.quote, lines: pending.lines };
    record.quoteDownloads = [...(record.quoteDownloads ?? []), download].slice(-20);
    await deps.store.putLead(pending.leadId, record).catch(() => {});
    await deps.store.event(pending.leadId, { at: new Date().toISOString(), type: 'quote-downloaded', ...download }).catch(() => {});
    // Agent CRM: production leads only, the first download of the lead only.
    const live = env.VERCEL_ENV === 'production' && !pending.test && record.mode !== 'test' && record.mode !== 'preview-sample';
    if (live && (await deps.store.once(pending.leadId, 'quote-downloaded').catch(() => false))) {
      const crm = sendQuoteDownloadToCrm(env, record, { at, quote: pending.quote, lines: pending.lines }, deps.fetchImpl)
        .catch(() => ({ sent: true, ok: false, error: 'error' }))
        .then((r) => deps.store.event(pending.leadId, { at: new Date().toISOString(), type: r.ok ? 'crm-quote-downloaded' : r.sent ? 'crm-quote-downloaded-failed' : 'crm-not-configured', ...r }).catch(() => {}));
      // Wait briefly so the update completes inside this request; never block the file for long.
      await Promise.race([crm, new Promise((r) => setTimeout(r, CRM_WAIT_MS))]);
    }
  }
  return new Response(body, {
    status: 200,
    headers: { ...headers, 'Content-Type': 'text/vcard; charset=utf-8', 'Content-Disposition': `attachment; filename="${VCARD_FILENAME}"` },
  });
}
