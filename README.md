# FEXGUY.com

The rebuild of FEXGUY.com as a static [Astro](https://astro.build) site, deployed on Vercel.

> **Status:** Phase 1 migration. All 339 live WordPress URLs are rebuilt with
> identical URLs, titles, metadata, headings, and content. The approved lead
> system is built: Fillout quote form, phone placements, GA4 + Meta tracking
> (see CLAUDE.md "Lead system"). Redirects are not built yet.
> No domain is connected and search-engine indexing is disabled (see below).
> The live FEXGUY.com is still the WordPress site.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (Node 22+) |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run check` | TypeScript + Astro type check |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Project layout

```
astro.config.mjs        Site URL, static output, trailing slashes, sitemap
vercel.json             Vercel build settings, redirects, caching/security headers
src/
  config/site.ts        Logo, nav menu, footer content, icons (one place)
  config/lead.ts        Phone number, Fillout form, GA4/Meta IDs
  content.config.ts     Content schema for pages (validated at build time)
  content/
    pages/              One file per page (339 migrated); file path = URL
    _templates/         Copy-from template for new pages
    README.md           How to add/migrate pages and redirects
  layouts/
    BaseLayout.astro    <html>/<head>, skip link, header, CTA bar, main,
                        pre-footer, footer, mobile call button, site scripts
    ContentLayout.astro Renders a content page (SEO from frontmatter + body,
                        quote sidebar when `sidebar: true`)
  components/
    Seo.astro           Title, description, canonical, robots, OG/Twitter, JSON-LD
    Header.astro        Logo/wordmark, navigation
    Navigation.astro    Primary nav (ends with the phone number), mobile menu
    Footer.astro        Footer nav, contact details, copyright
    PhoneButton.astro   Click-to-call button (tel:8888629456)
    lead/               Quote box, CTA bar, pre-footer, mobile call button
    ButtonLink.astro    Link styled as a button
    CallToAction.astro  CTA band (site-wide default or per-page)
    Section.astro       Labeled content section
  lib/
    pages.ts            Page queries and URL helpers
    seo/schema.ts       JSON-LD builders for new pages
    seo/meta.ts         Title formatting
    lead/               Quote box markup + Markdown plugin for in-content forms
  scripts/
    quote-form.ts       Loads the Fillout form late (keeps pages fast)
    tracking.ts         GA4 + Meta Pixel (production hostname only)
  pages/
    index.astro         Homepage (renders src/content/pages/index.md)
    [...slug].astro     Renders every page in src/content/pages/
    404.astro           Not-found page
    robots.txt.ts       robots.txt (follows the indexing gate)
    llms.txt.ts         AI answer-engine index of pages
  styles/global.css     Design tokens, base styles, buttons (mobile-first)
public/wp-content/      Images at their original WordPress paths
```

## Indexing gate

Every build is **noindex** unless the environment variable
`PUBLIC_ALLOW_INDEXING=true` is set. When it isn't set:

- every page has `<meta name="robots" content="noindex, nofollow">`
- `/robots.txt` disallows all crawlers

Set it **only** on the Vercel Production environment, and only when we're
actually launching on FEXGUY.com. Preview deployments must never have it set.

## Deploying on Vercel

Import the GitHub repo into Vercel. `vercel.json` already sets the framework,
build command, and output directory, so you don't need to change anything.
The output is fully static, so no adapter or serverless functions are involved.
Don't add the FEXGUY.com domain to the project until we're ready to launch.

## Editing content

See [`src/content/README.md`](src/content/README.md).
