# Content

There is no CMS and no database. Every page is a Markdown file in
`src/content/pages/`, validated against the schema in `src/content.config.ts`.
A missing required field fails the build with an error naming the file.

## Where pages came from (Phase 1 migration)

All 339 files were generated from the live WordPress site at fexguy.com
(October 2026). Each one keeps the live page's:

- URL (the file path), exact `<title>`, meta description, robots directive,
  canonical, Open Graph/Twitter tags (`headMeta`), and JSON-LD (`jsonLd`,
  emitted verbatim);
- user-facing body content, including the H1, the post byline block, author
  box, "Keep Reading" links, and approved comments.

WordPress/plugin markup was removed: theme classes, inline styles, scripts,
shortcodes, and page-builder wrappers. The body is clean HTML with a few short
class hooks used by `src/styles/global.css` (`post-meta`, `author-box`,
`related-posts`, `comments`, `comment`, `comment-replies`, `post-preview`,
`excerpt`, `table-wrap`, `button-link`).

`source: "live"` = copied from the live page; `source: "wordpress-export"` =
rebuilt from the WordPress export because the live URL redirected to itself
or to a broken URL (3 pages).

**Lead generation was intentionally not migrated yet:** quote forms, quote
pop-ups, sidebar quoters, Ninja/Fluent forms, Google Form embeds, booking
widgets, the header phone link, the header "GET RATES" bar, and the floating
call button. Phone numbers that appear inside page text were kept as-is.

**Rules for Phase 1:** don't rewrite content, titles, headings, or metadata.
Every page must keep exactly one `<h1>` in its body.

## Add a page

1. Copy `src/content/_templates/page.example.md` into `src/content/pages/`.
2. Name/place it so its path matches the URL you want.
3. Fill in the frontmatter, write the body, set `draft: false`, push.

Files starting with `_` are ignored.

## Site-wide settings

Logo, navigation, footer text, and icons live in `src/config/site.ts`.

## Images

Images keep their original WordPress paths under
`public/wp-content/uploads/` so their URLs never change.

## Redirects

Old-URL → new-URL redirects go in `vercel.json` under `"redirects"`
(served at the edge before any page loads). The Phase 1 redirect map must be
approved before it is added.
