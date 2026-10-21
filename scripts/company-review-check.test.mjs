// Tests for scripts/company-review-check.mjs (run: node --test scripts/company-review-check.test.mjs).
//
// Scenarios 1 to 18 use the real Lincoln Heritage history as git objects:
// 9f4e5bb and 825242a are on main; 21797ee, 1485347, 245940a, f99e0f6 and
// d5fcefe are reachable through origin/content/lincoln-heritage-company-review
// (PR #15 was squash-merged). The negative tests mutate the approved
// 825242a version in memory, so they need only main. Nothing is written.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  ROOT, check, classify, diffArticles, extractQuickAnswer, loadConfig, loadPage,
  outlineFindings, parseArticle, readAt, report, warnings,
} from './company-review-check.mjs';

const PAGE = '/lincoln-heritage-funeral-advantage-review/';
const FILE = 'src/content/pages/lincoln-heritage-funeral-advantage-review.md';
const cfg = loadConfig();
const pageCfg = cfg.pages[PAGE];
const GOV = 'Is Funeral Advantage a government program?';

function requireCommit(ref) {
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
  } catch {
    throw new Error(`Historical commit ${ref} is not available. Fetch it first: git fetch origin content/lincoln-heritage-company-review main`);
  }
}
const at = (ref) => { requireCommit(ref); return loadPage(ref, PAGE, pageCfg); };
const run = (base, target, approval = {}) => classify(diffArticles(base, target), approval, target);
const status = (changes, s) => changes.filter((c) => c.status === s);
const sectionsOf = (changes) => new Set(changes.map((c) => c.section.split(' > ')[0]));
const types = (ws, t) => ws.filter((w) => w.type === t).map((w) => w.message);

// Approved 825242a text, for in-memory negative tests.
requireCommit('825242a');
const APPROVED_MD = readAt('825242a', FILE);
const APPROVED_QA = extractQuickAnswer(readAt('825242a', 'src/config/article-pages.ts'), [PAGE]);
const approved = () => parseArticle(APPROVED_MD, APPROVED_QA);
const mutate = (fn, qa = APPROVED_QA) => {
  const md = fn(APPROVED_MD);
  assert.notEqual(md, APPROVED_MD, 'mutation did not change the article');
  return parseArticle(md, qa);
};
const replaceOnce = (s, a, b) => {
  assert.equal(s.split(a).length, 2, `expected exactly one "${a.slice(0, 40)}"`);
  return s.replace(a, b);
};

// Randy's exact approved texts for f99e0f6 and d5fcefe.
const QA_F99 = 'Lincoln Heritage sells whole life burial insurance through its Funeral Advantage program. Its captive agents sell only Lincoln Heritage policies, so they can\'t compare prices or coverage from other insurance companies. Lincoln Heritage\'s premiums are substantially higher than comparable first-day coverage offered by competing carriers. Applicants who answer yes to certain significant health questions receive a modified plan that limits natural-death benefits for the first two years at ages 50 through 85, or three years under age 50. During those years, a natural death pays back only the premiums paid plus 10%, 20%, or 30%, depending on the policy year. Many applicants can qualify for first-day coverage elsewhere at a lower price.';
const KP_F99 = [
  'Lincoln Heritage charges substantially more than competing carriers for comparable first-day burial insurance coverage.',
  'Its agents are captive. They can sell only Lincoln Heritage policies and can\'t compare other companies for you.',
  'Lincoln Heritage\'s published rate book shows a 65-year-old woman paying $107.70 a month for $10,000 of modified coverage versus $58.50 for immediate coverage. These are historical published rates, not current quotes.',
  'If you overpay by $40 a month for a Lincoln Heritage policy, that\'s $4,800 in additional premiums over 10 years.',
  'The Funeral Consumer Guardian Society helps with funeral planning but doesn\'t pay funeral expenses.',
  'Lincoln Heritage advertises payment within 24 hours after a claim is approved, not within 24 hours of death.',
];
const SOURCE_F99 = 'Source: Lincoln Heritage Life Insurance Company, Final Expense Plans Agent Rate Book. Rates shown are historical examples and may differ from current premiums.';
const D5_APPROVAL = {
  allow: ['quick-answer', 'key-points', GOV],
  expect: {
    'quick-answer': ['Most all applicants can qualify for first-day coverage elsewhere at a lower price.'],
    'key-points': ['Lincoln Heritage\'s published rate book shows a 65-year-old woman paying $107.70 a month for $10,000 of modified coverage versus $58.50 for immediate coverage.'],
  },
  deleteSections: [GOV],
};

