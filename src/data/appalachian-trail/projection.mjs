// Albers equal-area conic with d3 geoAlbersUsa's lower-48 parameters
// (parallels 29.5 and 45.5, rotate [96, 0], center [-0.6, 38.7]) at
// scale 1300 and translate [487.5, 305]: the projection of us-atlas
// states-albers-10m, so points land on src/data/funeral-map/state-paths.json.
// Checked against d3-geo to 1e-9 units (November 2026).
const R = Math.PI / 180;
const s0 = Math.sin(29.5 * R);
const n = (s0 + Math.sin(45.5 * R)) / 2;
const C = 1 + s0 * (2 * n - s0);
const r0 = Math.sqrt(C) / n;
const raw = (l, f) => {
  const r = Math.sqrt(C - 2 * n * Math.sin(f)) / n;
  return [r * Math.sin(l * n), r0 - r * Math.cos(l * n)];
};
const [cx, cy] = raw(-0.6 * R, 38.7 * R);
/** @param {number} lon @param {number} lat @returns {[number, number]} */
export function project(lon, lat) {
  const [x, y] = raw((lon + 96) * R, lat * R);
  return [487.5 + 1300 * (x - cx), 305 - 1300 * (y - cy)];
}
