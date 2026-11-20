// Financial Impact Calculator (PREVIEW, V5.8). Prices one profile through
// POST /api/impact-calculator/; every other figure is computed here from
// those premiums (src/lib/impact/calc.js). The lowest available premium is the
// fixed baseline; the visitor selects exactly one other plan in the chart.
import { VERIFIED_PRODUCTS, PERIODS } from '@/lib/impact/products.js';
import { impact, benefitAt, fmtMoney, fmtWhole } from '@/lib/impact/calc.js';

type Priced = { code: string; available: boolean; reason?: string; coverage?: number; premium?: number; units?: number; atColonialPennCoverage?: { coverage: number; premium: number } };
type Profile = { age: number; gender: 'male' | 'female'; tobacco: boolean; coverage: number };
type Row = { p: (typeof VERIFIED_PRODUCTS)[number]; q: Priced };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const num = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const product = (code: string) => VERIFIED_PRODUCTS.find((p) => p.code === code);
const nameOf = (r: Row) => `${esc(r.p.carrier)} ${esc(r.p.plan)}`;

/** Premiums compared at the same coverage (Colonial Penn's unit coverage when it's involved). */
function matched(base: Row, alt: Row) {
  if (alt.p.pricing === 'units' && base.q.atColonialPennCoverage) return { higher: alt.q.premium!, lower: base.q.atColonialPennCoverage.premium, coverage: alt.q.coverage! };
  if (base.p.pricing === 'units' && alt.q.atColonialPennCoverage) return { higher: alt.q.atColonialPennCoverage.premium, lower: base.q.premium!, coverage: base.q.coverage! };
  return { higher: alt.q.premium!, lower: base.q.premium!, coverage: alt.q.coverage! };
}

