// /funeral-cost-map/ interactions (Randy, November 2026, Map V3.0/V3.1). All
// data is static (src/data/funeral-map/); nothing is sent anywhere. Dollar
// amounts are calculated only from the price the visitor enters.
import mortality from '@/data/funeral-map/leading-causes.json';
import cpi from '@/data/funeral-map/cpi-funeral.json';
import recent from '@/data/funeral-map/mortality-recent.json';
import nfda from '@/data/funeral-map/nfda-prices.json';
import directCremation from '@/data/funeral-map/direct-cremation.json';
import lifeExp from '@/data/funeral-map/life-expectancy.json';
import survival from '@/data/funeral-map/survival.json';
import health from '@/data/funeral-map/health-conditions.json';
import statePaths from '@/data/funeral-map/state-paths.json';
import { ABBR_BY_FIPS } from '@/lib/funeral-map/state-abbr';
import { lead } from '@/config/lead';

type Row = [number, number];
type YearData = Record<string, Row>;
const FINAL = mortality.states as unknown as Record<string, Record<string, YearData>>;
const FINAL_LATEST = String(mortality.years[1]);
const FINAL_FIRST = mortality.years[0];
const RATES = recent.rates as Record<string, Record<string, (number | null)[]>>;
const Q = recent.quarters;
const QI = Q.length - 1;
const LEADING = recent.leading;
const US_DEMO = recent.us as Record<string, { female?: number | null; male?: number | null; ages?: Record<string, number | null> }>;
const DEATHS = recent.deaths2022.data as Record<string, Record<string, Record<string, number | null>>>;
const COUNTS = recent.counts2022.data as Record<string, Record<string, number | null>>;
// Final (1999-2017) cause names that differ from the provisional dataset's.
const FINAL_NAME: Record<string, string> = { 'Alzheimer disease': "Alzheimer's disease", 'Chronic lower respiratory diseases': 'CLRD' };
const US = 'United States';
const monthly = cpi.monthly as Record<string, Record<string, number>>;

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];
const root = $<HTMLElement>('.fcm');

const num = (n: number) => n.toLocaleString('en-US');
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
const parseMoney = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// --- CPI: latest published month and the same month 5-20 years earlier -----
const years = Object.keys(monthly).sort();
const lastYear = Number(years[years.length - 1]);
const lastMonth = Object.keys(monthly[String(lastYear)]).sort().pop()!;
const idx = (y: number) => monthly[String(y)]?.[lastMonth];
const current = idx(lastYear)!;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = MONTHS[Number(lastMonth.slice(1)) - 1];
const BACK = [5, 10, 15, 20].map((n) => ({ n, year: lastYear - n, value: idx(lastYear - n) })).filter((b) => b.value);
const twenty = BACK.find((b) => b.n === 20);
const DEFAULT_RATE = twenty ? Math.pow(current / twenty.value!, 1 / 20) - 1 : null;

// Each cause's latest published quarter (injury causes lag a quarter or more).
const latestIdx = (cause: string) => {
  const us = RATES[US]?.[cause] ?? [];
  for (let i = us.length - 1; i >= 0; i--) if (us[i] != null) return i;
  return QI;
};
const QEND: Record<string, string> = { Q1: 'March', Q2: 'June', Q3: 'September', Q4: 'December' };
const qLabel = (i: number) => { const [y, q] = Q[i].split(' '); return `${QEND[q]} ${y}`; };
const rateOf = (state: string, cause: string, i = latestIdx(cause)) => RATES[state]?.[cause]?.[i] ?? null;

// --- Funeral cost estimates (Map V3.3): NFDA 2023 regional medians (census
// regions) adjusted by the BLS funeral index from July 2023 (the survey month)
// to the latest published month. Modeled planning estimates, not state prices.
type Pkg = 'burial' | 'cremation';
const REF_MONTH = nfda.cpiReferenceMonth; // e.g. 2023-07, the 2023 survey month
const CPI_FACTOR = current / monthly[REF_MONTH.slice(0, 4)][`M${REF_MONTH.slice(5)}`];
const REGION_OF: Record<string, (typeof nfda.regions)[number]> = {};
for (const r of nfda.regions) for (const st of r.states) REGION_OF[st] = r;
const median2023 = (state: string, pkg: Pkg) => {
  if (state === US) return pkg === 'burial' ? nfda.national.burial2023 : nfda.national.cremation2023;
  const r = REGION_OF[state];
  return r ? (pkg === 'burial' ? r.burial2023 : r.cremation2023) : null;
};
const estimate = (state: string, pkg: Pkg) => { const m = median2023(state, pkg); return m == null ? null : m * CPI_FACTOR; };
const vsNational = (state: string, pkg: Pkg) => {
  const m = median2023(state, pkg);
  const n = pkg === 'burial' ? nfda.national.burial2023 : nfda.national.cremation2023;
  return m == null || state === US ? null : m / n - 1;
};
let onStateChange: (state: string) => void = () => {};

