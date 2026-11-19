# F. Google AI Overviews and AI Mode: technical report

## What Google's current documentation says

The documentation is "AI Features and Your Website", retrieved 2026-11-19 (G4 to G9).

- **Eligibility (ELIGIBILITY, G4):** "To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. There are no additional technical requirements."
- **SEO best practices for AI features (INFORMATIONAL):**
  - internal links (G5);
  - important content in textual form (G6);
  - structured data that matches the visible text (G7);
  - page experience (G9).
- **Controls (G8):** robots.txt directives for Googlebot control crawling. `nosnippet`, `data-nosnippet`, `max-snippet` and `noindex` limit what is shown.

So no special markup, file or format makes a page eligible. Nothing here guarantees a citation, and none is promised. The AI-specific question is simply whether pages meet the ordinary Search technical requirements with snippets allowed, plus the best practices above.

## Technical eligibility: status for FuneralFunds.com

| Requirement or best practice | Status on the 275 indexable pages | Evidence |
|---|---|---|
| Googlebot may crawl (robots.txt) | **Meets.** `User-agent: *` / `Allow: /` | technical-seo.md |
| Indexable (200, no noindex, self canonical, in the sitemap) | **Meets** on all 275. Google's actual indexing status is **UNVERIFIED** (needs Search Console) | G4, G18 |
| Snippets allowed | **Meets.** 272 pages set `max-snippet:-1` (no limit); 3 have no snippet limit set. No `nosnippet` or `data-nosnippet` in page content | G8 |
| Content in crawlable text | **Meets** for articles, hubs, the funeral cost map (4,254 words, 6 HTML tables) and the calculator page (3,719 words). **Gap:** /life-insurance-health-questions/ (see A1) | G6 |
| Server-rendered | **Meets.** Static HTML, the same as what's served (305 of 307 pages byte-identical to the build) | technical-seo.md |
| Canonical consistency | **Meets** (canonical, sitemap and og:url agree) | G12 |
| Internal discoverability | **Partly.** Every page is reachable through the menu, but the tools and 80 pages have weak contextual links | internal-linking.md, G5 |
| Structured data matches visible text | **Mostly.** Exception: 9 migrated pages mark up a breadcrumb trail they don't show (S4) | G7, G19 |
| Mobile accessibility | **Meets** basics: responsive single URL, viewport set. Measurements are in mobile-performance.md | G33, G9 |
| Image accessibility | `alt` attribute present on all 696 content images; image URLs are crawlable and not blocked | G31 |

**No verified technical barrier prevents any indexable page from being eligible for AI features.** The documented improvements are the same as for ordinary Search:

- the contextual internal links (L1, L3, L6);
- the structured-data alignment items (S3, S4);
- page experience (mobile-performance.md).

## A1 (EDITORIAL REVIEW REQUIRED): the health questions tool page has little crawlable text

- **What the page has:** /life-insurance-health-questions/ contains about 130 words in its HTML.
- **Why:** the tool's answers (carrier questions and YES/NO outcomes) come from a server-side search and never appear in the page source. That is intentional: the records are private, and the API returns only matches (CLAUDE.md, Health Question Search).
- **Effect:** Google can index the page but not the results, so what it can understand about the page is limited to those ~130 words (G6).
- **Not recommended:** exposing the records. That would break an approved design decision.
- **Possible improvement:** an approved explanatory text on the page about what the tool covers and how to read its results. That is an editorial decision for Randy.

## Not relevant to Google's AI features (INFORMATIONAL)

- **/llms.txt:** the site publishes /llms.txt (275 pages) and robots.txt rules for third-party AI crawlers. Google's documentation names no additional files or markup for AI features (G4: "There are no additional technical requirements"). These files neither help nor hurt Google eligibility, and no change is recommended.
- **Google-Extended:** robots.txt allows it. Under Google's controls passage (G8), the Googlebot rules govern Search, AI Overviews and AI Mode included. No change is recommended.

## Editorial opportunities (separate from technical eligibility)

Answer quality, original analysis and consumer-focused explanations decide how useful a page is to Search and its AI features, but they are editorial. They are listed in editorial-review.md (items E1 to E6) and not judged here.
