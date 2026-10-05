import { getCollection, type CollectionEntry } from 'astro:content';

export type PageEntry = CollectionEntry<'pages'>;

/** URL path for a page entry: "about" -> "/about/", "index" -> "/". */
export function pagePath(entry: PageEntry): string {
  const id = entry.id.replace(/(^|\/)index$/, '');
  return id ? `/${id}/` : '/';
}

/** All publishable pages (drafts excluded), sorted by path. */
export async function getPublishedPages(): Promise<PageEntry[]> {
  const pages = await getCollection('pages', ({ data }) => !data.draft);
  return pages.sort((a, b) => pagePath(a).localeCompare(pagePath(b)));
}

/**
 * Whether a page belongs in the internal site search (Pagefind index).
 * Only built pages can be indexed at all, so redirects, retired URLs, 404s
 * and drafts are never searchable. Of the built pages, noindex pages,
 * sitemap-false archives (pagination), landing pages (lead/utility funnels)
 * and /category/ archives are left out unless a page sets `search: true`;
 * `search: false` removes an otherwise searchable page.
 * scripts/check-dist.mjs re-checks this policy on the built site.
 */
export function isSearchable(entry: PageEntry): boolean {
  const d = entry.data;
  if (d.search !== undefined) return d.search;
  if (d.draft || d.noindex || !d.sitemap || d.layout === 'landing') return false;
  return !pagePath(entry).startsWith('/category/');
}
