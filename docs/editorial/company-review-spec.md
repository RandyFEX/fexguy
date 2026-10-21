# FEXGuy Company Review Specification

**Version:** 1.0 (Randy's Company Review Master Specification v1.0, with
his implementation decisions of October 2026).
**Status:** Approved by Randy, October 2026 (fexguy-monitoring decision log
DL-0023). Changes to this file need Randy's approval and a new decision-log
entry.
**Applies to:** every company or carrier review on FEXGuy.com, new or
existing.
**Procedure:** `.claude/skills/company-review/SKILL.md` turns this
specification into step-by-step work. Read both before any company-review
task.

**Precedence.** `CLAUDE.md` in this repository stays authoritative for the
hard rules, editorial authority and approvals, the Phase 1 migration
restrictions, URLs, redirects, SEO metadata, calls to action, phone
numbers, the lead system and production deployment. This specification
adds company-review rules and never relaxes those. Where it restates a
`CLAUDE.md` rule (em dashes, the validation commands, separate production
approval), `CLAUDE.md` is the authoritative wording. The editorial
knowledge base in RandyFEX/fexguy-monitoring (rule IDs such as
KB-STYLE-001, the RESERVED categories) also applies. If two rules conflict,
report the conflict to Randy; never resolve it silently.

**Purpose:** Produce comprehensive, factual company reviews efficiently,
while preventing unauthorized rewriting, shifting editorial standards, and
repeated correction cycles.

## 1. Authority and roles

Randy is the publisher, subject-matter expert, and final editorial authority.

ChatGPT acts as an editorial advisor. Claude Code acts as a researcher,
fact-checker, technical validator, and authorized implementer.

Claude may draft a new article only when explicitly assigned to do so.
Otherwise, Claude is not an independent author or editor.

Neither AI may override an approved editorial decision because it prefers
different wording, structure, tone, or SEO positioning.

## 2. Two operating modes

| Permission | New article | Existing article |
|---|---|---|
| Research | Required | Required where relevant |
| Write full article | Authorized when explicitly assigned | Not authorized by default |
| Preserve voice | Follow approved voice samples (section 12) | Mandatory |
| Add sections | Only from approved outline | Approval required |
| Remove content | Not applicable | Approval required |
| Change factual claims | Source-supported drafting | Flag and request approval |
| Publish | Separate authorization | Separate authorization |

For an existing article, the published version is the baseline. Claude
must not treat an audit as permission to replace the author's work.
Existing articles default to research and proposed corrections only: no
rewriting or implementation without authorization (rule D).

## 3. Locked company-review outline

1. H1 title
2. Quick Answer
3. Here's the Bottom Line (Key Points)
4. Company history, ownership, and financial strength
5. Products and coverage at a glance
6. Underwriting and health qualifications
7. Waiting periods and benefit limitations
8. Distinctive services and benefits, where applicable
9. Riders and optional benefits
10. Pricing and competing-company comparisons
11. Claims, cancellations, and replacements
12. Ratings, complaints, and customer reviews
13. Who the company may be suitable for
14. Better alternatives
15. What This Means for You
16. What Randy Thinks
17. Closing CTA

A section may be marked not applicable when the company does not offer
that feature. Claude must not invent a section merely to satisfy a generic
SEO checklist.

How to read the outline:

- It sets expected coverage and section order, not permission to add
  irrelevant sections. Every section must serve a documented reader need
  (rule B).
- The items are coverage categories. Each article's own heading wording
  can name the company or product, and subsections (H3) inside a category
  are fine when they serve that category.
- Items 1 to 3 come from the article template (H1, the `quickAnswer` in
  `src/config/article-pages.ts`, and the "Here's the Bottom Line:" list);
  item 15 is its own body section, separate from Key Points.
- Sections in already-published reviews that fall outside this outline
  stay unchanged until Randy decides otherwise (section 13), but they are
  not precedent for future articles.

## 4. Editorial voice and content rules

- Factual, comprehensive consumer resource, not a hit piece.
- Conversational seventh-grade reading level, preserving Randy's direct voice.
- No em dashes, AI filler, manufactured balance, or sensational claims.
- Quick Answer and Key Points provide direct answers, not personal commentary.
- Broker opinions belong in the designated opinion section.
- Company history comes before underwriting and pricing.
- Explain genuine advantages and disadvantages without forcing either.
- Compare equivalent policies, particularly first-day against first-day coverage.
- Keep specific numerical examples where they help readers understand the
  financial consequences.
