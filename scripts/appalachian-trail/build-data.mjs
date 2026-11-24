// Builds src/data/appalachian-trail/destinations.json for the Appalachian Trail
// ash-scattering guide (preview) from the research package in
// docs/investigations/appalachian-trail-2026-11/:
//   A-master-research-dataset.csv  destinations (only publish = YES rows)
//   B-editorial-article.md         state introductions and destination text
//   C-photography-manifest.csv     photo rights (only APPROVED rows)
// Usage: node scripts/appalachian-trail/build-data.mjs
// The script copies wording exactly; it refuses rows with missing required
// fields, coordinates without a source, and any em dash.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const docs = path.join(root, 'docs/investigations/appalachian-trail-2026-11');
const out = path.join(root, 'src/data/appalachian-trail/destinations.json');

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const fail = (msg) => { console.error(`build-data: ${msg}`); process.exit(1); };

const A = parseCsv(readFileSync(path.join(docs, 'A-master-research-dataset.csv'), 'utf8'));
const C = parseCsv(readFileSync(path.join(docs, 'C-photography-manifest.csv'), 'utf8'));
const B = readFileSync(path.join(docs, 'B-editorial-article.md'), 'utf8');

// ---- Article: H2 state sections, H3 destinations ----
const STATE_HEADINGS = {
  Georgia: 'Georgia',
  'North Carolina': 'North Carolina',
  Tennessee: 'Tennessee and the Great Smoky Mountains',
  Virginia: 'Virginia',
  'West Virginia': 'West Virginia: Harpers Ferry',
  Maryland: 'Maryland',
  Pennsylvania: 'Pennsylvania',
  'New Jersey': 'New Jersey',
  'New York': 'New York',
  Connecticut: 'Connecticut',
  Massachusetts: 'Massachusetts',
  Vermont: 'Vermont',
  'New Hampshire': 'New Hampshire',
  Maine: 'Maine',
};
// Dataset id -> article H3 heading.
const ARTICLE_HEADING = {
  'ge-springer-mountain': 'Springer Mountain',
  'ge-blood-mountain-via-byron-reece-trail': 'Blood Mountain via the Byron Reece Trail',
  'ge-long-creek-falls-from-three-forks': 'Long Creek Falls from Three Forks',
  'no-max-patch': 'Max Patch',
  'no-wayah-bald-lookout-tower': 'Wayah Bald Lookout Tower',
  'no-lover-s-leap-hot-springs': "Lover's Leap at Hot Springs",
  'te-kuwohi-formerly-clingmans-dome': 'Kuwohi (formerly Clingmans Dome)',
  'te-charlies-bunion': 'Charlies Bunion',
  'te-round-bald-and-jane-bald-from-carvers-gap': 'Round Bald and Jane Bald from Carvers Gap',
  'te-laurel-fork-gorge-and-falls': 'Laurel Fork Gorge and Falls',
  'vi-blackrock-shenandoah': 'Blackrock (Shenandoah)',
  'vi-bear-den-mountain-shenandoah': 'Bear Den Mountain (Shenandoah)',
  'vi-compton-peak-shenandoah': 'Compton Peak (Shenandoah)',
  'vi-thunder-ridge-overlook-blue-ridge-parkway': 'Thunder Ridge Overlook (Blue Ridge Parkway)',
  'vi-mcafee-knob': 'McAfee Knob',
  'vi-grayson-highlands-and-rhododendron-gap': 'Grayson Highlands and Rhododendron Gap',
  'we-harpers-ferry-lower-town-and-the-point': 'Harpers Ferry Lower Town and the Point',
  'we-jefferson-rock-harpers-ferry': 'Jefferson Rock',
  'ma-weverton-cliffs': 'Weverton Cliffs',
  'ma-washington-monument-state-park': 'Washington Monument State Park',
  'ma-gathland-state-park-at-crampton-gap': 'Gathland State Park at Crampton Gap',
  'pe-bake-oven-knob': 'Bake Oven Knob',
  'ne-sunfish-pond': 'Sunfish Pond',
  'ne-high-point-monument': 'High Point Monument',
  'ne-pochuck-boardwalk': 'Pochuck Boardwalk',
  'ne-bear-mountain-summit-perkins-memorial-drive': 'Bear Mountain',
  'ma-mount-greylock-summit': 'Mount Greylock',
  've-thundering-falls': 'Thundering Falls',
  'ne-franconia-ridge': 'Franconia Ridge',
  'ma-katahdin-via-the-hunt-trail': 'Katahdin via the Hunt Trail',
  'ma-little-and-big-niagara-falls': 'Little and Big Niagara Falls',
};

