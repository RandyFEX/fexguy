# Content

There is no CMS and no database. Every page is a Markdown file in
`src/content/pages/`, validated against the schema in `src/content.config.ts`.
A missing required field fails the build with an error naming the file.

## Add or migrate a page

1. Copy `src/content/_templates/page.example.md` into `src/content/pages/`.
2. Name/place it so its path matches the URL you want (WordPress URLs can be
   kept exactly):
   - `src/content/pages/about.md` → `/about/`
   - `src/content/pages/services/index.md` → `/services/`
   - `src/content/pages/services/burial.md` → `/services/burial/`
3. Fill in the frontmatter (each field is commented in the template).
4. Write the body in Markdown below the second `---`. Use `##`/`###` for
   headings — `title` is the only H1.
5. Set `draft: false` and push.

Files starting with `_` are ignored.

## Site-wide settings

Phone number, email, organization name, navigation menus, logo, social
profiles, and the default call to action all live in `src/config/site.ts`.

## Redirects

Old-URL → new-URL redirects go in `vercel.json` under `"redirects"`:

```json
{ "source": "/old-path/", "destination": "/new-path/", "permanent": true }
```

Vercel serves these at the edge as 308s before any page loads.
