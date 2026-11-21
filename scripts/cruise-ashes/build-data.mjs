// Builds src/data/cruise-ashes/operators.json from the research register in
// docs/investigations/cruise-ship-ashes-2026-11/research/operators-*.json
// (Version 1.3 preview). Only public fields: name, regions, status, the
// official policy link and verification date, and a short restrictions line.
// Forum, blog and search-summary sources never reach the page. Charter
// operators (notCruiseLine) are left out. Version 1.5 (Randy, November 2026):
// the public directory lists unique, currently operating operators only:
// reported-closed operators, non-specific grouped entries and duplicate
// records are left out (their research records are kept), operators split
// into two research records (ocean and river) are shown once, and each
// entry's check date comes from its own record (null when unsupported).
// Run: node scripts/cruise-ashes/build-data.mjs
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
// Left out of the public directory (research records kept):
const EXCLUDE = {
  'alaskan-dream-cruises': 'reported closed (February 2026, news reports)',
  'american-queen-voyages': 'reported closed (February 2024, news reports)',
  'yangtze-operators': 'non-specific grouped entry',
  'nile-cruise-operators': 'non-specific grouped entry',
  'japan-korea-coastal': 'non-specific grouped entry',
  'aman-and-other-yacht-lines': 'non-specific grouped entry',
  'carnival-australia': 'grouped entry for Carnival brands in Australia (Carnival Cruise Line is listed)',
  'viking-river-note': 'duplicate of the Viking entry',
};
// Operators with two research records (ocean and river): shown once, under the first id.
const MERGE = {
  'scenic-eclipse': { with: 'scenic-river', name: 'Scenic (ocean and river)', fleet: 'Ocean and river' },
  'emerald-cruises-yacht': { with: 'emerald-river', name: 'Emerald Cruises (yacht and river)', fleet: 'Yacht and river' },
  'nicko-cruises-ocean': { with: 'nicko-cruises', name: 'nicko cruises (ocean and river)', fleet: 'Ocean and river' },
  'grand-circle-oat-small-ships': { with: 'grand-circle-river', name: 'Grand Circle Cruise Line and Overseas Adventure Travel', fleet: 'River and small ship' },
};
const MERGED_AWAY = new Set(Object.values(MERGE).map((m) => m.with));
// A record supports the 2026-11-21 check date only if it was checked that day.
const CHECKED = new Set(['verified-direct', 'verified-via-fetch-tool-paraphrase', 'blocked-by-bot-protection', 'official-site-searched-nothing-found', 'verified-official', 'searched-no-official-policy', 'reclassified-unconfirmed-official-page']);
const checkedOn = (r) => (CHECKED.has(r.round3) || CHECKED.has(r.round2) ? '2026-11-21' : null);
// Official sites that blocked automated reading or rendered no text (gap-report.md section 3).
const UNREADABLE = new Set(['oceania-cruises', 'regent-seven-seas-cruises', 'four-seasons-yachts', 'aida-cruises', 'saga-cruises', 'aroya-cruises', 'resorts-world-cruises', 'hapag-lloyd-cruises', 'american-cruise-lines', 'aurora-expeditions', 'pearl-seas-cruises', 'swan-hellenic', 'star-clippers', 'coral-expeditions', 'avalon-waterways', 'captain-cook-cruises-australia', 'riviera-travel', 'amawaterways', 'croisieurope', 'aqua-expeditions', 'heritage-line']);
const FLEET = { ocean: 'Ocean', river: 'River', expedition: 'Expedition', coastal: 'Coastal', sailing: 'Sailing', yacht: 'Yacht' };

const dash = (s) => String(s ?? '').replace(/\u2014/g, ', ');
const ops = [];
const all = new Map(FILES.flatMap((f) => JSON.parse(readFileSync(join(RES, f), 'utf8'))).map((r) => [r.id, r]));
for (const id of [...Object.keys(EXCLUDE), ...MERGED_AWAY]) if (!all.has(id)) throw new Error(`unknown research id ${id}`);
for (const f of FILES) {
  for (const r of JSON.parse(readFileSync(join(RES, f), 'utf8'))) {
    if (r.notCruiseLine || EXCLUDE[r.id] || MERGED_AWAY.has(r.id)) continue;
    const merge = MERGE[r.id];
    const twin = merge ? all.get(merge.with) : null;
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
    } else if (UNREADABLE.has(r.id) || (twin && UNREADABLE.has(twin.id))) {
      restrictions = 'No published policy found. Parts of the official site could not be read.';
      detail = '#no-published-policy';
    } else {
      restrictions = 'No published policy found on the official site.';
      detail = '#no-published-policy';
    }
    if (r.status !== 'unverified' && !SUMMARY[r.id]) throw new Error(`${r.id}: status ${r.status} needs a summary line`);
    if (r.status !== 'unverified' && !r.wordingConfirmed && r.id !== 'marella-cruises') throw new Error(`${r.id}: permitted status without confirmed wording`);
    if (twin && twin.status !== 'unverified') throw new Error(`${r.id}: merged record ${twin.id} has its own status`);
    const verified = checkedOn(r) && (!twin || checkedOn(twin)) ? checkedOn(r) : null;
    ops.push({
      id: r.id,
      name: dash(merge?.name ?? r.name),
      fleet: merge?.fleet ?? FLEET[r.fleetType] ?? 'Other',
      regions: dash([...new Set([...(r.regions ?? []), ...(twin?.regions ?? [])])].join(', ')),
      status: r.status,
      policyUrl,
      policyNote,
      verified,
      restrictions: dash(restrictions),
      detail,
    });
  }
}
if (new Set(ops.map((o) => o.name)).size !== ops.length) throw new Error('duplicate operator names');
const ORDER = { 'officially-permitted': 0, 'conditionally-permitted': 1, 'not-permitted': 2, unverified: 3 };
ops.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, 'en'));
writeFileSync(OUT, JSON.stringify({ checked: '2026-11-21', operators: ops }, null, 2) + '\n');
const count = ops.reduce((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), {});
console.log(`${OUT}: ${ops.length} operators`, count);
