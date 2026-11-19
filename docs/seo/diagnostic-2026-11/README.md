# FuneralFunds.com Google SEO and AI-search diagnostic (Step 2 of 3)

Diagnostic only: no website code, content, metadata, links, canonicals, structured data, layout or quote-funnel change was made, and nothing was merged or deployed.

- **Date:** 2026-11-19.
- **Branch:** `claude/seo-diagnostic`, from `claude/google-seo-docs` at d22edfb.
- **Production compared:** `main` at 17db68d. The live site serves the same HTML as this build for 305 of 307 pages.

## Basis

- **Google guidance:** only the live, verified official documentation from `npm run seo:google-docs`, run in this session. 759 official URLs were discovered, 546 retrieved and verified, 0 left unretrieved and 0 documentation changes since Step 1. The 42 passages cited are in `sources.md` (IDs G1 to G42), each with URL, final URL, title, retrieval time, HTTP status, section and classification.
- **Site inventory (live production crawl):** 736 URLs requested without following redirects. That covers every built page, every sitemap URL, every link found from the homepage and all 370 redirect rules in vercel.json.
  - 360 HTML pages were parsed: the 307 built pages, 51 `?state=` map variants and 2 `/free-quote/?gender=` variants.
  - 275 of them are indexable.
  - 370 redirects were tested; 2 other URLs were script strings (one 308, one 404).
  - No page could not be evaluated.
- **Content types covered:** articles and guides, 42 company reviews, 174 health and eligibility pages, research pages (funeral cost map, cost articles), tools (health questions, calculator, quote funnel), landing pages, legal and utility pages, every shared layout and component in the rendered output, the sitemap and every redirect.
- **What doesn't exist:** there are no state-specific pages (state data lives on /funeral-cost-map/) and no national-parks remembrance resource in this site.
- **Not available:**
  - **Search Console:** no authenticated access (see below).
  - **Field Core Web Vitals:** the PageSpeed Insights API answered HTTP 429, quota exceeded.
  - **Plain-HTTP requests:** the sandbox proxy is HTTPS-only.

## Reports

| | File |
|---|---|
| A. Executive summary | this file |
| B. URL-level audit (all 736 URLs: status, indexability, sitemap, canonical, inlinks, depth, Phase 1 flag, findings, severity) | `url-audit.csv` |
| C. Internal linking (graph, orphans, depth, weak pages, 134 proposed links) | `internal-linking.md`, `link-graph-contextual.csv`, `inlinks-by-page.csv`, `link-proposals.csv` |
| D. Technical SEO (canonicals, indexing, redirects, metadata, structured data, rendering) | `technical-seo.md` |
| E. Mobile performance (measurements, templates, fixes) | `mobile-performance.md`, `mobile-performance-data.json` |
| F. Google AI search (AI Overviews, AI Mode) | `ai-search.md` |
| G. Editorial review required | `editorial-review.md` |
| H. Step 3 implementation plan | `implementation-plan.md` |
| Official sources | `sources.md` |
| Analysis scripts (re-runnable) | `tools/` (crawl.py, analyze.py, links.py, opps.py, urlaudit.py; mobile: measure.js, lh.sh) |

## Overall result

FuneralFunds.com meets every Google technical requirement checked, and nothing blocks crawling, indexing, rendering or eligibility for AI Overviews and AI Mode:

- 200 status on every page and a robots.txt that blocks nothing;
- a sitemap that exactly equals the indexable, self-canonical set;
- consistent self-canonicals, and host and HTTPS consolidation;
- single-hop permanent redirects;
- server-rendered content and crawlable `<a href>` links;
- no orphans, broken links or links through redirects;
- snippets allowed, and valid JSON-LD;
- lab Core Web Vitals well inside the "good" thresholds on every template.

The main opportunities are internal linking and a set of markup and image refinements.

## Findings by severity (distinct findings)

| Severity | Count | Findings |
|---|---|---|
| CRITICAL | 0 | none |
| HIGH | 2 | L1 tools with no in-text links; L3 80 pages with a single contextual linking page |
| MEDIUM | 6 | L4 deep contextual paths; T1 trust pages noindex, nofollow; S3 breadcrumb positions as text; S4 breadcrumb markup without a visible trail; S6 no ProfilePage on the author page; P-1 large unoptimized header PNGs on 89 pages |
| LOW | 14 | L5 internal nofollow; D1 `?state=` variants (correctly canonicalized); D2 script string; D3 /index.html variants; S2 missing dates (6 pages); S5 Article type on About/Contact; P-2 map script; P-3 hero size; P-4 rate-example images; P-5 logo dimensions; P-6 small tap targets; P-8 homepage HTML and logo priority; P-9 funnel animation; P-10 /images/ caching |
| EDITORIAL REVIEW REQUIRED | 9 | E1 to E9 (editorial-review.md) |
| UNVERIFIED | 3 | D4 http-to-https redirect; field Core Web Vitals and INP; Google-selected canonicals and actual index status |

