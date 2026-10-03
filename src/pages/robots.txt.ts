import type { APIRoute } from 'astro';
import { allowIndexing } from '@/config/site';

// Generated at build time so it follows the PUBLIC_ALLOW_INDEXING gate:
// everything is disallowed unless this is the real production build.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site).toString();

  const body = allowIndexing
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        '# AI answer engines and AI search crawlers are explicitly welcome.',
        ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'].flatMap((bot) => [
          '',
          `User-agent: ${bot}`,
          'Allow: /',
        ]),
        '',
        `Sitemap: ${sitemap}`,
        '',
      ]
    : ['# Indexing disabled: this is not the production FEXGUY.com site.', 'User-agent: *', 'Disallow: /', ''];

  return new Response(body.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
