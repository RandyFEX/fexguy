// Converts Randy's question set (plain text, kept only in the git-ignored
// server/health-search/private/source/) into the private per-carrier record
// files in server/health-search/private/questions/. It never rewords
// anything: question text and each YES/NO outcome are copied line for line
// (only surrounding whitespace is trimmed). Corrections Randy approved are
// applied from private/source/corrections.json and recorded on the record.
// Prints counts only.
//
//   node scripts/health-search-import.mjs [source.txt]

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = join(root, 'server/health-search/private');
const sourceDir = join(privateDir, 'source');
const arg = process.argv[2];
const sourceFile = arg ?? join(sourceDir, readdirSync(sourceDir).filter((f) => f.endsWith('.txt')).sort().at(-1) ?? '');
const sourceName = sourceFile.split('/').at(-1);

const CARRIERS = {
  'FAMILY BENEFIT LIFE': 'family-benefit-life',
  'TRINITY LIFE': 'trinity-life',
  'GUARANTEE TRUST LIFE': 'guarantee-trust-life',
  'CICA LIFE': 'cica-life',
  'AETNA ACCENDO CVS': 'aetna',
  AFLAC: 'aflac',
};
const SHARED = { 'family-benefit-life': 'fbl', 'trinity-life': 'fbl', aetna: 'aa', aflac: 'aa' };

// A question line: optional carrier label, optional "Part X", the number, a colon.
const HEADER = /^(?:(Family Benefit Life|Trinity Life|Guarantee Trust Life|CICA Life|Aetna Accendo CVS|AFLAC) )?(?:Part ([ABC]) ?)?(\d+[A-Z]?|[A-I](?:-\d)?): (.+)$/;
const CARRIER_LINE = /^CARRIER: ([^|]+?) \| (.+)$/;
const YES = /^IF YOU ANSWER "YES"$/;
const NO = /^IF YOU ANSWER "NO"$/;

// Outcome type from the outcome's first line (Randy's own wording decides it).
const KINDS = [
  [/^You do not qualify for /, 'not-eligible'],
  [/^First-day or graded coverage may be available\.$/, 'first-day-or-graded'],
  [/^Graded coverage may be available\.$/, 'graded-may-be-available'],
  [/^First-day or modified coverage may be available\.$/, 'first-day-or-modified'],
  [/^Modified coverage may be available\.$/, 'modified-may-be-available'],
  [/^FIRST-DAY COVERAGE:$/, 'first-day'],
  [/^GRADED COVERAGE:$/, 'graded-plan'],
  [/^Higher rates apply$/, 'tobacco-rates'],
  [/non-smoker" rates$/, 'non-smoker-rates'],
  [/^You will qualify for their Guaranteed Issue plan/, 'gi-plan'],
  [/first-day standard coverage\.$/, 'first-day-standard'],
  [/first-day preferred coverage\.$/, 'first-day-preferred'],
];

const lines = readFileSync(sourceFile, 'utf8').split(/\r?\n/).map((l) => l.trim());
const corrections = existsSync(join(sourceDir, 'corrections.json')) ? JSON.parse(readFileSync(join(sourceDir, 'corrections.json'), 'utf8')) : [];
const errors = [];
/** @type {any[]} */
const entries = [];
let cur = null;
let side = 'info';
lines.forEach((line, i) => {
  if (!line) return;
  const h = !CARRIER_LINE.test(line) && line.match(HEADER);
  if (h) {
    cur = { line: i + 1, part: h[2] ?? null, label: h[3], text: h[4], carrier: null, info: [], yes: [], no: [] };
    entries.push(cur);
    side = 'info';
    return;
  }
  const c = line.match(CARRIER_LINE);
  if (c) {
    if (/NO HEALTH QUESTIONS/.test(c[2])) { cur = null; return; } // Gerber: carrier configuration, not a question
    if (!cur) { errors.push(`line ${i + 1}: CARRIER line without a question`); return; }
    cur.carrier = CARRIERS[c[1]];
    if (!cur.carrier) errors.push(`line ${i + 1}: unknown carrier ${c[1]}`);
    return;
  }
  if (!cur) return;
  if (YES.test(line)) { side = 'yes'; return; }
  if (NO.test(line)) { side = 'no'; return; }
  cur[side].push(line);
});

/** @param {string[]} block @param {string} where */
function outcome(block, where) {
  if (!block.length) return null;
  const kind = KINDS.find(([re]) => re.test(block[0]))?.[1];
  if (!kind) errors.push(`${where}: unrecognized outcome "${block[0]}"`);
  return { classification: kind ?? 'unknown', explanation: block.join('\n') };
}

/** @type {Record<string, any[]>} */
const byCarrier = {};
for (const e of entries) {
  if (!e.carrier) { errors.push(`line ${e.line}: no CARRIER line`); continue; }
  const section = e.part ? `Part ${e.part}` : 'Health questions';
  const variant = /^[A-I]-\d$/.test(e.label) ? e.label : null;
  const number = variant ? variant.split('-')[0] : e.label;
  const id = `${e.carrier}-${e.part ?? 'Q'}-${e.label}`;
  const q = {
    id,
    section,
    number,
    variant,
    text: e.text,
    sharedKey: SHARED[e.carrier] ? `${e.part ?? 'Q'}-${e.label}` : null,
    ...(e.info.length ? { info: { classification: 'info', explanation: e.info.join('\n') } } : {}),
    yes: outcome(e.yes, `${id} yes`),
    no: outcome(e.no, `${id} no`),
    source: { document: sourceName, line: e.line },
  };
  if (q.yes?.classification === 'gi-plan') q.yes.rule = 'guaranteed-issue-referral';
  for (const fix of corrections.filter((/** @type {any} */ f) => f.id === id)) {
    const o = q[fix.side];
    if (!o || !o.explanation.includes(fix.from)) { errors.push(`${id}: correction "${fix.from}" not found`); continue; }
    o.explanation = o.explanation.replace(fix.from, fix.to);
    q.corrections = [...(q.corrections ?? []), { side: fix.side, from: fix.from, to: fix.to, reason: fix.reason }];
  }
  (byCarrier[e.carrier] ??= []).push(q);
}
for (const c of corrections) if (!entries.some((e) => `${e.carrier}-${e.part ?? 'Q'}-${e.label}` === c.id)) errors.push(`correction for unknown record ${c.id}`);

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
mkdirSync(join(privateDir, 'questions'), { recursive: true });
for (const [carrierId, questions] of Object.entries(byCarrier)) {
  writeFileSync(join(privateDir, 'questions', `${carrierId}.json`), JSON.stringify({
    carrierId,
    status: 'complete',
    source: `${sourceName} (Randy VanderVaate's question set, supplied in the Claude Code session)`,
    questions,
  }, null, 2) + '\n');
}
const counts = Object.entries(byCarrier).map(([c, q]) => `${c} ${q.length}`).join(', ');
console.log(`imported ${entries.length} records (${counts}); corrections applied: ${corrections.length}`);
