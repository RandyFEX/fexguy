// Shared structured data (JSON-LD). Today it is used only by the article
// template (src/layouts/ArticleLayout.astro), which emits `articleGraph()` in
// place of the page's migrated WordPress JSON-LD. Every other page still
// prints its migrated `jsonLd` frontmatter (src/components/Seo.astro), with
// only the entity corrections in normalizeMigratedJsonLd() below.
//
// The canonical entities are defined once here. Only facts Randy has approved
// are included; no sameAs, credentials, licenses, ratings, FAQ or other
// schema is generated (decisions of October 2026).

import { site } from '@/config/site';

export type JsonLd = Record<string, unknown>;

const BASE = site.url.replace(/\/$/, '');

export const IDS = {
  organization: `${BASE}/#organization`,
  website: `${BASE}/#website`,
  logo: `${BASE}/#logo`,
  randy: `${BASE}/randy-vandervaate/#person`,
} as const;

export const absoluteUrl = (path: string): string => new URL(path, `${BASE}/`).toString();

/** Funeral Funds, the public brand and publisher. */
export function organizationEntity(): JsonLd {
  const logo = absoluteUrl(site.logo.src);
  return {
    '@type': 'Organization',
    '@id': IDS.organization,
    name: 'Funeral Funds',
    alternateName: 'Final Expense Guy', // former name (2025-2026); the business began as Funeral Funds of America
    url: `${BASE}/`,
    telephone: '+1-888-862-9456',
    logo: { '@type': 'ImageObject', '@id': IDS.logo, url: logo, contentUrl: logo, width: site.logo.width, height: site.logo.height, caption: 'Funeral Funds' },
    founder: { '@id': IDS.randy },
  };
}

/** FuneralFunds.com. */
export function websiteEntity(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': IDS.website,
    name: 'Funeral Funds',
    url: `${BASE}/`,
    publisher: { '@id': IDS.organization },
  };
}

/** Randy VanderVaate, the author. Image: the headshot the article byline uses
 * (scripts/optimize-randy-headshot.mjs). */
export function randyEntity(): JsonLd {
  return {
    '@type': 'Person',
    '@id': IDS.randy,
    name: 'Randy VanderVaate',
    url: absoluteUrl('/randy-vandervaate/'),
    jobTitle: 'Licensed Life Insurance Agent',
    image: { '@type': 'ImageObject', url: absoluteUrl('/images/randy/randy-vandervaate-240.jpg'), width: 240, height: 240 },
    worksFor: { '@id': IDS.organization },
  };
}

// --- Migrated (WordPress/Rank Math) JSON-LD ---------------------------------
// Pages outside the article template print their migrated JSON-LD. These
// technical corrections (Randy, October 2026) point it at the canonical
// entities above and leave every other value as migrated:
// - the WordPress author "Final Expense Guy" (/author/rvanderv8/, a 404) is
//   dropped and every reference to it points to Randy's canonical Person,
//   which is added to the graph when it isn't already there;
// - an Organization named "FEX Guy" ("Funeral Funds" since the domain
//   migration) without an @id becomes a reference to
//   the canonical Organization;
// - a stray quote at the end of an image URL is removed;
// - a `knowsAbout` written as a numbered object becomes the plain list of
//   its values (same values, same order);
// - the homepage SearchAction targets the site search (/search/?q=), not
//   WordPress's /?s=.

const LEGACY_AUTHOR = `${BASE}/author/rvanderv8/`;

