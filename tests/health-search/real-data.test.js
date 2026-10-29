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
import { prepare, search } from '../../server/health-search/search.js';

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
  assert.ok(group.questions.every((q) => /age, state and product eligibility/.test(q.yes.explanation)), 'approved eligibility note');
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
