# D. Technical SEO: crawling, indexing, canonicals, redirects, metadata, structured data, rendering

Evidence:

- **Live production responses:** https://funeralfunds.com, 2026-11-19. Each request was made without following redirects, so every hop was recorded.
- **The repository:** `main` at 17db68d, built with production settings (`PUBLIC_ALLOW_INDEXING=true`).

The live HTML of 305 of the 307 built pages is identical to the local build, once build hashes are ignored. The 2 that differ are the health-search pages, whose review-only parts depend on the Vercel environment. So source-level findings below were confirmed against production output, not assumed from it.

What this diagnostic cannot see: Google's own decisions. Without Search Console it can't tell which canonical Google selected or whether a URL is indexed (G13, G37, G38). Those items are marked UNVERIFIED and listed in the README under Search Console.

## What meets Google's documented requirements (verified)

| Area | Result | Source |
|---|---|---|
| HTTP status | All 307 built pages return 200; removed URLs return real 404s (e.g. /does-not-exist-xyz/ 404) | G18 |
| robots.txt | `User-agent: *` / `Allow: /`; no resource is blocked; the sitemap is declared. Named AI crawlers are explicitly allowed, including Google-Extended, which doesn't affect Google Search | G11 |
| Meta robots | 272 indexable pages: `follow, index, max-image-preview:large, max-snippet:-1, max-video-preview:-1`; 3 pages `index, follow`. No `nosnippet` and no `data-nosnippet` inside `<main>` on any page | G8 |
| X-Robots-Tag | Only /trin-fbl/ (`noindex, nofollow`, intentional) | G11 |
| XML sitemap | sitemap-index.xml has 275 URLs = exactly the 275 indexable, self-canonical 200 pages. No noindex, redirected or non-canonical URL is listed, and no indexable page is missing | G14 |
| Canonicals | Every indexable page has exactly one self-referencing absolute `https://funeralfunds.com/...` canonical. The canonical, `og:url` and sitemap URL agree on every page | G12 |
| Host and HTTPS consolidation | https://www.funeralfunds.com/, https://fexguy.com/ and https://www.fexguy.com/ answer 301 to https://funeralfunds.com/, paths included (fexguy.com/burial-insurance/copd/ goes to the same path). HSTS max-age is 2 years | G13, G17 |
| Trailing slash | A missing slash answers a permanent 308 to the slash form (e.g. /burial-insurance/copd answers 308) | G17 |
| Redirects | 370 redirects from vercel.json were requested. Every one answers 301 or 308 and reaches a 200 page in one hop: no chains, no loops, no redirect to a 404 | G16, G17 |
| Rendering | All article text, navigation, breadcrumbs and links are in the server-sent HTML (static Astro), so no JavaScript is needed to see content or links. The funeral cost map ships 4,254 words and 6 data tables in its HTML | G3, G6 |
| Titles | Unique on all 275 indexable pages, and none is empty | G26 |
| Headings | Exactly one `<h1>` on every indexable page | - |
| Structured data validity | Every JSON-LD block parses. 273 indexable pages carry an `@graph` with WebSite, Organization, Person, WebPage, Article and BreadcrumbList; /reviews/ and /life-insurance-health-questions/ have none | G21 |
| Dates | On every article with a visible byline date, it matches `dateModified` | G23 |
| Mobile parity | One responsive HTML document serves every device (no separate mobile URLs), so mobile and desktop content are the same | G33 |

## Findings

### D1 (LOW): 51 `?state=` URLs on the funeral cost map are linked as crawlable links

- **What:** /funeral-cost-map/ links `/funeral-cost-map/?state=AL` through `?state=WY` (51 URLs, DC included) as `<a href>`.
- **What they return:** each answers 200 with the same page and `rel=canonical` pointing to https://funeralfunds.com/funeral-cost-map/. The sitemap lists only the clean URL.
- **Assessment:** the canonical is correct and consistent with the sitemap (G12, G14). 51 variants is far from the "very large number of possible URLs" the faceted-navigation guidance addresses (G35). This is not a defect.
- **Optional change:** if Search Console shows these URLs being crawled heavily or reported as "Duplicate, Google chose different canonical", the state switch could become a button, or keep its link and gain a fragment, since fragments are ignored for crawling. That is a functional change to the map, so it needs owner approval.
- **Status:** UNVERIFIED for impact; needs Search Console.

