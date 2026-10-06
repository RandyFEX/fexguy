// Shared data model for the article template (src/layouts/ArticleLayout.astro).
// The opt-in list itself is src/config/article-pages.ts.
import { ARTICLE_PAGES } from '@/config/article-pages';

export interface Crumb {
  label: string;
  href?: string; // omitted for the current page
}

export interface RelatedLink {
  title: string;
  href: string;
}

/** Breadcrumb sections: the reader's logical hierarchy, not URL folders.
 * One definition each, shared by every page in the section. */
export const SECTIONS = {
  healthConditions: { label: 'Health Conditions', href: '/a-z-health/' },
  companyReviews: { label: 'Company Reviews', href: '/a-z-companies/' },
  burialInsurance: { label: 'Burial Insurance', href: '/burial-insurance/' },
} as const satisfies Record<string, Required<Crumb>>;

export type SectionKey = keyof typeof SECTIONS;
export type ArticleVariant = 'article' | 'hub';

export interface ArticlePageConfig {
  section?: SectionKey;
  crumb: string;
  variant?: ArticleVariant;
  /** "Quick Answer": only wording Randy supplied or approved. Optional; the
   * template omits the block without it. Never generated. */
  quickAnswer?: string;
  related: { href: string; title?: string }[];
  relatedHub?: RelatedLink;
}

/** What the layout receives: config resolved against the built pages. */
export interface ResolvedArticle {
  variant: ArticleVariant;
  quickAnswer?: string;
  breadcrumbs: Crumb[];
  related: RelatedLink[];
  relatedHub?: RelatedLink;
}

export const isArticlePage = (path: string): boolean => path in ARTICLE_PAGES;

// Pages that are conversion or company pages, never "Related Topics".
const NOT_RELATED = /^\/(free-quote|contact|about|randy-vandervaate|help|licenses)\//;

/**
 * Resolves a page's config. `h1Of` returns a published page's H1 text (or
 * undefined if no such page): every link must point at an existing page, or
 * the build fails.
 */
export function resolveArticle(path: string, h1Of: (path: string) => string | undefined): ResolvedArticle {
  const c = ARTICLE_PAGES[path];
  if (!c) throw new Error(`No article config for ${path}`);
  const check = (href: string, what: string) => {
    if (h1Of(href) === undefined) throw new Error(`${path}: ${what} ${href} is not a published page`);
  };
  const section = c.section ? SECTIONS[c.section] : undefined;
  if (section) check(section.href, 'breadcrumb');
  const related = c.related.map((r) => {
    check(r.href, 'related link');
    if (NOT_RELATED.test(r.href) || r.href === path) throw new Error(`${path}: ${r.href} can't be a related topic`);
    return { href: r.href, title: r.title ?? (h1Of(r.href) as string) };
  });
  if (c.relatedHub) check(c.relatedHub.href, 'related hub');
  return {
    variant: c.variant ?? 'article',
    quickAnswer: c.quickAnswer,
    breadcrumbs: [{ label: 'Home', href: '/' }, ...(section ? [section] : []), { label: c.crumb }],
    related,
    relatedHub: c.relatedHub,
  };
}
