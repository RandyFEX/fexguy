// Funeral savings calculator (Randy, November 2026, article rewrite V1.0):
// "How long would it take to save for your funeral?" Page Markdown places
// <div data-savings-calculator></div>; savingsCalculatorPlugin replaces it at
// build time (like quote-form-plugin.ts and coverage/unit-table.ts) with the
// markup, its scoped styles and a small inline script. The default state
// ($10,000 goal, $50 a month) is rendered on the server, so the results show
// without JavaScript. No dependencies, no tracking, no network requests.
//
// Months required = ceil(goal / monthly), assuming the same deposit every
// month with no interest and no withdrawals (disclosed under the results).

export const SAVINGS_GOALS = [5000, 10000, 15000] as const;
export const MONTHLY_AMOUNTS = [25, 50, 75, 100, 125, 150, 175, 200] as const;
export const DEFAULT_GOAL = 10000;
export const DEFAULT_MONTHLY = 50;
export const MILESTONE_YEARS = [1, 2, 5, 10] as const;

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Months needed to reach the goal: the goal divided by the monthly amount, rounded up. */
export const monthsToGoal = (goal: number, monthly: number) => Math.ceil(goal / monthly);

/** "16 years and 8 months", "4 years", "10 months". */
export function durationText(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return [y ? part(y, 'year') : '', m ? part(m, 'month') : ''].filter(Boolean).join(' and ');
}

function milestoneRow(years: number, goal: number, monthly: number): string {
  const saved = monthly * 12 * years;
  const pct = Math.min(100, Math.round((saved / goal) * 100));
  const reached = saved >= goal;
  return (
    `<li class="fsc__row${reached ? ' is-reached' : ''}" data-years="${years}">` +
    `<span class="fsc__row-label">After ${years} year${years === 1 ? '' : 's'}</span>` +
    `<span class="fsc__row-value" data-saved>${money(saved)}</span>` +
    `<span class="fsc__bar" aria-hidden="true"><span class="fsc__fill" style="width:${pct}%"></span></span>` +
    `<span class="fsc__row-pct" data-pct>${reached ? 'Goal reached' : `${pct}% of goal`}</span>` +
    `</li>`
  );
}

