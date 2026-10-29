// Search behavior on the fictional sample dataset (ranking, labeling,
// grouping, pagination, typos, empty states). Real-data fixtures are in
// real-data.test.js and run once the carrier questions are loaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepare, search, detectConcepts } from '../../server/health-search/search.js';
import { sampleDataset } from '../../server/health-search/sample-dataset.js';
import { normalize, tokens, editDistance } from '../../server/health-search/normalize.js';

const prep = prepare(sampleDataset);
const flat = (r) => r.groups.flatMap((g) => g.questions.map((q) => ({ carrier: g.carrier, ...q })));

test('normalization folds case, punctuation, accents and plurals', () => {
  assert.equal(normalize("Alzheimer's  Disease!"), 'alzheimers disease');
  assert.equal(normalize('A-Fib'), 'a fib');
  assert.deepEqual(tokens('I had two Stents'), ['two', 'stent']);
  assert.equal(editDistance('emphazema', 'emphysema', 2), 2);
  assert.equal(editDistance('copd', 'cpod', 1), 1);
});

test('medical equivalents are direct; connected conditions are related', () => {
  const r = search(prep, 'myocardial infarction');
  const hits = flat(r);
  const direct = hits.filter((h) => h.match === 'direct');
  assert.ok(direct.some((h) => /heart attack/.test(h.text)), 'MI matches a question that says heart attack');
  for (const h of hits.filter((x) => x.match === 'related')) {
    assert.ok(!/heart attack/i.test(h.text));
    assert.match(h.because, /^Related:/);
  }
});

test('direct matches rank before related ones, and carriers with direct matches come first', () => {
  const r = search(prep, 'stent');
  assert.equal(r.groups[0].carrier, 'Sample Carrier B');
  assert.equal(r.groups[0].questions.find((q) => q.text.includes('stent')).match, 'direct');
  assert.ok(r.directCount >= 1);
});

test('inside a carrier: direct matches first, each kind in the source order, with original numbers', () => {
  for (const term of ['heart', 'copd', 'heart attack']) {
    for (const g of search(prep, term).groups) {
      const kinds = g.questions.map((q) => q.match);
      assert.deepEqual(kinds, [...kinds].sort((a, b) => (a === b ? 0 : a === 'direct' ? -1 : 1)), term);
      for (const kind of ['direct', 'related']) {
        const nums = g.questions.filter((q) => q.match === kind).map((q) => `${q.section} ${q.number}`);
        const src = sampleDataset.questions.filter((q) => g.questions.some((x) => x.match === kind && x.text === q.text)).map((q) => `${q.section} ${q.number}`);
        assert.deepEqual(nums, src, `${term} ${kind}`);
      }
    }
  }
});

test('typos and plain-language synonyms are understood', () => {
  for (const [q, expect] of [['emphazema', /emphysema/], ['diabetis insulin', /insulin/], ['strok', /stroke/], ['oxygen tank', /oxygen/], ['mini stroke', /TIA/], ['kidney dialysis', /dialysis/]]) {
    assert.ok(flat(search(prep, q)).some((h) => h.match === 'direct' && expect.test(h.text)), q);
  }
});

test('an indicator (medication) alone never produces a direct match', () => {
  const found = detectConcepts(prep, 'metformin');
  assert.equal(found.get('diabetes')?.via, 'indicator');
  for (const h of flat(search(prep, 'metformin'))) assert.equal(h.match, 'related');
});

test('outcomes come from the carrier rules; schedules are attached where used', () => {
  const r = search(prep, 'copd');
  const g = r.groups.find((x) => x.carrier === 'Sample Carrier A');
  const q = g.questions.find((x) => x.section === 'Part B');
  assert.equal(q.yes.classification, 'modified');
  assert.equal(g.schedules[0].label, 'Modified benefit (sample)');
});

test('guaranteed issue carriers are shown with every search that finds matches', () => {
  const r = search(prep, 'copd');
  assert.equal(r.guaranteedIssue[0].carrier, 'Sample Guaranteed Issue Co.');
  assert.equal(search(prep, 'hip replacement').guaranteedIssue.length, 0);
});

test('empty and short queries, and no-match queries', () => {
  assert.equal(search(prep, '').ok, false);
  assert.equal(search(prep, 'a').ok, false);
  assert.equal(search(prep, 'the of and').ok, false);
  const none = search(prep, 'hip replacement');
  assert.equal(none.ok, true);
  assert.equal(none.matchCount, 0);
});

test('pagination splits carrier groups and clamps out-of-range pages', () => {
  const many = { ...sampleDataset, carriers: [...sampleDataset.carriers], questions: [...sampleDataset.questions] };
  for (let i = 0; i < 5; i++) {
    many.carriers.push({ ...sampleDataset.carriers[0], id: `extra-${i}`, name: `Extra ${i}`, displayOrder: 10 + i });
    many.questions.push({ ...sampleDataset.questions[4], id: `x-${i}`, carrierId: `extra-${i}` });
  }
  const p = prepare(many);
  const r1 = search(p, 'copd', { page: 1 });
  assert.equal(r1.groups.length, 3);
  assert.ok(r1.totalPages >= 2);
  assert.equal(r1.guaranteedIssue.length, 0, 'guaranteed issue card is on the last page');
  const last = search(p, 'copd', { page: 99 });
  assert.equal(last.page, r1.totalPages);
});

test('anonymized carriers are never named', () => {
  const anon = { ...sampleDataset, carriers: sampleDataset.carriers.map((c) => (c.id === 'sample-a' ? { ...c, publicDisplay: 'anonymized', anonymizedName: 'One insurance company' } : c)) };
  const r = search(prepare(anon), 'copd');
  assert.ok(JSON.stringify(r).includes('One insurance company'));
  assert.ok(!JSON.stringify(r).includes('Sample Carrier A'));
});
