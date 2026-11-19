// Financial Impact Calculator (PREVIEW). Prices one profile through
// POST /api/impact-calculator/ and renders the comparison; all other figures
// are computed here from those premiums (src/lib/impact/calc.js).
import { VERIFIED_PRODUCTS } from '@/lib/impact/products.js';
import { impact, benefitAt, fmtMoney, fmtWhole } from '@/lib/impact/calc.js';

type Priced = { code: string; available: boolean; reason?: string; coverage?: number; premium?: number; units?: number; atColonialPennCoverage?: { coverage: number; premium: number } };
type Profile = { age: number; gender: 'male' | 'female'; tobacco: boolean; coverage: number };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const num = (v: FormDataEntryValue | null, fallback: number) => {
  const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const product = (code: string) => VERIFIED_PRODUCTS.find((p) => p.code === code)!;

function init(root: HTMLElement) {
  const cfg = JSON.parse(root.dataset.config || '{}');
  const results = root.querySelector<HTMLElement>('[data-imp-results]')!;
  const form = root.querySelector<HTMLFormElement>('[data-imp-form]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-imp-toggle]')!;
  const profileLine = root.querySelector<HTMLElement>('[data-imp-profile]')!;
  const phone = `<a href="${root.dataset.phoneHref}">${root.dataset.phoneDisplay}</a>`;
  let lastKey = '';
  let priced: Priced[] = [];
  let seq = 0;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    form.hidden = open;
  });

  const read = () => {
    const d = new FormData(form);
    const profile: Profile = { age: Number(d.get('age')), gender: d.get('gender') === 'male' ? 'male' : 'female', tobacco: d.get('tobacco') === 'yes', coverage: Number(d.get('coverage')) };
    const codes = d.getAll('codes').map(String);
    return {
      profile,
      codes: codes.length ? codes : cfg.codes,
      benchmark: String(d.get('benchmark') || cfg.benchmark),
      years: Number(d.get('years')) || cfg.years,
      income: num(d.get('income'), 0) || null,
      food: { mealCost: num(d.get('mealCost'), cfg.food.mealCost), caloriesPerMeal: num(d.get('caloriesPerMeal'), cfg.food.caloriesPerMeal), caloriesPerDay: num(d.get('caloriesPerDay'), cfg.food.caloriesPerDay) },
    };
  };

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
        priced = body.products;
        lastKey = key;
      } catch (e) {
        results.setAttribute('aria-busy', 'false');
        results.innerHTML = `<p class="imp__error">${esc((e as Error).message === 'unavailable' ? 'Prices are not available right now.' : (e as Error).message)} To compare plans by phone, call ${phone}.</p>`;
        return;
      }
    }
    render(s);
  }

  function render(s: ReturnType<typeof read>) {
    results.setAttribute('aria-busy', 'false');
    const rows = s.codes.map((c: string) => ({ p: product(c), q: priced.find((x) => x.code === c) })).filter((r: any) => r.p && r.q);
    const avail = rows.filter((r: any) => r.q.available);
    if (!avail.length) { results.innerHTML = `<p class="imp__error">None of the selected plans is available at this age.</p>`; return; }
    const max = Math.max(...avail.map((r: any) => r.q.premium));
    const bars = rows.map((r: any) => {
      const label = `${esc(r.p.carrier)} ${esc(r.p.plan)}`;
      if (!r.q.available) return `<li class="imp__bar imp__bar--na"><span class="imp__name">${label}</span><span class="imp__na">Not available: ${esc(r.q.reason || '')}</span></li>`;
      const cov = r.p.pricing === 'units' ? `${r.q.units} units = ${fmtMoney(r.q.coverage, false)} of coverage` : `${fmtMoney(r.q.coverage, false)} of coverage`;
      const bench = r.p.code === s.benchmark ? ' imp__bar--bench' : '';
      return `<li class="imp__bar${bench}"><span class="imp__name">${label}</span><span class="imp__badge imp__badge--${r.p.type === 'Level' ? 'level' : 'wait'}">${esc(r.p.timing)}</span>
        <span class="imp__track" aria-hidden="true"><span class="imp__fill" style="width:${Math.max(4, (r.q.premium / max) * 100).toFixed(1)}%"></span></span>
        <span class="imp__price">${fmtMoney(r.q.premium)}<small>/month</small></span><span class="imp__cov">${cov}</span></li>`;
    }).join('');

    // The reveal: the highest-priced available plan against the chosen comparison plan.
    const bench = avail.find((r: any) => r.p.code === s.benchmark) ?? avail.reduce((a: any, b: any) => (b.q.premium < a.q.premium ? b : a));
    const top = avail.filter((r: any) => r !== bench).reduce((a: any, b: any) => (!a || b.q.premium > a.q.premium ? b : a), null);
    let reveal = '';
    if (top) {
      const matched = top.p.pricing === 'units' && bench.q.atColonialPennCoverage ? bench.q.atColonialPennCoverage.premium : bench.q.premium;
      const im = impact(top.q.premium, matched, { years: s.years, ...s.food, monthlyIncome: s.income });
      const topName = `${esc(top.p.carrier)} ${esc(top.p.plan)}`;
      const benchName = `${esc(bench.p.carrier)} ${esc(bench.p.plan)}`;
      if (im.monthly > 0) {
        const share = im.incomeShare !== null ? `<p class="imp__share">That's <strong>${(im.incomeShare * 100).toFixed(1)}%</strong> of a monthly income of ${fmtMoney(s.income!, false)}.</p>` : '';
        reveal = `<div class="imp__reveal">
          <p class="imp__headline">${topName} costs <strong>${fmtMoney(im.monthly)} more a month</strong> than ${benchName} for about the same coverage.</p>
          <dl class="imp__totals"><div><dt>Per year</dt><dd>${fmtMoney(im.annual, false)}</dd></div><div><dt>5 years</dt><dd>${fmtMoney(im.totals[5], false)}</dd></div><div><dt>10 years</dt><dd>${fmtMoney(im.totals[10], false)}</dd></div><div><dt>20 years</dt><dd>${fmtMoney(im.totals[20], false)}</dd></div></dl>
          <div class="imp__food">
            <p class="imp__food-big"><span>${fmtWhole(im.foodDays)} days</span> of food for one person</p>
            ${im.foodDays >= 60 ? `<p class="imp__food-days">That's about <strong>${fmtWhole(Math.round(im.foodDays / (365 / 12)))} months</strong> of meals.</p>` : ''}
            <p class="imp__food-lead">About <strong>${fmtWhole(im.calories)} calories</strong> in all (${fmtWhole(im.meals)} meals).</p>
            <p class="imp__food-lead">Paid for by the ${fmtMoney(im.monthly)} monthly difference over ${im.years} years, ${fmtMoney(im.period, false)} in all.</p>
            <p class="imp__muted">This shows what the same money could buy, not what anyone actually eats. Based on ${fmtMoney(s.food.mealCost)} and ${fmtWhole(s.food.caloriesPerMeal)} calories per meal, and ${fmtWhole(s.food.caloriesPerDay)} calories a day. Change these under "Change the comparison".</p>
          </div>
          ${share}
          <p class="imp__note">The difference is a real saving only if you qualify for ${benchName}, which asks health questions.</p>
        </div>`;
      }
    }

    const months = [6, 18, 25];
    const benefitRows = avail.map((r: any) => {
      const cells = months.map((m) => {
        const b = benefitAt(r.p, r.q.premium, r.q.coverage, m);
        if (b.kind === 'face') return `<td>${fmtMoney(b.amount, false)}<span class="imp__muted"> full benefit</span></td>`;
        if (b.kind === 'premiums-plus-10') return `<td>${fmtMoney(b.amount)}<span class="imp__muted"> premiums paid plus 10%</span></td>`;
        return `<td>At least ${fmtMoney(b.amount)}<span class="imp__muted"> premiums paid plus an amount set by the policy</span></td>`;
      }).join('');
      return `<tr><th scope="row">${esc(r.p.carrier)} ${esc(r.p.plan)}</th>${cells}</tr>`;
    }).join('');

    results.innerHTML = `<ul class="imp__bars">${bars}</ul>${reveal}
      <h3 class="imp__sub">If death from natural causes happens in…</h3>
      <div class="imp__scroll" tabindex="0" role="region" aria-label="Benefit by month of death"><table class="imp__table"><thead><tr><th scope="col">Plan</th><th scope="col">Month 6</th><th scope="col">Month 18</th><th scope="col">Month 25 or later</th></tr></thead><tbody>${benefitRows}</tbody></table></div>
      <p class="imp__muted">Accidental deaths can be treated differently; the policy sets the terms. Prices from each company's published rates, Texas, as of the latest rate update.</p>`;
  }

  let t: number | undefined;
  form.addEventListener('input', () => { window.clearTimeout(t); t = window.setTimeout(update, 250); });
  form.addEventListener('submit', (e) => e.preventDefault());
  void update();
}

document.querySelectorAll<HTMLElement>('[data-impact]').forEach(init);
