// Colonial Penn coverage-per-unit tables (male and female), shared by both
// Colonial Penn review pages. Page Markdown places them with
// <div data-unit-table="colonial-penn"></div> (replaced at build time by
// unitTablePlugin below, like quote-form-plugin.ts). Data:
// src/data/colonial-penn-units.json (Randy's workbook, value for value).
// Styles: .unit-table in src/styles/global.css. Narrow screens scroll the
// table inside its own container (src/scripts/scroll-tables.ts adds the
// "Scroll →" hint and keyboard access only while it overflows).
import data from '../../data/colonial-penn-units.json';

type Row = { age: number; perUnit: number; units: number[]; coverage: number[] };

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Shown in both cells of a target that needs more than data.maxUnits units
 *  (the data keeps the calculated values). An en dash: the site bans em
 *  dashes (CLAUDE.md; npm run verify fails on them). */
const UNAVAILABLE = '\u2013';

/** The advertised price of one unit, in cents; COST = units x $9.95. */
const UNIT_PRICE_CENTS = 995;
const cost = (units: number) => `$${((units * UNIT_PRICE_CENTS) / 100).toFixed(2)}`;

/** Fails the build if a row's units or coverage don't follow from its per-unit amount. */
function check(sex: string, rows: Row[]): void {
  rows.forEach((r) => {
    data.targets.forEach((t, i) => {
      const units = Math.ceil(t / r.perUnit);
      if (r.units[i] !== units || r.coverage[i] !== units * r.perUnit) {
        throw new Error(`colonial-penn-units.json: ${sex} age ${r.age}, ${money(t)} target doesn't match ${money(r.perUnit)} per unit`);
      }
    });
  });
}

function table(sex: 'male' | 'female', label: string): string {
  const rows = data[sex] as Row[];
  check(sex, rows);
  const id = `cp-units-${sex}`;
  const max = data.maxUnits;
  let over = false;
  const groups = data.targets
    .map((t, i) => `<th scope="colgroup" colspan="3" class="unit-table__g${i % 2 ? '' : ' is-shaded'}">${money(t)}</th>`)
    .join('');
  const sub = data.targets
    .map((_, i) => {
      const s = i % 2 ? '' : ' is-shaded';
      return `<th scope="col" class="unit-table__g${s}">UNITS</th><th scope="col" class="${s.trim()}">COST</th><th scope="col" class="${s.trim()}">COVERAGE</th>`;
    })
    .join('');
  const body = rows
    .map((r) => {
      const cells = data.targets
        .map((_, i) => {
          const s = i % 2 ? '' : ' is-shaded';
          const beyond = r.units[i] > max;
          over ||= beyond;
          const o = beyond ? ' is-over' : '';
          const na = `<span aria-hidden="true">${UNAVAILABLE}</span><span class="visually-hidden">not available</span>`;
          const units = beyond ? na : `${r.units[i]}`;
          const monthly = beyond ? na : cost(r.units[i]);
          const coverage = beyond ? na : money(r.coverage[i]);
          const c = (s + o).trim();
          return `<td class="unit-table__g${s}${o}">${units}</td><td class="${c}">${monthly}</td><td class="${c}">${coverage}</td>`;
        })
        .join('');
      return `<tr><th scope="row">${r.age}</th><td class="unit-table__unit">${money(r.perUnit)}</td>${cells}</tr>`;
    })
    .join('');
  const note = over
    ? `<p class="unit-table__note">${UNAVAILABLE} means that coverage amount cannot be reached within Colonial Penn's advertised ${max}-unit maximum.</p>`
    : '';
  return (
    `<div class="unit-table">` +
    `<h4 id="${id}">${label}</h4>` +
    `<div class="unit-table__scroll" role="region" aria-labelledby="${id}" data-scroll-region>` +
    `<table class="unit-table__table">` +
    `<thead><tr><th scope="col" rowspan="2" class="unit-table__age">AGE</th><th scope="col" rowspan="2" class="unit-table__unit">1 UNIT</th>${groups}</tr>` +
    `<tr>${sub}</tr></thead>` +
    `<tbody>${body}</tbody></table></div>${note}</div>`
  );
}

export function colonialPennUnitTablesHtml(): string {
  return table('male', 'Male Coverage - Colonial Penn $9.95 Plan') + table('female', 'Female Coverage - Colonial Penn $9.95 Plan');
}

const MARKER = '<div data-unit-table="colonial-penn"></div>';

export const unitTablePlugin = {
  name: 'fexguy-unit-table',
  // Raw HTML in Markdown reaches the HTML tree as `raw` nodes.
  raw(node: { type: 'raw'; value: string }) {
    if (!node.value.includes(MARKER)) return;
    return { type: 'raw' as const, value: node.value.replaceAll(MARKER, colonialPennUnitTablesHtml()) };
  },
};
