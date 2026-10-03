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