const lines = B.split('\n');
function section(level, heading) {
  const mark = '#'.repeat(level) + ' ';
  const start = lines.findIndex((l) => l === mark + heading);
  if (start < 0) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3} /.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
// Plain text from the article's light Markdown (bold, italics, links).
const plain = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^\*(.+)\*$/, '$1').trim();
const paragraphs = (ps) => ps.filter((p) => !/^\*\*.+ · .+\*\*$/.test(p)).map(plain);

const intro = {
  lead: paragraphs(section(2, 'Why the Appalachian Trail') ?? []),
  rules: paragraphs(section(2, 'Before you go: how scattering rules work on the Trail') ?? []),
  classifications: (section(3, 'The four classifications in this guide') ?? []).flatMap((p) => p.split('\n')).map((l) => l.replace(/^- /, '')).map(plain),
  remembrance: paragraphs(section(3, 'Remembrance places and scattering places') ?? []),
  npsRules: (section(3, 'What the National Park Service rules ask of you') ?? []).flatMap((p) => p.split('\n')).map((l) => l.replace(/^- /, '')).map(plain),
  leaveNoTrace: paragraphs(section(3, 'Leave no trace') ?? []),
  planning: (section(2, 'Planning the day') ?? []).flatMap((p) => p.split('\n')).map((l) => l.replace(/^- /, '')).map(plain),
  finalWord: paragraphs(section(2, 'A final word') ?? []),
  quickAnswer: paragraphs(section(2, 'Quick answer') ?? []),
};
for (const [k, v] of Object.entries(intro)) if (!v.length) fail(`article section missing: ${k}`);

// ---- Photos (APPROVED only, first approved row per destination) ----
const photos = {};
for (const r of C) {
  if (r.status !== 'APPROVED' || !r.dataset_id) continue;
  (photos[r.dataset_id] ??= []).push(r);
}

