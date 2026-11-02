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

/** The label over the upper-right header phone number on every page (Randy,
 * V14.0). Never "Call Randy" there. */
export const HEADER_PHONE_LABEL = 'Speak With a Licensed Agent';

/** The approved filled handset shown beside every header phone number
 * (24px grid; viewBox "1.5 1.5 21 21"). */
export const HEADER_PHONE_ICON_PATH =
  'M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z';
