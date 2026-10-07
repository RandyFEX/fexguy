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
  iulPlaybook: { label: 'IUL Playbook', href: '/iul-book/' },
} as const satisfies Record<string, Required<Crumb>>;

export type SectionKey = keyof typeof SECTIONS;
export type ArticleVariant = 'article' | 'hub';

/** Page families whose breadcrumb section is known. */
export type PageFamily = 'health' | 'review';
const FAMILY_SECTION: Record<PageFamily, SectionKey> = {
  health: 'healthConditions',
  review: 'companyReviews',
};

export interface ArticlePageConfig {
  /** Page family; sets the breadcrumb section unless `section` is given. */
  family?: PageFamily;
  /** Breadcrumb parent: a section, or 'none' for a top-level page
   * (Home › page). Required when no `family` gives it. */
  section?: SectionKey | 'none';
  /** The page's own breadcrumb label. Defaults to the page's H1 when that is
   * short (≤ 50 characters, no "[…]" tag); otherwise required. */
  crumb?: string;
  variant?: ArticleVariant;
  /** "Quick Answer": only wording Randy supplied or approved. Optional; the
   * template omits the block without it. Never generated. */
  quickAnswer?: string;
  /** Related Topics: optional; without links the section isn't shown. */
  related?: { href: string; title?: string }[];
  relatedHub?: RelatedLink;
}

/** Longest H1 used as a breadcrumb label without an explicit `crumb`. */
const MAX_DEFAULT_CRUMB = 50;

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
  const sectionKey = c.section ?? (c.family ? FAMILY_SECTION[c.family] : undefined);
  if (!sectionKey) throw new Error(`${path}: set \`section\` (or a \`family\`) in src/config/article-pages.ts`);
  const section = sectionKey === 'none' ? undefined : SECTIONS[sectionKey];
  if (section) check(section.href, 'breadcrumb');
  const h1 = h1Of(path) ?? '';
  const crumb = c.crumb ?? (h1.length <= MAX_DEFAULT_CRUMB && !/\[/.test(h1) ? h1 : undefined);
  if (!crumb) throw new Error(`${path}: its H1 is too long for a breadcrumb; set \`crumb\` in src/config/article-pages.ts`);
  const related = (c.related ?? []).map((r) => {
    check(r.href, 'related link');
    if (NOT_RELATED.test(r.href) || r.href === path) throw new Error(`${path}: ${r.href} can't be a related topic`);
    return { href: r.href, title: r.title ?? (h1Of(r.href) as string) };
  });
  if (c.relatedHub) check(c.relatedHub.href, 'related hub');
  return {
    variant: c.variant ?? 'article',
    quickAnswer: c.quickAnswer,
    breadcrumbs: [{ label: 'Home', href: '/' }, ...(section ? [section] : []), { label: crumb }],
    related,
    relatedHub: c.relatedHub,
  };
}
