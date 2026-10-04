# CLAUDE.md — FEXGUY.com

Astro (TypeScript, static output) site deployed on Vercel. Rebuild of the
live WordPress site at fexguy.com. Phase 1 (exact migration of 339 live URLs)
is in place; see src/content/README.md for how pages were migrated.

## Hard rules

- **Never invent business facts**: no insurance claims, carriers, prices,
  rates, licensing/state info, statistics, testimonials, reviews, awards,
  addresses, phone numbers, or page copy. Use only content Randy provides.
  If something is missing, leave the field empty and ask.
- **Never guess WordPress URLs or redirects.** Only use URLs from the
  migration data Randy provides.
- Don't connect domains, change DNS, or set `PUBLIC_ALLOW_INDEXING=true`
  unless Randy explicitly asks. Never touch the production WordPress site.
- Phase 1 is an exact migration: don't change any migrated page's URL,
  title, meta description, H1, body content, robots, canonical, social
  tags, or JSON-LD without Randy's approval.
- **Phone:** 888-862-9456 (`tel:8888629456`) is the ONLY number ever presented
  as a FEXGuy.com / Final Expense Guy / Randy / quote / sales contact number.
  888-656-4648 is Randy's TV/streaming ad number and must never appear on the
  site. Insurance companies' own customer-service numbers in reviews stay as
  they are (never replace them with 888-862-9456).
- The lead system (below) was approved by Randy in October 2026. Don't add
  other forms, quoters, pop-ups, trackers, pixels, or tracking events, or
  change what is sent to GA4/Meta, without his approval.
- **Retired workflows** (never preserve or rebuild): the Google Forms
  suitability-questionnaire/mailed-report funnel (/easy/ pages), the Fluent
  Forms health quizzes, the recruiting/job-application pages, the /book/
  booking links, and the old term-life quote pages with their quoters
  (Quoteplicity, NinjaQuoter). A new term-life quote experience will be built
  from scratch later; the old pages must not influence it. Also the Agent CRM
  do-not-contact/suppression workflow (/do-not-sell/ — it was never a consumer
  privacy opt-out page): its footer link is removed and the URL returns 404.
