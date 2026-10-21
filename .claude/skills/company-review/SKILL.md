---
name: company-review
description: Procedure for any FEXGuy.com company or carrier review task (researching, drafting, fact-checking, revising or implementing a review of an insurance company, such as "review the Lincoln Heritage article" or "write a review of Aflac"). Read before starting the task.
---

# Company review procedure

Follow `docs/editorial/company-review-spec.md` (the specification; section
numbers below refer to it) and `CLAUDE.md` ("Editorial authority and
approvals" and every hard rule). This file is the procedure only: when it
and the specification differ, the specification wins, and `CLAUDE.md` wins
over both. Report any conflict to Randy instead of choosing.

## Before anything else

1. Read the specification in full.
2. Read the knowledge base (RandyFEX/fexguy-monitoring):
   `editorial-knowledge-base/README.md`, `INDEX.md`, the rule files for the
   subject and `decisions/article-exceptions.md`.
3. For an existing article, read
   `reports/article-reviews/<slug>/approval-record.md` and
   `research-record.md` if they exist. Anything recorded there as decided
   is not asked again (rule G).
4. Note the article's frontmatter `source` (`live` pages are Phase 1
   migrated pages: recommend-only for every change).

## Checkpoint A: scope statement

Open the first response with:

- **Mode:** new article (explicitly assigned) or existing article.
- **Page:** URL and source file; for existing articles, the baseline
  commit (the last approved, published version).
- **Authorized work:** exactly what the assignment allows, quoted or
  closely paraphrased. Anything else is out of scope.
- **Outline:** which of the 17 outline items apply; which are not
  applicable and why.
- **Sources needed:** primary company documents to obtain (applications,
  rate books, policy forms, disclosures).

## Checkpoint B: research and findings

- Classify each material claim (section 5). Open the original source
  before saying it omits or contradicts something, and quote it (rule H).
- Record every source with its edition or publication date in the research
  record.
- Existing article: deliver numbered findings only (Issue, Evidence,
  Recommendation, Approval required), labelled verified error, unverified,
  professional judgment or editorial preference. No rewrite (rule D).
- Ask only genuinely unresolved questions, in one short numbered list.

## Checkpoint C: draft and pre-delivery audit

- New article: one complete draft following the outline (section 3).
  Existing article: apply only the approved changes.
- Never carry opinions, criticisms or conclusions over from another review
  (rule A). Use the voice reference (section 12) for tone only.
- Before presenting, run the audit (section 8) and include the result in
  the delivery as a checklist, one line per item, pass or fail with notes:
  1. every applicable outline section covered;
  2. no unapproved section, angle or claim added;
  3. Quick Answer and Key Points give direct answers, no personal
     commentary;
  4. facts, calculations and underwriting match the cited sources
     (recompute every figure);
  5. Randy's voice and approved conclusions preserved, not softened or
     strengthened;
  6. no unnecessary repetition (count repeated figures, dates and
     examples) and no filler;
  7. no unrelated content changed;
  8. unresolved factual questions listed separately.
- A failed item is fixed before delivery if the assignment authorizes it,
  otherwise flagged. Repetition in approved, locked text is reported, not
  removed.

## Checkpoint D: editorial approval

- Present the full draft, or the exact changed passages when Randy asks
  for only those. Show what was asked for; never write "unchanged" without
  checking the diff (rule I).
- After approval, update `approval-record.md`: approved items, locked
  decisions, answered questions.

## Checkpoint E: implementation (only when authorized)

1. Work on a feature branch from current `main`.
2. Apply only the approved content.
3. **Scope diff:** `git diff <baseline>..HEAD -- <files>`. Read every
   hunk and list each changed paragraph or setting next to the approval
   item it implements. Revert or report anything without a matching
   approval before committing (rule F).
4. Run `npm run check`, `npm run build` and `npm run verify -- --strict`.
5. Commit, push and provide the Vercel preview URL with the scope-diff
   report and check results.
6. Stop. Merging to `main` and production need Randy's separate
   authorization; after a production merge, verify the live URLs.

## Never

- Rewrite an existing article, restructure it, or remove repetition
  without authorization.
- Change URLs, redirects, canonicals, SEO titles or descriptions, CTAs,
  phone numbers, forms or tracking outside the approved scope.
- Treat editorial approval as permission to publish.
- Run automated or scheduled editorial changes or publishing.
