import { site } from '@/config/site';

/** "{page} - {site}", the title format used on the live WordPress site. */
export function pageTitle(title: string, override?: string): string {
  if (override) return override;
  return title ? `${title} - ${site.name}` : site.name;
}
