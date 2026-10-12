// GA4 connectivity test: daily active users, sessions and page views for
// the last 7 complete days from property 386621285 (Analytics Data API).
import { GA4_PROPERTY_ID } from './config.js';
import { googleFetch } from './google-api.js';

type RunReport = {
  rowCount?: number;
  rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
  totals?: { metricValues: { value: string }[] }[];
};

export async function testGa4(token: string) {
  const metrics = ['activeUsers', 'sessions', 'screenPageViews'];
  const result = await googleFetch<RunReport>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    token,
    {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: metrics.map((name) => ({ name })),
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      metricAggregations: ['TOTAL'],
    },
  );
  if (!result.ok) return { ok: false as const, property: GA4_PROPERTY_ID, error: result };

  const rows = result.data.rows ?? [];
  const totals = result.data.totals?.[0]?.metricValues ?? [];
  return {
    ok: true as const,
    property: GA4_PROPERTY_ID,
    range: 'last 7 complete days',
    empty: rows.length === 0,
    note: rows.length === 0 ? 'Connected, but GA4 returned no rows for this range.' : undefined,
    totals: Object.fromEntries(metrics.map((m, i) => [m, Number(totals[i]?.value ?? 0)])),
    days: rows.map((r) => ({
      date: r.dimensionValues[0].value,
      ...Object.fromEntries(metrics.map((m, i) => [m, Number(r.metricValues[i].value)])),
    })),
  };
}