### D2 (LOW): a JavaScript template string in the search page looks like a URL

- **What:** a regex scan of the raw HTML finds `/search/${n(e)}`, which is part of a JavaScript template literal in the site-search script. Requested literally, it gives 308 and then 404.
- **Assessment:** it isn't an `<a href>` in the page's HTML. Google extracts links from `<a href>` elements (G3), so this is very unlikely to matter.
- **Action:** none, unless Search Console's Page Indexing report lists the URL.
- **Status:** UNVERIFIED.

### D3 (LOW): `/index.html` variants return 200

- **What:** for example https://funeralfunds.com/burial-insurance/copd/index.html answers 200 with the same HTML. Vercel serves the file directly.
- **Assessment:** the page's canonical names the clean URL and nothing links to the variant, so the canonical consolidates it (G12, G13).
- **Optional change:** a 301 from `*/index.html` to the directory URL in vercel.json. That's a redirect change, so it needs Randy's approval under the project rules.

### D4 (UNVERIFIED): plain-HTTP redirects

- **Not tested:** `http://funeralfunds.com/`. The sandbox's network proxy only allows HTTPS, so http:// could not be requested.
- **Evidence:** HSTS (max-age 63072000) is sent on HTTPS responses. Vercel normally redirects HTTP to HTTPS, but that was **not observed** here.
- **How to confirm:** from any browser, or with URL Inspection.

### T1 (MEDIUM, owner decision): three trust pages are `noindex, nofollow`

| Page | Robots | Linked from |
|---|---|---|
| /editorial-guidelines/ | `nofollow, noindex` (Phase 1 migrated; it was noindex on WordPress) | Every article's author byline, about 270 pages |
| /licenses/ | `nofollow, noindex` (Phase 1 migrated) | Footer, about pages |
| /terms-of-use/ | `nofollow, noindex` (new page; holds the accessibility statement) | Footer |

- **What the robots values mean:** "Do not follow the links on this page" (G10). The pages are also kept out of Google's index (G11).
- **Related guidance:** "We strongly encourage adding accurate authorship information, such as bylines..." (G34, INFORMATIONAL).
- **Assessment:** the bylines link to /editorial-guidelines/, and readers and Google can reach it. But it can't appear in Search, and Google is told not to follow its links. Whether these policy pages should be indexable is a business decision. No retrieved document makes indexing them a requirement.
- **Option for Randy:** keep them noindex but drop `nofollow`, or make them indexable.
- **Owner approval required:** Phase 1 for editorial-guidelines and licenses.

### S1 (EDITORIAL REVIEW REQUIRED): 150 articles have no image in their Article markup, and 153 indexable pages have no `og:image`

- **What:** `image` is a recommended Article property. Google recommends "multiple high-resolution images (minimum of 50K pixels...) with the following aspect ratios: 16x9, 4x3, and 1x1" (G22). Google Discover recommends "large images" and naming one with schema.org or `og:image`, but not the site logo (G24, G42).
- **Why it needs editorial input:** only 4 of the 150 pages already show a non-logo image in their article that could be named. The rest need an image chosen or created, which is editorial and design work.
- **Not a fix:** a generic site card (the logo) would not meet G24's "avoid generic images (for example, your site logo)".
- **Already planned:** CLAUDE.md notes a future default social card; that plan should be weighed against G24.

### S2 (LOW): 6 articles lack `datePublished` and `dateModified`

- **Pages:** /burial-insurance/burial-insurance-arthritis/, /colonial-penn-burial-insurance-review/, /final-expense-life-insurance-complete-guide/, /big-lou-term-life-insurance-review/ and 2 more. All are listed in url-audit.csv (finding S2).
- **Guidance:** dates are recommended, not required (G21, G23).
- **Fix:** where the page's own migrated metadata holds the dates, the fix is technical. The project rule says dates come from migrated metadata, never the build time, so nothing should be invented.