export function normalizeMigratedJsonLd(block: string): string {
  let data: unknown;
  try {
    data = JSON.parse(block);
  } catch {
    return block;
  }
  let changed = false;
  let needsRandy = false;
  const fix = (o: unknown): unknown => {
    if (Array.isArray(o)) {
      const out = o.filter((v) => !(isNode(v) && v['@type'] === 'Person' && v['@id'] === LEGACY_AUTHOR)).map(fix);
      if (out.length !== o.length) {
        changed = true;
        needsRandy = true;
      }
      return out;
    }
    if (!isNode(o)) return o;
    if (o['@id'] === LEGACY_AUTHOR) {
      changed = true;
      needsRandy = true;
      return { '@id': IDS.randy };
    }
    if (o['@type'] === 'Organization' && !o['@id'] && (o.name === 'FEX Guy' || o.name === 'Funeral Funds')) {
      changed = true;
      return { '@id': IDS.organization };
    }
    const n: JsonLd = {};
    for (const [k, v] of Object.entries(o)) n[k] = fix(v);
    if (typeof n.image === 'string' && n.image.endsWith('"')) {
      n.image = n.image.replace(/"+$/, '');
      changed = true;
    }
    if (isNode(n.knowsAbout) && n.knowsAbout['@type'] === 'knowsAbout') {
      n.knowsAbout = Object.entries(n.knowsAbout)
        .filter(([k]) => /^\d+$/.test(k))
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v);
      changed = true;
    }
    if (n['@type'] === 'SearchAction' && n.target === `${BASE}/?s={search_term_string}`) {
      n.target = `${BASE}/search/?q={search_term_string}`;
      changed = true;
    }
    return n;
  };
  const fixed = fix(data);
  if (!changed) return block;
  if (needsRandy && isNode(fixed) && Array.isArray(fixed['@graph'])) {
    const graph = fixed['@graph'] as unknown[];
    if (!graph.some((v) => isNode(v) && v['@id'] === IDS.randy && v['@type'] === 'Person')) graph.push(randyEntity());
  }
  return JSON.stringify(fixed).replace(/</g, '\\u003c');
}

const isNode = (v: unknown): v is JsonLd => !!v && typeof v === 'object' && !Array.isArray(v);

// --- Dates ------------------------------------------------------------------
// A page's dates come only from its migrated values: the WordPress JSON-LD
// (Article, else WebPage), else its article:/og: meta tags. Never the build,
// the current time, file times or git: a template change must not make a
// page look modified. A missing or invalid date is left out.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export interface PageDates {
  published?: string;
  modified?: string;
}

export function migratedDates(jsonLd: string[] = [], headMeta: { property?: string; name?: string; content: string }[] = []): PageDates {
  const nodes: Record<string, unknown>[] = [];
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      nodes.push(o as Record<string, unknown>);
      Object.values(o).forEach(walk);
    }
  };
  for (const block of jsonLd) {
    try {
      walk(JSON.parse(block));
    } catch {
      // Unparseable legacy block: no dates from it.
    }
  }
  const pick = (key: 'datePublished' | 'dateModified'): string | undefined => {
    for (const types of [['Article', 'BlogPosting'], ['WebPage']]) {
      const v = nodes.find((n) => types.includes(n['@type'] as string) && typeof n[key] === 'string')?.[key] as string | undefined;
      if (v && ISO_DATE.test(v)) return v;
    }
    return undefined;
  };
  const meta = (...names: string[]) => {
    const v = headMeta.find((m) => names.includes(m.property ?? m.name ?? ''))?.content;
    return v && ISO_DATE.test(v) ? v : undefined;
  };
  return {
    published: pick('datePublished') ?? meta('article:published_time'),
    modified: pick('dateModified') ?? meta('article:modified_time', 'og:updated_time'),
  };
}

// --- Article pages ------------------------------------------------------------

export interface ArticleGraphInput {
  /** Absolute canonical URL of the page. */
  url: string;
  /** Visible H1, plain text. */
  headline: string;
  /** The page's visible breadcrumb trail (same data as the Breadcrumbs component);
   * the last crumb is the page itself. */
  crumbs: { label: string; href?: string }[];
  dates: PageDates;
  /** The page's existing representative image (its og:image), if any. */
  image?: { url: string; width?: number; height?: number };
}

/** The complete JSON-LD graph of an article page (one block). */
export function articleGraph({ url, headline, crumbs, dates, image }: ArticleGraphInput): string {
  const webpageId = `${url}#webpage`;
  const breadcrumbId = `${url}#breadcrumb`;
  const graph: JsonLd[] = [
    organizationEntity(),
    websiteEntity(),
    randyEntity(),
    {
      '@type': 'WebPage',
      '@id': webpageId,
      url,
      name: headline,
      isPartOf: { '@id': IDS.website },
      breadcrumb: { '@id': breadcrumbId },
    },
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline,
      author: { '@id': IDS.randy },
      publisher: { '@id': IDS.organization },
      ...(dates.published ? { datePublished: dates.published } : {}),
      ...(dates.modified ? { dateModified: dates.modified } : {}),
      mainEntityOfPage: { '@id': webpageId },
      ...(image
        ? { image: { '@type': 'ImageObject', url: image.url, ...(image.width ? { width: image.width } : {}), ...(image.height ? { height: image.height } : {}) } }
        : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.label,
        item: i === crumbs.length - 1 ? url : absoluteUrl(c.href ?? '/'),
      })),
    },
  ];
  // `<` escaped so no value can end the inline <script> early.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
