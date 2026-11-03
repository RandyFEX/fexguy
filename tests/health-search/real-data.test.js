// Acceptance fixtures on the REAL carrier records. They are never in this
// public repository: these tests read the local private copy
// (server/health-search/private/questions/, git-ignored, e.g. exported with
// `npm run health-search:publish -- --export`) and are skipped without it.
// Each term must find at least one DIRECT match whose verbatim wording names
// it or a medical equivalent (medically supportable associations only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { config } from '../../server/health-search/config.generated.js';
import { checkPayload } from '../../server/health-search/question-store.js';
import { buildPayload } from '../../server/health-search/publish.js';
import { prepare, search, answerRows, LUCK, tidyLine } from '../../server/health-search/search.js';

const dir = new URL('../../server/health-search/private/questions/', import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))) : [];
const read = (p) => JSON.parse(readFileSync(new URL(`../../server/health-search/data/${p}`, import.meta.url), 'utf8'));
const built = files.length ? buildPayload(read('carriers.json'), read('concepts.json'), files, 'production') : null;
const skip = built?.ok ? false : files.length ? `private records do not validate yet: ${built?.result.errors.slice(0, 2).join(' | ')}` : 'real records not available locally (private, not in this repository)';
const dataset = built?.payload ? { carriers: config.carriers, concepts: config.concepts, questions: built.payload.questions } : null;

test('88 records across 7 carrier identities, complete and valid', { skip }, () => {
  const check = checkPayload(built.payload, config);
  assert.deepEqual(check.errors, []);
  assert.equal(check.complete, true);
  assert.equal(check.total, 88);
  assert.equal(config.carriers.length, 7);
  assert.equal(new Set(built.payload.questions.map((q) => q.id)).size, 88);
});

const FIXTURES = [
  ['heart attack', /heart attack|myocardial infarction/i],
  ['stent', /stent/i],
  ['COPD', /COPD|chronic obstructive/i],
  ['oxygen', /oxygen/i],
  ['insulin', /insulin/i],
  ['stroke', /stroke|cerebrovascular/i],
  ['kidney dialysis', /dialysis/i],
  ['congestive heart failure', /congestive heart failure|heart failure/i],
  ['Alzheimers', /alzheimer|dementia/i],
  ['HIV', /HIV|AIDS|immune deficiency/i],
];

for (const [term, wording] of FIXTURES) {
  test(`fixture: "${term}" finds a direct match that names it`, { skip }, () => {
    const r = search(prepare(dataset), term);
    assert.ok(r.ok && r.directCount > 0, `${term}: no direct match`);
    const pages = Array.from({ length: r.totalPages }, (_, i) => search(prepare(dataset), term, { page: i + 1 }));
    const direct = pages.flatMap((p) => p.groups.flatMap((g) => g.questions)).filter((q) => q.match === 'direct');
    assert.ok(direct.some((q) => wording.test(q.text)), `${term}: no direct match names it`);
  });
}

test('CICA Life Insurance is named, with D-1 and D-2 kept separate', { skip }, () => {
  const cica = built.payload.questions.filter((q) => q.carrierId === 'cica-life');
  assert.equal(cica.length, 10);
  const d = cica.filter((q) => q.number === 'D');
  assert.deepEqual(d.map((q) => q.variant), ['D-1', 'D-2'], 'question D has two separate versions');
  assert.notEqual(d[0].text, d[1].text);
  const r = search(prepare(dataset), 'COPD');
  const pages = Array.from({ length: r.totalPages }, (_, i) => search(prepare(dataset), 'COPD', { page: i + 1 }));
  const group = pages.flatMap((p) => p.groups).find((g) => g.carrier === 'CICA Life Insurance');
  assert.ok(group, 'named exactly "CICA Life Insurance"');
  assert.ok(group.questions.some((q) => q.variant === 'D-1') && group.questions.some((q) => q.variant === 'D-2'));
  assert.ok(group.questions.every((q) => q.answers.some((a) => a.answer === 'YES' && a.details.some((d) => /age, state and product eligibility/.test(d)))), 'approved eligibility note');
});

test('every record keeps Randy\'s wording line for line', { skip }, () => {
  const src = readFileSync(new URL('../../server/health-search/private/source/' + built.payload.questions[0].source.document, import.meta.url), 'utf8').split(/\r?\n/).map((l) => l.trim());
  for (const q of built.payload.questions) {
    const header = src[q.source.line - 1];
    assert.ok(header.endsWith(': ' + q.text), `${q.id}: question text`);
    for (const side of ['info', 'yes', 'no']) {
      const o = q[side];
      if (!o) continue;
      const lines = (q.corrections?.find((c) => c.side === side) ? o.explanation.replace(q.corrections.find((c) => c.side === side).to, q.corrections.find((c) => c.side === side).from) : o.explanation).split('\n');
      const at = src.indexOf(lines[0], q.source.line);
      assert.ok(at > 0, `${q.id} ${side}: first line found`);
      assert.deepEqual(src.slice(at, at + lines.length), lines, `${q.id} ${side}: lines in order`);
    }
  }
});

