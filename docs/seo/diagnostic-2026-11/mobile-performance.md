# E. Mobile-first performance

Mobile is the primary target here. Google's guidance:

- "We highly recommend site owners achieve good Core Web Vitals for success with Search" (G27, RECOMMENDED).
- The thresholds: LCP within 2.5 s (G28), INP under 200 ms (G29) and CLS under 0.1 (G30).

Raw data: `mobile-performance-data.json` (medians, Lighthouse results, every image and layout finding, and the field-data attempt).

## Field data (real users): not available

- **What was tried:** the PageSpeed Insights API (CrUX field data), called without a key: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Ffuneralfunds.com%2F&strategy=mobile`.
- **Result:** **HTTP 429**, "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'" (the shared keyless quota). No field data was substituted.
- **What's needed:** Search Console's Core Web Vitals report for funeralfunds.com, or a PageSpeed Insights API key. Until then, real-user Core Web Vitals and INP are **UNVERIFIED**.

## Lab method

All numbers below are lab measurements. They are not field data, and they are not Google's assessment.

- **Playwright:**
  - 13 representative pages, one per template, at 360, 375, 390 and 430 px, 3 runs each: 156 loads.
  - Mobile emulation at device pixel ratio 2 or 3.
  - Throttling: 150 ms latency, 1.6 Mbps down, 750 Kbps up and 4× CPU slowdown, applied by a per-request rule and verified on every run.
  - Cache disabled.
  - Figures are medians.
- **Lighthouse 12.8.2:** mobile, simulated throttling, 1 run per page and 3 for the homepage.
- **Interaction:** a scripted single tap stands in for INP (Menu, the health search, the quote funnel's first choice, the map tab). It is **only a lab proxy**: real INP comes from real users across a whole visit.
- **Not measured:** the network proxy refused www.googletagmanager.com and connect.facebook.net, so the GA4 and Meta scripts (which load after the `load` event) never ran. **Their cost is not in these numbers.** Real users download them.
- **Why the other 294 pages weren't tested one by one:** they render from these same layouts. ArticleLayout, ContentLayout, landing, hub and directory are covered, and the static image audit below covers every page's images.

## Results by template (390 px median; the other widths are within the same range)

| Template (page) | LCP | LCP element | CLS | TBT | Tap proxy | Requests / transfer | Lighthouse perf (LCP) |
|---|---|---|---|---|---|---|---|
| Homepage (/) | 1,248 ms (360 px: 1,612 ms) | hero image (AVIF, fetchpriority=high) | 0 | 0 ms | 32 ms | 14 / 389 KB (311 KB images) | 0.86 / 1.00 / 1.00 (≈1.68 s) |
| Article, health condition (/burial-insurance/copd/) | 380 ms | Quick Answer text | 0 | 0 ms | 40 ms | 11 / 345 KB (**304 KB images**) | 1.00 (1.01 s) |
| Article, company review (/aetna-burial-insurance-review/) | 372 ms | Quick Answer text | 0 | 14 ms | 40 ms | 10 / 56 KB | 1.00 (1.13 s) |
| Hub (/burial-insurance/) | 420 ms | Quick Answer text | 0 | 12 ms | 40 ms | 10 / 67 KB | 1.00 (1.11 s) |
| Directory (/a-z-health/) | 388 ms | summary text | 0 | 20 ms | 48 ms | 10 / 50 KB | 1.00 (1.06 s) |
| Content-layout article (/colonial-penn-burial-insurance-review/) | 568 ms | Quick Answer text | 0 | 47 ms | 40 ms | 10 / 58 KB | 0.99 (1.16 s) |
| Long guide (/12-step-final-planning-guide/) | 380 ms | text | 0 | 4 ms | 40 ms | 8 / 48 KB | 1.00 (1.02 s) |
| Research map (/funeral-cost-map/) | 368 ms | lead text | **0.019** | **112 ms** | **64 ms** | 8 / 223 KB (**183 KB JS**) | 1.00 (0.96 s) |
| Health questions tool (/life-insurance-health-questions/) | 336 ms | lead text | 0 | 0 ms | 32 ms (type + search) | 11 / 57 KB | 1.00 (0.96 s) |
| Quote funnel (/free-quote/, noindex) | 616 ms | first question heading | 0 | 0 ms | 40 ms | 11 / 49 KB | 1.00 (1.09 s) |
| Reviews (/reviews/) | 384 ms | review text | 0 | 0 ms | 40 ms | 7 / 69 KB | 1.00 (1.16 s) |
| About (/about/) | 392 ms | text | 0 | 0 ms | 32 ms | 8 / 95 KB | 1.00 (0.98 s) |
| Calculator page (/burial-insurance-calculator/) | 464 ms | Quick Answer text | 0 | 23 ms | 40 ms | 10 / 56 KB | 1.00 (1.15 s) |

What every template has in common:

- **0 render-blocking resources:** all CSS is inlined (`astro.config.mjs`, `inlineStylesheets: 'always'`), and there's no synchronous script in `<head>`.
- **0 web font requests.**
- **No horizontal overflow** at any width.
- The mobile menu opens and closes at every width without overflowing.
- Same-origin JavaScript is about 17 to 21 K characters on ordinary pages. Exceptions: 25 K on the health tool, 40 K on /free-quote/ and 628 K on the map.

**Assessment:** in the lab, every template is far inside Google's "good" thresholds: LCP ≤ 1.7 s, CLS ≤ 0.02, and the longest tap response 64 ms. **No CRITICAL or HIGH performance defect was found.** The items below are byte and robustness improvements.

## Findings

### P-1 (MEDIUM): header illustrations served as single large PNGs (no AVIF/WebP, no srcset)

- **Example:** /burial-insurance/copd/ downloads `COPD-Burial-Insurance-Image-1024x536.png`, **296 KB**, which is 304 of the page's 345 KB.
- **Format and size:** the file is a legacy PNG with no modern-format alternative, and it is smaller than a 390 to 430 px screen at 3× density needs (1,024 px against 1,074 to 1,194 px).
- **Not the LCP:** the Quick Answer text is the largest paint, so LCP isn't hurt. The cost is bandwidth and image quality on mobile.
- **Scope:** **89 built pages** render a header PNG this way, using 84 distinct upload files averaging 263 KB. 32 of them are over 300 KB (url-audit.csv, finding I1); they are the 2026 `…-Burial-Insurance-Image-1024x536.png` headers, between 314 and 553 KB.
- **Cause:** `src/lib/article/enhance.ts`, which places the header illustration, outputs these uploads as a plain `<img fetchpriority="high" loading="eager">`. Verified on /burial-insurance/copd/.
  - The image sits below the Quick Answer and Key Points, so on phones it's below the fold. It still competes for bandwidth at the highest priority with the text that is the real LCP.
  - The illustrations in public/images/articles/ already go through `scripts/optimize-article-images.mjs` (AVIF/WebP at 800, 1200 and 1600 px in `<picture>`); these PNG headers don't.
- **Fix:** run the same optimization on those PNGs, render them the same way, and drop `fetchpriority="high"` where the image isn't the LCP element. The images look the same, so the approved images and layout are kept.
- **Guidance:** G31 (RECOMMENDED: `<picture>` or `srcset` with a `src` fallback) and G36 (RECOMMENDED: WebP and AVIF compress better).

### P-2 (LOW): the funeral cost map's JavaScript (183 KB transferred, 628 K characters)

- **Effect:** in the lab this gives TBT of 72 to 112 ms, a 64 ms tap response and CLS 0.019. These are within the thresholds but are the highest on the site.
- **Fix:** splitting or deferring the map's script until it's needed would lower them. That is a functional change to the tool, so it needs owner approval and is not urgent.

### P-3 (LOW): homepage hero image slightly smaller than high-density phones need

- **What:** `hero-beach-mobile.avif` is 720 px wide, while 750 to 1,290 px are needed at 2× to 3× density.
- **Effect:** LCP is good (≈1.2 to 1.6 s), so this affects sharpness, not speed.
- **Fix:** a larger `srcset` candidate. The image itself doesn't change.

### P-4 (LOW): a rate-example image above the fold is lazy-loaded at 360 to 375 px

- **What:** on the homepage, `rate-mortgage-250000-960.avif` is visible on first view at 360 and 375 px but carries `loading="lazy"`.
- **Also:** the rate examples are 960 px files shown at 160 to 240 px, 4 to 6 times larger than needed.
- **Guidance:** content in the viewport shouldn't depend on lazy loading (G32).
- **Effect:** not the LCP. A minor improvement.

### P-5 (LOW): carrier logos in the health tool's results have no width/height

- **What:** aflac.png, cvs-aetna-logo.png, family-benefit-life.png, gerber-life.png and trinity-life.png are inserted without dimensions. Two are PNGs without a modern format.
- **Effect:** the layout can shift while results load. These shifts follow the visitor's own tap, so they don't count in CLS, but they can still be noticed.
- **Static audit:** 3 more images lack dimensions (I2).

### P-6 (LOW): small tap targets on /12-step-final-planning-guide/

- **What:** 2 to 3 links smaller than 24 × 24 px with no spacing at 360 to 390 px; 1 control on the map at 390 px.
- **Guidance:** this is an accessibility (WCAG 2.2 target size) and usability matter rather than a Google requirement.
- **Fix:** CSS spacing, but it changes the layout, so it needs owner approval.

### P-8 (LOW): homepage HTML weight, and a second high-priority image on every page

- **Homepage HTML:** 265 KB raw (69 KB transferred), against 17 to 49 KB transferred on other pages. About 125 KB is the inline state-map SVG (`src/components/home/StateMap.astro`) and about 65 KB is inline CSS. LCP is still good.
- **Header logo:** it carries `fetchpriority="high"` on every page, so on the homepage it competes with the hero image, which is the real LCP.
- **Fix:** move the map SVG to a cacheable file or render it later, and drop the logo's high priority. Both are technical changes that leave the page looking the same.

### P-9 (LOW): the quote funnel's entrance animation delays its LCP

- **What:** on /free-quote/ the first step fades in from opacity 0 (`@keyframes qf-in` in `src/components/quote/QuoteFunnelPage.astro`), so LCP lands at 616 to 676 ms, well after FCP (≈350 ms).
- **Why it's LOW:** the page is noindex, so this concerns users, not Search.
- **Restriction:** the quote funnel must not be modified without approval.

### P-10 (LOW): `/images/*` files are sent with `Cache-Control: max-age=0, must-revalidate`

- **Effect:** returning visitors revalidate every logo, photo and illustration under /images/. For comparison, `/wp-content/uploads/*` gets `max-age=604800`.
- **Fix:** a `headers` rule in vercel.json with a long cache lifetime for /images/. Some files there are replaced under the same name, so it needs care and owner approval.

### P-11 (INFORMATIONAL): inline CSS

About 62 to 65 KB of CSS (about 9 KB compressed) is inlined in every page. That is the approved design choice that removes render-blocking requests (`inlineStylesheets: 'always'`), at the cost of no cross-page caching. No change is recommended.

### P-7 (INFORMATIONAL): the analytics scripts were not measured

GA4 and the Meta pixel load after `load`, which limits their effect on LCP, but they can affect INP for real users. Only field data (Search Console Core Web Vitals) can show that.
