# Worldwide Cruise Ship Ash Scattering Guide (Version 1.0, research phase)

Branch `claude/cruise-ship-ashes-guide` (from `main` at 7ac8fed). Research
only: nothing here is published, merged or deployed, and no website page or
component has been changed. Model for depth and sourcing: the One Last
Amazing Adventure national parks preview (branch
`claude/last-adventure-preview`, not modified).

## Status: Version 1.7 preview rebuilt around verified policies (2026-11-21)

- Primary comparison: the 11 lines with an established policy (9
  officially permitted, Ambassador conditionally permitted, Crystal not
  permitted), with advance approval, documents, ceremony restrictions,
  fees and official links, generated from `src/data/cruise-ashes/operators.json`
  (`compare` fields in scripts/cruise-ashes/build-data.mjs).
- Profiles added for Carnival, MSC, P&O Cruises and Cunard, each marked
  as read from the search engine's indexed copy of the official page; the
  P&O minimum-length discrepancy is shown, not resolved. Marella keeps its
  verification limitation.
- The 69 unverified lines are a compact searchable list (name, type and
  regions, official contact page link for 23 of them; nothing invented).
- Documents, ceremony and FAQ sections synchronized with the Version 1.6
  draft; law and travel sections unchanged except Carnival added to the
  "remains cannot be taken ashore" line.
- Title, SEO title, meta description, slug, shared header, footer, mobile
  call bar and CTA unchanged; noindex and navigation exclusions kept.

## Version 1.6 evidence recovery (2026-11-21)

- Carnival, MSC, P&O Cruises and Cunard recovered as Officially permitted
  from the search engine's indexed copies of their official policy pages
  (domain-restricted searches); full requirements recorded in the research
  JSON (`basis: official-indexed`, `evidenceMethod`). Direct reads still
  blocked (403/401); exact wording to confirm in a browser.
- Celebrity, Norwegian, Holland America and Disney: no official policy on
  their sites or in the search index; secondary reporting kept separately.
  Other priority lines searched the same way: no policy found.
- Counts, public directory scope (80 lines): 9 officially permitted, 1
  conditionally permitted, 1 not permitted, 69 unverified. Research
  register (92 cruise records): 9 / 1 / 1 / 81 (plus the Tokyo Bay charter).
- Updated: research JSON, SCHEMA.md, register.md, sources.md,
  gap-report.md, article-draft.md. NOT updated (held by Randy until the
  directory strategy is decided): the preview page, its component and
  `src/data/cruise-ashes/operators.json`. Note:
  `scripts/cruise-ashes/build-data.mjs` will stop with an error for the
  four recovered lines until their summary lines are added, by design.

## Version 1.5 corrections (2026-11-21)

Randy's authorized corrections on the preview:
- Meta description replaced with Randy's wording.
- Glacier Bay-specific claim removed; the general National Park System
  rule (36 CFR 2.62) and its citation kept.
- Marella: verification limitation recorded (research record
  `verificationLimitation`, gap-report.md section 2a); link and research kept.
- Directory: 80 unique, currently operating cruise lines (5 officially
  permitted, 1 conditionally permitted, 1 not permitted, 73 unverified).
  Left out of the public directory, research records kept: 2 reported
  closures (Alaskan Dream Cruises, American Queen Voyages), 5 grouped
  entries (Yangtze, Nile, Japan/Korea coastal, Aman and other yachts,
  Carnival Australia brands), 1 duplicate (Viking River note); 4 operators
  split across two records shown once (Scenic, Emerald, nicko, Grand
  Circle/O.A.T.). Check dates now come from each record (all 80 supported).
- Sales elements and shared components unchanged.

## Version 1.3 status: private preview built (2026-11-21)

The article and the 92-operator directory are built as a private preview
at the provisional path `/scattering-ashes-from-a-cruise-ship/` (slug not
approved). Not merged, not deployed.

- Page: `src/pages/scattering-ashes-from-a-cruise-ship.astro` (noindex,
  nofollow; X-Robots-Tag in vercel.json; out of the sitemap, llms.txt and
  site search; never linked; guarded out of the menu in check-dist).
- Content: `src/components/cruise-ashes/CruiseAshesGuide.astro`
  (editorial article markup, `data-article-layout="content"`, shared
  byline, Quick Answer, Key Points and bulleted table of contents).
- Data: `src/data/cruise-ashes/operators.json`, generated from the research
  register by `scripts/cruise-ashes/build-data.mjs` (public fields only;
  the build fails if a non-unverified status lacks a confirmed official
  source). The charter record is excluded, leaving exactly 92 operators.
