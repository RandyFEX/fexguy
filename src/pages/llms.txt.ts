import type { APIRoute } from 'astro';
import { site } from '@/config/site';
import { getPublishedPages, pagePath } from '@/lib/pages';

// llms.txt: a plain-text index AI answer engines can use to find and cite
// the site's pages. Regenerated from content on every build — never edit
// by hand. Noindexed pages are left out.
export const GET: APIRoute = async ({ site: siteUrl }) => {
  const pages = (await getPublishedPages()).filter((p) => !p.data.noindex && p.data.sitemap);

  const lines = [
    `# ${site.name}`,
    '',
    ...(site.description ? [`> ${site.description}`, ''] : []),
    '## Pages',
    '',
    ...pages.map((p) => `- [${p.data.title}](${new URL(pagePath(p), siteUrl)}): ${p.data.description ?? ''}`),
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
