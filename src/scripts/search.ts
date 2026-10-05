// Client side of /search/: reads ?q= (or the old WordPress ?s=), queries the
// Pagefind index built by `npm run build`, and renders results 10 at a time.
// Loaded only on /search/; every other page just has a plain HTML form.

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: { title?: string };
}
interface PagefindResult {
  data: () => Promise<PagefindResultData>;
}
interface Pagefind {
  options: (o: Record<string, unknown>) => Promise<void>;
  search: (q: string) => Promise<{ results: PagefindResult[] }>;
}

const PAGE_SIZE = 10;
// Built by Pagefind into dist/pagefind/ after the Astro build; not a module
// Vite can see, so it is imported at runtime by URL. The import() is hidden
// from Vite: it otherwise wraps it in its preload helper, which breaks in
// this inlined script (__VITE_PRELOAD__ is left undefined).
const PAGEFIND_URL = '/pagefind/pagefind.js';
const importByUrl = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function escapeText(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export async function initSearch(): Promise<void> {
  const input = $<HTMLInputElement>('search-q');
  const status = $<HTMLParagraphElement>('search-status');
  const list = $<HTMLOListElement>('search-results');
  const more = $<HTMLButtonElement>('search-more');
  const none = $<HTMLDivElement>('search-none');

  const params = new URLSearchParams(location.search);
  const query = (params.get('q') ?? params.get('s') ?? '').trim();

  // Old ?s= links: keep the query in the URL under the canonical ?q= name.
  if (!params.has('q') && params.has('s')) {
    history.replaceState(null, '', query ? `/search/?q=${encodeURIComponent(query)}` : '/search/');
  }

  input.value = query;
  if (!query) {
    input.focus();
    return;
  }
  document.title = `Search results for “${query}” - Final Expense Guy`;
  status.textContent = 'Searching…';

  let results: PagefindResult[];
  try {
    const pagefind = (await importByUrl(PAGEFIND_URL)) as Pagefind;
    await pagefind.options({ excerptLength: 30 });
    ({ results } = await pagefind.search(query));
  } catch {
    status.textContent = 'Search is not available right now. Please try again later, or browse the popular guides below.';
    return;
  }
  if (results.length === 0) {
    status.innerHTML = `No pages matched “${escapeText(query)}”.`;
    none.hidden = false;
    return;
  }

  status.innerHTML = `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${escapeText(query)}”`;
  list.hidden = false;

  let shown = 0;
  const showNext = async () => {
    const batch = await Promise.all(results.slice(shown, shown + PAGE_SIZE).map((r) => r.data()));
    const firstNew = shown;
    for (const r of batch) {
      const path = new URL(r.url, location.origin).pathname;
      const li = document.createElement('li');
      // Pagefind escapes the excerpt and only adds <mark> around matches.
      li.innerHTML =
        `<h2><a href="${escapeText(path)}">${escapeText(r.meta.title ?? path)}</a></h2>` +
        `<p class="search-result__path">${escapeText(path)}</p>` +
        `<p class="search-result__excerpt">${r.excerpt}</p>`;
      list.append(li);
    }
    shown += batch.length;
    more.hidden = shown >= results.length;
    // After "Show more", move focus to the first new result for keyboard users.
    if (firstNew > 0) list.children[firstNew]?.querySelector('a')?.focus();
  };

  more.addEventListener('click', () => void showNext());
  await showNext();
}