- No unrelated government-program, state-benefit, or generic SEO sections
  without an identified reason and approval.
- No invented consumer motivations, company motives, statistics, or
  product advantages.
- Do not silently soften approved professional conclusions or strengthen
  them beyond the evidence.
- Keep the distinction between professional opinions and independently
  verified facts, without automatically weakening approved conclusions
  (rule J).
- Never copy opinions, recommendations, criticisms, or conclusions from
  one carrier review into another to imitate Randy's voice (rule A).

The Quick Answer, Key Points and opinion-placement rules govern new drafts
and any text Claude writes or is authorized to change. Approved wording
already published is locked (section 6); a mismatch with these rules is
reported, not fixed.

## 5. Source and fact-checking rules

Classify each material claim internally:

| Classification | Handling |
|---|---|
| Verified fact | Retain with supporting source |
| Verified error | Flag and propose exact correction |
| Not independently verified | Report the limitation; do not automatically delete |
| Professional judgment | Preserve as judgment, with factual support |
| Editorial preference | Do not change without approval |

Use primary company documentation where possible for rates, underwriting,
policy limits, waiting periods, and riders.

Never claim a source is silent about a fact based only on a summary.
Inspect the relevant original source, and quote it when reporting what it
does or doesn't say (rule H).

Maintain source edition dates in the research record (section 14). Include
dates in consumer-facing text only where they materially affect accuracy
or where disclosure is necessary to prevent misleading readers. Never
present historical rates as verified current quotes.

## 6. Editorial change lock

Once a section, paragraph, claim, or structural decision is approved, it
is locked.

**The only authorized changes are those specifically requested.**

No collateral rewriting, reorganization, shortening, expansion, repetition
removal, new comparisons, or new qualifications. Corrections must preserve
all unrelated content (rule E).

If Claude discovers an additional material error, it must report it
separately. It cannot use that discovery as permission to modify unrelated
content.

Repetition in approved content may be reported but not removed without
authorization. A knowledge-base AUTO-EDIT rule (for example KB-STYLE-001)
applies only during an assignment that authorizes editing that page, and
each such edit appears in the scope-diff report.

## 7. Approval checkpoints

**Checkpoint A: Scope.** Identify new drafting versus existing-article
update. Confirm outline, source requirements, and exact authorized work.

**Checkpoint B: Research and issue report.** Gather facts and flag genuine
discrepancies. For existing articles, present numbered findings with the
issue, evidence, proposed correction, and approval status. Don't re-ask
questions already answered in the article's approval record (rule G).

**Checkpoint C: Draft and internal audit.** Produce one complete draft for
new work, or apply only approved changes for existing work. Check voice,
structure, accuracy, repetition, source attribution, and unauthorized
additions before presenting it (section 8; rule C).

**Checkpoint D: Editorial approval.** Present the draft or precise changes.
Randy approves, rejects, or requests specific corrections. Approval locks
accepted content.

**Checkpoint E: Technical implementation.** Apply approved content on a
feature branch, run site checks, and provide a Vercel preview. No
production merge without separate authorization.

## 8. Mandatory pre-delivery audit

Before presenting a draft, Claude must verify:

- Every applicable outline section is covered.
- No unapproved section or editorial angle was introduced.
- Quick Answer and Key Points contain direct, useful information.
- Insurance facts, numerical calculations, and underwriting descriptions
  agree with cited sources.
- Randy's voice and approved professional conclusions are preserved.
- No unnecessary repetition or generic AI filler.
- No unrelated content was changed.
- All unresolved factual questions are identified separately.

A failed audit means Claude fixes the problem internally if authorized, or
flags it for approval. It does not deliver an unfinished draft and expect
Randy to find basic mistakes. New articles always get this audit before
presentation (rule C).

## 9. Implementation and publishing rules

Before committing, Claude must compare changes against the approved scope
and report any unauthorized differences. Each authorized implementation
includes an exact scope-diff report: every substantive change corresponds
to an approved instruction (rule F). Never claim content is unchanged
without checking the actual diff (rule I).

