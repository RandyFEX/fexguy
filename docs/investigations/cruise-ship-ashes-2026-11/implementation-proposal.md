# Implementation proposal

> Version 1.3 (2026-11-21): the private preview is built (see README.md).
> Differences from this proposal: one generated data file
> (`src/data/cruise-ashes/operators.json`) instead of one file per
> operator; law and travel stay as page text with links rather than
> separate data files; the directory uses cards for all 92 operators with
> search and status filters; the page lives at the provisional final slug
> with noindex rather than a "-preview" slug, as instructed.

How to build the guide in the Astro site once Randy approves the content.
Modeled on the One Last Amazing Adventure preview (branch
`claude/last-adventure-preview`, read only, not modified): typed data in
`src/data/last-adventure/`, one private page
`src/pages/one-last-amazing-adventure-preview.astro` with
`robots="noindex, nofollow"`, an X-Robots-Tag header in vercel.json, and an
exclusion from the sitemap filter in astro.config.mjs.

## Phase 1: private preview

1. **Data** in `src/data/cruise-ashes/`:
   - `operators/<id>.json`, one file per operator, copied from the
     research records but only the public fields: name, parent, fleet type,
     regions, status, the 24 answers (answer text, basis), official sources
     (URL, title, verified date), `wordingConfirmed`, and "what to ask".
     Forum and blog sources stay in the research files, never on the page.
   - `operators.ts`: types (`Status = 'officially-permitted' |
     'conditionally-permitted' | 'not-permitted' | 'unverified'`), loader,
     sort order, and build-time checks: every non-unverified operator has an
     official source with a verified date; no answer marked official without
     a source; no em dash (U+2014) in any string.
   - `law.json`: the confirmed law entries only (EPA, eCFR, UNCLOS, GOV.UK,
     gov.scot, Norway, Svalbard, Netherlands, Italy, Spain, Croatia,
     Rhineland-Palatinate, Japan, Singapore, Hong Kong, South Georgia), each
     with its `category` (national law, coastal state, maritime convention,
     environmental or protected area, river) so the page can group them.
     Partially confirmed entries (France, Canada, Australia, Antarctica)
     are shown only with that label; unverified ones are not shown.
   - `travel.json`: official airport, customs and airline rules, grouped by
     country, never generalizing TSA rules to other countries.
2. **Page** `src/pages/scattering-ashes-from-a-cruise-ship-preview.astro`
   (preview slug; the final slug `/scattering-ashes-from-a-cruise-ship/`
   needs Randy's approval):
   - `noindex, nofollow`, X-Robots-Tag in vercel.json, excluded from the
     sitemap filter, llms.txt and Pagefind (`search: false` equivalent),
     never linked from the site.
   - Classified in `src/config/content-articles.ts` (or rendered through
     ArticleLayout if the final version moves into the article template).
3. **Article standard** (CLAUDE.md "Editorial article standard"): one H1
   (Title Case), breadcrumbs, the shared ArticleByline (Randy VanderVaate,
   Founder of Funeral Funds; real dates), Quick Answer, Key Points, a
   bulleted "In This Article" table of contents with Title Case entries,
   then the body. Body H2 to H4 stored in sentence case (displayed in caps by
   the shared rule). No pre-H2 introduction that repeats the Quick Answer.
   No sales or insurance sections, no quote module, no sidebar pricing
   module on this page (Randy to confirm; the article sidebar normally shows
   it).

## The directory

- **Full content in the HTML.** Every operator renders server-side as an
  `<article>` (an `<h3>` name, status badge, evidence line, verified date,
  the answers that are published, "what to ask" for unverified ones, links to
  the official sources). Without JavaScript the reader gets everything.
- **Comparison table** first: a real `<table>` with `<caption>`, `<th
  scope>` headers, wrapped in the existing keyboard-focusable scroll
  container (src/scripts/scroll-tables.ts). On phones, the operator cards
  below carry the same data.
- **Status data rules (round 3):** the page shows a status other than
  Unverified only when the record has `wordingConfirmed: true` and an
  official source read by us. Records with `unconfirmed-official` answers
  (Carnival, MSC, P&O, Cunard) show "Policy page could not be confirmed"
  with the link, never the summarized rules as fact. `notCruiseLine`
  records (charters) are excluded from the directory. Grouped and closed
  operators are excluded too.
- **Unverified operators** get a compact row (name, regions, "No
  published policy found", date searched, the official contact if read)
  rather than a full card, so 85 rows stay readable.
- **Progressive-enhancement filters** (a small inline script, no new
  dependency), placed above the cards:
  - text search by operator name (`<input type="search">` with a visible
    label);
  - region (`<select>`) and status (checkboxes in a `<fieldset>` with a
    `<legend>`);
  - a polite live region announcing "Showing 12 of 92 cruise lines";
  - a "Clear filters" button;
  - filters hide cards with the `hidden` attribute, never remove them; the
    form is hidden until the script runs, so it never appears broken.
- **Accessibility (WCAG 2.2 AA):** status shown in text, not color alone;
  contrast-checked badges from the global.css tokens; 44 px targets
  (`--tap-target`); focus ring from `--color-focus`; no skipped heading
  levels; links that say where they go ("Royal Caribbean burial at sea
  policy (official)"); tested at 320 px width and 200% text.
- **Mobile first:** cards in one column, two from 48rem; the table scrolls
  inside its focusable container.
- **No new dependencies, no client framework, no web fonts.**

## Internal links (only where relevant)

- /cremation-cost-and-info/ (cremation costs, in the planning steps)
- /burial-vs-cremation/ (in the introduction or FAQ, if Randy wants it)
- /12-step-final-planning-guide/ (planning steps)
- /burial-insurance/veterans/ only beside the US Navy burial at sea mention,
  and only if Randy agrees it fits (the guide carries no insurance pitch).

## Verification before publication

- `npm run check`, `npm run build`, `npm run verify -- --strict` (em dashes,
  tables of contents, article standard, internal links).
- A test that fails if any operator shown as permitted lacks an official
  source verified within, for example, 12 months.
- Manual keyboard, screen-reader and zoom checks of the filters.
- Re-verification of every "not yet confirmed" line (gap-report.md) or a
  decision by Randy to show them with that label.

## Maintenance

Add a `verified` date per operator and a yearly re-check; the page shows
"Checked <date>" on each card. Corrections go into the JSON, then the page
rebuilds.