test('Aflac Part A 3A carries the correction and is flagged for confirmation', { skip }, () => {
  const q = built.payload.questions.find((x) => x.id === 'aflac-A-3A');
  assert.match(q.yes.explanation, /AFLAC/);
  assert.doesNotMatch(q.yes.explanation, /Aetna/);
  assert.equal(q.corrections.length, 1);
});

test('Gerber appears as guaranteed issue with no health questions', { skip }, () => {
  const r = search(prepare(dataset), 'COPD');
  const last = search(prepare(dataset), 'COPD', { page: r.totalPages });
  assert.ok(last.guaranteedIssue.some((g) => /Gerber/.test(g.carrier)));
  assert.equal(built.payload.questions.filter((q) => q.carrierId === 'gerber-life').length, 0);
});

test('carrier names narrow the real results and never list a whole carrier', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  for (const name of ['Aflac', 'aetna', 'CICA', 'Trinity', 'Family Benefit Life', 'Guarantee Trust', 'Gerber']) {
    const r = search(prep, name);
    assert.equal(r.ok, false, name);
    assert.equal(r.reason, 'carrier-only', name);
  }
  const aflac = search(prep, 'Aflac COPD');
  assert.ok(aflac.ok && aflac.groups.length === 1 && aflac.groups[0].carrier === 'Aflac');
  assert.ok(aflac.groups[0].questions.some((q) => q.match === 'direct' && /chronic obstructive pulmonary disease/i.test(q.text)));
  const trinity = search(prep, 'trinity heart attack');
  assert.ok(trinity.groups.every((g) => g.carrier === 'Trinity Life'));
});

test('common consumer searches reach the right questions', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  const direct = (q) => search(prep, q).groups.flatMap((g) => g.questions.filter((x) => x.match === 'direct').map((x) => `${g.carrier}|${x.number}`));
  assert.ok(direct('chemo').includes('Guarantee Trust Life|3'), 'chemo finds the chemotherapy question');
  assert.ok(direct('depression').some((k) => k.startsWith('CICA Life Insurance|')), 'depression finds the mental disorder question');
  assert.ok(direct('pending surgery').includes('Family Benefit Life|9'), 'pending surgery finds the not-yet-done surgery question');
  // A medication only ever produces RELATED matches.
  const sub = search(prep, 'suboxone');
  assert.ok(sub.matchCount > 0 && sub.directCount === 0);
});

test('outcomes that point to a modified or graded plan show its approved payout schedule', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  const groups = (q) => [1, 2, 3].flatMap((page) => search(prep, q, { page }).groups ?? []);
  const label = (q, carrier) => groups(q).find((g) => g.carrier === carrier)?.schedules.map((s) => s.label) ?? [];
  assert.ok(label('heart attack', 'Aflac').includes('Modified benefit'), 'Aflac modified schedule');
  assert.ok(label('heart attack', 'Family Benefit Life').includes('Graded benefit'), 'FBL graded schedule');
  assert.ok(label('cancer', 'Guarantee Trust Life').includes('Graded benefit'), 'GTL graded schedule');
  // A question whose outcomes never point to a reduced plan shows no schedule.
  assert.deepEqual(label('hiv', 'Family Benefit Life'), []);
});

