# G. Editorial review required

Every item here involves wording, article content, opinions, images or how a page is presented. None was changed. Under CLAUDE.md, each needs Randy's decision. Phase 1 migrated pages (`source: "live"`) need his approval even for link or punctuation changes.

| # | Item | Pages | Guidance | What Randy would decide |
|---|---|---|---|---|
| E1 | **Add the proposed contextual links** (L1, L3, L6). 134 candidates; each uses text that already exists on the source page (`link-proposals.csv`) | 54 destinations, 81 source pages (130 of the 134 rows are on Phase 1 pages) | G1, G2, G5 (RECOMMENDED / INFORMATIONAL) | Approve, reject or edit each row. Priority: the funeral cost map, the health questions tool, the 12-step guide, the calculator, then the single-link pages |
| E2 | **Write connecting sentences or related-article lists for weak pages with no matching text.** 56 weakly linked pages have no unlinked mention anywhere else (e.g. /burial-insurance/esophageal-cancer/, /phoenix-life-burial-insurance-review-pros-cons/, /flameless-cremation-burial-insurance/, /colonial-penn-two-year-wait/) | 56 (inlinks-by-page.csv, `inContextPages` 0 to 2, no row in link-proposals.csv) | G1, G5 | New wording, or `related` entries in src/config/article-pages.ts (the related-articles module is used on 11 pages) |
| E3 | **Meta descriptions for 11 indexable pages** | /12-step-final-planning-guide/, /a-z-companies/, /a-z-health/, /final-expense-life-insurance-book/, /iul-book/ (+4 chapters), /life-insurance-height-weight-guidelines/, /privacy-policy/ | G25 (RECOMMENDED) | Approve description text (Phase 1 for migrated pages) |
| E4 | **Representative images for 150 articles** that have none in Article markup or `og:image` | url-audit.csv finding S1 | G22, G24, G42 (RECOMMENDED); a generic logo card is discouraged by G24 | Whether to commission page images (the article-illustration process already in use) or leave them without one |
| E5 | **Explanatory text for the health questions tool** (about 130 crawlable words; results aren't crawlable by design) | /life-insurance-health-questions/ | G6 (INFORMATIONAL) | Whether to add approved text about what the tool covers. No carrier question wording may be published (private records) |
| E6 | **Indexing of trust pages** (/editorial-guidelines/, /licenses/, /terms-of-use/ are `noindex, nofollow`) | 3 | G10, G11, G34 | Keep, drop only `nofollow`, or make them indexable (Phase 1 for the first two) |
| E7 | **Homepage title "Funeral Funds"** (the brand only; the H1 is "Affordable Burial Insurance for Every Family") | / | G26 (RECOMMENDED: distinct, descriptive titles); the site name itself comes from the WebSite markup, which is present | Whether to make the homepage title more descriptive. Phase 1: migrated title |
| E9 | **Alt text for header illustrations.** The 2026 header PNGs are output with `alt=""` (decorative), e.g. COPD-Burial-Insurance-Image on /burial-insurance/copd/ | 89 pages | Image SEO: G31 covers formats. Alt text needs descriptive judgment | Whether the illustrations are decorative (`alt=""`) or should carry descriptions |
| E8 | **Title format.** 111 indexable titles carry bracketed tags such as "[Pros & Cons]" or "[Calculate Your Final Expenses]" | url-audit.csv titles | G26 asks for distinct, descriptive titles and no boilerplate. Brackets aren't prohibited | An editorial style decision only. No defect was found: every title is unique |

Not editorial, but informational for these decisions:

- **/reviews/** has no structured data. Under CLAUDE.md, review or aggregate-rating schema must never be added to it, and nothing here recommends it.
- **CICA:** no proposed link or text names CICA's underwriting in health-condition content (the CICA confidentiality rule).