export function savingsCalculatorHtml(): string {
  const goal = DEFAULT_GOAL;
  const monthly = DEFAULT_MONTHLY;
  const months = monthsToGoal(goal, monthly);
  const goalChoices = SAVINGS_GOALS.map(
    (g) =>
      `<label class="fsc__choice"><input type="radio" name="fsc-goal" value="${g}"${g === goal ? ' checked' : ''}><span>${money(g)}</span></label>`,
  ).join('');
  const monthlyChoices = MONTHLY_AMOUNTS.map(
    (a) =>
      `<label class="fsc__choice"><input type="radio" name="fsc-monthly" value="${a}"${a === monthly ? ' checked' : ''}><span>${money(a)}</span></label>`,
  ).join('');
  return `<section class="fsc" data-fsc aria-labelledby="fsc-title" data-pagefind-ignore>
<h3 class="fsc__title" id="fsc-title">How long would it take to save for your funeral?</h3>
<form class="fsc__form" onsubmit="return false">
<fieldset class="fsc__group"><legend>Savings goal</legend><div class="fsc__choices fsc__choices--goal">${goalChoices}</div></fieldset>
<fieldset class="fsc__group"><legend>Monthly savings</legend><div class="fsc__choices fsc__choices--monthly">${monthlyChoices}</div></fieldset>
</form>
<div class="fsc__result" aria-live="polite">
<p class="fsc__answer">Saving <strong data-monthly>${money(monthly)}</strong> a month, it takes <strong data-duration>${durationText(months)}</strong> to reach <strong data-goal>${money(goal)}</strong>.</p>
<ul class="fsc__rows" role="list">${MILESTONE_YEARS.map((y) => milestoneRow(y, goal, monthly)).join('')}</ul>
</div>
<p class="fsc__note">Assumes the same deposit every month, with no interest and no withdrawals.</p>
</section>
<style>
.fsc{margin:1.5rem 0;padding:1.25rem;border:1px solid var(--color-border,#ddd7ca);border-top:4px solid var(--home-gold,#b68a35);border-radius:var(--radius,.5rem);background:var(--color-surface,#efebe2)}
.fsc .fsc__title{margin:0 0 1rem;font-size:1.25rem;line-height:1.3;color:var(--color-primary,#173f35)}
.fsc__group{margin:0 0 1rem;padding:0;border:0;min-width:0}
.fsc__group legend{padding:0;margin-bottom:.5rem;font-weight:700;color:var(--color-text,#202522)}
.fsc__choices{display:grid;gap:.5rem}
.fsc__choices--goal{grid-template-columns:repeat(3,1fr)}
.fsc__choices--monthly{grid-template-columns:repeat(4,1fr)}
.fsc__choice{display:block;margin:0;cursor:pointer}
.fsc__choice input{position:absolute;opacity:0;width:1px;height:1px}
.fsc__choice span{display:flex;align-items:center;justify-content:center;min-height:var(--tap-target,2.75rem);padding:.25rem;border:1px solid #8a8f8b;border-radius:var(--radius,.5rem);background:#fff;font-weight:600;color:var(--color-text,#202522)}
.fsc__choice input:checked+span{background:var(--color-primary,#173f35);border-color:var(--color-primary,#173f35);color:#fff}
.fsc__choice input:focus-visible+span{outline:3px solid var(--color-focus,#1a1a1a);outline-offset:2px}
.fsc__result{padding:1rem;border-radius:var(--radius,.5rem);background:#fff}
.fsc .fsc__answer{margin:0 0 1rem;font-size:1.125rem;line-height:1.45}
.fsc__answer strong{color:var(--color-primary,#173f35)}
.fsc ul.fsc__rows{margin:0;padding:0 !important;list-style:none}
.fsc ul.fsc__rows li.fsc__row{margin-left:0;padding-left:0;display:grid;grid-template-columns:1fr auto;gap:.25rem .75rem;margin:0 0 .875rem;padding:0}
.fsc ul.fsc__rows li.fsc__row::before{content:none;display:none}
.fsc__row-label{font-weight:600}
.fsc__row-value{font-weight:700;color:var(--color-primary,#173f35);text-align:right}
.fsc__bar{grid-column:1/-1;display:block;height:.875rem;border-radius:999px;background:#e4e0d6;overflow:hidden}
.fsc__fill{display:block;height:100%;border-radius:999px;background:var(--color-primary,#173f35)}
.fsc__row.is-reached .fsc__fill{background:var(--home-gold,#b68a35)}
.fsc__row-pct{grid-column:1/-1;font-size:.875rem;color:var(--color-text-muted,#555b57)}
.fsc .fsc__note{margin:.75rem 0 0;font-size:.875rem;color:var(--color-text-muted,#555b57)}
@media (max-width:23rem){.fsc__choices--monthly{grid-template-columns:repeat(2,1fr)}}
</style>
<script>
(function(){
  var root=document.querySelector('[data-fsc]');if(!root)return;
  var years=[${MILESTONE_YEARS.join(',')}];
  var money=function(n){return '$'+n.toLocaleString('en-US');};
  var part=function(n,u){return n+' '+u+(n===1?'':'s');};
  var duration=function(m){var y=Math.floor(m/12),r=m%12;return [y?part(y,'year'):'',r?part(r,'month'):''].filter(Boolean).join(' and ');};
  var val=function(name){var el=root.querySelector('input[name="'+name+'"]:checked');return el?Number(el.value):0;};
  function update(){
    var goal=val('fsc-goal'),monthly=val('fsc-monthly');if(!goal||!monthly)return;
    root.querySelector('[data-goal]').textContent=money(goal);
    root.querySelector('[data-monthly]').textContent=money(monthly);
    root.querySelector('[data-duration]').textContent=duration(Math.ceil(goal/monthly));
    years.forEach(function(y){
      var row=root.querySelector('[data-years="'+y+'"]');var saved=monthly*12*y;
      var pct=Math.min(100,Math.round(saved/goal*100));var reached=saved>=goal;
      row.classList.toggle('is-reached',reached);
      row.querySelector('[data-saved]').textContent=money(saved);
      row.querySelector('.fsc__fill').style.width=pct+'%';
      row.querySelector('[data-pct]').textContent=reached?'Goal reached':pct+'% of goal';
    });
  }
  root.addEventListener('change',update);
})();
</script>`;
}

const MARKER = '<div data-savings-calculator></div>';

export const savingsCalculatorPlugin = {
  name: 'fexguy-savings-calculator',
  // Raw HTML in Markdown reaches the HTML tree as `raw` nodes.
  raw(node: { type: 'raw'; value: string }) {
    if (!node.value.includes(MARKER)) return;
    // A function replacement, so the "$'" in the script isn't read as a replacement pattern.
    return { type: 'raw' as const, value: node.value.replaceAll(MARKER, () => savingsCalculatorHtml()) };
  },
};
