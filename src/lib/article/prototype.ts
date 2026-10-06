// The redesigned article template ("article v2") is a PROTOTYPE for Randy's
// approval. Only the pages listed here use it (src/layouts/ArticleLayout.astro);
// every other page keeps ContentLayout unchanged. Each entry is page-specific
// data the template can't derive yet: the reader's breadcrumb trail (logical
// hierarchy, not the URL) and hand-picked related pages (real URLs only).
// Once approved, this becomes shared data (e.g. per-topic clusters).

export interface Crumb {
  label: string;
  href?: string; // omitted for the current page
}

export interface RelatedLink {
  title: string;
  href: string;
}

export interface ArticleConfig {
  /** "Quick Answer": a short narrative summary (about 40–70 words) shown
   * before "Here's the Bottom Line". Written only from facts already in the
   * article; new copy, so it needs Randy's approval. */
  quickAnswer?: string;
  breadcrumbs: Crumb[];
  related: RelatedLink[];
  /** The hub page for the related topics ("View all …"). */
  relatedHub?: RelatedLink;
}

export const ARTICLE_V2: Record<string, ArticleConfig> = {
  '/burial-insurance/copd/': {
    // Wording supplied by Randy (October 2026).
    quickAnswer:
      'People with COPD can still get burial insurance, and many can qualify for first-day coverage. Your options depend on the severity of your COPD, the medications you take, whether you use oxygen, and any recent hospitalizations. More severe COPD can limit your options and may require a two-year waiting period.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Health Conditions', href: '/a-z-health/' },
      { label: 'COPD' },
    ],
    related: [
      { title: 'Emphysema Burial Insurance', href: '/burial-insurance/emphysema/' },
      { title: 'Chronic Bronchitis Burial Insurance', href: '/burial-insurance/chronic-bronchitis/' },
      { title: 'Oxygen Use Burial Insurance', href: '/burial-insurance/oxygen-use/' },
      { title: 'Asthma Burial Insurance', href: '/burial-insurance/asthma/' },
      { title: 'Burial Insurance for Smokers', href: '/burial-insurance/for-smokers/' },
      { title: 'Sleep Apnea Burial Insurance', href: '/burial-insurance/sleep-apnea/' },
    ],
    relatedHub: {
      title: 'All respiratory & lung conditions',
      href: '/burial-insurance/respiratory-lung-conditions/',
    },
  },
};

export const articleConfig = (path: string): ArticleConfig | undefined => ARTICLE_V2[path];
