# C. Internal linking and site architecture

Data: live production crawl of https://funeralfunds.com on 2026-11-19 (736 URLs requested, 360 HTML pages parsed), 275 indexable pages. Every link was classified by where it sits on the page:

- **Menu:** the site header and mega menu.
- **Footer.**
- **Breadcrumb.**
- **Article text:** links inside `<main>`, outside the modules below.
- **Related articles module.**
- **Table of contents.**
- **Author box.**
- **Sidebar.**
- **Pre-footer call to action.**

"Contextual" means article text, related articles, hub lists and tables of contents.

Files:
- `link-graph-contextual.csv`: every non-menu, non-footer internal link (source, region, target), 4,421 edges.
- `inlinks-by-page.csv`: incoming links per indexable page by region, outgoing text links, click depth, word count and most common anchor texts.
- `link-proposals.csv`: 134 proposed contextual links built only from text that already exists on the source page.

Guidance used:

- **G1 (RECOMMENDED):** "Every page you care about should have a link from at least one other page."
- **G2 (INFORMATIONAL):** what good anchor text is.
- **G3 (INFORMATIONAL):** links must be `<a href>`.
- **G5 (INFORMATIONAL):** "Making your content easily findable through internal links", listed under SEO best practices for AI features.

Google does not require silos or any particular hierarchy, and nothing below assumes one.

## What already meets the guidance (verified)

| Check | Result |
|---|---|
| Orphan pages (indexable, no internal link from any page) | **0** |
| Broken internal links (to a 404) | **0** real links. The one 404 is a JavaScript template string in the search page script, not an `<a href>` (G3); see the technical report, D2 |
| Internal links that go through a redirect | **0** |
| Links that aren't `<a href>` elements | 0. Every menu, footer and article link is a plain `<a href>` in the server-rendered HTML, menu panels included (G3) |
| Empty anchors (no text, `aria-label` or image `alt`) | **0** |
| Generic anchors ("Read More", "click here") in article text | 73, all on the noindex `/blog/` archives (noindex, follow) |
| Click depth from the homepage, menu included | 77 pages at 1 click, 193 at 2, 4 at 3; nothing deeper |

The menu makes every page reachable within 3 clicks. The weaknesses are in **contextual** linking, which is what G1, G2 and G5 describe: in-text links with descriptive anchors between related subjects.

## Findings

### L1 (HIGH): the research and tool pages get no links from article text

| Page | Pages linking to it | Contextual linking pages | Contextual click depth |
|---|---|---|---|
| /funeral-cost-map/ (Funeral Cost and Mortality Map by State; 4,254 words, 6 tables of crawlable text) | 345 | **0** | unreachable without the menu |
| /life-insurance-health-questions/ (Life Insurance Health Questions tool) | 345 | **0** | unreachable without the menu |
| /12-step-final-planning-guide/ | menu and footer | 0 from articles (only /search/'s empty-results list) | unreachable without the menu |
| /final-expense-life-insurance-book/ | menu | 0 from articles | unreachable without the menu |
| /burial-insurance-calculator/ | menu | 2 | 3 |

- All 345 links to each tool come from the mega menu on every page. No article mentioning funeral costs links to the map.
- No health-condition article links to the health questions tool, although many explain application health questions.

Cluster view (contextual links among indexable pages; the full matrix is below):

- 15 funeral-cost and planning articles send 1 link to the tools.
- 174 health and eligibility articles send 2.

**Assessment:** the pages are discoverable through the menu, so Google can crawl them; this is not a crawling defect. But the guidance is about anchor text and context (G1, G2, G5). Today the only anchors pointing to the map and the tool are menu labels. The proposals below use the source articles' own words, so this is **HIGH: strongly justified, important pages**. Adding the links changes article bodies, so it needs owner approval (Phase 1 pages need Randy's approval even for link changes).

### L3 (HIGH): 80 indexable pages are linked in context from only one page

Most of them (49 under /burial-insurance/) are linked in context only from a hub or directory list:

| Only linking page | Pages |
|---|---|
| /burial-insurance/ | 19 |
| /a-z-companies/ | 13 |
| /burial-insurance/cancer/ | 13 |
| /a-z-health/ | 9 |
| /burial-insurance/heart-conditions/ | 6 |
| /iul-book/ | 4 |
| /search/ (noindex) | 2 |
| /burial-insurance/neurological-disorders/ | 2 |

Examples:

- Many company reviews, such as Aflac, Transamerica, Foresters, Phoenix Life, Oxford Life and Great Western.
- Most single-cancer pages, such as pancreatic, brain, cervical, esophageal and thyroid cancer.
- /prepaid-funeral/, /burial-vs-cremation/, /cremation-cost-and-info/ and /t2-life-insurance/.

The full list is in `inlinks-by-page.csv` (`inContextPages` = 1).

A further 53 pages have exactly 2 contextual linking pages.

Cross-subject linking is thin:

- Company reviews receive 11 contextual links from the 174 health-condition pages.
- Funeral-cost and planning articles receive 13.
- Company reviews send 0 links to the funeral-cost articles.

### L4 (MEDIUM): deep pages without the menu

Following only article text, related modules and breadcrumbs, 11 pages sit 4 or more clicks from the homepage or can't be reached at all:

| Pages | Contextual depth |
|---|---|
| /12-step-final-planning-guide/, /final-expense-life-insurance-book/, /funeral-cost-map/, /life-insurance-health-questions/ | unreachable |
| /cremation-cost-questions/, /randy-vandervaate/ | 5 |
| /about/, /burial-insurance/donating-your-body-to-science/, /burial-vs-cremation/, /cremation-cost-and-info/, /prepaid-caskets-pros-and-cons/ | 4 |