- **Ninja Forms is retired**, along with its integrations (including the old
  Agent CRM workflows). Never preserve or rebuild Ninja Forms functionality.
  But don't delete a page just because it once held a Ninja Form: judge the
  page itself (content, traffic, links, SEO value, current purpose) and, if it
  stays, replace the old form appropriately (with Randy's approval).
- Removed URLs return a real 404 (no redirect) unless Randy approves a
  redirect. Removed so far: /application/, /conservation/, /careers/, /apply/,
  /leave-a-review/, /quiz/, /video-info-quiz-2/, /easy/, /easy-whole-life/,
  /easy-term-life/, /quote-final-expense/, /term-life-quote/, /term-quote/,
  /do-not-sell/ (never rebuilt in the new site).
- Redirects must be approved by Randy before they're added to vercel.json.
  Old URLs decided as 404 with no redirect: /book/, the two
  /jonathan-lawson-actor-colonial-penn*/ URLs, /burial-insurance-neuropathy/,
  /best-whole-life-insurance-plans/ (draft not restored; also no redirect for
  its -old slug), /selling-a-burial-plot/ (draft not restored; don't rebuild
  this topic unless Randy asks — its traffic was people selling cemetery
  plots), /how-to-write-an-obituary/ (same: not restored, not rebuilt —
  bereavement-writing intent). Don't redirect these without Randy's approval.
- **The Life Insurance Podcast is permanently retired** (Randy, October 2026).
  Never restore or rebuild it: no podcast pages, episode pages, archives,
  categories, feeds, embeds, navigation or redirects. Its 36 URLs are
  intentional real 404s with no redirects (don't send episodes to unrelated
  articles): /life-insurance-podcast/ (draft not restored), /podcast-episodes/,
  /category/podcast/, /category/life-insurance-podcast/ (and /page/4/), every
  /…-podcast-episode-N/ URL (episodes 2, 3, 5–15, 17–31, 35), and episodes 1
  and 16, whose slugs lack "podcast": /benefits-of-burial-insurance-episode-1/
  and /7-ways-to-get-the-lowest-pricing-on-burial-insurance-episode-16/.
- **Group G2 decided** (Randy, October 2026; 39 old URLs, none in the
  WordPress export, all unpublished in December 2025): 2 approved 301s
  (/category/guaranteed-issue-whole-life-insurance/ →
  /burial-insurance/guaranteed-issue-life-insurance-for-seniors/ and
  /funeral-planning-checklist/ → /12-step-final-planning-guide/) and 37
  intentional real 404s with no redirects. Don't restore or rebuild these
  just because the URLs existed; new content on a topic (e.g. retiree
  coverage) is a separate content decision. The 404s:
  /burial-plot-prices-save-money/, /funeral-trust-pros-and-cons/,
  /burial-life-insurance-for-alcoa-retirees/,
  /burial-life-insurance-sears-retirees/, /life-insurance-for-allstate-retirees/,
  /burial-insurance-3m-retirees/, /top-20-uplifting-poems-after-loss-of-mother/,
  /top-20-uplifting-poems-after-loss-of-father/,
  /the-history-of-hearses-in-the-united-states/,
  /top-25-bible-verses-for-celebration-of-life-service-funeral/,
  /best-bible-verses-for-a-funeral/,
  /how-pilgrim-burials-were-handled-after-the-mayflower-landed-in-the-usa/,
  /mushroom-burial-suit-for-green-burial/, /tree-pod-burial-green-burials/,
  /burial-insurance-human-composting/, /how-to-select-a-headstone/,
  /how-to-liquidate-assets-after-parents-death/,
  /payable-on-death-account-pros-and-cons/, /how-to-post-an-obituary/,
  /medicare-coverage-helpline-review/,
  /jimmie-walker-medicare-tv-commercial-review/,
  /medicare-benefits-questions-line-tv-commercial-review/,
  /joe-namath-medicare-advantage-commercial-review/,
  /lose-it-review-for-seniors/, /how-to-buy-a-casket/, /how-to-buy-an-urn/,
  /funeral-home-scams/, /funeral-scams-to-watch-out-for-how-to-protect-yourself/,
  /how-to-sell-parents-house-after-their-death/,
  /preventing-identity-theft-after-death/, /senior-discounts/,
  /how-to-choose-a-funeral-home/,
  /nursing-home-checklist-find-the-best-nursing-home/,
  /buying-flowers-for-a-funeral/, /how-to-dispose-of-medications-after-a-death/,
  /the-history-of-life-insurance/, /how-to-get-a-death-certificate/.
- **Group G3 decided** (Randy, October 2026): the 31 remaining low-traffic
  URLs are intentional real 404s with no redirects (episodes 1 and 16 are in
  the podcast list above; the other 29 follow). Don't redirect old archives,
  pagination, duplicates or workflow/campaign/thank-you URLs just to preserve
  them; the unpublished veteran-life-insurance draft is a separate content
  decision. Old workflow/campaign URLs: /application-received/,
  /compare-burial-insurance-quotes/, /youtube/, /you-tube-free-quote/.
  Duplicates of retired G2 pages: /the-history-of-hearses-in-the-united-states-copyscaped/,
  /burial-plot-prices-explained-costs-options/. Old articles:
  /6-questions-to-ask-before-buying-burial-insurance/, /state-regulated-programs/,
  /funeral-service-planning/, /33-scams-targeting-seniors-how-to-avoid-them/,
  /17-ways-to-pay-for-long-term-care/. Categories: /category/retiree-life-insurance/,
  /category/veteran-life-insurance/, /category/medicare/,
  /category/after-a-death-occurs/, /category/blog/. Blog pagination:
  /blog/page/10/, /12/, /13/, /26/, /27/, /28/. Author archives:
  /author/rvanderv8/page/2/, /3/, /9/, /12/, /14/, /19/, /21/. With G1, G2 and
  G3 done, every Group G URL has a final disposition.
- Old WordPress drafts are not restored unless Randy decides so page by page.
  /funeral-expenses-people-overlook/ was consolidated into
  /how-much-does-a-funeral-cost/ (301; draft not restored), and /t2-form-scam/
  into /t2-life-insurance/ (301; draft not restored).
- /mortgage-protection-life-insurance/ is a rewritten, fact-checked article
  Randy approved (October 2026; `source: "new"`), not the old WordPress post.
  Mortgage protection is a legitimate part of the business: present it as a
  reason for buying life insurance, never as a scam. Its contextual link to
  /t2-life-insurance/ waits for that page's pre-launch review.
  /mortgage-protection/ 301s to it (approved; old page not restored); the old quote
  URLs (/mortgage-protection-quote/, /mortgage-protection-2/,
  /mortgage-protection-quoter/) stay retired 404s.
- **T2 is not an insurer or a policy.** A "T2 form" is a lead-generation
  mailer marketed to seniors so it looks tied to a government program or
  special benefit; its purpose is collecting their details for agents selling
  ordinary life insurance. /t2-life-insurance/ must eventually read as an
  article exposing that mailer, not a review of a company or product.
- **Pre-launch content review list** (don't change these until reviewed with
  Randy): /t2-life-insurance/ — check the carrier-style star rating, the
  financial-strength section, the rate-analysis/premium table, any implication
  that T2 sells/issues insurance or that the premiums are T2 rates, claims
  about government affiliation (or its appearance), and regulatory/legal
  claims needing verification or sourcing.
- Internal links awaiting the link cleanup (don't change until Randy decides
  each): the 14 "whole life" links to /best-whole-life-insurance-plans/ and
  the "Neuropathy" link on /a-z-health/ (broken); the 2 links to
  /funeral-expenses-people-overlook/ (work via the 301; point them straight at
  /how-much-does-a-funeral-cost/ later); the "READ THE FULL WEEK 5 ARTICLE"
  and "READ THE FULL WEEK 6 ARTICLE" links on /12-step-final-planning-guide/
  (broken), and its "READ THE FULL WEEK 9 ARTICLE" link to the retired
  /funeral-service-planning/ (G3). From the G2 decisions: on /12-step-final-planning-guide/, the
  "READ THE FULL WEEK 3/4/7/8/10/11/12 ARTICLE" links and the "READ THE FULL
  ARTICLE HERE" link now point at retired 404s (casket, funeral home,
  headstone, flowers, identity theft, medications, liquidating assets, Bible
  verses); the "Payable on death account" link on /prepaid-funeral/ is
  broken; the "guaranteed issue whole life insurance" link on
  /final-expense-life-insurance-pre-existing-conditions/ works via the 301
  but should point straight at
  /burial-insurance/guaranteed-issue-life-insurance-for-seniors/.