// State direct cremation figures (Map V3.6): only where a funeral consumer
// organization publishes a statewide summary figure; shown as published.
type CpiRef = { kind: 'year' | 'month'; year: string; month?: string; label: string } | null | undefined;
type DC = { year: number; whenLabel?: string; kind: string; value: number; low?: number; high?: number; n?: number; coverage?: string; source: string; definition: string; cpiRef?: CpiRef };
// V4.0: today's planning estimate = observed figure x BLS funeral index (latest
// month / the survey's reference period). Georgia's current listing has no ref.
const refIndex = (r: CpiRef) => {
  if (!r) return null;
  const m = monthly[r.year];
  if (!m) return null;
  if (r.kind === 'month') return r.month ? m[r.month] ?? null : null;
  const v = Object.values(m);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const dcToday = (dc: DC) => { const ref = refIndex(dc.cpiRef); return ref ? dc.value * (current / ref) : null; };
// Medians can end in .50: show cents only then.
const dcMoney = (v: number) => (Number.isInteger(v) ? money(v) : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const DIRECT = directCremation.states as Record<string, DC>;
// V4.0 local surveys (area medians; shown for the surveyed area only).
type Local = { states: string[]; area: string; when: string; n: number; observedMedian: number; low: number; high: number; todayMedian: number; definition: string; source: string };
const LOCAL = directCremation.local.areas as Local[];
const localFor = (state: string) => LOCAL.filter((l) => l.states.includes(state));


function init() {
  const stateSel = $<HTMLSelectElement>('[data-fcm-state]')!;
  const causeSel = $<HTMLSelectElement>('[data-fcm-cause]')!;

  function select(state: string, syncUrl = true) {
    stateSel.value = state;
    renderSummary(state);
    renderMortality(state, causeSel.value);
    onStateChange(state);
    renderDanger();
    if (syncUrl) setStateInUrl(state);
  }
  stateSel.addEventListener('change', () => { select(stateSel.value); });
  causeSel.addEventListener('change', () => { renderMortality(stateSel.value, causeSel.value); });

  initTabs();
  initCosts();
  initDanger(() => stateSel.value);
  select(stateFromUrl() ?? US, false);
}

// V5.2: keep ?state=XX in step with the dropdown (no reload); other parameters
// and the hash are kept.
function setStateInUrl(state: string) {
  try {
    const url = new URL(location.href);
    const code = statePaths.states.find((x) => x.name === state);
    if (code) url.searchParams.set('state', ABBR_BY_FIPS[code.fips]); else url.searchParams.delete('state');
    history.replaceState(history.state, '', url.toString());
  } catch {}
}

// V4.4: /funeral-cost-map/?state=TX (from the homepage map) opens with that state selected.
function stateFromUrl(): string | null {
  let code = '';
  try { code = (new URLSearchParams(location.search).get('state') ?? '').trim().toUpperCase(); } catch {}
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const s = statePaths.states.find((x) => ABBR_BY_FIPS[x.fips] === code);
  return s ? s.name : null;
}

function renderMortality(state: string, metric: string) {
  for (const el of $$<HTMLElement>('[data-fcm-name]')) el.textContent = state;
  for (const el of $$<HTMLElement>('[data-fcm-trend-cause]')) el.textContent = metric;
  // Latest rates, highest first, among the leading causes.
  const rows = LEADING.map((c) => [c, rateOf(state, c), rateOf(US, c)] as const).filter((r) => r[1] != null).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);
  $<HTMLElement>('[data-fcm-causes]')!.innerHTML = rows.map(([c, r, u], i) => {
    const diff = u ? (r as number) / u - 1 : null;
    const vs = state === US || diff == null ? 'n/a' : `${diff > 0 ? '+' : ''}${pct(diff, 0)}`;
    const lag = latestIdx(c) < QI ? '<sup>†</sup>' : '';
    const n = COUNTS[state]?.[c];
    const all22 = COUNTS[state]?.['All causes'];
    const share = n != null && all22 ? pct(n / all22) : 'n/a';
    return `<tr><td>${i + 1}</td><td>${c}${lag}</td><td>${r}</td><td>${u ?? 'n/a'}</td><td>${vs}</td><td>${n != null ? num(n) : 'n/a'}</td><td>${share}</td></tr>`;
  }).join('') || '<tr><td colspan="7">No data for this state.</td></tr>';
  const lagged = rows.filter(([c]) => latestIdx(c) < QI).map(([c]) => `${c}: 12 months ending ${qLabel(latestIdx(c))}`);
  $<HTMLElement>('[data-fcm-lag]')!.textContent = lagged.length ? `†Latest published period: ${lagged.join('; ')}.` : '';
  const all = rateOf(state, 'All causes');
  const usAll = rateOf(US, 'All causes');
  $<HTMLElement>('[data-fcm-total]')!.textContent = all != null
    ? `All causes: ${all} deaths per 100,000${state !== US && usAll ? ` (U.S.: ${usAll}; ${all >= usAll ? 'higher' : 'lower'} by ${pct(Math.abs(all / usAll - 1), 0)})` : ''}.`
    : '';

  // Recent trend: 12-month rates ending each quarter.
  const qx = (i: number) => i;
  trendChart($<HTMLElement>('[data-fcm-trend]')!, state, metric,
    Q.map((q, i) => [qx(i), rateOf(state, metric, i)] as [number, number | null]),
    state === US ? [] : Q.map((q, i) => [qx(i), rateOf(US, metric, i)] as [number, number | null]),
    [Q[0], Q[QI]], (i) => Q[i], '12-month age-adjusted death rate per 100,000, provisional');

  // Deaths by age and sex (2022, all causes).
  const d = DEATHS[state];
  const AGES = ['45-54', '55-64', '65-74', '75-84', '85+', 'All Ages'];
  const cell = (sex: string, a: string) => { const v = d?.[sex]?.[a]; return v == null ? 'n/a' : num(v); };
  $<HTMLElement>('[data-fcm-agesex]')!.innerHTML = d
    ? AGES.map((a) => `<tr><th scope="row">${a === 'All Ages' ? 'All ages' : a}</th><td>${cell('Male', a)}</td><td>${cell('Female', a)}</td><td>${cell('All Sexes', a)}</td></tr>`).join('')
    : '<tr><td colspan="4">No data for this state.</td></tr>';

  // U.S. by sex and age for the selected cause.
  const demo = US_DEMO[metric];
  const demoRows: [string, number | null | undefined][] = [['Men (age-adjusted)', demo?.male], ['Women (age-adjusted)', demo?.female], ...Object.entries(demo?.ages ?? {}).map(([a, v]) => [`Ages ${a}`, v] as [string, number | null])];
  $<HTMLElement>('[data-fcm-usdemo]')!.innerHTML = demoRows.map(([g, v]) => `<tr><th scope="row">${g}</th><td>${v == null ? 'n/a' : v}</td></tr>`).join('');

  // Final 1999-2017 data (collapsed section).
  const fy = FINAL[state]?.[FINAL_LATEST] ?? {};
  const fall = fy['All causes'];
  const frows = Object.entries(fy).filter(([c]) => c !== 'All causes').sort((a, b) => b[1][0] - a[1][0]);
  $<HTMLElement>('[data-fcm-causes-final]')!.innerHTML = frows.map(([c, [dd, r]], i) => `<tr><td>${i + 1}</td><td>${c}</td><td>${num(dd)}</td><td>${fall ? pct(dd / fall[0]) : 'n/a'}</td><td>${r}</td></tr>`).join('') || '<tr><td colspan="5">No data.</td></tr>';
  const fname = FINAL_NAME[metric] ?? metric;
  const fseries = (s: string) => {
    const out: [number, number | null][] = [];
    for (let yr = FINAL_FIRST; yr <= Number(FINAL_LATEST); yr++) out.push([yr, FINAL[s]?.[String(yr)]?.[fname]?.[1] ?? null]);
    return out;
  };
  const fel = $<HTMLElement>('[data-fcm-trend-final]')!;
  if (fseries(state).some((p) => p[1] != null)) {
    trendChart(fel, state, fname, fseries(state), state === US ? [] : fseries(US), [String(FINAL_FIRST), FINAL_LATEST], (yr) => String(yr), 'Age-adjusted death rate per 100,000, final data');
  } else fel.innerHTML = `<p class="fcm-note">${metric} is not in the 1999 to ${FINAL_LATEST} dataset.</p>`;
}

function trendChart(el: HTMLElement, state: string, metric: string, a0: [number, number | null][], b0: [number, number | null][], ends: [string, string], label: (x: number) => string, unit: string) {
  const a = a0.filter((p): p is [number, number] => p[1] != null);
  const b = b0.filter((p): p is [number, number] => p[1] != null);
  if (!a.length) { el.innerHTML = '<p class="fcm-note">Not available for this state.</p>'; return; }
  const xs = a0.map((p) => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const all = [...a, ...b].map((p) => p[1]);
  const W = 600, H = 200, P = 34;
  const min = Math.min(...all) * 0.9, max = Math.max(...all) * 1.05;
  const x = (v: number) => P + ((v - x0) / (x1 - x0 || 1)) * (W - P * 2);
  const yy = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - P * 2);
  const line = (pts: [number, number][]) => pts.map(([xv, v]) => `${x(xv).toFixed(1)},${yy(v).toFixed(1)}`).join(' ');
  const first = a[0], last = a[a.length - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric} in ${state}: ${first[1]} per 100,000 in ${label(first[0])}, ${last[1]} in ${label(last[0])}.">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#ddd7ca"/>
    <text x="${P}" y="${H - 10}" font-size="12">${ends[0]}</text><text x="${W - P}" y="${H - 10}" font-size="12" text-anchor="end">${ends[1]}</text>
    <text x="${P}" y="14" font-size="12">${max.toFixed(0)}</text><text x="${P}" y="${H - P - 4}" font-size="12">${min.toFixed(0)}</text>
    ${b.length ? `<polyline points="${line(b)}" fill="none" stroke="#9aa39f" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
    <polyline points="${line(a)}" fill="none" stroke="#173f35" stroke-width="3"/>
  </svg>
  <p class="fcm-note">${unit}. Solid: ${state}${b.length ? '; dashed: United States' : ''}. ${label(first[0])}: ${first[1]}; ${label(last[0])}: ${last[1]}.</p>`;
}

function initCosts() {
  const hist = $<HTMLElement>('[data-fcm-hist]')!;
  hist.innerHTML = BACK.map((b) => `<div class="fcm-stat"><strong>+${pct(current / b.value! - 1, 0)}</strong>since ${monthName} ${b.year}</div>`).join('');

  const price = $<HTMLInputElement>('[data-fcm-price]')!;
  const type = $<HTMLSelectElement>('[data-fcm-type]')!;
  const yearsSel = $<HTMLSelectElement>('[data-fcm-years]')!;
  const rate = $<HTMLInputElement>('[data-fcm-rate]')!;
  const ins = $<HTMLInputElement>('[data-fcm-ins]')!;
  const sav = $<HTMLInputElement>('[data-fcm-sav]')!;
  const timeline = $<HTMLElement>('[data-fcm-timeline]')!;
  const future = $<HTMLElement>('[data-fcm-future]')!;
  const short = $<HTMLElement>('[data-fcm-short]')!;
  const assume = $<HTMLElement>('[data-fcm-assume]')!;
  if (DEFAULT_RATE != null) {
    rate.value = (DEFAULT_RATE * 100).toFixed(1);
    $<HTMLElement>('[data-fcm-rate-note]')!.textContent = `Default: ${(DEFAULT_RATE * 100).toFixed(1)}% a year, the average yearly change in the BLS funeral index from ${monthName} ${lastYear - 20} to ${monthName} ${lastYear}.`;
  }

  const estEl = $<HTMLElement>('[data-fcm-est]')!;
  let typed = false; // the visitor typed their own price
  let state = US;
  const pkgOf = (): Pkg | null => (type.value === 'burial' ? 'burial' : type.value === 'cremation-service' ? 'cremation' : null);
  const prefill = () => {
    const pkg = pkgOf();
    const dc = !pkg ? DIRECT[state] : undefined;
    const est = pkg ? estimate(state, pkg) : dc ? dcToday(dc) ?? dc.value : null;
    if (!typed) price.value = est != null ? String(Math.round(est)) : '';
    const src = $<HTMLElement>('[data-fcm-price-src]')!;
    src.textContent = typed
      ? 'Using the price you entered.'
      : est != null && !dc
        ? `Filled in with the estimate for ${state === US ? 'the United States' : `${state} (${REGION_OF[state]?.name} region)`}. Replace it with a funeral home's price for a more accurate result.`
        : pkg
          ? `No estimate for ${state}. Enter a price from a funeral home's price list.`
          : 'No published estimate for direct cremation. Enter a price from a funeral home\'s price list.';
    if (!typed && dc) {
      const what = dc.n ? `the ${dc.kind} for ${state} (${dc.whenLabel ?? dc.year})` : `the ${dc.year} ${dc.kind} for ${state}`;
      src.textContent = dcToday(dc) != null
        ? `Filled in with an estimate based on historical data: ${what}, ${dcMoney(dc.value)}, adjusted with the BLS funeral index. Replace it with a funeral home's price for a more accurate result.`
        : `Filled in with ${what}, a current listing used without adjustment. Replace it with a funeral home's price for a more accurate result.`;
    }
  };
  const card = (label: string, pkg: Pkg) => {
    const est = estimate(state, pkg);
    const m = median2023(state, pkg);
    const vs = vsNational(state, pkg);
    if (est == null || m == null) return `<div class="fcm-stat"><strong>n/a</strong>${label}: not available for ${state}</div>`;
    const cmp = vs == null ? '' : '; ' + `${Math.abs(vs * 100).toFixed(0)}% ${vs >= 0 ? 'above' : 'below'} the national median`;
    return `<div class="fcm-stat"><strong>${money(est)}</strong>${label}<span class="fcm-stat__sub">${money(m)} NFDA 2023 ${state === US ? 'national' : 'regional'} median${cmp}</span></div>`;
  };
  const localList = () => {
    const ls = localFor(state);
    if (!ls.length) return '';
    return `<span class="fcm-stat__sub"><b>Local surveys</b> (this area only, not statewide):</span>${ls.map((l) => `<span class="fcm-stat__sub fcm-local">${l.area}: estimated ${money(l.todayMedian)} today; observed median ${dcMoney(l.observedMedian)} of ${l.n} funeral homes (${l.when}), range ${money(l.low)} to ${money(l.high)}. ${l.definition} ${l.source}.</span>`).join('')}`;
  };
  const directCard = () => {
    const dc = DIRECT[state];
    if (!dc) return `<div class="fcm-stat"><strong>${CALL_US}</strong>Direct cremation<span class="fcm-stat__sub">No statewide figure for this state</span>${localList()}</div>`;
    const range = dc.low != null && dc.high != null ? `; range ${money(dc.low)} to ${money(dc.high)}` : '';
    const today = dcToday(dc);
    const head = today != null ? money(today) : dcMoney(dc.value);
    const est = today != null ? `Estimate based on historical data. Observed: ${dcMoney(dc.value)}, ` : '';
    if (dc.n) return `<div class="fcm-stat"><strong>${head}</strong>Direct cremation<span class="fcm-stat__sub">${est}${dc.whenLabel ?? dc.year}: ${dc.kind} of ${dc.n} funeral homes (${dc.coverage}), ${dc.source}${range}. ${dc.definition}</span>${localList()}</div>`;
    return `<div class="fcm-stat"><strong>${head}</strong>Direct cremation<span class="fcm-stat__sub">${est}${dc.year} ${dc.kind}, ${dc.source}${range}. ${dc.definition}</span></div>`;
  };
  onStateChange = (s: string) => {
    state = s;
    const region = REGION_OF[s]?.name;
    estEl.innerHTML = `<p class="fcm-est-title">Estimated funeral cost based on historical data: <strong>${s}</strong>${region ? ` (${region} region)` : ''}</p>
      <div class="fcm-hist">${card('Funeral with viewing and burial', 'burial')}${card('Funeral with viewing and cremation', 'cremation')}${directCard()}</div>`;
    prefill();
    update();
  };
  price.addEventListener('input', () => { typed = price.value.trim() !== ''; if (!typed) prefill(); });
  type.addEventListener('change', () => { prefill(); });

  const update = () => {
    const p = parseMoney(price.value);
    const r = Number(rate.value.replace(/[%\s]/g, '')) / 100;
    const n = Number(yearsSel.value);
    const label = type.options[type.selectedIndex].text.toLowerCase();
    if (!p || !Number.isFinite(r)) {
      timeline.hidden = true;
      future.textContent = p ? 'Enter a yearly increase to see the projection.' : 'Enter today\'s price above to see past and future costs.';
      assume.textContent = 'Set today\'s funeral price and the yearly increase in Inflation & Future Costs to calculate a shortfall.';
      short.textContent = '';
      return;
    }
    const fut = p * Math.pow(1 + r, n);
    timeline.hidden = false;
    timeline.innerHTML = [
      ...[...BACK].reverse().map((b) => `<div><strong>${money((p * b.value!) / current)}</strong>${b.year} (${b.n} years ago)*</div>`),
      `<div class="is-today"><strong>${money(p)}</strong>Today</div>`,
      `<div class="is-future"><strong>${money(fut)}</strong>In ${n} years**</div>`,
    ].join('');
    future.innerHTML = `A ${label} that costs <strong>${money(p)}</strong> today would cost about <strong>${money(fut)}</strong> in ${n} years at ${(r * 100).toFixed(1)}% a year: <strong>${money(fut - p)}</strong> more (+${pct(fut / p - 1, 0)}).<br><span class="fcm-note">*Past costs: today's price adjusted by the BLS funeral index, not surveyed prices from those years. **Projection, not a guaranteed price.</span>`;
    assume.innerHTML = `Using: ${label}, <strong>${money(p)}</strong> today, ${n} years ahead at ${(r * 100).toFixed(1)}% a year: projected cost <strong>${money(fut)}</strong>.`;
    const have = (parseMoney(ins.value) ?? 0) + (parseMoney(sav.value) ?? 0);
    const gap = fut - have;
    short.innerHTML = gap > 0
      ? `Projected cost in ${n} years: ${money(fut)}. Coverage and savings: ${money(have)}. <strong>Estimated funding shortfall: ${money(gap)}.</strong>`
      : `Projected cost in ${n} years: ${money(fut)}. Coverage and savings: ${money(have)}. <strong>No shortfall: your coverage and savings exceed the projected cost by ${money(-gap)}.</strong>`;
  };
  for (const el of [price, rate, ins, sav]) el.addEventListener('input', update);
  for (const el of [type, yearsSel]) el.addEventListener('change', update);
  update();
}

// --- V4.2 state summary panel: life expectancy, funeral costs, top 10 causes.
type LE = { birth: number; age65: number };
// Shown where no direct cremation price is available (Randy, V4.3/V4.4).
const CALL_US = `<a href="${lead.phone.href}">Call us for details</a>`;
const LIFE = lifeExp.states as Record<string, { total: LE; male: LE; female: LE }>;
const row = (label: string, value: string) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
function renderSummary(state: string) {
  $<HTMLElement>('[data-fcm-sum-name]')!.textContent = state;
  const L = LIFE[state];
  const yrs = (v: number) => `${v.toFixed(1)} years`;
  // V5.9: two sections (life expectancy at birth; years left at 65), Male and
  // Female; the combined-population figures stay in the data, not shown.
  const place = state === US ? 'the United States' : state;
  $<HTMLElement>('[data-fcm-sum-le]')!.innerHTML = L
    ? row(`Male in ${place}`, yrs(L.male.birth)) + row(`Female in ${place}`, yrs(L.female.birth))
    : row('Life expectancy', 'Unavailable');
  $<HTMLElement>('[data-fcm-sum-le65]')!.innerHTML = L
    ? row(`Male in ${place}`, yrs(L.male.age65)) + row(`Female in ${place}`, yrs(L.female.age65))
    : row('Years left at 65', 'Unavailable');
  const burial = estimate(state, 'burial');
  const crem = estimate(state, 'cremation');
  const dc = DIRECT[state];
  const dcVal = dc ? dcToday(dc) ?? dc.value : null;
  $<HTMLElement>('[data-fcm-sum-costs]')!.innerHTML =
    row('Funeral with burial', burial != null ? money(burial) : 'Unavailable') +
    row('Cremation with viewing', crem != null ? money(crem) : 'Unavailable') +
    row('Direct cremation', dcVal != null ? money(dcVal) : CALL_US);
  const region = REGION_OF[state]?.name;
  const parts: string[] = [];
  if (state === US) parts.push('Burial and cremation with viewing: national NFDA medians.');
  else if (region) parts.push(`Burial and cremation with viewing: regional estimates for the ${region} census region (NFDA).`);
  if (dc) parts.push(dcToday(dc) != null
    ? `Direct cremation: state survey (${dc.whenLabel ?? dc.year}${dc.n ? `, ${dc.kind} of ${dc.n} funeral homes` : `, ${dc.kind}`}), adjusted for inflation.`
    : `Direct cremation: state survey (${dc.whenLabel ?? dc.year}${dc.n ? `, ${dc.kind} of ${dc.n} funeral homes` : ''}).`);
  else if (localFor(state).length) parts.push('Direct cremation: no statewide survey; see local surveys in Funeral Costs.');
  $<HTMLElement>('[data-fcm-sum-costnote]')!.textContent = parts.join(' ');
}

// --- V5.2 tabs: WAI-ARIA tabs (arrow keys, Home/End); a link or hash pointing
// at content inside a pane opens that pane first.
let showTab: (id: string, focus?: boolean) => void = () => {};
function initTabs() {
  const tabs = $$<HTMLButtonElement>('[data-fcm-tab]');
  const panes = $$<HTMLElement>('[data-fcm-pane]');
  showTab = (id, focus = false) => {
    for (const t of tabs) {
      const on = t.dataset.fcmTab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    }
    for (const p of panes) p.hidden = p.dataset.fcmPane !== id;
    if (id === 'overview') renderDanger(); // the label is sized from the visible chart
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(t.dataset.fcmTab!));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      const n = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
      if (n == null) return;
      e.preventDefault();
      showTab(tabs[(n + tabs.length) % tabs.length].dataset.fcmTab!, true);
    });
  });
  const openTarget = (id: string, scroll: boolean) => {
    const el = document.getElementById(id);
    const pane = el?.closest<HTMLElement>('[data-fcm-pane]');
    if (!el || !pane) return;
    showTab(pane.dataset.fcmPane!);
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  for (const a of $$<HTMLAnchorElement>('[data-fcm-open]')) {
    a.addEventListener('click', (e) => { e.preventDefault(); openTarget(a.getAttribute('href')!.slice(1), true); });
  }
  if (location.hash.length > 1) openTarget(decodeURIComponent(location.hash.slice(1)), true);
}

