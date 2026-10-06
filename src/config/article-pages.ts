// Pages that use the redesigned article template (src/layouts/ArticleLayout.astro).
// This list is the ONLY opt-in: a page listed here is rendered by
// src/pages/[...article].astro; every other page keeps ContentLayout through
// src/pages/[...slug].astro, unchanged. To add a page, add one entry.
//
// PILOT (October 2026): five representative page types. Don't add more pages
// until Randy approves the rollout.
//
// Per page (src/lib/article/config.ts has the types and defaults):
//   family       'health' or 'review': sets the breadcrumb section
//   section      breadcrumb parent (SECTIONS), or 'none' for a top-level page
//                (Home › page); required when no `family` gives it
//   crumb        the page's own breadcrumb label; defaults to its H1 when that
//                is short, otherwise required (the build says so)
//   variant      'hub' for link-collection pages (default: 'article')
//   quickAnswer  only wording Randy has supplied or approved; never generated
//   related      optional; existing pages only (checked at build); `title`
//                defaults to the target page's H1. No links = no section.
//   relatedHub   optional "see all" link under Related Topics
import type { ArticlePageConfig } from '@/lib/article/config';

export const ARTICLE_PAGES: Record<string, ArticlePageConfig> = {
  // A. Health condition (the approved prototype).
  '/burial-insurance/copd/': {
    section: 'healthConditions',
    crumb: 'COPD',
    // Wording supplied by Randy (October 2026).
    quickAnswer:
      'People with COPD can still get burial insurance, and many can qualify for first-day coverage. Your options depend on the severity of your COPD, the medications you take, whether you use oxygen, and any recent hospitalizations. More severe COPD can limit your options and may require a two-year waiting period.',
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

  // B. Company review.
  '/aetna-burial-insurance-review/': {
    section: 'companyReviews',
    crumb: 'Aetna',
    related: [
      { href: '/burial-insurance/top-10-final-expense-life-insurance-companies/' },
      { href: '/burial-insurance/american-amicable-life-insurance-review/' },
      { href: '/foresters-burial-insurance-review/' },
      { href: '/family-benefit-life-burial-insurance-review/' },
      // The review names Aetna "the #1 choice for COPD or very overweight".
      { href: '/burial-insurance/copd/' },
      { href: '/burial-insurance/overweight-obese/' },
    ],
    relatedHub: { title: 'All company reviews', href: '/a-z-companies/' },
  },

  // C. Primary pillar.
  '/burial-insurance/': {
    section: 'none',
    crumb: 'Burial Insurance',
    related: [
      { href: '/how-much-does-final-expense-insurance-cost/' },
      { href: '/burial-insurance/for-seniors/' },
      { href: '/burial-insurance/life-insurance-with-no-waiting-period/' },
      { href: '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/' },
      { href: '/burial-insurance/how-to-apply-for-burial-insurance/' },
      { href: '/burial-insurance/top-10-final-expense-life-insurance-companies/' },
    ],
    relatedHub: { title: 'All health conditions A to Z', href: '/a-z-health/' },
  },

  // D. General article.
  '/how-much-does-final-expense-insurance-cost/': {
    section: 'burialInsurance',
    crumb: 'Final Expense Insurance Cost',
    related: [
      { href: '/finding-affordable-burial-insurance/' },
      { href: '/burial-insurance/cheap/' },
      { href: '/how-much-does-a-funeral-cost/' },
      { href: '/burial-insurance/for-smokers/' },
      { href: '/burial-insurance/life-insurance-with-no-waiting-period/' },
      { href: '/final-expense-life-insurance-complete-guide/' },
    ],
  },

  // Health pilot (10 pages, October 2026): representative health-condition
  // structures before the wider health rollout. Breadcrumb: Home › Health
  // Conditions › H1 (explicit `crumb` only where the H1 is too long).
  '/burial-insurance-substance-abuse-drug-abuse/': { family: 'health' },
  '/burial-insurance/transferring-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Transferring' },
  '/burial-insurance/need-help-with-dressing-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Dressing' },
  '/burial-insurance/stent/': { family: 'health' },
  '/burial-insurance/oxygen-use/': { family: 'health' },
  '/burial-insurance/hospitalized/': { family: 'health' },
  '/burial-insurance/terminal-illness/': { family: 'health', crumb: 'Terminal Illness' },
  '/burial-insurance/blood-thinner/': { family: 'health' },
  '/burial-insurance/sarcoidosis/': { family: 'health' },
  '/final-expense-life-insurance-diabetics/': { family: 'health' },

  // E. A–Z hub.
  // It is the "Health Conditions" section page itself (COPD's parent crumb).
  '/a-z-health/': {
    section: 'none',
    crumb: 'Health Conditions',
    variant: 'hub',
    related: [
      { href: '/final-expense-life-insurance-pre-existing-conditions/' },
      { href: '/burial-insurance/life-insurance-with-no-waiting-period/' },
      { href: '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/' },
      { href: '/a-z-companies/' },
    ],
  },
};
