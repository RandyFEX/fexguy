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
  its -old slug). Don't redirect these without Randy's approval.
- Old WordPress drafts are not restored unless Randy decides so page by page.
  /funeral-expenses-people-overlook/ was consolidated into
  /how-much-does-a-funeral-cost/ (301; draft not restored).
- Internal links awaiting the link cleanup (don't change until Randy decides
  each): the 14 "whole life" links to /best-whole-life-insurance-plans/ and
  the "Neuropathy" link on /a-z-health/ (broken); the 2 links to
  /funeral-expenses-people-overlook/ (work via the 301; point them straight at
  /how-much-does-a-funeral-cost/ later).
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