// --- V5.2-V5.4 Death Danger Zone: the selected state's 2022 life table
// (survivors at each age from 50), the estimated life expectancy at birth for
// the selected sex as the baseline, and markers for published health-condition
// figures (health-conditions.json). The red band runs from the earliest
// condition-adjusted age back up to the baseline; nothing is estimated or added.
type Sex = 'male' | 'female';
const SURV = survival.states as Record<string, Record<Sex, number[]>>;
const AGE0 = survival.ages[0]; // lx arrays start at age 50
type HcOpt = { id: string; label: string; yearsLost?: number; plusSmoking?: number; atAge?: number; medianSurvival?: number };
type HcType = { id: string; label: string; survival5: number; localized5: number; medianDeathAge: number; sexes: string[]; url: string; yearsLost?: Partial<Record<Sex, number>>; yearsLostRange?: Partial<Record<Sex, [number, number]>> };
type Hc = {
  label: string; options?: HcOpt[]; default?: string; sexes?: string[]; femalePending?: string; atAge?: number;
  measure?: string; note?: string; source?: string; url?: string; types?: HcType[];
  lole?: { url: string; source: string };
  combined?: { with: string[]; atAge: number; yearsLost: Record<Sex, number>; source: string; url: string; studyCondition: string };
};
const HC = health.conditions as unknown as Record<string, Hc>;
const SEX_WORD: Record<Sex, string> = { male: 'men', female: 'women' };
// Lowercase only the first letter of an option label (keeps acronyms such as GOLD).
const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
// V5.5: survival after diagnosis and age at death are not years of life lost
// compared with people without the condition, so they get no graph marker.
const NO_MARKER = 'Not shown on the graph: this figure is not a measure of years of life lost compared with people without the condition.';