describe('Lincoln Heritage acceptance scenarios', () => {
  test('1. outline at 21797ee: government section and missing "What this means for you"', () => {
    const f = outlineFindings(cfg, pageCfg, at('21797ee'));
    assert.ok(f.some((x) => x.includes(`Unexpected section "${GOV}"`)));
    assert.ok(f.some((x) => x.startsWith('Missing outline item 15')));
  });

  test('2. outline at 1485347: government section and order problem', () => {
    const f = outlineFindings(cfg, pageCfg, at('1485347'));
    assert.ok(f.some((x) => x.includes(`Unexpected section "${GOV}"`)));
    assert.ok(f.some((x) => x.startsWith('Order:') && x.includes('Company history and ownership')));
  });

  test('3. outline at 245940a and f99e0f6: government section only', () => {
    for (const ref of ['245940a', 'f99e0f6']) {
      assert.deepEqual(outlineFindings(cfg, pageCfg, at(ref)), [`Unexpected section "${GOV}" (not in the outline and not an approved exception)`], ref);
    }
  });

  test('4. outline at d5fcefe and 825242a: clean', () => {
    for (const ref of ['d5fcefe', '825242a']) assert.deepEqual(outlineFindings(cfg, pageCfg, at(ref)), [], ref);
  });

  test('5. dates at 1485347: "January 2024" repeated (13 times, one of them in Key Points)', () => {
    const d = types(warnings(cfg, pageCfg, at('1485347'), at('21797ee')), 'dates');
    assert.ok(d.some((m) => m.startsWith('"January 2024" appears 13 times (baseline 0)')), d.join('\n'));
  });

  test('6. dates at 245940a and later: clean', () => {
    for (const [b, t] of [['1485347', '245940a'], ['245940a', 'f99e0f6'], ['f99e0f6', 'd5fcefe']]) {
      assert.deepEqual(types(warnings(cfg, pageCfg, at(t), at(b)), 'dates'), [], t);
    }
  });

  test('7. wording at 1485347: date in Key Points', () => {
    const w = types(warnings(cfg, pageCfg, at('1485347'), at('21797ee')), 'wording');
    assert.ok(w.some((m) => m.startsWith('Key Points contains a date')), w.join('\n'));
  });

  test('8. wording at 245940a: "in my experience" in Quick Answer and Key Points', () => {
    const w = types(warnings(cfg, pageCfg, at('245940a'), at('1485347')), 'wording');
    assert.ok(w.includes('Quick Answer contains personal wording "in my experience"'), w.join('\n'));
    assert.ok(w.includes('Key Points contains personal wording "in my experience"'), w.join('\n'));
  });

  test('9. wording at f99e0f6 and d5fcefe: clean', () => {
    assert.deepEqual(types(warnings(cfg, pageCfg, at('f99e0f6'), at('245940a')), 'wording'), []);
    assert.deepEqual(types(warnings(cfg, pageCfg, at('d5fcefe'), at('f99e0f6')), 'wording'), []);
  });

  test('10. title and H1 before 7e998fd warn "worst"; 825242a is clean', () => {
    const before = types(warnings(cfg, pageCfg, at('9f4e5bb')), 'wording');
    assert.ok(before.includes('H1 contains sensational wording "worst"'), before.join('\n'));
    assert.deepEqual(types(warnings(cfg, pageCfg, at('825242a')), 'wording'), []);
  });

  test('11. lock: f99e0f6 with its approvals: no violations; review required until exact texts are given', () => {
    const allow = ['quick-answer', 'key-points', 'Pricing and cost factors'];
    const loose = run(at('245940a'), at('f99e0f6'), { allow });
    assert.equal(status(loose, 'violation').length, 0);
    assert.ok(status(loose, 'review').length >= 7);
    const exact = run(at('245940a'), at('f99e0f6'), {
      allow, expect: { 'quick-answer': [QA_F99], 'key-points': KP_F99, 'Pricing and cost factors': [SOURCE_F99] },
    });
    assert.equal(status(exact, 'violation').length, 0);
    assert.deepEqual(status(exact, 'review').filter((c) => c.after != null), [], 'every edit matched');
    assert.ok(status(exact, 'authorized').length >= 8);
  });

  test('12. lock: d5fcefe with its approvals passes; government section deletion authorized', () => {
    const c = run(at('f99e0f6'), at('d5fcefe'), D5_APPROVAL);
    assert.equal(status(c, 'violation').length, 0);
    assert.deepEqual(status(c, 'review'), []);
    assert.ok(status(c, 'authorized').some((x) => x.section.startsWith(GOV) && x.matchedBy === 'approved section deletion'));
  });

  test('13. lock: 7e998fd (9f4e5bb to 825242a) with title approval: title fields only, description unchanged', () => {
    const c = run(at('9f4e5bb'), at('825242a'), { allow: ['title'], expect: { title: ['Lincoln Heritage Funeral Advantage Review: Rates, Pros & Cons'] } });
    assert.equal(status(c, 'violation').length, 0);
    assert.equal(status(c, 'review').length, 0);
    const fields = c.map((x) => x.field ?? x.kind).sort();
    assert.ok(fields.includes('frontmatter:title') && fields.includes('meta:og:title') && fields.includes('meta:twitter:title') && fields.includes('h1'), fields.join(', '));
    assert.ok(!fields.some((f) => /description/.test(f)), 'description must be unchanged');
  });

  test('14. lock: f99e0f6 diff with only the Quick Answer approved flags Key Points and Pricing', () => {
    const v = status(run(at('245940a'), at('f99e0f6'), { allow: ['quick-answer'] }), 'violation');
    const s = sectionsOf(v);
    assert.ok(s.has('key-points') && s.has('Pricing and cost factors'), [...s].join(', '));
    assert.ok(!s.has('quick-answer'));
  });

  test('15. lock: 245940a diff with d5fcefe\'s narrow approvals flags many sections', () => {
    const v = status(run(at('1485347'), at('245940a'), D5_APPROVAL), 'violation');
    assert.ok(sectionsOf(v).size >= 10, `${sectionsOf(v).size} sections`);
  });

  test('16. negative: one changed sentence in "Riders and add-ons" with only the Quick Answer approved', () => {
    const t = mutate((md) => replaceOnce(md, 'It pays only for qualifying accidents, not illness.', 'It pays only for qualifying accidents.'));
    const v = status(run(approved(), t, { allow: ['quick-answer'] }), 'violation');
    assert.equal(v.length, 1);
    assert.equal(v[0].section, 'Riders and add-ons');
  });

  test('17. repetition, existing-article mode: approved repeats produce no findings', () => {
    const w = warnings(cfg, pageCfg, at('825242a'), at('825242a'));
    assert.deepEqual(w, []);
    assert.deepEqual(run(at('825242a'), at('825242a')), []);
  });

  test('18. repetition, new-article mode: repeated figures listed as review only', () => {
    const f = types(warnings(cfg, pageCfg, at('825242a')), 'figures');
    for (const fig of ['$10,000', '$40', '$4,800']) assert.ok(f.some((m) => m.startsWith(`${fig} appears in`) && m.endsWith('(review only)')), fig);
  });
});

