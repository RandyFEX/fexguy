// Rebuilds the /funeral-cost-map/ datasets in src/data/funeral-map/ from their
// public sources (Map V3.0, November 2026):
//   node scripts/funeral-map/build-data.mjs
// - BLS CPI series CUUR0000SEGD (funeral expenses), monthly, 2004 to now, via
//   the public API v1 (10 years per request; no key).
// - CDC/NCHS "Leading Causes of Death: United States" (data.cdc.gov bi63-dtpu).
// The state outlines (state-paths.json) come from us-atlas 3.0.1
// states-albers-10m (U.S. Census Bureau boundaries) and rarely need rebuilding.
import { writeFileSync } from 'node:fs';

const OUT = new URL('../../src/data/funeral-map/', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

async function cpi() {
  const now = new Date().getUTCFullYear();
  const monthly = {};
  const notes = [];
  for (let start = 2004; start <= now; start += 10) {
    const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesid: ['CUUR0000SEGD'], startyear: String(start), endyear: String(Math.min(start + 9, now)) }),
    });
    const body = await res.json();
    if (body.status !== 'REQUEST_SUCCEEDED') throw new Error(`BLS: ${body.status} ${body.message}`);
    for (const o of body.Results.series[0].data) {
      if (!/^M(0[1-9]|1[0-2])$/.test(o.period)) continue;
      const v = Number(o.value);
      if (!Number.isFinite(v)) { notes.push(`${o.periodName} ${o.year} was not published (BLS: ${o.footnotes?.[0]?.text ?? 'no value'}).`); continue; }
      (monthly[o.year] ??= {})[o.period] = v;
    }
  }
  const sorted = Object.fromEntries(Object.keys(monthly).sort().map((y) => [y, Object.fromEntries(Object.entries(monthly[y]).sort())]));
  writeFileSync(new URL('cpi-funeral.json', OUT), JSON.stringify({
    series: 'CUUR0000SEGD', title: 'Funeral expenses in U.S. city average, all urban consumers, not seasonally adjusted',
    base: 'Dec. 1986=100', source: 'U.S. Bureau of Labor Statistics, Consumer Price Index',
    sourceUrl: 'https://data.bls.gov/timeseries/CUUR0000SEGD', api: 'https://api.bls.gov/publicAPI/v1/timeseries/data/',
    retrieved: today, geography: 'United States (national only; BLS publishes no state funeral index)', notes, monthly: sorted,
  }, null, 0));
}

async function mortality() {
  const rows = await (await fetch('https://data.cdc.gov/resource/bi63-dtpu.json?$limit=50000')).json();
  const states = {};
  for (const r of rows) ((states[r.state] ??= {})[r.year] ??= {})[r.cause_name] = [Number(r.deaths), Number(r.aadr)];
  const years = rows.map((r) => Number(r.year));
  writeFileSync(new URL('leading-causes.json', OUT), JSON.stringify({
    dataset: 'NCHS - Leading Causes of Death: United States', id: 'bi63-dtpu',
    source: 'Centers for Disease Control and Prevention, National Center for Health Statistics',
    sourceUrl: 'https://data.cdc.gov/NCHS/NCHS-Leading-Causes-of-Death-United-States/bi63-dtpu',
    retrieved: today, years: [Math.min(...years), Math.max(...years)],
    measures: 'deaths (number) and aadr (age-adjusted death rate per 100,000 population, 2000 U.S. standard population)',
    scope: 'All ages, both sexes combined; 10 leading causes plus all causes; resident deaths by state',
    causes: [...new Set(rows.map((r) => r.cause_name))].filter((c) => c !== 'All causes').sort(), states,
  }));
}

await cpi();
await mortality();
console.log('funeral-map data rebuilt', today);