Run `npm run check`, `npm run build`, and `npm run verify -- --strict`.

Preserve approved URLs, redirects, canonicals, internal links, CTAs, phone
numbers, forms, tracking, and conversion mechanisms.

Editorial approval does not automatically authorize publication. A
production merge requires separate approval.

## 10. Failure test: Lincoln Heritage

| Actual failure | Preventive rule |
|---|---|
| Review became an argument against Lincoln Heritage | Locked editorial purpose and outline |
| Government-program section inserted | No unapproved sections |
| "In my experience" repeatedly added to factual summaries | Quick Answer and Key Points rules |
| Pricing example repeated unnecessarily | Internal repetition audit |
| Historical source date kept resurfacing | Source-attribution standard |
| Claude repeatedly rewrote approved sections | Editorial change lock |
| Randy had to inspect every new draft for collateral edits | Exact-scope change verification |
| Too many rounds before a usable article | Mandatory pre-delivery audit |
| Claude said a source omitted a fact after reading only a summary | Rule H |
| Claude carried another review's opinions into this one in Randy's voice | Rule A |
| Claude re-asked settled questions and said content was unchanged without showing it | Rules G and I |

## 11. Permanent rules (Randy, October 2026)

- **A.** Claude must never copy opinions, recommendations, criticisms, or
  conclusions from one carrier review into another merely to imitate
  Randy's voice.
- **B.** The company-review outline establishes expected coverage and
  section order, not permission to add irrelevant sections. Every section
  must serve a documented reader need.
- **C.** New articles require a mandatory internal editorial audit before
  presentation. Claude must check factual consistency, source support,
  voice, repetition, structure, and completeness.
- **D.** Existing articles default to research and proposed corrections
  only. No rewriting or implementation without authorization.
- **E.** Approved editorial decisions are locked. Corrections must preserve
  all unrelated content.
- **F.** Each authorized implementation must include an exact scope-diff
  report. Every substantive change must correspond to an approved
  instruction.
- **G.** Do not re-ask questions already answered in an approval record.
- **H.** Never claim a source is silent about a fact based only on a
  summary. Inspect the relevant original source.
- **I.** Never claim content is unchanged without checking the actual diff.
- **J.** Preserve the distinction between professional opinions and
  independently verified facts without automatically weakening approved
  conclusions.

## 12. Voice references

- **Approved:** the "What Randy thinks about Lincoln Heritage" section of
  `src/content/pages/lincoln-heritage-funeral-advantage-review.md`, as
  published at commit `825242a` (October 2026).
- Use voice references for tone, sentence style and directness only, never
  as content to copy (rule A).
- Other articles, including the American Amicable review, are not approved
  voice samples. Additional samples need Randy's approval and are added
  here.

## 13. Existing published reviews

Published reviews stay as they are. This setup changed none of them.
Sections outside the outline, Quick Answers or Key Points that contain
personal commentary, and repetition in approved text are reported when a
review of that article is assigned, never removed or rewritten without
Randy's authorization.

## 14. Records

Each company review has a folder in RandyFEX/fexguy-monitoring,
`reports/article-reviews/<slug>/`, using the knowledge-base templates:

- `approval-record.md` (`editorial-knowledge-base/templates/approval-record.md`):
  the approved baseline commit, the locked decisions and the questions
  already answered. Read it before Checkpoint B (rule G); update it after
  each approval.
- `research-record.md` (`editorial-knowledge-base/templates/research-record.md`):
  every source used, with its edition or publication date, evidence level
  and what it supports.
- `auto-edit-log.md`, as the knowledge base already requires for
  rule-based edits.

## 15. Planned validation (Phase 2, not yet implemented)

Randy approved read-only validation scripts in principle. They will not be
built until he separately authorizes Phase 2. They must be read-only, never
rewrite articles, and be tested against the actual Lincoln Heritage commit
diffs, after verifying what each historical commit really changed. They
must catch unauthorized structural changes, unexpected paragraph edits,
repeated numerical examples, excessive source-date references and
prohibited wording without excessive false positives. Until then, the
scope diff and audit are manual steps in the procedure.
