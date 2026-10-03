---
# Copy this file into src/content/pages/ and rename it. The file path
# becomes the URL: src/content/pages/some-page.md -> /some-page/
# Nested folders create nested URLs. Use index.md for a folder's own URL:
# src/content/pages/services/index.md -> /services/

# Visible H1 for the page.
title: Page title

# Optional full <title> override. Default: "Page title | FEXGUY".
# metaTitle: Exact title tag from the WordPress SEO plugin

# Required meta description (search snippet).
description: One- or two-sentence summary of the page for search results.

# Optional. Only set if this page should point its canonical elsewhere.
# canonicalPath: /other-page/

# Optional share image, path relative to THIS file (e.g. ./images/share.jpg).
# ogImage: ./images/share.jpg

# true = <meta name="robots" content="noindex"> and excluded from sitemap/llms.txt.
noindex: false

# true = never built. Use while drafting.
draft: true

# Optional dates (YYYY-MM-DD). updatedDate shows "Updated …" on the page.
# publishDate: 2026-01-01
# updatedDate: 2026-01-01

# Optional parent crumbs (Home and this page are added automatically).
breadcrumbs: []
#  - name: Parent page
#    path: /parent/

# Optional FAQ — rendered on the page AND as FAQPage structured data.
faq: []
#  - question: A real question from the existing site?
#    answer: The real answer, verbatim.

# Show the site-wide call-to-action band at the bottom.
showCta: true
---

Page body in Markdown. The `title` above is the page's only H1 — use `##`
and `###` for section headings inside the body.
