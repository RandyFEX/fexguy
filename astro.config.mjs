import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { quoteFormPlugin } from './src/lib/lead/quote-form-plugin.ts';

// Keep in sync with `url` in src/config/site.ts.
const SITE_URL = 'https://fexguy.com';

// Fully static output: every page is pre-rendered HTML served from Vercel's
// CDN. No adapter, no server functions — the single biggest lever for Core
// Web Vitals, and nothing to maintain at runtime.

// Pages marked `noindex: true`, `draft: true`, or `sitemap: false` in their
// frontmatter must not appear in the sitemap. The sitemap integration can't read content
// collections, so this scans the Markdown frontmatter directly.
function excludedContentPaths() {
  const base = new URL('./src/content/pages/', import.meta.url).pathname;
  const excluded = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.mdx?$/.test(entry.name) && !entry.name.startsWith('_')) {
        const frontmatter = readFileSync(full, 'utf-8').split(/^---$/m)[1] ?? '';
        if (/^\s*(noindex|draft):\s*true\b/m.test(frontmatter) || /^\s*sitemap:\s*false\b/m.test(frontmatter)) {
          const slug = full.slice(base.length).replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
          excluded.add(`/${slug}/`.replace(/\/+/g, '/'));
        }
      }
    }
  };
  try {
    walk(base);
  } catch {
    // No content yet.
  }
  return excluded;
}

const excluded = excludedContentPaths();

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // Matches the live WordPress permalinks and vercel.json `trailingSlash: true`.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // The whole stylesheet is a few KB, so inline it on every page: no
    // render-blocking CSS request, which helps First/Largest Contentful Paint.
    inlineStylesheets: 'always',
  },
  markdown: {
    // <div data-quote-form></div> in page Markdown -> the Fillout quote box.
    processor: satteri({ hastPlugins: [quoteFormPlugin] }),
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !path.startsWith('/404') && !excluded.has(path);
      },
    }),
  ],
});
