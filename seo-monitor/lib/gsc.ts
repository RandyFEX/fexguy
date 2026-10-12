// Search Console connectivity test for the domain property sc-domain:fexguy.com:
// the service account's permission level, then daily clicks, impressions,
// CTR and average position for the 28 days ending 3 days ago (Search
// Console data lags by about 2-3 days).
import { GSC_SITE } from './config.js';
import { googleFetch } from './google-api.js';

const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

type Site = { siteUrl: string; permissionLevel: string };
type Query = { rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] };

export async function testGsc(token: string) {
  const site = encodeURIComponent(GSC_SITE);
  const access = await googleFetch<Site>(`https://searchconsole.googleapis.com/webmasters/v3/sites/${site}`, token);
  if (!access.ok) return { ok: false as const, site: GSC_SITE, step: 'site access', error: access };

  const startDate = day(30);
  const endDate = day(3);
  const result = await googleFetch<Query>(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    token,
    { startDate, endDate, dimensions: ['date'], rowLimit: 100 },
  );
  if (!result.ok) return { ok: false as const, site: GSC_SITE, step: 'search analytics', permissionLevel: access.data.permissionLevel, error: result };

  const rows = result.data.rows ?? [];
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    ok: true as const,
    site: GSC_SITE,
    permissionLevel: access.data.permissionLevel,
    range: { startDate, endDate },
    empty: rows.length === 0,
    note: rows.length === 0 ? 'Connected, but Search Console returned no rows for this range.' : undefined,
    totals: { clicks, impressions, ctr: impressions ? Number((clicks / impressions).toFixed(4)) : 0 },
    days: rows.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: Number(r.ctr.toFixed(4)), position: Number(r.position.toFixed(1)) })),
  };
}