function init(root: HTMLElement) {
  const cfg = JSON.parse(root.dataset.config || '{}');
  const results = root.querySelector<HTMLElement>('[data-imp-results]')!;
  const form = root.querySelector<HTMLFormElement>('[data-imp-form]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-imp-toggle]')!;
  const profileLine = root.querySelector<HTMLElement>('[data-imp-profile]')!;
  const phone = `<a href="${root.dataset.phoneHref}">${root.dataset.phoneDisplay}</a>`;
  const altName = `${cfg.uid}-alt`;
  const yearsName = `${cfg.uid}-years`;
  const state = { alt: '', years: Number(cfg.years) || 10 };
  let lastKey = '';
  let rows: Row[] = [];
  let seq = 0;

  // "gut": the article's simplified, food-first display (V8.8); same data and math.
  const gut = cfg.display === 'gut';
  results.innerHTML = `<div class="imp__main">
      <fieldset class="imp__chart"><legend class="imp__legend">Choose one plan to compare with the lowest-priced option.</legend><div data-imp-chart></div></fieldset>
      <div class="imp__impact">
        <fieldset class="imp__periods"><legend class="imp__legend">${gut ? 'See the food equivalent over:' : 'Click to compare over:'}</legend>
          ${PERIODS.map((y: number) => `<label class="imp__period"><input type="radio" name="${yearsName}" value="${y}"${y === state.years ? ' checked' : ''} /><span>${y} ${y === 1 ? 'year' : 'years'}</span></label>`).join('')}
        </fieldset>
        <div data-imp-out aria-live="polite"></div>
      </div>
    </div>
    <div data-imp-benefits></div>`;
  const chart = results.querySelector<HTMLElement>('[data-imp-chart]')!;
  chart.after(profileLine);
  // "gut": the price summary sits under the plan choices (left column); the
  // right column keeps the period choice and the food panel.
  if (gut) profileLine.insertAdjacentHTML('afterend', '<div class="imp__cmp-wrap" data-imp-cmp aria-live="polite"></div>');
  const out = results.querySelector<HTMLElement>('[data-imp-out]')!;
  const cmp = results.querySelector<HTMLElement>('[data-imp-cmp]');
  const benefits = results.querySelector<HTMLElement>('[data-imp-benefits]')!;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    form.hidden = open;
  });

  const read = () => {
    const d = new FormData(form);
    const profile: Profile = { age: Number(d.get('age')), gender: d.get('gender') === 'male' ? 'male' : 'female', tobacco: d.get('tobacco') === 'yes', coverage: Number(d.get('coverage')) };
    return {
      profile,
      income: num(d.get('income'), 0) || null,
      food: { mealCost: num(d.get('mealCost'), cfg.food.mealCost), caloriesPerMeal: num(d.get('caloriesPerMeal'), cfg.food.caloriesPerMeal), caloriesPerDay: num(d.get('caloriesPerDay'), cfg.food.caloriesPerDay) },
    };
  };

  const available = () => rows.filter((r) => r.q.available);
  const baseline = () => available().reduce<Row | null>((a, b) => (!a || b.q.premium! < a.q.premium! ? b : a), null);

  async function update() {
    const s = read();
    const key = JSON.stringify(s.profile);
    const sexWord = s.profile.gender === 'male' ? 'man' : 'woman';
    profileLine.textContent = `Example: a ${s.profile.age}-year-old ${sexWord} who ${s.profile.tobacco ? 'uses tobacco' : "doesn't use tobacco"}, buying about $${s.profile.coverage.toLocaleString('en-US')} of coverage (Texas rates).`;
    if (key !== lastKey) {
      const mine = ++seq;
      results.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch('/api/impact-calculator/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: key });
        const body = await res.json().catch(() => ({}));
        if (mine !== seq) return;
        if (!res.ok || body.status !== 'ok') throw new Error(body.message || 'unavailable');
        rows = (cfg.codes as string[]).map((c) => ({ p: product(c)!, q: (body.products as Priced[]).find((x) => x.code === c)! })).filter((r) => r.p && r.q);
        lastKey = key;
      } catch (e) {
        results.setAttribute('aria-busy', 'false');
        rows = [];
        chart.innerHTML = '';
        benefits.innerHTML = '';
        out.innerHTML = `<p class="imp__error">${esc((e as Error).message === 'unavailable' ? 'Prices are not available right now.' : (e as Error).message)} To compare plans by phone, call ${phone}.</p>`;
        return;
      }
      renderChart();
    }
    results.setAttribute('aria-busy', 'false');
    renderImpact(s);
  }

  // The chart: baseline first (fixed), then the alternatives, each a radio.
  function renderChart() {
    const base = baseline();
    // Lowest to highest monthly premium; keep the visitor's choice while it's
    // available, otherwise compare with the highest-priced alternative.
    const alts = available().filter((r) => r !== base).sort((a, b) => a.q.premium! - b.q.premium!);
    if (!alts.some((r) => r.p.code === state.alt)) state.alt = alts[alts.length - 1]?.p.code ?? '';
    if (!base) { chart.innerHTML = `<p class="imp__error">None of these plans is available at this age.</p>`; return; }
    const max = Math.max(...available().map((r) => r.q.premium!));
    const body = (r: Row) => {
      const cov = r.p.pricing === 'units' ? `${r.q.units} units = ${fmtMoney(r.q.coverage!, false)}` : `${fmtMoney(r.q.coverage!, false)} coverage`;
      return `<span class="imp__name">${nameOf(r)}</span><span class="imp__price">${fmtMoney(r.q.premium!)}<small>/mo</small></span>
        <span class="imp__track" aria-hidden="true"><span class="imp__fill" style="width:${Math.max(4, (r.q.premium! / max) * 100).toFixed(1)}%"></span></span>
        <span class="imp__meta">${esc(r.p.timing)} · ${cov}</span>`;
    };
    const na = rows.filter((r) => !r.q.available).map((r) => `<li class="imp__bar imp__bar--na"><span class="imp__name">${nameOf(r)}</span><span class="imp__meta">Not available: ${esc(r.q.reason || '')}</span></li>`).join('');
    chart.innerHTML = `<ul class="imp__bars">
      <li class="imp__bar imp__bar--base"><span class="imp__tag">Lowest price shown</span>${body(base)}</li>
      ${alts.map((r) => `<li><label class="imp__bar imp__bar--alt${r.p.code === state.alt ? ' is-selected' : ''}"><input type="radio" name="${altName}" value="${r.p.code}"${r.p.code === state.alt ? ' checked' : ''} /><span class="imp__radio" aria-hidden="true"></span>${body(r)}</label></li>`).join('')}
      ${na}</ul>`;
  }

  function renderImpact(s: ReturnType<typeof read>) {
    const base = baseline();
    const alt = available().find((r) => r.p.code === state.alt);
    chart.querySelectorAll('.imp__bar--alt').forEach((el) => el.classList.toggle('is-selected', !!el.querySelector('input:checked')));
    if (!base || !alt) { out.innerHTML = base ? '<p class="imp__muted">Only one plan is available for this profile, so there is nothing to compare.</p>' : ''; benefits.innerHTML = ''; return; }
    const m = matched(base, alt);
    const im = impact(m.higher, m.lower, { years: state.years, ...s.food, monthlyIncome: s.income });
    const period = `${im.years} ${im.years === 1 ? 'year' : 'years'}`;
    if (gut) {
      const note = `It's a saving only if you qualify for ${nameOf(base)}${base.p.type === 'Level' ? ', which asks health questions' : ''}.`;
      if (im.monthly <= 0) {
        cmp!.innerHTML = `<p class="imp__headline">At about ${fmtMoney(m.coverage, false)} of coverage, ${nameOf(alt)} costs about the same as ${nameOf(base)}.</p>`;
        out.innerHTML = '';
      } else {
        cmp!.innerHTML = `<dl class="imp__cmp">
            <div><dt>Lower-priced policy <span>${nameOf(base)}</span></dt><dd>${fmtMoney(m.lower)}/month</dd></div>
            <div><dt>Higher-priced policy <span>${nameOf(alt)}</span></dt><dd>${fmtMoney(m.higher)}/month</dd></div>
            <div class="imp__cmp-extra"><dt>Extra premium</dt><dd>${fmtMoney(im.monthly)}/month</dd></div>
          </dl>`;
        out.innerHTML = `<p class="imp__overpay">If You Overpay ${fmtMoney(im.monthly)} a Month</p>
          <div class="imp__food imp__food--gut">
            <p class="imp__gut-lead">Over ${im.years} ${im.years === 1 ? 'Year' : 'Years'}, That Extra ${fmtMoney(im.period, false)} in Premiums Could Buy:</p>
            <p class="imp__gut-days"><span class="imp__days-n">${fmtWhole(im.foodDays)}</span> Days</p>
            <p class="imp__gut-sub">of food for one person</p>
            <div class="imp__gut-stack">
              <p class="imp__gut-stat"><span class="imp__stat-n imp__meals-n">${fmtWhole(im.meals)}</span> Meals</p>
              <p class="imp__gut-stat"><span class="imp__stat-n">${fmtWhole(im.calories)}</span> Calories</p>
            </div>
            <p class="imp__muted">Over ${period}. Illustrative purchasing power: what the same money could buy at ${fmtMoney(s.food.mealCost)} and ${fmtWhole(s.food.caloriesPerMeal)} calories a meal and ${fmtWhole(s.food.caloriesPerDay)} calories a day, not what anyone actually eats. Compared at about ${fmtMoney(m.coverage, false)} of coverage.</p>
          </div>
          <p class="imp__note">${note}</p>`;
      }
    } else if (im.monthly <= 0) {
      out.innerHTML = `<p class="imp__headline">At about ${fmtMoney(m.coverage, false)} of coverage, ${nameOf(alt)} costs about the same as ${nameOf(base)}.</p>`;
    } else {
      const share = im.incomeShare !== null ? `<p class="imp__share">The monthly difference is <strong>${(im.incomeShare * 100).toFixed(1)}%</strong> of a monthly income of ${fmtMoney(s.income!, false)}.</p>` : '';
      out.innerHTML = `<p class="imp__intro">Choosing ${nameOf(alt)} instead of ${nameOf(base)} costs:</p>
        <dl class="imp__money">
          <div class="imp__money-total"><dt>Over ${period}</dt><dd>${fmtMoney(im.period, false)}</dd></div>
          <div><dt>Per year</dt><dd>${fmtMoney(im.annual)}</dd></div>
          <div><dt>Per month</dt><dd>${fmtMoney(im.monthly)}</dd></div>
        </dl>
        ${share}
        <div class="imp__food">
          <h3 class="imp__food-title">How Much Food Could That Extra Premium Buy?</h3>
          <p class="imp__days"><span class="imp__days-n">${fmtWhole(im.foodDays)}</span><span class="imp__days-l">Days of food for one person</span></p>
          <div class="imp__food-pair">
            <p class="imp__stat"><span class="imp__stat-n">${fmtWhole(im.calories)}</span><span class="imp__stat-l">Calories</span></p>
            <p class="imp__stat"><span class="imp__stat-n">${fmtWhole(im.meals)}</span><span class="imp__stat-l">Meals</span></p>
          </div>
          <p class="imp__muted">Illustrative purchasing power: what the same money could buy at ${fmtMoney(s.food.mealCost)} and ${fmtWhole(s.food.caloriesPerMeal)} calories a meal and ${fmtWhole(s.food.caloriesPerDay)} calories a day, not what anyone actually eats. Compared at about ${fmtMoney(m.coverage, false)} of coverage.</p>
        </div>
        <p class="imp__note">It's a saving only if you qualify for ${nameOf(base)}${base.p.type === 'Level' ? ', which asks health questions' : ''}.</p>`;
    }

    const cell = (r: Row, month: number) => {
      const b = benefitAt(r.p, r.q.premium!, r.q.coverage!, month);
      if (b.kind === 'face') return `<td>${fmtMoney(b.amount, false)}</td>`;
      if (b.kind === 'premiums-plus-10') return `<td>${fmtMoney(b.amount, false)}<span class="imp__muted"> (premiums + 10%)</span></td>`;
      return `<td>At least ${fmtMoney(b.amount, false)}<span class="imp__muted"> (premiums + an amount set by the policy)</span></td>`;
    };
    if (!cfg.showBenefits) { benefits.innerHTML = ''; return; }
    const tr = (r: Row) => `<tr><th scope="row">${nameOf(r)}</th>${[6, 18, 25].map((mo) => cell(r, mo)).join('')}</tr>`;
    benefits.innerHTML = `<div class="imp__benefits">
      <h3 class="imp__sub">What the family receives after a death from natural causes</h3>
      <div class="imp__scroll" tabindex="0" role="region" aria-label="Benefit by month of death"><table class="imp__table"><thead><tr><th scope="col">Plan</th><th scope="col">Month 6</th><th scope="col">Month 18</th><th scope="col">Month 25+</th></tr></thead><tbody>${tr(base)}${tr(alt)}</tbody></table></div>
      <p class="imp__muted">Accidental deaths can be treated differently; the policy sets the terms. Prices from each company's published rates, Texas, as of the latest rate update.</p></div>`;
  }

  results.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === altName) state.alt = t.value;
    else if (t.name === yearsName) state.years = Number(t.value);
    else return;
    renderImpact(read());
  });
  let timer: number | undefined;
  form.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(update, 250); });
  form.addEventListener('submit', (e) => e.preventDefault());
  void update();
}

document.querySelectorAll<HTMLElement>('[data-impact]').forEach(init);