- Keep pages static. Don't add an SSR adapter, a CSS framework, web fonts, or
  client-side frameworks without a clear reason: speed and Core Web Vitals
  come first.

## Lead system

- One form everywhere: Fillout form `pJBgSNEtN9us` (settings in
  `src/config/lead.ts`). Markup: `src/lib/lead/quote-box.ts`; loader:
  `src/scripts/quote-form.ts` (loads the ~4 MB embed late — keep it that way).
- Sidebar form: frontmatter `sidebar: true` (pages that had the WordPress
  sidebar). In-content form: put `<div data-quote-form></div>` on its own line
  in the page body. At most one form per page.
- Tracking (`src/scripts/tracking.ts`): GA4 `G-JMYZE458HQ` and Meta pixel
  `2351342698972751`, loaded directly — no GTM, Stape, server-side tagging,
  or Conversions API. GA4 `generate_lead` + Meta `Lead` fire only on Fillout's
  verified `form_submit` message; GA4 `click_to_call` on taps of
  `tel:8888629456` (no Meta event for phone taps). Never send personal
  information. Meta Automatic Advanced Matching and automatic event setup
  stay off. Tracking runs only on fexguy.com; elsewhere it logs to the console.
- Phone placements: header nav, CTA bar under the header, pre-footer CTA,
  mobile call button (`src/components/lead/`). No pop-ups.

## Where things go

- Business details, phone, nav menus, footer: `src/config/site.ts`
- Lead form and tracking IDs: `src/config/lead.ts`
- Pages: Markdown files in `src/content/pages/` (path = URL; `index.md` is
  the homepage). Template: `src/content/_templates/page.example.md`.
  Schema: `src/content.config.ts`. Rendered by `src/layouts/ContentLayout.astro`.
- Images: `public/wp-content/uploads/` (original WordPress paths).
- Redirects: `vercel.json` → `redirects`.
- Structured data: migrated pages carry verbatim JSON-LD in frontmatter
  (`jsonLd`). For new pages, builders live in `src/lib/seo/schema.ts`.
- Colors/spacing: CSS custom properties at the top of `src/styles/global.css`.

## Conventions

- Exactly one `<h1>` per page, inside the page body.
- Components that depend on unset config render nothing. Keep that pattern.
- Mobile-first CSS: base styles for small screens, `min-width` queries up.
  Touch targets ≥ 44px (`--tap-target`).
- URLs use trailing slashes (`trailingSlash: 'always'`, matched in vercel.json).

## Before committing

Run `npm run check` and `npm run build`. Both must pass with 0 errors.
