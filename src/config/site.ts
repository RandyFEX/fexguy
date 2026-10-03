// Single source of truth for site-wide identity, contact details, and
// navigation. Every component (header, footer, phone buttons, structured
// data, llms.txt) reads from here, so a phone number or nav change is a
// one-line edit in this file.
//
// IMPORTANT: Business facts below are intentionally left empty. Fill them in
// only from information Randy provides — never invent or guess them. Any
// component that depends on a missing value renders nothing rather than a
// placeholder, so an empty field can never leak onto a public page.

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  /** Canonical origin, no trailing slash. Also set in astro.config.mjs. */
  url: string;
  name: string;
  /** Default meta description for pages that don't set their own. */
  description: string;
  /** Legal/organization name for structured data and the footer copyright. */
  organizationName: string;
  /** schema.org type for the organization node, e.g. 'Organization',
   * 'InsuranceAgency'. Kept generic until confirmed. */
  organizationType: string;
  locale: string;
  /** Phone number as it should be displayed, e.g. "(555) 555-0100". */
  phoneDisplay: string;
  /** Phone number in E.164 form for tel: links, e.g. "+15555550100". */
  phoneE164: string;
  email: string;
  /** Path under /public, e.g. "/logo.svg". Empty = text wordmark. */
  logo: string;
  /** Default social-share image, path under /public. */
  defaultOgImage: string;
  /** Profile URLs (Facebook, YouTube, LinkedIn…) for schema sameAs. */
  sameAs: string[];
  primaryNav: NavItem[];
  footerNav: NavItem[];
  /** Default call-to-action band shown at the end of content pages. Renders
   * nothing until `heading` is filled in. */
  cta: {
    heading: string;
    text: string;
    /** Optional non-phone action, e.g. a quote/contact page. */
    link?: NavItem;
  };
}

export const site: SiteConfig = {
  url: 'https://fexguy.com',
  name: 'FEXGUY',
  description: '',
  organizationName: '',
  organizationType: 'Organization',
  locale: 'en_US',
  phoneDisplay: '',
  phoneE164: '',
  email: '',
  logo: '',
  defaultOgImage: '',
  sameAs: [],
  primaryNav: [],
  footerNav: [],
  cta: {
    heading: '',
    text: '',
  },
};

/** True only on the real production deployment — see .env.example. */
export const allowIndexing = import.meta.env.PUBLIC_ALLOW_INDEXING === 'true';
