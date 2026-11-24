# F. Claude Code Implementation Prompt (copy-ready)

Copy everything below the line into a new Claude Code session on the RandyFEX/fexguy repository, with this package's files attached or placed in `docs/investigations/appalachian-trail-2026-11/`.

---

PROJECT: FuneralFunds.com | Appalachian Trail guide | PREVIEW ONLY

ROLE: You are a technical implementation specialist. You are not an author or editor. Build exactly what is specified, from the supplied research files, and change nothing else.

INPUT FILES (in `docs/investigations/appalachian-trail-2026-11/`):
- `A-master-research-dataset.csv`: the destinations. Build only rows with `publish` = YES.
- `B-editorial-article.md`: the approved article text. Use its wording exactly. Do not rewrite, shorten, expand or "improve" it.
- `C-photography-manifest.csv`: use only rows with `status` = APPROVED.
- `D-regulatory-verification-report.md`: the scattering rules and sources.
- `E-website-implementation-spec.md`: the build specification. Follow it.

TASK:
1. Create the page `src/pages/scattering-ashes-on-the-appalachian-trail.astro` (URL `/scattering-ashes-on-the-appalachian-trail/` unless Randy gives another), its data in `src/data/appalachian-trail/`, a build script `scripts/appalachian-trail/build-data.mjs`, and images in `public/images/appalachian-trail/`, exactly as in the specification.
2. Reuse the national parks guide's components, styles and patterns (`src/pages/scattering-ashes-in-us-national-parks.astro`, `src/data/last-adventure/`). Do not change that guide, the cruise guide, or any shared component's existing behavior.
3. Keep the page private: `robots="noindex, nofollow"`, excluded from the sitemap in `astro.config.mjs`, an `X-Robots-Tag: noindex, nofollow` header in `vercel.json`, not in the menu, no links from other pages.
4. Download each APPROVED photo once, keep its license and attribution exactly as recorded, and show the credit (and for CC BY / CC BY-SA the title, author, source, license link and a change notice) under the photo. Destinations without an approved photo show the existing placeholder panel.
5. Never show a coordinate, distance, elevation, time or rule that the dataset marks as not established. Show "Not established" instead.
6. Show each destination's scattering classification exactly as in the dataset (Permitted, Permit or permission required, Prohibited, Unconfirmed). Where a destination is a remembrance place only, say so and show the separate authorized scattering location if the dataset names one.

PROHIBITED:
- No changes to any other page, component, layout, style, menu, footer, redirect, quote widget, tracking or configuration beyond the preview settings for this page.
- No new copy, claims, statistics, prices or facts. No em dashes.
- No AI-generated images. No photos outside the approved manifest.
- No merge to `main`, no production deployment, no indexing, no menu link, without Randy's explicit authorization in a separate message.

CHECKS before reporting:
- `npm run check`, `npm run build`, `npm run verify -- --strict` all pass with 0 errors and 0 problems.
- Screenshots at 1440 px and 390 px: hero, filters, map, the Virginia and Maine sections.
- The number of destination cards equals the number of `publish` = YES rows.
- `git diff --stat` shows only the new page, its data, its build script, its images, and the preview noindex/sitemap lines.

DELIVERY: commit on a feature branch, push, and report the Vercel preview URL, the commit hash, the card count, the photos used, and any row you could not build and why. Then stop and wait for Randy.
