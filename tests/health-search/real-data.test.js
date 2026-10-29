// Search fixtures on the REAL carrier data. Skipped until the original
// applications are loaded (dataset status "complete"). Expectations use only
// medically supportable associations: each term must find at least one
// DIRECT match whose verbatim wording names it or a medical equivalent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../../server/health-search/dataset.generated.js';
import { prepare, search } from '../../server/health-search/search.js';

const ready = dataset.status === 'complete';
const skip = ready ? false : 'real carrier questions not loaded yet (awaiting source applications)';

test('88 records across 7 carrier identities', { skip }, () => {
  assert.equal(dataset.total, 88);
  assert.equal(dataset.carriers.length, 7);
  assert.equal(new Set(dataset.questions.map((q) => q.id)).size, 88);
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
    const direct = r.groups.flatMap((g) => g.questions).filter((q) => q.match === 'direct');
    assert.ok(direct.some((q) => wording.test(q.text)), `${term}: no direct match names it`);
  });
}

test('Gerber appears as guaranteed issue with no health questions', { skip }, () => {
  const r = search(prepare(dataset), 'COPD');
  const pages = Array.from({ length: r.totalPages }, (_, i) => search(prepare(dataset), 'COPD', { page: i + 1 }));
  assert.ok(pages.at(-1).guaranteedIssue.some((g) => /Gerber/.test(g.carrier)));
  assert.equal(dataset.questions.filter((q) => q.carrierId === 'gerber-life').length, 0);
});
