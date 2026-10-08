---
# Copy this file into src/content/pages/ and rename it. The file path is the
# URL: src/content/pages/some-page.md -> /some-page/
# Use index.md for a folder's own URL: services/index.md -> /services/

# Exact <title> tag text.
title: "Page title - Final Expense Guy"

# Meta description (search snippet).
description: "One- or two-sentence summary of the page for search results."

# Robots directive used once indexing is enabled. Omit for "index, follow".
# robots: "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large"

# true = noindex, and left out of the sitemap and llms.txt.
noindex: false

# true = never built. Use while drafting.
draft: true

# Optional: "landing" hides the site header and footer.
# layout: landing

# Optional: show the quote sidebar (Fillout form). Or place the form inside
# the body with <div data-quote-form></div> on its own line, not both.
# sidebar: true

# Optional exact social tags and JSON-LD (migrated pages carry these).
# headMeta: [{"property":"og:title","content":"..."}]
# jsonLd: ["{\"@context\":\"https://schema.org\", ...}"]

source: "new"
---

<h1>Visible page heading</h1>

<p>Page body. Plain Markdown also works here; migrated pages use HTML.
The body must contain exactly one &lt;h1&gt;.</p>