let renderDanger: () => void = () => {};
function initDanger(getState: () => string) {
  const chart = $<HTMLElement>('[data-fcm-dz-chart]')!;
  const sum = $<HTMLElement>('[data-fcm-dz-sum]')!;
  const notesEl = $<HTMLElement>('[data-fcm-dz-notes]')!;
  const checks = $$<HTMLInputElement>('[data-fcm-hc]');
  const types = $$<HTMLInputElement>('[data-fcm-hc-type]');
  const sexInputs = $$<HTMLInputElement>('[data-fcm-sex]');
  const sexOf = (): Sex => (sexInputs.find((r) => r.checked)?.value as Sex) ?? 'male';
  const link = (url?: string, text = 'Source') => (url ? `<a href="${url}" rel="noopener">${text}</a>` : '');
  const fmtAge = (a: number) => a.toFixed(1);

  renderDanger = () => {
    const state = getState();
    const sex = sexOf();
    const lx = SURV[state]?.[sex];
    const birth = (lifeExp.states as Record<string, Record<Sex, { birth: number }>>)[state]?.[sex]?.birth;
    // Only the options of checked conditions are shown; types match the sex.
    for (const c of checks) {
      for (const el of $$<HTMLElement>(`[data-fcm-hc-opt="${c.value}"]`)) el.hidden = !c.checked;
    }
    for (const t of types) {
      const ok = (t.dataset.sexes ?? '').split(' ').includes(sex);
      t.disabled = !ok;
      if (!ok) t.checked = false;
    }
    if (!lx || birth == null) { chart.innerHTML = ''; sum.textContent = 'Life table not available for this selection.'; notesEl.innerHTML = ''; return; }
    // V5.3/V5.4 baseline: estimated life expectancy at birth for the selected sex.
    const avg = birth;
    // V5.9: Male / Female, as in the sex selector.
    const who = `${sex === 'male' ? 'Male' : 'Female'} in ${state === US ? 'the United States' : state}`;

    // Markers from checked conditions (published figures only).
    type Marker = { age: number; text: string; muted?: false } | { age: null; text: string; muted: true };
    const marks: Marker[] = [];
    const on = new Set(checks.filter((c) => c.checked).map((c) => c.value));
    const selOf = (id: string) => $<HTMLSelectElement>(`[data-fcm-hc-sel="${id}"]`)?.value;
    const combo = on.has('heart') && on.has('diabetes') ? HC.heart.combined : undefined;
    if (on.has('heart')) {
      if (combo) {
        const y = combo.yearsLost[sex];
        marks.push({ age: avg - y, text: `<b>Heart disease and diabetes together:</b> about ${y} fewer years of life for ${SEX_WORD[sex]} at age ${combo.atAge} (a history of heart attack plus diabetes). Published combined figure; not two figures added together. ${link(combo.url)}` });
      } else {
        marks.push({ age: null, muted: true, text: `<b>Heart disease:</b> a verified figure for heart disease alone is not yet available, so no marker is shown. Select Diabetes as well to see the study's published combined figure.` });
      }
    }
    if (on.has('diabetes') && !combo) {
      const o = HC.diabetes.options!.find((x) => x.id === selOf('diabetes'))!;
      marks.push({ age: avg - o.yearsLost!, text: `<b>Diabetes, ${lcFirst(o.label)}:</b> about ${o.yearsLost} fewer years of life (a 50-year-old with type 2 diabetes compared with one without, U.S. death rates). ${HC.diabetes.note} ${link(HC.diabetes.url)}` });
    } else if (on.has('diabetes') && combo) {
      marks.push({ age: null, muted: true, text: `<b>Diabetes:</b> included in the combined heart disease and diabetes figure above.` });
    }
    if (on.has('copd')) {
      if (sex === 'male') {
        const o = HC.copd.options!.find((x) => x.id === selOf('copd'))!;
        marks.push({ age: avg - o.yearsLost!, text: `<b>COPD, ${lcFirst(o.label)}:</b> about ${o.yearsLost} fewer years of life for men at age 65${o.plusSmoking ? `, in addition to the ${o.plusSmoking} years lost due to smoking` : ''}. ${link(HC.copd.url)}` });
      } else {
        marks.push({ age: null, muted: true, text: `<b>COPD:</b> ${HC.copd.femalePending}` });
      }
    }
    if (on.has('alzheimers')) {
      const o = HC.alzheimers.options!.find((x) => x.id === selOf('alzheimers'))!;
      marks.push({ age: null, muted: true, text: `<b>Alzheimer's disease, ${lcFirst(o.label)}:</b> half of people live at least ${o.medianSurvival} more years after diagnosis (median survival; men and women alike). ${link(HC.alzheimers.url)} ${NO_MARKER}` });
    }
    if (on.has('cancer')) {
      const picked = HC.cancer.types!.filter((t) => types.find((x) => x.value === t.id && x.checked && !x.disabled));
      if (!picked.length) marks.push({ age: null, muted: true, text: `<b>Cancer:</b> choose a cancer type.` });
      for (const t of picked) {
        // V5.11: published loss of life expectancy at diagnosis (years lost compared
        // with the matched general population; Rahman et al. 2024). SEER survival
        // and age at death stay as information.
        const y = t.yearsLost?.[sex];
        const rg = t.yearsLostRange?.[sex];
        const seer = `5-year relative survival ${t.survival5}% (compared with people without this cancer; ${t.localized5}% when found before it spreads). Median age at death from this cancer, U.S.: ${t.medianDeathAge}. ${link(t.url, 'SEER')}`;
        if (y != null) marks.push({ age: avg - y, text: `<b>${t.label}:</b> about ${y} fewer years of life for ${SEX_WORD[sex]} diagnosed at ages 50 to 89, compared with the general population (${rg ? `${rg[0]} to ${rg[1]} across area income groups; ` : ''}Australia, diagnosed 2001 to 2019). ${link(HC.cancer.lole?.url)}. ${seer}` });
        else marks.push({ age: null, muted: true, text: `<b>${t.label}:</b> ${seer} ${NO_MARKER}` });
      }
    }
    // V5.10 guard: a condition is never shown as extending life expectancy. Only
    // published years of life lost (an earlier age) are plotted; anything at or
    // after the baseline is listed as information, without a marker.
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i];
      if (m.age != null && !(m.age < avg)) marks[i] = { age: null, muted: true, text: `${m.text} ${NO_MARKER}` };
    }
    const shown = marks.filter((m): m is Extract<Marker, { age: number }> => m.age != null);
    const many = shown.length > 1;
    notesEl.innerHTML = marks.map((m) => {
      const n = m.age != null ? shown.indexOf(m) + 1 : 0;
      return `<li class="${m.muted ? 'is-muted' : ''}">${m.age != null ? `<span class="fcm-dz-pin">${n}</span> Marker at age ${fmtAge(Math.min(100, Math.max(50, m.age)))}. ` : ''}${m.text}</li>`;
    }).join('') + (many ? '<li class="is-muted">Each marker shows one published figure on its own. Published research does not support adding them together, so no combined estimate is shown.</li>' : '');

    // Death Danger Zone: from the earliest condition-adjusted age (a published
    // figure, never a sum) back up to the baseline. Gray after the baseline,
    // green before the zone.
    const earlier = shown.map((m) => m.age).filter((a) => a < avg);
    const start = earlier.length ? Math.max(50, Math.min(...earlier)) : null;
    sum.innerHTML = `Estimated life expectancy at birth, ${who}: <strong>${fmtAge(avg)}</strong>. ` + (start != null
      ? `<span class="fcm-dz-key">Death Danger Zone</span>: <strong>${fmtAge(start)} to ${fmtAge(avg)}</strong>, from the earliest age linked to the selected condition${shown.length > 1 ? 's' : ''} up to that average.`
      : shown.length
        ? 'The selected figures fall after this average, so no Death Danger Zone is shown.'
        : 'Select a health condition to see its Death Danger Zone.');

    // Chart: ages 50 to 100; the curve is the share of 50-year-olds still living.
    const W = 640, H = 300, L = 44, R = 14, T = 40, B = 40;
    const x = (a: number) => L + ((Math.min(100, Math.max(50, a)) - 50) / 50) * (W - L - R);
    const y = (p: number) => T + (1 - p) * (H - T - B);
    const base = lx[0];
    const pts: string[] = [];
    for (let a = 50; a <= 100; a++) pts.push(`${x(a).toFixed(1)},${y(lx[a - AGE0] / base).toFixed(1)}`);
    const ticksX = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((a) => `<line x1="${x(a)}" y1="${y(0)}" x2="${x(a)}" y2="${y(0) + 5}" stroke="#6b726e"/><text x="${x(a)}" y="${y(0) + 19}" font-size="13" text-anchor="middle" fill="#454b49">${a}</text>`).join('');
    const ticksY = [0, 0.25, 0.5, 0.75, 1].map((p) => `<line x1="${L}" y1="${y(p)}" x2="${W - R}" y2="${y(p)}" stroke="#e7e2d8"/><text x="${L - 6}" y="${y(p) + 4}" font-size="12" text-anchor="end" fill="#454b49">${p * 100}%</text>`).join('');
    const region = (a0: number, a1: number, fill: string, op: number) => (a1 > a0 ? `<rect x="${x(a0)}" y="${T}" width="${x(a1) - x(a0)}" height="${y(0) - T}" fill="${fill}" fill-opacity="${op}"/>` : '');
    const greenEnd = start ?? avg;
    const regions = region(50, greenEnd, '#cfe0d7', 0.95) + (start != null ? region(start, avg, '#c2410c', 0.22) : '') + region(avg, 100, '#6b726e', 0.14);
    const PIN0 = T + 34;
    const markerSvg = shown.map((m, k) => {
      const mx = x(m.age);
      const ty = PIN0 + (k % 3) * 18;
      return `<line x1="${mx}" y1="${T}" x2="${mx}" y2="${y(0)}" stroke="#c2410c" stroke-width="2.5" stroke-dasharray="6 4"/><circle cx="${mx}" cy="${ty}" r="9" fill="#c2410c"/><text x="${mx}" y="${ty + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">${k + 1}</text>`;
    }).join('');
    const nearRight = x(avg) > W - R - 120;
    const label = `${who}: share of those alive at 50 who are still living at each age. Estimated life expectancy at birth ${fmtAge(avg)}.${start != null ? ` Death Danger Zone ${fmtAge(start)} to ${fmtAge(avg)}.` : ''}${shown.length ? ` ${shown.length} condition marker${shown.length > 1 ? 's' : ''} shown.` : ''}`;
    chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
      ${regions}
      ${ticksY}
      <polyline points="${pts.join(' ')}" fill="none" stroke="#173f35" stroke-width="3"/>
      <line x1="${x(avg)}" y1="${T}" x2="${x(avg)}" y2="${y(0)}" stroke="#173f35" stroke-width="2.5"/>
      <text x="${x(avg) + (nearRight ? -5 : 5)}" y="${T + 14}" font-size="12" font-weight="700" text-anchor="${nearRight ? 'end' : 'start'}" fill="#173f35">Life expectancy ${fmtAge(avg)}</text>
      ${markerSvg}
      <line x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}" stroke="#6b726e"/>
      ${ticksX}
      <text x="${(L + W - R) / 2}" y="${H - 4}" font-size="12" text-anchor="middle" fill="#454b49">Age</text>
    </svg>`;

    // DEATH DANGER ZONE label (HTML over the chart, so it stays readable on
    // phones): stacked inside the band if it fits, else one compact line inside,
    // else a small line just above the band. It sits in the widest gap between
    // marker lines, so it never covers a marker, pin or other label.
    if (start == null) return;
    const svgEl = chart.querySelector('svg')!;
    const scale = svgEl.getBoundingClientRect().width / W;
    if (!scale) return; // not visible yet; redrawn when the tab opens
    const PAD = 4; // clear of the marker lines (pins sit in rows above the label)
    const cuts = [x(start), ...shown.map((m) => x(m.age)).filter((mx) => mx > x(start) + 1 && mx < x(avg) - 1).sort((a, b) => a - b), x(avg)];
    let g0 = cuts[0], g1 = cuts[1];
    for (let i = 1; i < cuts.length - 1; i++) if (cuts[i + 1] - cuts[i] > g1 - g0) { g0 = cuts[i]; g1 = cuts[i + 1]; }
    const inner = (g1 - g0 - PAD * 2) * scale; // usable width in px
    const tag = document.createElement('div');
    tag.className = 'fcm-dz-label';
    tag.setAttribute('aria-hidden', 'true');
    chart.appendChild(tag);
    type Mode = 'stack' | 'stack-sm' | 'line' | 'above';
    const place = (mode: Mode) => {
      tag.className = `fcm-dz-label is-${mode}`;
      tag.innerHTML = mode.startsWith('stack') ? '<span>DEATH</span><span>DANGER</span><span>ZONE</span>' : 'DEATH DANGER ZONE';
      return tag.getBoundingClientRect();
    };
    const plotMid = (PIN0 + 3 * 18 + y(0)) / 2; // below the pin rows, above the axis
    const room = (y(0) - PIN0 - 3 * 18) * scale;
    // Stacked (full, then compact), then one compact line, then above the band.
    let mode: Mode = 'above';
    let box = place('above');
    for (const m of ['stack', 'stack-sm', 'line'] as Mode[]) {
      const bx = place(m);
      if (bx.width <= inner && bx.height <= room) { mode = m; box = bx; break; }
    }
    if (mode === 'above') box = place('above');
    const cx = mode === 'above' ? (x(start) + x(avg)) / 2 : (g0 + g1) / 2;
    // Within the plot area (clear of the axis labels on the left).
    const left = Math.min(Math.max(cx * scale - box.width / 2, L * scale), (W - R) * scale - box.width);
    const top = mode === 'above' ? (T - 6) * scale - box.height : plotMid * scale - box.height / 2;
    tag.style.left = `${left}px`;
    tag.style.top = `${top}px`;
  };
  for (const el of [...checks, ...types, ...sexInputs]) el.addEventListener('change', () => renderDanger());
  for (const sel of $$<HTMLSelectElement>('[data-fcm-hc-sel]')) sel.addEventListener('change', () => renderDanger());
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(() => renderDanger(), 150); });
}

// Runs last so every helper above is initialized.
if (root) init();