### S3 (MEDIUM, Phase 1): migrated JSON-LD gives breadcrumb `position` as text ("1") instead of an Integer

- **Where:** 37 migrated pages (Rank Math JSON-LD printed verbatim). 9 of them are indexable: /12-step-final-planning-guide/, /about/, /colonial-penn-burial-insurance-review/, /colonial-penn-two-year-wait/, /contact/, /final-expense-life-insurance-book/, /iul-book/, /privacy-policy/ and /randy-vandervaate/.
- **Guidance:** the property table lists `position` as Integer (G39). The same pages use `"item": {"@id": "https://funeralfunds.com", "name": ...}`, which is valid.
- **Status:** whether Google's parser accepts the numeric string is **UNVERIFIED**. The Rich Results Test or Search Console's Breadcrumbs report would show it.
- **Fix:** making positions integers is mechanical, but it changes migrated JSON-LD, so it needs Phase 1 approval.

### S4 (MEDIUM, Phase 1): breadcrumb markup with no visible breadcrumb trail

- **Where:** the same 9 indexable migrated pages carry BreadcrumbList JSON-LD but show no breadcrumb trail.
- **Guidance:** "Don't mark up content that is not visible to readers of the page" (G19, REQUIRED in the general structured-data guidelines); "Making sure your structured data matches the visible text on the page" (G7).
- **Fix:** add the visible trail (design and template) or remove the BreadcrumbList from those pages' JSON-LD. Either way needs Phase 1 approval.

### S5 (LOW): /about/ and /contact/ are typed as Article

- **What:** their migrated JSON-LD includes Article nodes. Google's Article documentation is for "news, blog, and sports article pages".
- **Assessment:** About and Contact pages aren't articles. Google lists no penalty, and the documentation doesn't require anything else, so this is LOW.
- **Fix:** typing them as AboutPage or ContactPage `WebPage` without the Article node would align the markup with the content. That needs Phase 1 approval.

### S6 (MEDIUM, Phase 1): the author page has no ProfilePage markup

- **What:** every Article names the author by reference to the Person `https://funeralfunds.com/randy-vandervaate/#person`, with `url` https://funeralfunds.com/randy-vandervaate/. That meets the `author.url` recommendation (G40).
- **Guidance:** "If the URL is an internal profile page, we recommend marking up that author using profile page structured data" (G41, RECOMMENDED).
- **Current markup:** /randy-vandervaate/ carries Article and WebPage markup, not ProfilePage.
- **Approval:** Phase 1 page.

### Identity markup consistency (verified, no defect)

**Organization** (on every page, `@id` `https://funeralfunds.com/#organization`):

- name "Funeral Funds" and `alternateName` "Final Expense Guy";
- url https://funeralfunds.com/;
- telephone +1-888-862-9456;
- logo `/images/logo/funeral-funds-logo.png` (1986 × 433);
- `founder` points to the Person.

**Person** (`@id` `https://funeralfunds.com/randy-vandervaate/#person`): name, url, jobTitle and image, `worksFor` the Organization.

**Article nodes:** every one uses these same `@id`s for `author` and `publisher`.

**Visible identity:** the published phone (888-862-9456) and address on /contact/ match CLAUDE.md. No email is published, and no credentials, ratings or reviews are marked up.

No new identity claims are proposed.

## Metadata

- **M1 (EDITORIAL REVIEW REQUIRED): 11 indexable pages have no meta description.**
  - **Pages:**
    - /12-step-final-planning-guide/, /a-z-companies/, /a-z-health/, /final-expense-life-insurance-book/;
    - /iul-book/ and 4 IUL chapters;
    - /life-insurance-height-weight-guidelines/, /privacy-policy/.
  - **Guidance:** Google recommends accurate, page-specific descriptions and says to prioritize important pages (G25, RECOMMENDED).
  - **Approval:** the wording is editorial, and Phase 1 pages need Randy's approval.
- **Duplicate meta descriptions:** none.