Through the menu they are all 1 or 2 clicks away. This is a contextual-relationship issue, not a crawl barrier.

### L5 (LOW): one internal link marked `rel="nofollow"`

- **Where:** /burial-insurance/over-80/ links to /final-expense-life-insurance-over-80/ with anchor "over 80", `rel="noreferrer noopener nofollow"`. This is migrated Phase 1 markup.
- **Why it matters:** a nofollow hint on an internal link to an indexable page works against G1. The same markup also opens it in a new tab with `target="_blank"`.
- **Fix:** removing `nofollow` is a one-attribute change, but Phase 1 needs Randy's approval.

### L6 (EDITORIAL REVIEW REQUIRED): 134 proposed contextual links

`link-proposals.csv` lists 134 candidate links to 54 weakly linked pages. Each row gives:

- the source URL and destination URL;
- the **exact existing anchor text** on the source page, which already appears in the source's own words and isn't already linked;
- the surrounding sentence, so the fit can be judged;
- the reason for the link;
- whether the source is a Phase 1 migrated page;
- the guidance it follows (G1, G2).

How they were selected:

- Sources are indexable pages only.
- Customer reviews (/reviews/), the privacy policy, the health tool page and search pages are never used as sources.
- Text already inside a link is excluded.
- At most 3 per destination, ranked by subject relevance. Funeral-cost articles come first for the map, application and health-condition articles first for the health tool.
- 130 of the 134 sources are Phase 1 migrated pages, so every link needs Randy's approval.

Highest-value examples:

| Source | Destination | Existing anchor text |
|---|---|---|
| /how-much-does-a-funeral-cost/ | /funeral-cost-map/ | "Funeral costs" ("Funeral costs are higher than most people expect today") |
| /pay-for-a-funeral-without-life-insurance/ | /funeral-cost-map/ | "funeral costs" |
| /how-much-does-final-expense-insurance-cost/ | /funeral-cost-map/ | "Funeral costs" |
| /burial-insurance/how-to-apply-for-burial-insurance/ | /life-insurance-health-questions/ | "Health questions" ("Health questions determine if you get full coverage or delays") |
| /final-expense-life-insurance-pre-existing-conditions/ | /life-insurance-health-questions/ | "health questions" |
| /burial-insurance/copd/ | /life-insurance-health-questions/ | "health questions" |
| /how-much-does-a-funeral-cost/ | /12-step-final-planning-guide/ | "funeral planning" |
| /how-much-does-final-expense-insurance-cost/ | /burial-insurance-calculator/ | "how much coverage" |
| /burial-insurance/diabetes/ | /aflac-burial-insurance-review/ | "Aflac" ("...available through specific carriers like Aflac.") |
| /burial-insurance/respiratory-lung-conditions/ | /transamerica-burial-insurance-review/ | "Transamerica" |
| /burial-insurance/pacemaker/ | /burial-insurance/arrhythmia/ | "Arrhythmia" |
| /burial-insurance/hepatitis-b/ | /burial-insurance/hepatitis-c/ | "Hepatitis C" |
| /burial-insurance/stent/ | /burial-insurance/peripheral-vascular-disease-pvd-pad/ | "peripheral vascular disease" |
| /burial-insurance/cirrhosis/ | /burial-insurance/fatty-liver-disease/ | "fatty liver disease" |
| /burial-insurance/for-smokers/ | /burial-insurance-with-lung-cancer/ | "lung cancer" |

**Limits of the proposals:**

- 56 weak pages got no proposal: no other indexable page uses their topic phrase as plain unlinked text. Examples are /burial-insurance/esophageal-cancer/, /phoenix-life-burial-insurance-review-pros-cons/ and /flameless-cremation-burial-insurance/. Linking them needs new wording, which is editorial.
- Phrase matching is mechanical. Each row needs a human check that the sentence really discusses the destination's subject. Some matches are generic uses of a phrase: "how much coverage" in /children-grandchild-policies/, and "suicide" in /mortgage-protection-life-insurance/.
- The CICA confidentiality rule must be respected. No proposal names CICA, and none should be added that would.

## Cluster link matrix (contextual links among indexable pages)

Rows are sources and columns are destinations. Article text and related-articles links only.

| from \ to | company | funeral-cost-planning | general-guides | health-eligibility | other-insurance | site | tools |
|---|---|---|---|---|---|---|---|
| company (42 pages) | 25 | **0** | 8 | 103 | 0 | 3 | **0** |
| funeral-cost-planning (15) | 8 | 17 | 14 | 22 | 0 | 4 | **1** |
| general-guides (25) | 40 | 3 | 6 | 24 | 1 | 2 | **0** |
| health-eligibility (174) | 11 | 13 | 37 | 683 | 1 | 12 | **2** |
| other-insurance (11) | 0 | 0 | 2 | 3 | 13 | 1 | 0 |
| site (5) | 7 | 0 | 1 | 10 | 3 | 7 | 0 |
| tools (3) | 0 | 0 | 2 | 14 | 0 | 0 | 0 |

The clusters are assigned by URL pattern and are approximate.

## Other observations (INFORMATIONAL)

- **Menu size:** the mega menu puts about 82 links on every regular page (median 116 links per page, at most 214). Every link points to a real, 200, non-redirect page. The retrieved documentation sets no limit on links per page, so this is not a finding.
- **Related articles module:** the module (`RelatedTopics`, fed by `related` in `src/config/article-pages.ts`) appears on only 11 pages (39 links site-wide). The COPD page shows 7 related respiratory pages; the other article pages show none. Filling it in is an editorial choice of which pages relate; see the implementation plan, item P6.
