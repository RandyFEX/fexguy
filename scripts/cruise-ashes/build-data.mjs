// Builds src/data/cruise-ashes/operators.json from the research register in
// docs/investigations/cruise-ship-ashes-2026-11/research/operators-*.json
// (Version 1.3 preview). Only public fields: name, regions, status, the
// official policy link and verification date, and a short restrictions line.
// Forum, blog and search-summary sources never reach the page. Charter
// operators (notCruiseLine) are left out. Run: node scripts/cruise-ashes/build-data.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RES = 'docs/investigations/cruise-ship-ashes-2026-11/research';
const OUT = 'src/data/cruise-ashes/operators.json';
const FILES = ['operators-major.json', 'operators-international.json', 'operators-luxury.json', 'operators-expedition.json', 'operators-river-regional.json'];

// Short restriction lines for the lines whose policy we read (from the
// verified answers in the research records; wording kept to what the
// official page says).
const SUMMARY = {
  'royal-caribbean-international': 'Biodegradable urn with no plastic or wire, released whole; death and cremation certificates; request by email, then the Front Desk on board.',
  'princess-cruises': 'Private ceremony, arranged and approved before sailing.',
  'virgin-voyages': 'Request form at least 14 days before sailing; certificate of biodegradability; approval with local port authorities.',
  'fred-olsen-cruise-lines': 'Notify Guest Services at least 7 days before; sealed, leakproof container; at least 12 nautical miles from land; biodegradable items only; not guaranteed.',
  'marella-cruises': 'International waters, at least 12 nautical miles from land and outside protected areas; copy of the death certificate; sealed container that passes X-ray.',
  'ambassador-cruise-line': 'May be possible at the discretion of local port authorities; approval can take time.',
  crystal: 'No burial at sea from the ship; ashes may be spread on a private excursion.',
};
const UNCONFIRMED = new Set(['carnival-cruise-line', 'msc-cruises', 'po-cruises-uk', 'cunard']);
const CLOSED = { 'alaskan-dream-cruises': 'Reported to have ceased operations in February 2026.', 'american-queen-voyages': 'Reported to have ceased operations in February 2024.' };
const GROUPS = new Set(['yangtze-operators', 'nile-cruise-operators', 'japan-korea-coastal', 'aman-and-other-yacht-lines']);
// Official sites that blocked automated reading or rendered no text (gap-report.md section 3).
const UNREADABLE = new Set(['oceania-cruises', 'regent-seven-seas-cruises', 'four-seasons-yachts', 'aida-cruises', 'saga-cruises', 'aroya-cruises', 'resorts-world-cruises', 'hapag-lloyd-cruises', 'american-cruise-lines', 'aurora-expeditions', 'pearl-seas-cruises', 'swan-hellenic', 'star-clippers', 'coral-expeditions', 'avalon-waterways', 'captain-cook-cruises-australia', 'riviera-travel', 'amawaterways', 'croisieurope', 'aqua-expeditions', 'heritage-line']);
const NAMES = { 'viking-river-note': 'Viking River Cruises' };
const FLEET = { ocean: 'Ocean', river: 'River', expedition: 'Expedition', coastal: 'Coastal', sailing: 'Sailing', yacht: 'Yacht' };

const dash = (s) => String(s ?? '').replace(/\u2014/g, ', ');
const ops = [];
for (const f of FILES) {
  for (const r of JSON.parse(readFileSync(join(RES, f), 'utf8'))) {
    if (r.notCruiseLine) continue;
    const official = (r.sources ?? []).find((s) => /^official|passenger-contract/.test(s.type));
    let restrictions, detail, policyUrl = null, policyNote = null;
    if (SUMMARY[r.id]) {
      restrictions = SUMMARY[r.id];
      detail = `#op-${r.id}`;
      policyUrl = official?.url ?? null;
      policyNote = r.wordingConfirmed ? 'read' : 'read-paraphrase';
    } else if (UNCONFIRMED.has(r.id)) {
      restrictions = 'The line has a policy page, but it could not be read for this guide. Check it directly or ask the line.';
      detail = '#unconfirmed-lines';
      policyUrl = official?.url ?? null;
      policyNote = 'unreadable';
    } else if (CLOSED[r.id]) {
      restrictions = CLOSED[r.id];
      detail = '#no-published-policy';
    } else if (GROUPS.has(r.id)) {
      restrictions = 'Group of operators. No operator statement found.';
      detail = '#no-published-policy';
    } else if (r.id === 'viking-river-note') {
      restrictions = 'Covered by the Viking entry. No published policy found.';
      detail = '#no-published-policy';
    } else if (UNREADABLE.has(r.id)) {
      restrictions = 'No published policy found. Parts of the official site could not be read.';
      detail = '#no-published-policy';
    } else {
      restrictions = 'No published policy found on the official site.';
      detail = '#no-published-policy';
    }
    if (r.status !== 'unverified' && !SUMMARY[r.id]) throw new Error(`${r.id}: status ${r.status} needs a summary line`);
    if (r.status !== 'unverified' && !r.wordingConfirmed && r.id !== 'marella-cruises') throw new Error(`${r.id}: permitted status without confirmed wording`);
    ops.push({
      id: r.id,
      name: dash(NAMES[r.id] ?? r.name),
      fleet: FLEET[r.fleetType] ?? 'Other',
      regions: dash((r.regions ?? []).join(', ')),
      status: r.status,
      policyUrl,
      policyNote,
      verified: '2026-11-21',
      restrictions: dash(restrictions),
      detail,
    });
  }
}
if (ops.length !== 92) throw new Error(`expected 92 cruise operators, got ${ops.length}`);
const ORDER = { 'officially-permitted': 0, 'conditionally-permitted': 1, 'not-permitted': 2, unverified: 3 };
ops.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, 'en'));
writeFileSync(OUT, JSON.stringify({ checked: '2026-11-21', operators: ops }, null, 2) + '\n');
const count = ops.reduce((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
console.log(`${OUT}: ${ops.length} operators`, count);
