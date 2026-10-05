import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Every page is one Markdown file under src/content/pages/. The file's path
// is its URL (index.md -> /, about.md -> /about/, blog/page/2.md -> /blog/page/2/).
// Files starting with "_" are ignored. See src/content/README.md.
//
// Pages migrated from WordPress keep their live SEO values exactly as they
// were on fexguy.com: the <title>, meta description, robots directive,
// canonical, Open Graph/Twitter tags, and JSON-LD. The page body (HTML)
// contains the page's own H1.

const headMeta = z.object({
  property: z.string().optional(),
  name: z.string().optional(),
  content: z.string(),
});

const pages = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: 'src/content/pages' }),
  schema: z.object({
    /** Exact <title> text. */
    title: z.string(),
    description: z.string().optional(),
    /** Exact robots directive used once indexing is enabled (see .env.example). */
    robots: z.string().optional(),
    /** Canonical path (or absolute URL). Defaults to the page's own URL. */
    canonical: z.string().optional(),
    /** Page is noindex: also excluded from the sitemap and llms.txt. */
    noindex: z.boolean().default(false),
    /** false = keep out of the XML sitemap (e.g. paginated archives). */
    sitemap: z.boolean().default(true),
    /** "landing" pages render without the site header and footer. */
    layout: z.enum(['default', 'landing']).default('default'),
    /** Open Graph / article / Twitter meta tags, emitted as-is. */
    headMeta: z.array(headMeta).default([]),
    /** JSON-LD blocks, emitted verbatim. */
    jsonLd: z.array(z.string()).default([]),
    /** Show the quote sidebar (Fillout form). True on the pages that had the
     * quote sidebar on the WordPress site. */
    sidebar: z.boolean().default(false),
    /** Where the content came from: "live" (fexguy.com), "wordpress-export", or "new". */
    source: z.string().optional(),
    /** Drafts are never built. */
    draft: z.boolean().default(false),
    /** Internal site search (Pagefind). Unset = automatic: indexable content
     * pages are searchable; noindex, sitemap-false, landing and /category/
     * pages are not. true/false overrides that (see isSearchable). */
    search: z.boolean().optional(),
  }),
});

export const collections = { pages };
