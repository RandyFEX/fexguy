import { site } from '@/config/site';

/** "{page} | {site}" unless the page supplies a full override. The homepage
 * should pass `fullTitle` so it isn't rendered as "Home | FEXGUY". */
export function pageTitle(title: string, override?: string): string {
  if (override) return override;
  return title ? `${title} | ${site.name}` : site.name;
}