test('answer rows keep every approved line, on the right YES/NO, and add nothing new', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  const SECTION = /^[A-Z][A-Z -]*? COVERAGE:$/;
  const carrierLines = new Map();
  for (const q of dataset.questions) {
    const set = carrierLines.get(q.carrierId) ?? new Set();
    for (const o of [q.yes, q.no]) for (const l of (o?.explanation ?? '').split('\n')) set.add(tidyLine(l.trim()));
    carrierLines.set(q.carrierId, set);
  }
  let multi = 0;
  for (const q of dataset.questions) {
    const carrier = prep.carrierById.get(q.carrierId);
    for (const [key, A] of [['yes', 'YES'], ['no', 'NO']]) {
      const o = q[key];
      if (!o) continue;
      const rows = answerRows(carrier, A, o, prep.planLines.get(q.carrierId) ?? {});
      assert.ok(rows.length >= 1, `${q.id} ${A} has a row`);
      assert.ok(rows.every((r) => r.answer === A), `${q.id} ${A} rows keep the answer`);
      const lines = (o.explanation ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
      const sections = lines.filter((l) => SECTION.test(l)).length;
      if (sections > 1) { multi++; assert.equal(rows.length, sections, `${q.id} ${A}: one row per approved outcome`); }
      // "You're in luck!" opens the call line of first-day rows only.
      for (const r of rows) for (const d of r.details) if (d.startsWith(LUCK)) assert.match(r.primary, /^First-day\b/, `${q.id} ${A}: luck only on first-day rows`);
      for (const r of rows) if (/^(Graded|Modified)\b|not qualify|Guaranteed Issue/i.test(r.primary)) assert.ok(!r.details.some((d) => d.startsWith(LUCK)), `${q.id} ${A}: no luck on ${r.primary}`);
      const unluck = (d) => (d.startsWith(LUCK) ? d.slice(LUCK.length) : d);
      const shown = rows.flatMap((r) => [r.primary, ...r.details.map(unluck)]);
      for (const l of lines) {
        if (SECTION.test(l)) continue;
        if (sections > 1 && /coverage may be available\.?$/.test(l) && / or /.test(l)) continue; // distributed into the rows
        const t = tidyLine(l);
        assert.ok(shown.includes(t) || shown.includes(t.replace(/\.$/, '')), `${q.id} ${A}: line kept: ${l.slice(0, 40)}`);
      }
      const rule = o.rule ? carrier.rules[o.rule]?.explanation : null;
      for (const r of rows) for (const d of r.details.map(unluck)) {
        assert.ok(carrierLines.get(q.carrierId).has(d) || d === rule, `${q.id} ${A}: detail comes from the approved wording: ${d.slice(0, 40)}`);
      }
      assert.ok(!shown.some((x) => SECTION.test(x)), `${q.id} ${A}: no COVERAGE subheading`);
    }
  }
  assert.ok(multi > 0, 'multi-outcome answers exist and are split');
});

test('COPD and related terms show every matching carrier, Aetna and Aflac included, on the first page', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  for (const term of ['COPD', 'emphysema', 'chronic bronchitis', 'chronic obstructive pulmonary disease', 'lung disease', 'asthma']) {
    const r = search(prep, term);
    assert.equal(r.totalPages, 1, `${term}: one page`);
    const names = r.groups.map((g) => g.carrier);
    for (const c of ['Aetna (Accendo, a CVS Health company)', 'Aflac']) {
      const g = r.groups.find((x) => x.carrier === c);
      assert.ok(g, `${term}: ${c} shown`);
      assert.ok(g.questions.some((q) => /chronic respiratory condition/.test(q.text)), `${term}: ${c} respiratory question`);
    }
    assert.ok(names.length >= 4, term);
  }
  // Every search that finds matches shows all of them on page 1.
  for (const term of ['heart attack', 'cancer', 'stroke', 'surgery', 'treatment', 'oxygen', 'insulin']) assert.equal(search(prep, term).totalPages, 1, term);
});

test('"You\'re in luck!" appears on first-day call lines only', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  const rows = search(prep, 'Trinity heart attack').groups.flatMap((g) => g.questions.flatMap((q) => q.answers));
  const firstDay = rows.find((r) => r.primary === 'First-day coverage may be available');
  assert.ok(firstDay && firstDay.details[0] === "You're in luck! Call 888-862-9456 to qualify.");
  assert.ok(rows.filter((r) => /^Graded/.test(r.primary)).every((r) => !r.details.some((d) => d.startsWith(LUCK))));
});

test('payout lines show no dashes: "Months 1 to 12", "Month 25 onward"', { skip }, () => {
  const prep = prepare(/** @type {any} */ (dataset));
  const r = search(prep, 'Guarantee Trust cancer');
  const rows = r.groups.flatMap((g) => g.questions.flatMap((q) => q.answers));
  const graded = rows.find((x) => x.primary === 'Graded coverage');
  assert.deepEqual(graded.details, [
    'Call 888-862-9456 to compare first-day coverage options.',
    'Months 1 to 12: Return of premium plus 5% interest.',
    'Months 13 to 24: 50% coverage payout.',
    'Month 25 onward: 100% coverage payout.',
  ]);
  const everything = JSON.stringify(['COPD', 'heart attack', 'cancer', 'oxygen', 'diabetes', 'stroke', 'hiv'].map((t) => search(prep, t)));
  assert.doesNotMatch(everything, /[\u2013\u2014]/, 'no en or em dash anywhere in API results');
});
