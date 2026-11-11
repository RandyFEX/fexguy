// /funeral-cost-map/ interactions (Randy, November 2026, Map V3.0/V3.1). All
// data is static (src/data/funeral-map/); nothing is sent anywhere. Dollar
// amounts are calculated only from the price the visitor enters.
import mortality from '@/data/funeral-map/leading-causes.json';
import cpi from '@/data/funeral-map/cpi-funeral.json';
import recent from '@/data/funeral-map/mortality-recent.json';

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

if (root) init();

function init() {
  const stateSel = $<HTMLSelectElement>('[data-fcm-state]')!;
  const metricSel = $<HTMLSelectElement>('[data-fcm-metric]')!;
  const svg = $<SVGSVGElement>('[data-fcm-svg]')!;
  const tip = $<HTMLElement>('[data-fcm-tip]')!;
  const pathsEls = [...svg.querySelectorAll<SVGPathElement>('path[data-state]')];
  const shades = ['#e3ece8', '#b9cec6', '#7fa597', '#3f7263', '#173f35'];

  function colorMap() {
    const metric = metricSel.value;
    const vals = pathsEls.map((p) => rateOf(p.dataset.state!, metric)).filter((v): v is number => v != null).sort((a, b) => a - b);
    const cut = (q: number) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))];
    const bounds = [0.2, 0.4, 0.6, 0.8].map(cut);
    for (const p of pathsEls) {
      const v = rateOf(p.dataset.state!, metric);
      p.style.fill = v == null ? '#eeeeee' : shades[bounds.filter((b) => v >= b).length];
      p.querySelector('title')!.textContent = `${p.dataset.state}: ${v == null ? 'not available' : `${v} per 100,000`}`;
    }
    $<HTMLElement>('[data-fcm-legend]')!.innerHTML = shades.map((c) => `<span style="background:${c}"></span>`).join('');
    $<HTMLElement>('[data-fcm-period]')!.textContent = `12 months ending ${qLabel(latestIdx(metric))}`;
  }

  function select(state: string) {
    stateSel.value = state;
    for (const p of pathsEls) p.setAttribute('aria-pressed', String(p.dataset.state === state));
    renderMortality(state, metricSel.value);
  }

  for (const p of pathsEls) {
    p.addEventListener('click', () => select(p.dataset.state!));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.dataset.state!); }
    });
    p.addEventListener('mouseenter', () => {
      const v = rateOf(p.dataset.state!, metricSel.value);
      tip.textContent = `${p.dataset.state}: ${v == null ? 'not available' : `${v} deaths per 100,000`}`;
      tip.hidden = false;
    });
    p.addEventListener('mouseleave', () => { tip.hidden = true; });
  }
  stateSel.addEventListener('change', () => select(stateSel.value));
  metricSel.addEventListener('change', () => { colorMap(); renderMortality(stateSel.value, metricSel.value); });

  colorMap();
  select(US);
  initCosts();
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
    return `<tr><td>${i + 1}</td><td>${c}${lag}</td><td>${r}</td><td>${u ?? 'n/a'}</td><td>${vs}</td></tr>`;
  }).join('') || '<tr><td colspan="5">No data for this state.</td></tr>';
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
  if (DEFAULT_RATE != null) {
    rate.value = (DEFAULT_RATE * 100).toFixed(1);
    $<HTMLElement>('[data-fcm-rate-note]')!.textContent = `Default: ${(DEFAULT_RATE * 100).toFixed(1)}% a year, the average yearly change in the BLS funeral index from ${monthName} ${lastYear - 20} to ${monthName} ${lastYear}.`;
  }

  const update = () => {
    const p = parseMoney(price.value);
    const r = Number(rate.value.replace(/[%\s]/g, '')) / 100;
    const n = Number(yearsSel.value);
    const label = type.options[type.selectedIndex].text.toLowerCase();
    if (!p || !Number.isFinite(r)) {
      timeline.hidden = true;
      future.textContent = p ? 'Enter a yearly increase to see the projection.' : 'Enter today\'s price above to see past and future costs.';
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
