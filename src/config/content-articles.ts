// Page classification for every page rendered by ContentLayout (Randy, October
// 2026). Pages on the article template (src/config/article-pages.ts) are
// editorial articles by definition; every other content page must appear in
// exactly one list below, and the build fails on a page that is in neither
// (src/layouts/ContentLayout.astro). Landing-layout pages are classified by
// their layout. `npm run verify` re-checks the built HTML.
//
// Editorial articles outside the template open with the same shared
// components as template articles: the byline (ArticleByline), the Quick
// Answer and Key Points (summary markup in the page body, styled by
// src/styles/article-summary.css) and the bulleted table of contents
// (ArticleToc, built from the H2s, unless the page has its own bulleted table
// of contents marked data-article-part="toc"). Body H2-H6 display in ALL CAPS.

/** An opening element an article legitimately lacks, with the reason. */
export interface ArticleExceptions {
  quickAnswer?: string;
  keyPoints?: string;
  toc?: string;
  /** The page's own table of contents sits inside its first section. */
  tocPosition?: string;
}

export const CONTENT_ARTICLES: Record<string, { exceptions?: ArticleExceptions }> = {
  '/colonial-penn-burial-insurance-review/': {},
  '/colonial-penn-two-year-wait/': {},
  '/12-step-final-planning-guide/': {
    exceptions: {
      quickAnswer: 'No approved Quick Answer copy exists for this guide; it needs Randy’s wording.',
      keyPoints: 'No approved key-points copy exists for this guide; it needs Randy’s wording.',
    },
  },
  '/final-expense-life-insurance-book/': {
    exceptions: {
      quickAnswer: 'A book page with no approved Quick Answer copy; it needs Randy’s wording.',
      keyPoints: 'A book page with no approved key-points copy; it needs Randy’s wording.',
      toc: 'Its "BOOK CHAPTERS" list names the chapters as unlinked text; linking it (or adding the shared table of contents beside it) is a content decision for Randy.',
    },
  },
  '/iul-book/': {
    exceptions: {
      quickAnswer: 'A book page with no approved Quick Answer copy; it needs Randy’s wording.',
      keyPoints: 'A book page with no approved key-points copy; it needs Randy’s wording.',
      tocPosition: 'The bulleted chapter list is part of the book’s Introduction section (it follows the Introduction heading); moving it would restructure the book.',
    },
  },
};

/** Paths of the content-layout editorial articles. */
export const contentArticles: ReadonlySet<string> = new Set(Object.keys(CONTENT_ARTICLES));

export type PageType = 'company' | 'contact' | 'legal' | 'utility' | 'sales' | 'archive';

/** Content pages that are not editorial articles, with the reason. */
export const NON_ARTICLE_PAGES: Record<string, { type: PageType; reason: string }> = {
  '/about/': { type: 'company', reason: 'About page (company information).' },
  '/randy-vandervaate/': { type: 'company', reason: 'Author profile page.' },
  '/licenses/': { type: 'company', reason: 'License numbers and lines of authority.' },
  '/editorial-guidelines/': { type: 'company', reason: 'Editorial policy page.' },
  '/funeral-funds-of-america/': { type: 'company', reason: 'Brand-transition notice.' },
  '/contact/': { type: 'contact', reason: 'Contact page.' },
  '/forms/': { type: 'contact', reason: 'Links to insurance companies’ policy-service forms.' },
  '/get-help/': { type: 'contact', reason: 'Short help/contact prompt.' },
  '/privacy-policy/': { type: 'legal', reason: 'Legal page.' },
  '/terms-of-use/': { type: 'legal', reason: 'Legal page (holds the accessibility statement).' },
  '/help/': { type: 'utility', reason: 'Thank-you page after a quote request.' },
  '/welcome/': { type: 'utility', reason: 'Welcome page for new clients (instructions, not an article).' },
  '/lbl/': { type: 'utility', reason: 'Carrier page with no article text.' },
  '/trin-fbl/': { type: 'sales', reason: 'Product sheet for two carriers’ plans (noindex), not an article.' },
  '/funeral-relief-program/': { type: 'sales', reason: 'Promotional offer page (noindex).' },
  '/senior-benefits/': { type: 'sales', reason: 'Promotional program page (noindex).' },
  '/roku/': { type: 'sales', reason: 'TV-ad landing page (noindex).' },
  '/blog/': { type: 'archive', reason: 'Frozen WordPress blog archive (noindex, not linked).' },
};

/** /blog/page/N/ archive pages share the archive classification. */
export function nonArticlePage(path: string) {
  if (/^\/blog\/page\/\d+\/$/.test(path)) return NON_ARTICLE_PAGES['/blog/'];
  return NON_ARTICLE_PAGES[path];
}
