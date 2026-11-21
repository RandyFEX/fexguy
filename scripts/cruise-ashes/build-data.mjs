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
  // Version 1.6: recovered from the search engine's indexed copy of the official page.
  'carnival-cruise-line': 'Arranged with Guest Services on board; beyond 12 nautical miles from land and outside special areas; death certificate and proof of licensed cremation; biodegradability certificate if the urn is released.',
  'msc-cruises': 'Cruises of 6 nights or more with a sea day; at least 12 nautical miles; up to 10 guests; certified biodegradable urn; human ashes only; no fee.',
  'po-cruises-uk': 'Captain\u2019s approval before the cruise; sea day, at least 12 nautical miles, not the Norwegian Fjords; Certificate of Cremation; GBP 270 admin charge.',
  cunard: 'Captain\u2019s approval before the voyage; not on 5 nights or less; sea day, at least 12 nautical miles; container committed whole; paid package.',
};
// Version 1.7: the primary comparison for the lines with an established
// policy (wording from the research records' official answers only).
const COMPARE = {
  'royal-caribbean-international': { approval: 'Request by email (gfotravelservices@rccl.com); Front Desk on boarding sets the time and place', documents: 'Death certificate and cremation certificate; an urn biodegradability certificate may be required', restrictions: 'Biodegradable urn with no plastic or wire, released whole', fees: 'Not published' },
  'princess-cruises': { approval: 'Arranged and approved before sailing (ashesrequest@princesscruises.com)', documents: 'Not published', restrictions: 'Private shipboard ceremony', fees: 'Not published' },
  'virgin-voyages': { approval: 'Celebration of Life Request Form at least 14 days before sailing; approval with local port authorities', documents: 'Certificate of Biodegradability for the container', restrictions: 'Party size asked on the form; no single-use items such as balloons', fees: 'Not published' },
  'fred-olsen-cruise-lines': { approval: 'Notify Guest Services at least 7 days before the cruise; subject to the ship\u2019s management', documents: 'Biodegradability certificate if the container is released', restrictions: 'At least 12 nautical miles from land; sealed, leakproof container; biodegradable items only; attendance may be limited; not guaranteed', fees: 'Not published' },
  'marella-cruises': { approval: 'Contact TUI before travelling; arranged on board', documents: 'Copy of the death certificate', restrictions: 'International waters, at least 12 nautical miles from land, outside marine protected areas; sealed container that passes X-ray', fees: 'Not published' },
  'ambassador-cruise-line': { approval: 'Case by case, at the discretion of local port authorities; ask Guest Services early', documents: 'Not published', restrictions: 'Not published', fees: 'Not published' },
  crystal: { approval: 'Not offered from the ship; ask Onboard Guest Services about a private excursion', documents: 'Not published', restrictions: 'No burial at sea from the ship', fees: 'Not published' },
  'carnival-cruise-line': { approval: 'Contact the Guest Services Desk once on board', documents: 'Death certificate; proof of cremation at a licensed facility; biodegradability certificate if the urn is released', restrictions: 'Beyond 12 nautical miles from land and outside special areas; sealed, leak-proof urn; flowers bought on board; urn may not go ashore in port', fees: 'Not published' },
  'msc-cruises': { approval: 'Notify MSC or your travel agent before the cruise', documents: 'Urn maker\u2019s biodegradability certificate; MSC does not require a death certificate', restrictions: '6 nights or more with a sea day; at least 12 nautical miles; up to 10 guests; human ashes only; urn in carry-on luggage', fees: 'No fee' },
  'po-cruises-uk': { approval: 'Captain\u2019s approval before the cruise', documents: 'Certificate of Cremation; proof the container is biodegradable', restrictions: 'Sea day; at least 12 nautical miles; not the Norwegian Fjords; no pet ashes; minimum cruise length differs between P&O\u2019s own pages', fees: 'GBP 270 admin charge' },
  cunard: { approval: 'Captain\u2019s approval before the voyage', documents: 'Cremation certificate; supporting documentation for the biodegradable container', restrictions: 'Not on voyages of 5 nights or less; sea day; at least 12 nautical miles; container committed whole; no pet ashes', fees: 'Paid package; price not published' },
};
// Unverified lines: the official page where a contact was shown (from the
// record's officialContact; nothing invented). Pages marked "not opened" are skipped.
const contactUrl = (r) => {
  const c = r.officialContact ?? '';
  // Skipped: pages not opened, contacts not captured, and redirects to another company's site.
  if (/not opened|not captured|redirects/i.test(c)) return null;
  return c.match(/https?:\/\/[^\s)]+/)?.[0]?.replace(/[.,;]$/, '') ?? null;
};
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
      policyNote = r.evidenceMethod === 'search-index-of-official-page' ? 'indexed' : r.wordingConfirmed ? 'read' : 'read-paraphrase';
    } else if (UNREADABLE.has(r.id) || (twin && UNREADABLE.has(twin.id))) {
      restrictions = 'No published policy found. Parts of the official site could not be read.';
      detail = '#no-published-policy';
    } else {
      restrictions = 'No published policy found on the official site.';
      detail = '#no-published-policy';
    }
    if (r.status !== 'unverified' && !SUMMARY[r.id]) throw new Error(`${r.id}: status ${r.status} needs a summary line`);
    if (r.status !== 'unverified' && !r.wordingConfirmed && r.id !== 'marella-cruises' && r.evidenceMethod !== 'search-index-of-official-page')
      throw new Error(`${r.id}: established status without confirmed wording or an indexed official page`);
    if (r.status !== 'unverified' && !COMPARE[r.id]) throw new Error(`${r.id}: established status needs a comparison row`);
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
      compare: COMPARE[r.id] ?? null,
      contactUrl: r.status === 'unverified' ? contactUrl(r) ?? contactUrl(twin ?? {}) : null,
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
