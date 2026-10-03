import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Every migrated page is one Markdown file under src/content/pages/. The
// file's path becomes its URL, so WordPress URLs can be preserved exactly:
//   src/content/pages/about.md                  -> /about/
//   src/content/pages/services/final-expense.md -> /services/final-expense/
// Files starting with "_" are ignored. See src/content/README.md.

const faqItem = z.object({ question: z.string(), answer: z.string() });

const pages = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: 'src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      /** Visible H1. */
      title: z.string(),
      /** <title> override; defaults to "{title} | {site name}". */
      metaTitle: z.string().optional(),
      /** Meta description / search snippet. Required so no page ships without one. */
      description: z.string().min(1),
      /** Override canonical path (rare — only when this page duplicates another). */
      canonicalPath: z.string().optional(),
      ogImage: image().optional(),
      noindex: z.boolean().default(false),
      /** Drafts are never built and never appear anywhere. */
      draft: z.boolean().default(false),
      publishDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      /** Optional parent crumbs; the current page is appended automatically. */
      breadcrumbs: z.array(z.object({ name: z.string(), path: z.string() })).default([]),
      /** Rendered as an FAQ section and FAQPage structured data. */
      faq: z.array(faqItem).default([]),
      /** Show the site-wide call-to-action band at the end of the page. */
      showCta: z.boolean().default(true),
    }),
});

export const collections = { pages };