// ---- Destinations ----
const DIFF = { 1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Challenging', 5: 'Strenuous' };
const CLASS = {
  PERMITTED: 'permitted',
  'PERMIT OR PERMISSION REQUIRED': 'permit-required',
  PROHIBITED: 'prohibited',
  UNCONFIRMED: 'unconfirmed',
};
const NE = (v) => (!v || /^not established/i.test(v) ? null : v);
const splitLinks = (s) => s.split(' ; ').map((u) => u.trim()).filter((u) => /^https:\/\//.test(u));
const ORDER = Object.keys(STATE_HEADINGS);

const rows = A.filter((r) => r.publish === 'YES');

// ---- Follow-up research (November 24, 2026): route facts, mapped GPS points
// and scattering-rule findings, each with its source and evidence label. ----
const UPDATES_FILE = path.join(docs, 'updates-2026-11-24.json');
const UPDATES = existsSync(UPDATES_FILE) ? JSON.parse(readFileSync(UPDATES_FILE, 'utf8')).destinations : {};
const LEVEL = [[/easiest|very easy/i, 1], [/very strenuous|strenuous|very difficult/i, 5], [/difficult|challenging|hard/i, 4], [/moderate/i, 3], [/easy/i, 2]];
const EVIDENCE_WORDS = (e) =>
  e
    .split(/ and (?=OFFICIAL|SECONDARY)/)
    .map((x) =>
      /^OFFICIAL \(fetched\)/.test(x) ? 'official website' : /^OFFICIAL/.test(x) ? 'official source, via search summary' : /^SECONDARY/.test(x) ? 'secondary source' : x,
    )
    .join('; ');
const srcText = (f) => [f.source, f.evidence && `[${EVIDENCE_WORDS(f.evidence)}]`].filter(Boolean).join(' ');
function applyUpdates(d) {
  const u = UPDATES[d.id];
  if (!u) return d;
  if (u.distance) { d.distance = Number(u.distance.miles); d.distanceSource = srcText(u.distance); }
  if (u.elevationGainFt) { d.elevation = Number(u.elevationGainFt.value); d.elevationSource = srcText(u.elevationGainFt); }
  if (u.time) { d.time = u.time.text; d.timeSource = srcText(u.time); }
  if (u.difficulty) {
    const lvl = LEVEL.find(([re]) => re.test(u.difficulty.text))?.[1];
    if (!lvl) fail(`${d.id}: difficulty "${u.difficulty.text}" not on the scale`);
    d.difficulty = lvl; d.difficultyWord = DIFF[lvl]; d.difficultySource = `${u.difficulty.text}: ${srcText(u.difficulty)}`;
  }
  if (u.parking) d.parking = { text: u.parking.text, source: srcText(u.parking) };
  for (const l of u.mapLinks ?? []) if (!d.links.some((x) => x.url === l.url)) d.links.push({ url: l.url, label: l.label });
  const mapped = [];
  for (const role of ['trailhead', 'destination']) {
    const pt = u[role];
    if (!pt) continue;
    if (!Number.isFinite(pt.lat) || !Number.isFinite(pt.lon) || !pt.source) fail(`${d.id}: bad ${role} point`);
    if (d.points.some((x) => x.role === role)) continue; // an official point wins
    mapped.push({ kind: /NPS/.test(pt.source) ? 'official' : 'osm', role, label: pt.label, lat: pt.lat, lon: pt.lon, source: pt.source });
  }
  d.points.push(...mapped);
  // ATC map points stay only where no trailhead or destination point exists.
  if (d.points.some((x) => x.role !== 'atc')) d.points = d.points.filter((x) => x.role !== 'atc');
  if (u.policy) {
    const p = u.policy;
    const cls = CLASS[p.classification];
    if (!cls) fail(`${d.id}: unknown classification ${p.classification}`);
    d.scatter = {
      classification: cls,
      remembranceOnly: p.remembranceOnly ?? (cls === 'unconfirmed' || cls === 'prohibited'),
      remembranceNote: p.remembranceNote ?? null,
      alternative: p.alternative ?? d.scatter.alternative,
      conditions: p.conditions,
      contact: p.contact ?? d.scatter.contact,
      sourceUrls: p.sourceLinks?.length ? p.sourceLinks : d.scatter.sourceUrls,
      evidence: p.evidence,
    };
    if (p.landManager) d.landManager = p.landManager;
  }
  return d;
}
const destinations = rows.map((r) => {
  for (const f of ['id', 'state', 'name', 'category', 'land_manager', 'scattering_classification', 'scattering_conditions']) {
    if (!r[f]) fail(`${r.id || r.name}: missing ${f}`);
  }
  const cls = CLASS[r.scattering_classification];
  if (!cls) fail(`${r.id}: unknown classification ${r.scattering_classification}`);
  const heading = ARTICLE_HEADING[r.id];
  const text = heading && section(3, heading);
  if (!text) fail(`${r.id}: no article section "${heading}"`);
  // Difficulty: only a rating the sources state, never an editorial one.
  const diffSrc = r.difficulty_source || '';
  const diff = r.difficulty_level && !/editorial|not established|not stated/i.test(diffSrc) ? Number(r.difficulty_level) : null;
  const points = [];
  if (r.parking_lat && r.parking_lon) {
    if (!NE(r.parking_point_source)) fail(`${r.id}: parking point without a source`);
    points.push({ kind: 'official', role: 'trailhead', label: 'Kuwohi parking area', lat: Number(r.parking_lat), lon: Number(r.parking_lon), source: r.parking_point_source });
  }
  if (r.destination_lat && r.destination_lon) fail(`${r.id}: destination coordinates are not expected in this dataset`);
  if (r.atc_map_lat && r.atc_map_lon) {
    if (!r.atc_map_point_role) fail(`${r.id}: ATC map point without a role note`);
    points.push({ kind: 'atc', role: 'atc', label: 'ATC map point', lat: Number(r.atc_map_lat), lon: Number(r.atc_map_lon), source: r.atc_map_point_role });
  }
  for (const p of points) if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) fail(`${r.id}: bad coordinate`);
  const ph = (photos[r.id] ?? []).map((p) => ({
    sourceUrl: p.source_page_url,
    fileUrl: p.image_file_url,
    credit: p.photographer,
    license: p.license,
    licenseUrl: p.license_url,
    attribution: p.attribution_required,
    depicts: p.depicts,
  }));
  const alt = r.authorized_scattering_alternative || null;
  return {
    id: r.id,
    state: r.state,
    stateOrder: ORDER.indexOf(r.state) + 1,
    name: heading,
    datasetName: r.name,
    category: r.category.toLowerCase(),
    onAT: NE(r.on_at),
    landManager: r.land_manager,
    landManagerEvidence: r.land_manager_evidence,
    distance: r.round_trip_miles ? Number(r.round_trip_miles) : null,
    distanceSource: r.distance_source,
    elevation: r.elevation_gain_ft !== '' ? Number(r.elevation_gain_ft) : null,
    elevationSource: r.elevation_source,
    time: NE(r.estimated_time),
    difficulty: diff,
    difficultyWord: diff ? DIFF[diff] : null,
    difficultySource: diff ? diffSrc : null,
    terrain: NE(r.terrain),
    accessibility: NE(r.accessibility),
    seasonal: NE(r.seasonal_notes),
    nearestTown: NE(r.nearest_town),
    scatter: {
      classification: cls,
      remembranceOnly: /^YES/.test(r.remembrance_only),
      remembranceNote: /^YES/.test(r.remembrance_only) ? r.remembrance_only.replace(/^YES\s*/, '').replace(/^\((.*)\)$/, '$1') || null : null,
      alternative: alt,
      conditions: r.scattering_conditions,
      contact: NE(r.scattering_contact),
      sourceUrls: splitLinks(r.scattering_source_url).map((url) => ({ url })),
      evidence: r.scattering_evidence,
    },
    points,
    photo: ph[0] ?? null,
    photos: ph,
    links: splitLinks(r.official_links).map((url) => ({ url })),
    parking: null,
    verification: r.verification,
    description: paragraphs(text),
  };
}).map(applyUpdates);

const states = ORDER.map((s, i) => ({
  state: s,
  order: i + 1,
  heading: STATE_HEADINGS[s],
  intro: paragraphs(section(2, STATE_HEADINGS[s]) ?? []),
  held: (section(2, STATE_HEADINGS[s]) ?? []).filter((p) => /^\*.+\*$/.test(p)).map(plain),
  count: destinations.filter((d) => d.state === s).length,
}));
for (const s of states) if (!s.intro.length && !s.count) fail(`${s.state}: no article text`);

const data = { generated: 'from docs/investigations/appalachian-trail-2026-11 (A, B, C)', intro, states, destinations };
const json = JSON.stringify(data, null, 2) + '\n';
if (/—|&mdash;|&#8212;/.test(json)) fail('em dash in output');
if (destinations.length !== rows.length) fail('count mismatch');
writeFileSync(out, json);
console.log(`build-data: ${destinations.length} destinations, ${destinations.filter((d) => d.photo).length} with an approved photo -> ${path.relative(root, out)}`);
if (!existsSync(out)) fail('not written');