describe('Additional negative tests', () => {
  test('metadata-only: description change without approval is a violation', () => {
    const t = mutate((md) => md.replace(/^description: ".*"$/m, 'description: "A different description."'));
    const v = status(run(approved(), t, {}), 'violation');
    assert.equal(v.length, 1);
    assert.equal(v[0].field, 'frontmatter:description');
  });

  test('metadata-only: title change is outside a description approval', () => {
    const t = mutate((md) => md.replace(/^title: ".*"$/m, 'title: "Another Title"'));
    const v = status(run(approved(), t, { allow: ['description'] }), 'violation');
    assert.deepEqual(v.map((x) => x.field), ['frontmatter:title']);
  });

  test('Quick Answer: unapproved change is a violation; approved scope needs the exact text', () => {
    const qa = `${APPROVED_QA} Call today.`;
    const t = parseArticle(APPROVED_MD, qa);
    assert.equal(status(run(approved(), t, {}), 'violation').length, 1);
    assert.equal(status(run(approved(), t, { allow: ['quick-answer'] }), 'review').length, 1);
    assert.equal(status(run(approved(), t, { allow: ['quick-answer'], expect: { 'quick-answer': ['Call today.'] } }), 'authorized').length, 1);
  });

  test('approved text plus an extra edit in the same block is not auto-authorized', () => {
    const want = 'Most all applicants can qualify for first-day coverage elsewhere for less.';
    const onlyApproved = APPROVED_QA.replace('elsewhere at a lower price.', 'elsewhere for less.');
    const plusCollateral = onlyApproved.replace('Its captive agents sell only', 'Its agents sell only');
    const approval = { allow: ['quick-answer'], expect: { 'quick-answer': [want] } };
    assert.equal(status(run(approved(), parseArticle(APPROVED_MD, onlyApproved), approval), 'authorized').length, 1);
    const c = run(approved(), parseArticle(APPROVED_MD, plusCollateral), approval);
    assert.equal(status(c, 'authorized').length, 0);
    assert.equal(status(c, 'review').length, 1);
  });

  test('Key Points: approved scope with a non-matching expected text stays review required', () => {
    const t = mutate((md) => replaceOnce(md, 'helps with funeral planning but doesn\'t pay funeral expenses', 'helps with funeral planning'));
    const c = run(approved(), t, { allow: ['key-points'], expect: { 'key-points': ['Something else entirely.'] } });
    assert.equal(status(c, 'violation').length, 0);
    assert.equal(status(c, 'review').length, 1);
  });

  test('section reordering is a structural violation and an outline warning', () => {
    const t = mutate((md) => {
      const a = md.indexOf('## The Funeral Consumer Guardian Society (FCGS)');
      const b = md.indexOf('## Riders and add-ons');
      const c = md.indexOf('## Pricing and cost factors');
      return md.slice(0, a) + md.slice(b, c) + md.slice(a, b) + md.slice(c);
    });
    const c = run(approved(), t, { allow: ['quick-answer'] });
    assert.ok(status(c, 'violation').some((x) => x.type === 'reordered'));
    assert.ok(outlineFindings(cfg, pageCfg, t).some((m) => m.startsWith('Order:')));
    assert.ok(status(run(approved(), t, { allow: ['structure'] }), 'review').some((x) => x.type === 'reordered'));
  });

  test('a new heading is a violation and an unexpected-section warning', () => {
    const t = mutate((md) => replaceOnce(md, '## Funeral Advantage at a glance', `## ${GOV}\n\nNo. It is private insurance.\n\n## Funeral Advantage at a glance`));
    const v = status(run(approved(), t, {}), 'violation');
    assert.ok(v.some((x) => x.section === GOV && x.kind === 'heading'));
    assert.ok(types(warnings(cfg, pageCfg, t, approved()), 'outline').some((m) => m.startsWith(`Unexpected section "${GOV}"`) && !m.includes('also in the baseline')));
  });

  test('repeated dates added inside an approved section: no violation, review items, date warning', () => {
    const t = mutate((md) => md
      .replace('Premiums never increase.', 'Premiums never increase (January 2024).')
      .replace('Then compare the same coverage', 'In January 2024, compare the same coverage')
      .replace('Tobacco matters too:', 'Tobacco matters too (January 2024):'));
    const c = run(approved(), t, { allow: ['Pricing and cost factors'] });
    assert.equal(status(c, 'violation').length, 0);
    assert.ok(status(c, 'review').length >= 2);
    assert.ok(types(warnings(cfg, pageCfg, t, approved()), 'dates').some((m) => m.startsWith('"January 2024" appears 3 times')));
  });

  test('collateral edit inside an approved section: requested edit authorized, the other needs review', () => {
    const t = mutate((md) => md
      .replace('Rates shown are historical examples and may differ from current premiums.', 'Rates shown are historical examples.')
      .replace('Then compare the same coverage and the same type of plan from several companies', 'Then compare several companies'));
    const c = run(approved(), t, { allow: ['Pricing and cost factors'], expect: { 'Pricing and cost factors': ['Rates shown are historical examples.'] } });
    assert.equal(status(c, 'violation').length, 0);
    assert.equal(status(c, 'authorized').length, 1);
    assert.equal(status(c, 'review').length, 1);
    assert.ok(status(c, 'review')[0].after.startsWith('Then compare several companies'));
  });

  test('approved exception: "Common misunderstandings" is not flagged, and would be without the exception', () => {
    assert.deepEqual(outlineFindings(cfg, pageCfg, approved()), []);
    const noException = { ...pageCfg, approvedExtraSections: [] };
    assert.ok(outlineFindings(cfg, noException, approved()).some((m) => m.includes('Common misunderstandings and sales tactics')));
    assert.deepEqual(warnings(cfg, pageCfg, approved(), approved()), []);
  });

  test('newly repeated figure: $4,800 added to a fourth section is a warning', () => {
    const t = mutate((md) => replaceOnce(md, 'It pays only for qualifying accidents, not illness.', 'It pays only for qualifying accidents, not illness. That is like paying $4,800 for nothing.'));
    assert.ok(types(warnings(cfg, pageCfg, t, approved()), 'figures').some((m) => m.startsWith('$4,800 now appears in 4 sections (baseline 3)')));
  });

  test('moved paragraph: moving out of an unapproved section is a violation', () => {
    const para = 'These terms and prices come from Lincoln Heritage\'s rate book. Ask the agent for the current terms in your state.';
    const t = mutate((md) => {
      const out = replaceOnce(md, `${para}\n\n`, '');
      return replaceOnce(out, '## Claims, cancellations and replacements\n\n', `## Claims, cancellations and replacements\n\n${para}\n\n`);
    });
    const c = run(approved(), t, { allow: ['Claims, cancellations and replacements'] });
    const moved = c.find((x) => x.type === 'moved');
    assert.ok(moved, 'move detected');
    assert.equal(moved.status, 'violation');
    assert.deepEqual(moved.unauthorized, ['Riders and add-ons']);
  });

  test('warning phrase in an approved Key Point: warned, and still review required (never auto-authorized)', () => {
    const t = mutate((md) => replaceOnce(md, '• Its agents are captive.', '• In my experience, its agents are captive.'));
    const c = run(approved(), t, { allow: ['key-points'] });
    assert.equal(status(c, 'review').length, 1);
    assert.ok(types(warnings(cfg, pageCfg, t, approved()), 'wording').includes('Key Points contains personal wording "in my experience"'));
  });

  test('table row edit outside the approved scope is a violation', () => {
    const t = mutate((md) => replaceOnce(md, '| 65 | $58.50 | $69.30 | $107.70 | $131.30 |', '| 65 | $58.00 | $69.30 | $107.70 | $131.30 |'));
    const v = status(run(approved(), t, { allow: ['quick-answer'] }), 'violation');
    assert.equal(v.length, 1);
    assert.equal(v[0].kind, 'table-row');
    assert.equal(v[0].section, 'Pricing and cost factors > Lincoln Heritage\'s published rates');
  });

  test('renamed section: reported as a rename; needs approval of the section', () => {
    const t = mutate((md) => replaceOnce(md, '## Riders and add-ons', '## Optional riders'));
    const c = run(approved(), t, {});
    assert.ok(c.some((x) => x.type === 'renamed' && x.before === 'Riders and add-ons' && x.status === 'violation'));
    assert.ok(status(run(approved(), t, { allow: ['Riders and add-ons'] }), 'review').some((x) => x.type === 'renamed'));
  });

  test('report contains every required part', () => {
    const t = mutate((md) => replaceOnce(md, 'It pays only for qualifying accidents, not illness.', 'It pays only for qualifying accidents.'));
    const md = report(check({ cfg, page: PAGE, pageCfg, base: approved(), target: t, approval: { allow: ['quick-answer'] }, labels: { base: '825242a', target: 'test' } }));
    for (const part of ['**Baseline:** 825242a', '**Target:** test', '**Authorized scope:**', '## Scope violations', '## Review required', '## Authorized (matched)', '## Warnings', '## Manual editorial checks', 'Riders and add-ons']) {
      assert.ok(md.includes(part), part);
    }
  });

  test('read-only: running the CLI changes no file and no git state', () => {
    const hash = (f) => createHash('sha256').update(readFileSync(path.join(ROOT, f))).digest('hex');
    const files = [FILE, 'src/config/article-pages.ts', 'docs/editorial/company-review-pages.json'];
    const before = { status: execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }), hashes: files.map(hash) };
    try {
      execFileSync('node', ['scripts/company-review-check.mjs', '--page', PAGE, '--baseline', '825242a', '--allow', 'quick-answer'], { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      assert.ok([0, 1].includes(e.status), `unexpected exit ${e.status}`);
    }
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }), before.status);
    assert.deepEqual(files.map(hash), before.hashes);
  });
});
