/** A review's attribution as shown on the site: "Name - City, ST". The
 * archive (data/customer-reviews.json) keeps the published separator, an en
 * dash; the site shows a plain hyphen (Randy, October 2026: no em dashes, and
 * attributions use a regular hyphen). Nothing else in the attribution
 * changes. */
export function displayAttribution(attribution: string): string {
  return attribution.replace(/\s+[–—]\s+/g, ' - ');
}