## A. The 10 highest-value findings, ranked by likely impact

| Rank | Finding | Severity | Affected | Google basis | Next step |
|---|---|---|---|---|---|
| 1 | The funeral cost map and the health questions tool get **no links from article text**, only menu links. The 12-step guide and the book are the same | HIGH (L1) | 4 key pages | G1, G2, G5 | Approve the in-text links in link-proposals.csv (E1, B1) |
| 2 | **80 indexable pages are linked in context from only one page** (usually a hub list); 53 more from only two. Company reviews and funeral-cost articles get few links from the 174 health pages | HIGH (L3) | 133 pages | G1, G5 | Approve proposals (E1) and related lists (E2, B2) |
| 3 | **134 ready link proposals** using text already on the source pages (with exact anchor and sentence) | EDITORIAL (E1) | 54 destinations, 81 sources | G1, G2 | Randy approves or rejects each row |
| 4 | **Header PNGs (avg 263 KB) load at highest priority below the fold, with no AVIF/WebP or srcset** | MEDIUM (P-1) | 89 article pages | G31, G36, G27 | Implementation plan item 1 |
| 5 | **Trust pages are `noindex, nofollow`**: /editorial-guidelines/ (linked from every byline), /licenses/, /terms-of-use/ | MEDIUM (T1) | 3 pages, linked site-wide | G10, G11, G34 | Owner decision (E6, B5) |
| 6 | **150 articles have no image in Article markup or `og:image`**; Google recommends large representative images (not a logo) | EDITORIAL (E4, S1) | 150 pages | G22, G24, G42 | Decide on page images |
| 7 | **Migrated JSON-LD: breadcrumb trail not shown on the page, and `position` given as text** | MEDIUM (S4, S3) | 9 indexable (+28 noindex) pages | G19, G7, G39 | Plan items 3 and 4 |
| 8 | **Author profile page lacks ProfilePage markup** (every article's author points to it) | MEDIUM (S6) | /randy-vandervaate/; affects authorship for about 270 articles | G41, G40 | Plan item 5 |
| 9 | **11 indexable pages have no meta description**, including both A to Z directories and the 12-step guide | EDITORIAL (E3, M1) | 11 pages | G25 | Approve descriptions |
| 10 | **Health questions tool page has about 130 crawlable words** (results are server-side by design) | EDITORIAL (E5, A1) | 1 tool page | G6 | Decide on explanatory text |

## Search Console and visibility (not available)

No authenticated Google Search Console access was available, so actual indexing, Google-selected canonicals, impressions, clicks, positions and AI-feature reporting were **not evaluated**, and nothing is claimed about them. To complete that part, export these for the `funeralfunds.com` property, or give access:

1. Page indexing report (indexed, and each "not indexed" reason with example URLs), especially for the 51 `/funeral-cost-map/?state=` URLs and the noindex pages.
2. URL Inspection, Google-selected canonical, for a sample: /, /burial-insurance/copd/, /funeral-cost-map/, /life-insurance-health-questions/, /aflac-burial-insurance-review/.
3. Sitemaps report for `/sitemap-index.xml` (submitted, discovered and indexed counts).
4. Performance report, last 3 and 16 months, by page and query (impressions, clicks, CTR, average position); the pages with the most impressions; pages with declining clicks.
5. Core Web Vitals report (mobile and desktop, field data). This replaces the unavailable PageSpeed field data.
6. Enhancements: Breadcrumbs (to settle S3) and any structured-data errors.
7. Crawl stats (hosts, response codes, file types).

## Final verification

1. Every substantive finding cites verified official Google documentation (`sources.md`, G1 to G42). Accessibility tap-target notes (P-6) are labeled as non-Google usability items.
2. Defects are separated from recommendations: each finding is labeled with its severity and the passage's classification (REQUIRED, RECOMMENDED, ELIGIBILITY, INFORMATIONAL); non-defects (D1, D2, P-11) are stated as such.
3. Unverified items are labeled UNVERIFIED (D4, field Core Web Vitals, Google's index and canonical decisions, S3's parser behavior).
4. Coverage: all 307 built pages, all 275 sitemap URLs, all discovered links and parameter variants, and all 370 redirects. Mobile was measured on 13 representative templates (every layout type) at 4 widths, plus a static image audit of every page.
5. No website implementation change: the only repository changes on this branch are under `docs/seo/`, plus one bug fix in the Step 1 documentation tool (`scripts/google-seo-docs.mjs`: pages found by its retry pass are now fetched).
6. No editorial content was changed.
7. No merge and no deployment.
