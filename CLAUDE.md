# CLAUDE.md — FEXGUY.com

Astro (TypeScript, static output) site deployed on Vercel. Rebuild of an
existing WordPress site; content is being migrated in stages.

## Hard rules

- **Never invent business facts**: no insurance claims, carriers, prices,
  rates, licensing/state info, statistics, testimonials, reviews, awards,
  addresses, phone numbers, or page copy. Use only content Randy provides.
  If something is missing, leave the field empty and ask.
- **Never guess WordPress URLs or redirects.** Only use URLs from the
  migration data Randy provides.
- Don't connect domains, change DNS, or set `PUBLIC_ALLOW_INDEXING=true`
  unless Randy explicitly asks.
- Keep pages static. Don't add an SSR adapter, a CSS framework, web fonts, or
  client-side frameworks without a clear reason: speed and Core Web Vitals
  come first.

## Where things go

- Business details, phone, nav menus, default CTA: `src/config/site.ts`
- New/migrated page: Markdown in `src/content/pages/` (path = URL). Template:
  `src/content/_templates/page.example.md`. Schema: `src/content.config.ts`.
- Redirects: `vercel.json` → `redirects`.
- Structured data: add a builder to `src/lib/seo/schema.ts`, then pass it via
  a layout's `jsonLd` prop. Builders must omit empty fields.
- Colors/spacing: CSS custom properties at the top of `src/styles/global.css`.

## Conventions

- One `<h1>` per page (the page `title`); Markdown bodies start at `##`.
- Components that depend on unset config render nothing. Keep that pattern.
- Mobile-first CSS: base styles for small screens, `min-width` queries up.
  Touch targets ≥ 44px (`--tap-target`).
- URLs use trailing slashes (`trailingSlash: 'always'`, matched in vercel.json).

## Before committing

Run `npm run check` and `npm run build`. Both must pass with 0 errors.
