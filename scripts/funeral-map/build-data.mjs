// Rebuilds the /funeral-cost-map/ datasets in src/data/funeral-map/ from their
// public sources (Map V3.0, November 2026):
//   node scripts/funeral-map/build-data.mjs
// - BLS CPI series CUUR0000SEGD (funeral expenses), monthly, 2004 to now, via
//   the public API v1 (10 years per request; no key).
// - CDC/NCHS "Leading Causes of Death: United States" (data.cdc.gov bi63-dtpu).
// - CDC/NCHS quarterly provisional death rates (489q-934x) and provisional
//   deaths by sex and age (9bhg-hcku, year 2022) -> mortality-recent.json.
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

async function recentMortality() {
  const LEADING = ['Heart disease', 'Cancer', 'Unintentional injuries', 'Stroke', 'Chronic lower respiratory diseases', 'Alzheimer disease', 'Diabetes', 'Kidney disease', 'Chronic liver disease and cirrhosis', 'COVID-19', 'Influenza and pneumonia', 'Suicide', 'Hypertension', 'Parkinson disease', 'Pneumonitis due to solids and liquids'];
  const OTHER = ['Drug overdose', 'Firearm-related injury', 'Homicide', 'Falls, ages 65 and over', 'HIV disease'];
  const CAUSES = new Set(['All causes', ...LEADING, ...OTHER]);
  const rows = (await (await fetch('https://data.cdc.gov/resource/489q-934x.json?$limit=50000')).json()).filter((r) => r.time_period.startsWith('12 months') && CAUSES.has(r.cause_of_death));
  const quarters = [...new Set(rows.map((r) => r.year_and_quarter))].sort();
  const latest = quarters.at(-1);
  const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const stateName = (k) => k.slice(5).split('_').map((w) => (w === 'of' ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
  const skip = new Set(['rate_type', 'rate_overall', 'rate_sex_female', 'rate_sex_male', 'rate_65_74']);
  const rates = {};
  const us = {};
  for (const r of rows) {
    const c = r.cause_of_death;
    if (r.rate_type === 'Age-adjusted') {
      for (const k of Object.keys(r)) {
        if (!k.startsWith('rate_') || skip.has(k) && k !== 'rate_overall' || k.startsWith('rate_age')) continue;
        const st = k === 'rate_overall' ? 'United States' : stateName(k);
        ((rates[st] ??= {})[c] ??= Array(quarters.length).fill(null))[quarters.indexOf(r.year_and_quarter)] = num(r[k]);
      }
      if (r.year_and_quarter === latest) Object.assign((us[c] ??= {}), { female: num(r.rate_sex_female), male: num(r.rate_sex_male) });
    } else if (r.year_and_quarter === latest) {
      (us[c] ??= {}).ages = { '45-54': num(r.rate_age_45_54), '55-64': num(r.rate_age_55_64), '65-74': num(r.rate_65_74), '75-84': num(r.rate_age_75_84), '85+': num(r.rate_age_85_plus) };
    }
  }
  const sa = await (await fetch('https://data.cdc.gov/resource/9bhg-hcku.json?$limit=200000&year=2022')).json();
  const AG = { '45-54 years': '45-54', '55-64 years': '55-64', '65-74 years': '65-74', '75-84 years': '75-84', '85 years and over': '85+', 'All Ages': 'All Ages' };
  const deaths = {};
  for (const r of sa) {
    if (r.group !== 'By Year' || !AG[r.age_group]) continue;
    ((deaths[r.state] ??= {})[r.sex] ??= {})[AG[r.age_group]] = num(r.total_deaths);
  }
  // NCHS reports New York City separately from the rest of New York State.
  const nyc = deaths['New York City'];
  for (const sex of Object.keys(deaths['New York'] ?? {})) for (const a of Object.keys(deaths['New York'][sex])) {
    const x = deaths['New York'][sex][a], y = nyc?.[sex]?.[a];
    deaths['New York'][sex][a] = x != null && y != null ? x + y : null;
  }
  delete deaths['New York City'];
  delete deaths['Puerto Rico'];
  // 2022 deaths by cause, by state of occurrence (weekly provisional counts; a
  // total is left out when any week was suppressed). New York adds New York City.
  const COLS = { all_cause: 'All causes', diseases_of_heart_i00_i09: 'Heart disease', malignant_neoplasms_c00_c97: 'Cancer', cerebrovascular_diseases: 'Stroke', chronic_lower_respiratory: 'Chronic lower respiratory diseases', alzheimer_disease_g30: 'Alzheimer disease', diabetes_mellitus_e10_e14: 'Diabetes', influenza_and_pneumonia_j09_j18: 'Influenza and pneumonia', nephritis_nephrotic_syndrome: 'Kidney disease', covid_19_u071_underlying_cause_of_death: 'COVID-19' };
  const wk = await (await fetch('https://data.cdc.gov/resource/muzy-jte6.json?$limit=50000&mmwryear=2022')).json();
  const counts = {};
  for (const r of wk) {
    const c = (counts[r.jurisdiction_of_occurrence] ??= {});
    for (const [k, name] of Object.entries(COLS)) {
      const v = r[k];
      if (v == null || v === '') c[name] = null;
      else if (c[name] !== null) c[name] = (c[name] ?? 0) + Number(v);
    }
  }
  for (const name of Object.values(COLS)) {
    const a = counts['New York']?.[name], b = counts['New York City']?.[name];
    if (counts['New York']) counts['New York'][name] = a != null && b != null ? a + b : null;
  }
  delete counts['New York City'];
  delete counts['Puerto Rico'];
  writeFileSync(new URL('mortality-recent.json', OUT), JSON.stringify({
    dataset: 'NCHS - VSRR Quarterly provisional estimates for selected indicators of mortality', id: '489q-934x',
    source: 'Centers for Disease Control and Prevention, National Center for Health Statistics (Vital Statistics Rapid Release)',
    sourceUrl: 'https://data.cdc.gov/NCHS/NCHS-VSRR-Quarterly-provisional-estimates-for-sele/489q-934x', retrieved: today,
    status: 'Provisional', period: '12 months ending with quarter', latest, quarters,
    measure: 'Age-adjusted death rate per 100,000 (2000 U.S. standard population); U.S. age-group rates are age-specific (crude) rates',
    leading: LEADING, other: OTHER, rates, us,
    counts2022: { dataset: 'Weekly Provisional Counts of Deaths by State and Select Causes, 2020-2023', id: 'muzy-jte6', sourceUrl: 'https://data.cdc.gov/NCHS/Weekly-Provisional-Counts-of-Deaths-by-State-and-S/muzy-jte6', status: 'Provisional (data as of September 27, 2023)', year: 2022, note: 'Deaths in 2022 by state where the death occurred (not state of residence), summed from MMWR weeks of 2022. Natural causes only. A total is not shown when CDC suppressed any week (1 to 9 deaths). New York includes New York City.', data: counts },
    deaths2022: { dataset: 'Provisional COVID-19 Deaths by Sex and Age', id: '9bhg-hcku', sourceUrl: 'https://data.cdc.gov/NCHS/Provisional-COVID-19-Deaths-by-Sex-and-Age/9bhg-hcku', status: 'Provisional (data as of September 27, 2023)', year: 2022, measure: 'Deaths from all causes', note: 'New York includes New York City (reported separately by NCHS and added here).', data: deaths },
  }));
}

await cpi();
await mortality();
await recentMortality();
console.log('funeral-map data rebuilt', today);
