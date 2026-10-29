// Dataset validation: the inventory rules (7 carriers, 88 questions, section
// counts, CICA variants, shared wording, Aflac 3A) and the current data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDataset } from '../../server/health-search/validate.js';

const dir = new URL('../../server/health-search/data/', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, dir), 'utf8'));
const carriers = read('carriers.json');
const concepts = read('concepts.json');
test('public configuration: 7 carriers, 88 expected, no errors; question records are not in the repository', () => {
  const r = validateDataset({ carriers, questionFiles: [], concepts }, { configOnly: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.pending.length, 6, 'every carrier except Gerber waits for its private records');
  assert.equal(carriers.carriers.length, 7);
  assert.equal(carriers.expectedQuestionTotal, 88);
  const expected = Object.fromEntries(carriers.carriers.map((c) => [c.id, c.expectedQuestionCount]));
  assert.deepEqual(expected, { 'family-benefit-life': 14, 'trinity-life': 14, 'guarantee-trust-life': 6, 'cica-life': 10, 'gerber-life': 0, aetna: 22, aflac: 22 });
});

test('approved benefit schedules are recorded exactly', () => {
  const by = Object.fromEntries(carriers.carriers.map((c) => [c.id, c]));
  const months = (c, k) => by[c].schedules[k].periods.map((p) => `${p.months}: ${p.benefit}`);
  assert.deepEqual(months('guarantee-trust-life', 'graded'), ['1-12: Return of premiums paid plus 5% interest', '13-24: 50% of the death benefit', '25 and later: 100% of the death benefit']);
  for (const c of ['aetna', 'aflac']) assert.deepEqual(months(c, 'modified'), ['1-12: Return of premiums paid plus 5% interest', '13-24: 50% of the death benefit', '25 and later: 100% of the death benefit']);
  for (const c of ['family-benefit-life', 'trinity-life']) {
    const m = months(c, 'graded');
    assert.match(m[0], /^1-12: A partial benefit that varies by age, sex and tobacco use/);
    assert.ok(!/\d+%/.test(m[0]), 'no invented first-year percentage');
    assert.deepEqual(m.slice(1), ['13-24: 50% of the death benefit', '25 and later: 100% of the death benefit']);
  }
  assert.deepEqual(months('gerber-life', 'guaranteed-issue'), ['1–24: Return of premium plus 10% interest.', '25+: 100% coverage payout.']);
  assert.ok(by['gerber-life'].guaranteedIssue);
  assert.equal(by['cica-life'].name, 'CICA Life Insurance');
  assert.equal(by['cica-life'].publicDisplay, 'named');
  assert.match(by['cica-life'].rules['guaranteed-issue-referral'].explanation, /age, state and product eligibility/);
});

// A synthetic complete dataset (placeholder wording "Q") exercises every
// inventory rule. Nothing here is carrier wording.
function synthetic() {
  const q = (carrier, section, number, extra = {}) => ({ id: `${carrier}-${section}-${number}`, section, number, text: `Q ${section} ${number}`, yes: { classification: 'decline', explanation: 'x' }, ...extra });
  const out = [];
  for (const c of ['family-benefit-life', 'trinity-life']) out.push({ carrierId: c, status: 'complete', source: 'test', questions: Array.from({ length: 14 }, (_, i) => q(c, 'Q', `${i + 1}`, { sharedKey: `k${i}` })) });
  out.push({ carrierId: 'guarantee-trust-life', status: 'complete', source: 'test', questions: Array.from({ length: 6 }, (_, i) => q('gtl', 'Q', `${i + 1}`)) });
  out.push({ carrierId: 'cica-life', status: 'complete', source: 'test', questions: Array.from({ length: 10 }, (_, i) => q('cica', 'Q', `${i + 1}`, { variant: i < 5 ? 'D-1' : 'D-2' })) });
  out.push({ carrierId: 'gerber-life', status: 'complete', source: 'test', questions: [] });
  for (const c of ['aetna', 'aflac']) {
    const qs = [];
    for (const [section, n] of [['Part A', 13], ['Part B', 5], ['Part C', 4]]) for (let i = 1; i <= n; i++) qs.push(q(c, section, i === 3 && section === 'Part A' ? '3A' : `${i}`, { sharedKey: `${section}${i}`, ...(i === 3 && section === 'Part A' ? { yes: { classification: 'decline', explanation: `You do not qualify for ${c === 'aflac' ? 'AFLAC' : 'Aetna Accendo CVS'} whole life insurance.` } } : {}) }));
    out.push({ carrierId: c, status: 'complete', source: 'test', questions: qs });
  }
  return out;
}

test('a complete dataset that follows every rule validates as complete', () => {
  const r = validateDataset({ carriers, questionFiles: synthetic(), concepts }, { requireComplete: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.total, 88);
  assert.equal(r.complete, true);
});

test('each inventory rule is enforced', () => {
  const cases = [
    [(d) => (d.find((f) => f.carrierId === 'aflac').questions.find((q) => q.number === '3A').yes.explanation = 'You do not qualify for Aetna Accendo CVS whole life insurance.'), /yes must include "AFLAC"/],
    [(d) => d.find((f) => f.carrierId === 'aetna').questions.pop(), /aetna: 21 questions, expected 22/],
    [(d) => { const a = d.find((f) => f.carrierId === 'aetna').questions; a.find((q) => q.section === 'Part C').section = 'Part B'; }, /Part B has 6 questions, expected 5/],
    [(d) => d.find((f) => f.carrierId === 'cica-life').questions.forEach((q) => (q.variant = 'D-1')), /no questions for variant D-2/],
    [(d) => (d.find((f) => f.carrierId === 'cica-life').questions[0].variant = 'D-9'), /unknown variant "D-9"/],
    [(d) => (d.find((f) => f.carrierId === 'trinity-life').questions[0].id = 'family-benefit-life-Q-1'), /duplicate question id/],
    [(d) => (d.find((f) => f.carrierId === 'aetna').questions[0].yes = { rule: 'nope' }), /rule "nope" is not defined/],
    [(d) => (d.find((f) => f.carrierId === 'aetna').questions[0].search = { direct: ['not-a-concept'] }), /unknown concept/],
    [(d) => (d.find((f) => f.carrierId === 'aetna').questions[0].yes = { classification: 'x', explanation: 'a — b' }), /em dash/],
    [(d) => (d.find((f) => f.carrierId === 'aetna').source = null), /without a recorded source/],
  ];
  for (const [mutate, expected] of cases) {
    const d = synthetic();
    mutate(d);
    const r = validateDataset({ carriers, questionFiles: d, concepts });
    assert.ok(r.errors.some((e) => expected.test(e)), `${expected}: ${r.errors.join(' | ')}`);
  }
});

test('shared wording differences beyond the carrier name are reported, not changed', () => {
  const d = synthetic();
  d.find((f) => f.carrierId === 'trinity-life').questions[2].text = 'Q different wording';
  const r = validateDataset({ carriers, questionFiles: d, concepts });
  assert.ok(r.warnings.some((w) => /share key k2 but the wording differs/.test(w)));
  // Aetna and Aflac share identical wording: nothing is flagged for them.
  assert.ok(!r.warnings.some((w) => /aetna-aflac/.test(w)));
});

test('em dashes in verbatim source wording are flagged, not rewritten', () => {
  const d = synthetic();
  d.find((f) => f.carrierId === 'aetna').questions[0].text = 'Have you — ever';
  const r = validateDataset({ carriers, questionFiles: d, concepts });
  assert.ok(r.warnings.some((w) => /em dash; kept verbatim/.test(w)));
  assert.equal(d.find((f) => f.carrierId === 'aetna').questions[0].text, 'Have you — ever');
});
