// /funeral-cost-map/ interactions (Randy, November 2026, Map V3.0). All data is
// static (src/data/funeral-map/); nothing is sent anywhere. Dollar amounts are
// calculated only from the price the visitor enters.
import mortality from '@/data/funeral-map/leading-causes.json';
import cpi from '@/data/funeral-map/cpi-funeral.json';

type Row = [number, number];
type YearData = Record<string, Row>;
const STATES = mortality.states as unknown as Record<string, Record<string, YearData>>;
const LATEST = String(mortality.years[1]);
const FIRST = mortality.years[0];
const US = 'United States';
const monthly = cpi.monthly as Record<string, Record<string, number>>;

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel);
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

if (root) init();

function init() {
  const stateSel = $<HTMLSelectElement>('[data-fcm-state]')!;
  const metricSel = $<HTMLSelectElement>('[data-fcm-metric]')!;
  const svg = $<SVGSVGElement>('[data-fcm-svg]')!;
  const tip = $<HTMLElement>('[data-fcm-tip]')!;
  const pathsEls = [...svg.querySelectorAll<SVGPathElement>('path[data-state]')];
  const shades = ['#e3ece8', '#b9cec6', '#7fa597', '#3f7263', '#173f35'];

  const value = (state: string, metric: string) => STATES[state]?.[LATEST]?.[metric]?.[1] ?? null;

  function colorMap() {
    const metric = metricSel.value;
    const vals = pathsEls.map((p) => value(p.dataset.state!, metric)).filter((v): v is number => v != null).sort((a, b) => a - b);
    const cut = (q: number) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))];
    const bounds = [0.2, 0.4, 0.6, 0.8].map(cut);
    for (const p of pathsEls) {
      const v = value(p.dataset.state!, metric);
      p.style.fill = v == null ? '#eeeeee' : shades[bounds.filter((b) => v >= b).length];
      p.querySelector('title')!.textContent = `${p.dataset.state}: ${v == null ? 'no data' : `${v} per 100,000`}`;
    }
    const legend = $<HTMLElement>('[data-fcm-legend]')!;
    legend.innerHTML = shades.map((c) => `<span style="background:${c}"></span>`).join('');
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
      const v = value(p.dataset.state!, metricSel.value);
      tip.textContent = `${p.dataset.state}: ${v == null ? 'no data' : `${v} deaths per 100,000`}`;
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
  const y = STATES[state]?.[LATEST] ?? {};
  const us = STATES[US]?.[LATEST] ?? {};
  const all = y['All causes'];
  $<HTMLElement>('[data-fcm-name]')!.textContent = state;
  const rows = Object.entries(y).filter(([c]) => c !== 'All causes').sort((a, b) => b[1][0] - a[1][0]);
  $<HTMLElement>('[data-fcm-causes]')!.innerHTML = rows.map(([c, [d, r]], i) => {
    const ur = us[c]?.[1];
    const diff = ur ? r / ur - 1 : null;
    const vs = state === US || diff == null ? 'n/a' : `${diff > 0 ? '+' : ''}${pct(diff, 0)}`;
    return `<tr><td>${i + 1}</td><td>${c}</td><td>${num(d)}</td><td>${all ? pct(d / all[0]) : 'n/a'}</td><td>${r}</td><td>${vs}</td></tr>`;
  }).join('') || '<tr><td colspan="6">No data for this state.</td></tr>';
  const usAll = us['All causes'];
  $<HTMLElement>('[data-fcm-total]')!.textContent = all
    ? `All causes: ${num(all[0])} deaths; age-adjusted death rate ${all[1]} per 100,000${state !== US && usAll ? ` (U.S.: ${usAll[1]}, ${all[1] >= usAll[1] ? 'higher' : 'lower'} by ${pct(Math.abs(all[1] / usAll[1] - 1), 0)})` : ''}.`
    : '';
  renderTrend(state, metric);
}

function renderTrend(state: string, metric: string) {
  $<HTMLElement>('[data-fcm-trend-cause]')!.textContent = metric;
  const series = (s: string) => {
    const out: [number, number][] = [];
    for (let yr = FIRST; yr <= Number(LATEST); yr++) {
      const v = STATES[s]?.[String(yr)]?.[metric]?.[1];
      if (v != null) out.push([yr, v]);
    }
    return out;
  };
  const a = series(state);
  const b = state === US ? [] : series(US);
  const all = [...a, ...b].map((p) => p[1]);
  const el = $<HTMLElement>('[data-fcm-trend]')!;
  if (!a.length) { el.textContent = 'No trend data for this state.'; return; }
  const W = 600, H = 200, P = 34;
  const min = Math.min(...all) * 0.9, max = Math.max(...all) * 1.05;
  const x = (yr: number) => P + ((yr - FIRST) / (Number(LATEST) - FIRST)) * (W - P * 2);
  const yy = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - P * 2);
  const line = (pts: [number, number][]) => pts.map(([yr, v]) => `${x(yr).toFixed(1)},${yy(v).toFixed(1)}`).join(' ');
  const first = a[0], last = a[a.length - 1];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric} death rate in ${state}: ${first[1]} per 100,000 in ${first[0]}, ${last[1]} in ${last[0]}.">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#ddd7ca"/>
    <text x="${P}" y="${H - 10}" font-size="12">${FIRST}</text><text x="${W - P}" y="${H - 10}" font-size="12" text-anchor="end">${LATEST}</text>
    <text x="${P}" y="14" font-size="12">${max.toFixed(0)}</text><text x="${P}" y="${H - P - 4}" font-size="12">${min.toFixed(0)}</text>
    ${b.length ? `<polyline points="${line(b)}" fill="none" stroke="#9aa39f" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
    <polyline points="${line(a)}" fill="none" stroke="#173f35" stroke-width="3"/>
  </svg>
  <p class="fcm-note">Age-adjusted deaths per 100,000. Solid: ${state}${b.length ? '; dashed: United States' : ''}. ${first[0]}: ${first[1]}; ${last[0]}: ${last[1]}.</p>`;
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
