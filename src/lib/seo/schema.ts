// JSON-LD builders. Pages pass ordinary content fields in; nobody writes
// structured data by hand. Each builder omits any field whose source value
// is empty, so missing business facts never produce empty or false claims.
//
// To add a new schema type (LocalBusiness, Service, Person, Article…), add a
// builder here and pass its result to a layout via the `jsonLd` prop.

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
    '@type': site.organizationType,
    '@id': ORG_ID,
    name: site.organizationName || site.name,
    url: absoluteUrl('/'),
    ...(site.logo ? { logo: absoluteUrl(site.logo) } : {}),
    ...(site.phoneE164 ? { telephone: site.phoneE164 } : {}),
    ...(site.email ? { email: site.email } : {}),
    ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
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
