// Builds src/data/appalachian-trail/at-map.json: the shared locator map for
// the Appalachian Trail guide (preview).
//   node scripts/appalachian-trail/build-map.mjs [page.geojson ...]
// With file arguments it reads saved query pages (the same query URL, e.g.
// fetched with curl where Node cannot reach the service) instead of fetching.
// Sources:
// - Trail: "Appalachian National Scenic Trail - Official Centerline -
//   03-15-2023" (National Park Service Appalachian National Scenic Trail &
//   Appalachian Trail Conservancy), NPS ArcGIS feature service ANST_Centerline,
//   generalized by the service (maxAllowableOffset) and projected here.
// - States: src/data/funeral-map/state-paths.json (us-atlas 3.0.1
//   states-albers-10m, U.S. Census Bureau boundaries, ISC license), already
//   projected with d3 geoAlbersUsa().scale(1300).translate([487.5, 305]).
// The trail is projected with the same Albers equal-area conic (lower 48
// parameters of geoAlbersUsa), checked against d3-geo to 1e-9 units, so it
// sits exactly on the Census state outlines. Nothing is drawn by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { project } from '../../src/data/appalachian-trail/projection.mjs';

const root = new URL('../../', import.meta.url);
const SERVICE = 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/ANST_Centerline/FeatureServer/0/query';

const lines = [];
const files = process.argv.slice(2);
const addPage = (fc) => {
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    for (const l of g.type === 'MultiLineString' ? g.coordinates : [g.coordinates]) lines.push(l);
  }
};
for (const f of files) addPage(JSON.parse(readFileSync(f, 'utf8')));
for (let offset = 0; !files.length; offset += 2000) {
  const url = `${SERVICE}?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&maxAllowableOffset=0.01&resultOffset=${offset}&resultRecordCount=2000&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ANST_Centerline: HTTP ${res.status}`);
  const fc = await res.json();
  addPage(fc);
  if (fc.features.length < 2000) break;
}
if (lines.length < 1000) throw new Error(`ANST_Centerline: only ${lines.length} lines`);

// Project, round to 0.1 unit and drop repeated points.
const r = (v) => Math.round(v * 10) / 10;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const parts = [];
for (const l of lines) {
  const pts = [];
  for (const [lon, lat] of l) {
    const [x, y] = project(lon, lat).map(r);
    const last = pts[pts.length - 1];
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (pts.length > 1) parts.push('M' + pts.map((p) => p.join(',')).join('L'));
}

// The frame: the whole trail with room for the state labels and callouts.
const pad = { left: 70, right: 125, top: 22, bottom: 30 };
const box = [Math.floor(minX - pad.left), Math.floor(minY - pad.top), Math.ceil(maxX - minX + pad.left + pad.right), Math.ceil(maxY - minY + pad.top + pad.bottom)];

const AT_STATES = { '13': 'GA', '37': 'NC', '47': 'TN', '51': 'VA', '54': 'WV', '24': 'MD', '42': 'PA', '34': 'NJ', '36': 'NY', '09': 'CT', '25': 'MA', '50': 'VT', '33': 'NH', '23': 'ME' };
// Label anchors (longitude, latitude) chosen inside each state, clear of the trail line.
const LABELS = {
  GA: [-83.3, 33.95], NC: [-80.4, 35.7], TN: [-85.0, 35.9], VA: [-78.6, 37.4], WV: [-80.6, 38.65], MD: [-76.85, 39.25],
  PA: [-77.6, 40.95], NJ: [-74.45, 40.35], NY: [-75.4, 42.75], CT: [-72.65, 41.6], MA: [-71.85, 42.4], VT: [-72.75, 44.5],
  NH: [-71.45, 43.55], ME: [-68.35, 44.95],
};
const states = JSON.parse(readFileSync(new URL('src/data/funeral-map/state-paths.json', root), 'utf8'));
// Keep the states whose outline touches the frame (cheap bounding-box test on the path numbers).
const inFrame = (d) => {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x >= box[0] && x <= box[0] + box[2] && y >= box[1] && y <= box[1] + box[3]) return true;
  }
  return false;
};
const out = {
  source: {
    trail: 'Appalachian National Scenic Trail - Official Centerline - 03-15-2023, National Park Service Appalachian National Scenic Trail & Appalachian Trail Conservancy (NPS ArcGIS feature service ANST_Centerline)',
    trailUrl: 'https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/ANST_Centerline/FeatureServer/0',
    states: states.source,
    projection: 'Albers equal-area conic, d3 geoAlbersUsa lower-48 parameters, scale 1300, translate [487.5, 305]',
    retrieved: new Date().toISOString().slice(0, 10),
  },
  viewBox: box,
  trail: parts.join(''),
  states: states.states
    .filter((s) => AT_STATES[s.fips] || inFrame(s.d))
    .map((s) => ({ fips: s.fips, name: s.name, abbr: AT_STATES[s.fips] ?? null, d: s.d, label: AT_STATES[s.fips] ? project(...LABELS[AT_STATES[s.fips]]).map(r) : null })),
};
writeFileSync(new URL('src/data/appalachian-trail/at-map.json', root), JSON.stringify(out));
console.log(`at-map: ${lines.length} centerline lines, ${parts.length} parts, ${out.states.length} states, viewBox ${box.join(' ')}, ${Math.round(JSON.stringify(out).length / 1024)} KB`);