- Test: `node tests/cruise-ashes/directory.browser.mjs` (after a build).
- Checks run: `npm run check` (0 errors), `npm run build`, `npm run verify
  -- --strict` (0 problems), the directory browser test (8 checks pass),
  axe-core WCAG 2.2 AA scan at 1280px and 390px (0 violations). Automated
  checks do not prove conformance; manual keyboard and screen-reader review
  is still needed before publication.
- The four blocked policy pages (Carnival, MSC, P&O Cruises, Cunard) were
  retried once on 2026-11-21 (HTTP 403/401) and stay unverified; their
  exact links are on the page for manual review.

## Round 3 status

Round 3 (Version 1.2, international verification): network switched from
Limited (20 hosts) to unrestricted at the start of the round; all
operator, law and travel records re-researched on official sources.
Deliverables updated in place (register.md and sources.md regenerated by
`tools/`); research JSON merged; new fields documented in
research/SCHEMA.md.

| Status (round 3 rules) | Count | Operators |
| --- | --- | --- |
| Officially permitted | 5 cruise lines (+1 charter) | Royal Caribbean, Princess, Virgin Voyages, Fred. Olsen, Marella; charter: Tokyo Bay Anniversary Cruises (context only) |
| Conditionally permitted | 1 | Ambassador |
| Not permitted | 1 | Crystal (ashes only on a private excursion) |
| Unverified | 85 | Carnival, MSC, P&O Cruises, Cunard (policy pages blocked; reclassified from conditionally permitted, evidence kept as unconfirmed); 81 others searched on their official sites with no published policy, or sites unreadable |

Total 93 records (92 cruise-operator records plus 1 charter).

Law: 62 entries (UNCLOS, UK nations, Ireland, Norway, Svalbard,
Netherlands, Italy, Spain, Croatia, Germany, France partial, Japan,
Singapore, Hong Kong, Shanghai, Antarctica partial, South Georgia and
others). Travel: 49 entries (TSA, CATSA, ABF, NZ, Heathrow, GOV.UK,
USPS, eCFR, Air Canada, JetBlue, Alaska, Frontier, WestJet, Air New
Zealand, Virgin Australia, Corsair, Air Caraibes and more).

Still blocked: bot protection on several operator, airline and government
sites; web.archive.org unreachable through the proxy; archived copies not
used (permission policy). Details in gap-report.md.

## Round 2 status (superseded)

Deliverables: `register.md` (A, generated by `tools/build_register.py`),
`article-draft.md` (B), `sources.md` (C, generated by
`tools/build_sources.py`), `gap-report.md` (D), `implementation-proposal.md`
(E). Research records in `research/` (each operator has `round2` and
`wordingConfirmed` fields).

Round 2 results (92 operator records):

| Status | Count | Operators |
| --- | --- | --- |
| Officially permitted | 5 | Royal Caribbean, Princess, Virgin Voyages, Fred. Olsen (read directly); Marella (read via a fetch tool, paraphrase plus one exact quote) |
| Conditionally permitted | 5 | Ambassador (read directly); Carnival, MSC, P&O Cruises, Cunard (pages blocked by bot protection; wording still from round 1 search summaries) |
| Not permitted | 1 | Crystal (read directly; ashes only on a private excursion) |
| Unverified | 81 | Norwegian, Celebrity, Holland America, Disney, Viking (official sites searched, nothing found) and 76 operators whose domains were not reachable |

Law confirmed from official pages in round 2: EPA Burial at Sea page (last
updated August 26, 2026) and reporting-tool fact sheet; GOV.UK burial at
sea guidance ("You don't need a licence or permission to scatter ashes at
sea after a cremation"), death-abroad guidance (no permit to bring ashes
into the UK) and Italy guidance. TSA cremated-remains page read through a
fetch tool. eCFR texts from round 1 stand.

Status category change: round 1 put lines with published conditions under
"conditionally permitted". Round 2 uses "officially permitted" for any line
whose page, read directly, says yes and explains how; "conditionally
permitted" now means "may be possible case by case" or "wording not yet
confirmed".

The round 1 record follows for history.

## Round 1 status (superseded): BLOCKED on source access (2026-11-21)

Round 1 covered 92 operator records plus law, travel, competitor and SEO
research (`research/`, format in `research/SCHEMA.md`). It cannot be treated
as verified:

