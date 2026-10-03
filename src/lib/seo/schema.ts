// JSON-LD builders for NEW pages. Pages migrated from WordPress carry their
// live JSON-LD verbatim in frontmatter (`jsonLd`) and don't use these.
// Each builder omits any field whose source value is empty, so missing
// business facts never produce empty or false claims. Pass results through
// JSON.stringify into a page's `jsonLd` frontmatter or the Seo component.

import { site } from '@/config/site';

export type JsonLd = Record<string, unknown>;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

const ORG_ID = `${site.url}/#organization`;
const WEBSITE_ID = `${site.url}/#website`;

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.organizationName || site.name,
    url: absoluteUrl('/'),
    ...(site.logo.src ? { logo: absoluteUrl(site.logo.src) } : {}),
    ...(site.phoneE164 ? { telephone: site.phoneE164 } : {}),
    ...(site.email ? { email: site.email } : {}),
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: site.name,
    url: absoluteUrl('/'),
    publisher: { '@id': ORG_ID },
  };
}

export function webPageSchema(params: {
  path: string;
  title: string;
  description?: string;
  datePublished?: Date;
  dateModified?: Date;
}): JsonLd {
  const { path, title, description, datePublished, dateModified } = params;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    ...(description ? { description } : {}),
    isPartOf: { '@id': WEBSITE_ID },
    ...(datePublished ? { datePublished: datePublished.toISOString() } : {}),
    ...(dateModified ? { dateModified: dateModified.toISOString() } : {}),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(faqs: FaqItem[]): JsonLd | undefined {
  if (faqs.length === 0) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
