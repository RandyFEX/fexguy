// Page phone numbers, chosen per page with the content frontmatter field
// `phone` (default: the website number). Build-time only: never import this
// from a client script, so the CTV number never ships in the site-wide
// JavaScript.
import { lead } from './lead';

export type PagePhone = { display: string; paren: string; href: string };

export const PAGE_PHONES = {
  default: { display: lead.phone.display, paren: '(888) 862-9456', href: lead.phone.href },
  /** Randy's ad campaign number: only on /roku/ and /facebook/ (CLAUDE.md, "Phone"). */
  ctv: { display: '888-656-4648', paren: '(888) 656-4648', href: 'tel:8886564648' },
} satisfies Record<string, PagePhone>;

export type PagePhoneKey = keyof typeof PAGE_PHONES;

/** Swaps the website number (in its link, dashed and parenthesized forms)
 * for a page's own number in shared markup such as the footer. */
export function withPagePhone(html: string, key: PagePhoneKey = 'default'): string {
  if (key === 'default') return html;
  const from = PAGE_PHONES.default;
  const to = PAGE_PHONES[key];
  return html.replaceAll(from.href, to.href).replaceAll(from.paren, to.paren).replaceAll(from.display, to.display);
}
