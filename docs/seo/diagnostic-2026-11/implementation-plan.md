# H. Step 3 implementation plan (technical corrections only)

Ordered by likely impact, then risk. Every item is technical: no wording, opinion or article content changes. Editorial items are in editorial-review.md and come after Randy's decisions (part B).

Approval column:

- "Yes (Phase 1)": the change touches a migrated page's markup, links or JSON-LD, which the Phase 1 rule reserves for Randy.
- "Yes (functional)": the change alters how a tool or layout works.

Nothing here should be implemented without the Step 3 authorization.

## A. Technical corrections

| # | Affected URL / file | Verified problem | Correction | Google reference | Expected benefit | Risk | Owner approval |
|---|---|---|---|---|---|---|---|
| 1 | 89 article pages with a 2026 header PNG; `src/lib/article/enhance.ts` (header illustration), `scripts/optimize-article-images.mjs` | Header illustrations are single PNGs (84 files, 263 KB on average, up to 553 KB) (296 KB of COPD's 345 KB). No AVIF/WebP and no srcset; `fetchpriority="high"` and `loading="eager"` although they sit below the fold on phones (P-1, I1) | Generate AVIF/WebP at 800, 1200 and 1600 px with the existing pipeline. Render them in `<picture>` with the PNG/JPG `src` fallback. Drop `fetchpriority="high"` where the image isn't the LCP element. Images and layout unchanged | G31, G36, G27 | Fewer image bytes (measure the saving after the change), sharper on 3× screens, no priority competition with the LCP text | Low: same images, template-level change, checked by `npm run verify` and the image audit | Yes (Phase 1: template output on migrated pages) |
| 2 | /burial-insurance/over-80/ (src/content/pages/burial-insurance/over-80.md line 50) | Internal link with `rel="nofollow"` to an indexable page (L5) | Remove `nofollow` from that one link (keep the anchor text) | G1, G10 | The link counts normally for discovery | Very low | Yes (Phase 1) |
| 3 | 9 indexable migrated pages: /12-step-final-planning-guide/, /about/, /colonial-penn-burial-insurance-review/, /colonial-penn-two-year-wait/, /contact/, /final-expense-life-insurance-book/, /iul-book/, /privacy-policy/, /randy-vandervaate/ (frontmatter `jsonLd`); 28 more noindex migrated pages | BreadcrumbList `position` given as text ("1"); Google documents Integer (S3) | Change `"position": "1"` to `1`, etc. No other change | G39, G20 | Valid breadcrumb markup. Whether Google currently accepts the strings is unverified; check with the Rich Results Test before and after | Very low | Yes (Phase 1: migrated JSON-LD) |
| 4 | The same 9 indexable pages | BreadcrumbList markup but no visible breadcrumb trail (S4) | Either remove the BreadcrumbList node from their JSON-LD, or show the same trail visibly (template change) | G19 (REQUIRED in the general guidelines), G7 | Structured data matches visible content | Low | Yes (Phase 1; the visible option is a design change) |
| 5 | /randy-vandervaate/ (frontmatter `jsonLd`) | Author profile page has no ProfilePage markup (S6) | Mark the page as ProfilePage with `mainEntity` = the existing Person `@id`. No new facts, credentials or sameAs | G41, G40 | Clearer author identity for every article that names him | Low | Yes (Phase 1) |
| 6 | /about/, /contact/ (frontmatter `jsonLd`) | Typed as Article (S5) | Remove the Article node; type the WebPage as AboutPage / ContactPage | G21 (Article is for news, blog and sports articles) | Markup matches the page type | Very low | Yes (Phase 1) |
| 7 | 6 articles without dates in markup (url-audit.csv S2) | `datePublished` / `dateModified` missing (S2) | Fill them in from the page's own migrated metadata where it exists. Never use the build time, never invent | G23, G21 | Better date understanding | Very low | Yes (Phase 1) for migrated pages |
| 8 | Every page: `src/components/HeaderLogo.astro` / Header; homepage `src/components/home/StateMap.astro` | Header logo has `fetchpriority="high"` everywhere, competing with the homepage hero (LCP). The 125 KB inline map SVG makes the homepage HTML 265 KB (P-8) | Remove the logo's high priority (keep eager). Serve the map SVG as a cacheable file, inlined only if needed for interaction | G27, G28 | Slightly earlier homepage LCP on slow connections; smaller HTML | Low: check the homepage map still works and looks the same | Yes (functional: homepage component) |
| 9 | Homepage `src/components/home/RateExamples.astro` | Rate-example images are 4 to 6 times larger than shown (960 px for 160 to 240 px); one slide visible on first view at 360/375 px is `loading="lazy"` (P-4) | Add smaller srcset candidates (e.g. 320w/480w) with accurate `sizes`; make the first visible slide eager | G31, G32 | About 150 to 200 KB less on mobile homepage loads | Low | No (no visual change), but it's the homepage, so confirm |
| 10 | Homepage hero `hero-beach-mobile.avif` | 720 px file for 750 to 1,290 px needed (P-3) | Add a 1080w/1440w candidate to the existing srcset | G31 | Sharper hero on modern phones; LCP already good | Low | No (same image) |
| 11 | Health questions tool results (`src/scripts/health-search.ts`, carrier logos in public/images/carriers/) | Logos inserted without width/height; 2 PNG without modern format (P-5) | Set width/height on the inserted `<img>`; add WebP versions | G31 | No layout shift as results appear | Very low | No (no visual change) |
| 12 | `vercel.json` headers | `/images/*` served with `max-age=0, must-revalidate` (P-10) | Long cache (e.g. one week, like /wp-content/uploads/) for /images/, after confirming which files are replaced in place | G27 (repeat-visit page experience) | Fewer requests for returning visitors | Medium (a long cache on a file later replaced under the same name keeps the old one) | Yes (site-wide hosting setting) |
| 13 | `vercel.json` | `/index.html` URL variants return 200 (D3) | 301 `/(.*)/index.html` to `/$1/` | G12, G17 | One URL per page | Low | Yes (redirects need Randy's approval) |
| 14 | /funeral-cost-map/ (`src/scripts/funeral-cost-map.ts`) | 610 KB of script loaded at start (183 KB transferred): highest lab TBT (≤112 ms) and CLS (≤0.044) from `div.fcm-sum__block` (P-2) | Load data per tab or per state; reserve the summary block's height | G27, G29, G30 | Lower INP and CLS on the site's key research page | Medium (functional change to the tool) | Yes (functional) |
| 15 | /12-step-final-planning-guide/ table of contents; /free-quote/ header phone link | 2 to 3 stacked links below 24 × 24 px with no spacing; a 136 × 12 px phone link (P-6) | Add spacing or padding | Usability / WCAG 2.2 (no Google requirement) | Easier taps | Low (layout) | Yes (layout; the quote funnel is approval-only) |
| 16 | /free-quote/ (noindex) | Step 1 fades in from opacity 0, delaying LCP (P-9) | Don't animate the step visible on first paint | G27 | Faster visual completion for ad visitors | Low | Yes (quote funnel) |

Not recommended (verified non-defects): D1 (the `?state=` URLs are correctly canonicalized), D2 (a script string, not a link), and P-11 (inline CSS is the approved design).

## B. Technical work that follows editorial decisions

Do these only after Randy decides the matching editorial item.

| # | Editorial item | Technical work once approved | Reference |
|---|---|---|---|
| B1 | E1: approved rows of `link-proposals.csv` | Wrap the exact approved anchor text in an `<a href>` to the destination. Change nothing else on the page. `npm run verify` confirms no redirect or broken links | G1, G2, G5 |
| B2 | E2: related-article lists | Add `related` entries in `src/config/article-pages.ts` (the RelatedTopics module already exists and is used on 11 pages) | G1, G5 |
| B3 | E3: approved descriptions | Set `description` in the 11 pages' frontmatter | G25 |
| B4 | E4: approved page images | Add the images (optimized as in item 1) and reference them in `image` / `og:image` | G22, G24, G42 |
| B5 | E6: trust pages | Change `robots` and `noindex` on /editorial-guidelines/, /licenses/, /terms-of-use/ as decided (dropping `noindex: true` also restores their canonical tags, per Seo.astro) | G10, G11 |
| B6 | E5: health tool text | Add the approved text to src/pages/life-insurance-health-questions.astro | G6 |

## C. Verification after implementation

1. `npm run check`, `npm run build` and `npm run verify -- --strict` (the project's required checks).
2. Repeat this diagnostic's crawl and analysis; the scripts are described in the README:
   - link graph and proposals: confirm the new links and no redirect or broken links;
   - URL audit: confirm the findings are cleared;
   - performance on the same 13 templates.
3. Google's Rich Results Test for one page of each changed markup type (Breadcrumb, Article, ProfilePage).
4. In Search Console: URL Inspection for changed pages, then the Page Indexing, Breadcrumbs and Core Web Vitals reports after recrawl (G37, G38).
