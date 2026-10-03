# FEXGUY.com

The rebuild of FEXGUY.com as a static [Astro](https://astro.build) site, deployed on Vercel.

> **Status:** architecture only. No content has been migrated, no domain is
> connected, and search-engine indexing is disabled (see below). The live
> FEXGUY.com is still the existing WordPress site.

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
  config/site.ts        Business details, phone, nav menus, default CTA (one place)
  content.config.ts     Content schema for pages (validated at build time)
  content/
    pages/              One Markdown file per page; file path = URL
    _templates/         Copy-from template for new pages
    README.md           How to add/migrate pages and redirects
  layouts/
    BaseLayout.astro    <html>/<head>, skip link, header, main, footer
    PageLayout.astro    Standard content page: breadcrumbs, H1, body, FAQ, CTA
  components/
    Seo.astro           Title, description, canonical, robots, OG/Twitter, JSON-LD
    Header.astro        Logo/wordmark, navigation, call button
    Navigation.astro    Primary nav with accessible mobile menu toggle
    Footer.astro        Footer nav, contact details, copyright
    PhoneButton.astro   Click-to-call button (hidden until a number is configured)
    ButtonLink.astro    Link styled as a button
    CallToAction.astro  CTA band (site-wide default or per-page)
    Section.astro       Labeled content section
    Breadcrumbs.astro   Breadcrumb trail + BreadcrumbList schema
    FaqList.astro       FAQ list (pair with faqSchema)
  lib/
    pages.ts            Page queries and URL helpers
    seo/schema.ts       JSON-LD builders (Organization, WebSite, WebPage, Breadcrumb, FAQ)
    seo/meta.ts         Title formatting
  pages/
    index.astro         Homepage (temporary scaffold)
    [...slug].astro     Renders every page in src/content/pages/
    404.astro           Not-found page
    robots.txt.ts       robots.txt (follows the indexing gate)
    llms.txt.ts         AI answer-engine index of pages
  styles/global.css     Design tokens, base styles, buttons (mobile-first)
public/                 Static files served as-is (favicon, images)
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