- This cloud environment's network allowlist blocks every cruise-line
  website, epa.gov, tsa.gov, gov.uk, imo.org, noaa.gov, cruisecritic.com,
  the Cruise Brothers benchmark and web.archive.org. Only www.ecfr.gov and
  www.nps.gov were readable. Every operator "quote" therefore comes from
  search-engine summaries (each source's `accessNote` says so), not from
  the pages themselves.
- Web search is capped at 200 calls per turn, shared by all research agents;
  the cap was reached, so several operators and countries got few or no
  searches.

Rule kept: no answer is published from a search summary alone. Round 2
must open each official page, confirm the quote word for word and record
the verification date.

## Round 1 provisional findings (search summaries, unconfirmed)

| Operator | Provisional status | Official page found |
|---|---|---|
| Carnival | Conditionally permitted | help.carnival.com answer 1132 |
| Royal Caribbean | Conditionally permitted | royalcaribbean.com FAQ, burial-at-sea policy |
| Princess | Conditionally permitted | princess.com FAQ, onboard experience |
| MSC | Conditionally permitted | msccruisesusa.com FAQ, on-board information |
| Virgin Voyages | Conditionally permitted | virginvoyages.com FAQ, onboard celebrations |
| Cunard | Conditionally permitted | cunard.com committal of ashes at sea + FAQ |
| P&O Cruises (UK) | Conditionally permitted | pocruises.com committal of ashes |
| Ambassador | Conditionally permitted | ambassadorcruiseline.com FAQs |
| Fred. Olsen | Officially permitted | fredolsencruises.com FAQ |
| Marella | Officially permitted | tui.co.uk Marella FAQ |
| Crystal | Not permitted from the ship (shore excursion option) | crystalcruises.com FAQ |
| 81 others | Unverified | none found in round 1 |

Confirmed from regulation text (eCFR): 40 CFR 229.1 (cremated remains no
closer than 3 nautical miles from land; decomposable flowers; report to EPA
within 30 days), 40 CFR 220.1 and 220.2 (scope: material taken from the US,
US-flagged vessels, US territorial sea), 36 CFR 2.62(b) (national park
waters such as Glacier Bay), 15 CFR 922 discharge bans in Monterey Bay,
Greater Farallones and Channel Islands sanctuaries.

## Research gap report (round 1)

1. All 11 provisional operator policies: open the official page, confirm
   wording, minimum cruise length, distance (3 vs 12 nm), fees, documents,
   container rules, coordinates certificate.
2. Conflicts to resolve: P&O minimum cruise length (6 nights or less vs five
   nights or more); Marella distance wording; Cunard contact department;
   Carnival on-board vs pre-cruise arrangement and the 12-guest limit
   (secondary only); MSC guest limit by region; NCL urn vs scatter (forum).
3. Unverified major lines needing direct confirmation if no page exists:
   Norwegian, Celebrity, Holland America, Disney, Viking (ocean, river,
   expedition), Oceania, Regent, Seabourn, Silversea, Azamara, Explora,
   Windstar, AIDA, Costa, TUI Cruises, Hurtigruten, Havila, Ponant, Saga,
   Hapag-Lloyd, Lindblad, Quark, HX, Aurora.
4. Not searched at all: Aman and other yacht lines, Sanctuary Retreats,
   Yangtze operators, Murray Princess, Japanese and Korean coastal lines;
   Celestyal and Hapag-Lloyd second pass; non-English searches in
   Norwegian, Greek, Chinese.
5. Law not yet confirmed from official text: EPA pages and reporting tool,
   UNCLOS, London Convention/Protocol, MARPOL Annex V, and the national
   rules for the UK, Australia (incl. Great Barrier Reef), New Zealand,
   Canada, Norway, Germany, France, Italy, Spain, Greece, Mexico, Bahamas
   and Caribbean, Japan, Singapore; river rules for Portugal, Austria,
   Hungary, Egypt, Mekong countries; Antarctica (no IAATO text found),
   Galapagos.
6. Travel: TSA, airline, CBP, gov.uk quotes all from summaries; Delta and
   Hawaiian pages not found; Air Canada August 28, 2026 checked-bag change
   inconsistent across its pages.
7. Benchmark (Cruise Brothers) never opened; its outbound links unconfirmed.
8. Operators that closed: Alaskan Dream Cruises (February 2026), American
   Queen Voyages (February 2024): exclude from the directory, note in the
   register.

## Next steps

1. Confirm Carnival, MSC, P&O and Cunard in a browser or in writing
   (they return to their real status once the wording is read).
2. Written confirmation from Norwegian, Celebrity, Holland America, Disney
   and Viking.
3. Randy reviews article-draft.md and the proposed title, slug and status
   categories.
4. Only then: build the noindex preview (implementation-proposal.md).
