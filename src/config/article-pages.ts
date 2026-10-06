// Pages that use the redesigned article template (src/layouts/ArticleLayout.astro).
// This list is the ONLY opt-in: a page listed here is rendered by
// src/pages/[...article].astro; every other page keeps ContentLayout through
// src/pages/[...slug].astro, unchanged. To add a page, add one entry.
//
// Rollout (October 2026): the five pilot page types, then the health family.
// Add other families only after Randy approves each batch.
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

  // Health rollout (October 2026): every remaining health-condition and
  // health-category page. Same breadcrumb rule as the pilot.
  '/burial-insurance-breast-cancer/': { family: 'health' },
  '/burial-insurance-defibrillator/': { family: 'health' },
  '/burial-insurance-diabetic-complications/': { family: 'health', crumb: 'Diabetic Complications' },
  '/burial-insurance-kidney-failure/': { family: 'health' },
  '/burial-insurance-with-lung-cancer/': { family: 'health' },
  '/burial-insurance/adl-activities-of-daily-living/': { family: 'health', crumb: 'Activities of Daily Living' },
  '/burial-insurance/afib/': { family: 'health' },
  '/burial-insurance/aids-hiv/': { family: 'health', crumb: 'AIDS or HIV' },
  '/burial-insurance/alcohol-or-drug-abuse/': { family: 'health' },
  '/burial-insurance/aneurysm/': { family: 'health' },
  '/burial-insurance/angina/': { family: 'health' },
  '/burial-insurance/arrhythmia/': { family: 'health' },
  '/burial-insurance/asthma/': { family: 'health' },
  '/burial-insurance/autism/': { family: 'health' },
  '/burial-insurance/basal-cell-squamous-cell-carcinoma/': { family: 'health', crumb: 'Basal Cell & Squamous Cell Carcinoma' },
  '/burial-insurance/bathing-disability-adl/': { family: 'health', crumb: 'Help with Bathing' },
  '/burial-insurance/bipolar-disorder/': { family: 'health' },
  '/burial-insurance/bladder-cancer/': { family: 'health' },
  '/burial-insurance/blind/': { family: 'health' },
  '/burial-insurance/blood-cancer-leukemia/': { family: 'health' },
  '/burial-insurance/blood-clot/': { family: 'health' },
  '/burial-insurance/brain-cancer/': { family: 'health' },
  '/burial-insurance/brain-tumor/': { family: 'health' },
  '/burial-insurance/breast-cancer/': { family: 'health' },
  '/burial-insurance/burial-insurance-arthritis/': { family: 'health' },
  '/burial-insurance/burial-insurance-with-diverticulitis/': { family: 'health' },
  '/burial-insurance/burial-insurance-with-gout/': { family: 'health' },
  '/burial-insurance/cancer/': { family: 'health' },
  '/burial-insurance/cardiomyopathy/': { family: 'health' },
  '/burial-insurance/cbd-oil/': { family: 'health' },
  '/burial-insurance/cerebral-palsy/': { family: 'health' },
  '/burial-insurance/cervical-cancer/': { family: 'health' },
  '/burial-insurance/chronic-bronchitis/': { family: 'health' },
  '/burial-insurance/cirrhosis/': { family: 'health' },
  '/burial-insurance/colorectal-cancer/': { family: 'health' },
  '/burial-insurance/congestive-heart-failure/': { family: 'health' },
  '/burial-insurance/continence-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Continence' },
  '/burial-insurance/coronary-artery-disease/': { family: 'health' },
  '/burial-insurance/crohns-disease/': { family: 'health' },
  '/burial-insurance/cystic-fibrosis/': { family: 'health' },
  '/burial-insurance/dementia-alzheimers/': { family: 'health' },
  '/burial-insurance/depression/': { family: 'health' },
  '/burial-insurance/diabetes/': { family: 'health' },
  '/burial-insurance/diabetic-amputation/': { family: 'health' },
  '/burial-insurance/diabetic-coma/': { family: 'health' },
  '/burial-insurance/diabetic-insulin-shock/': { family: 'health' },
  '/burial-insurance/diabetic-nephropathy/': { family: 'health' },
  '/burial-insurance/diabetic-neuropathy/': { family: 'health' },
  '/burial-insurance/diabetic-retinopathy/': { family: 'health' },
  '/burial-insurance/dialysis-patients/': { family: 'health' },
  '/burial-insurance/disability/': { family: 'health' },
  '/burial-insurance/disabled-persons/': { family: 'health' },
  '/burial-insurance/down-syndrome/': { family: 'health' },
  '/burial-insurance/drug-abuse-treatment/': { family: 'health' },
  '/burial-insurance/drug-alcohol-abuse/': { family: 'health' },
  '/burial-insurance/eating-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Eating' },
  '/burial-insurance/emphysema/': { family: 'health' },
  '/burial-insurance/endocarditis-heart-infection/': { family: 'health' },
  '/burial-insurance/epilepsy-seizures/': { family: 'health' },
  '/burial-insurance/esophageal-cancer/': { family: 'health' },
  '/burial-insurance/fatty-liver-disease/': { family: 'health' },
  '/burial-insurance/fibromyalgia/': { family: 'health' },
  '/burial-insurance/for-smokers/': { family: 'health', crumb: 'Smokers' },
  '/burial-insurance/graves-disease/': { family: 'health' },
  '/burial-insurance/heart-attack/': { family: 'health' },
  '/burial-insurance/heart-bypass-surgery/': { family: 'health' },
  '/burial-insurance/heart-conditions/': { family: 'health' },
  '/burial-insurance/heart-disease/': { family: 'health' },
  '/burial-insurance/heart-failure/': { family: 'health' },
  '/burial-insurance/heart-murmur/': { family: 'health' },
  '/burial-insurance/heart-surgery-2/': { family: 'health' },
  '/burial-insurance/heart-surgery/': { family: 'health' },
  '/burial-insurance/hepatitis-b/': { family: 'health' },
  '/burial-insurance/hepatitis-c/': { family: 'health' },
  '/burial-insurance/high-blood-pressure/': { family: 'health', crumb: 'Uncontrolled High Blood Pressure' },
  '/burial-insurance/high-cholesterol/': { family: 'health' },
  '/burial-insurance/hodgkins-disease/': { family: 'health' },
  '/burial-insurance/hospice-patients/': { family: 'health', crumb: 'Hospice Patients' },
  '/burial-insurance/huntingtons-disease/': { family: 'health' },
  '/burial-insurance/insulin-diabetics/': { family: 'health' },
  '/burial-insurance/kidney-disease/': { family: 'health' },
  '/burial-insurance/leukemia/': { family: 'health' },
  '/burial-insurance/liver-disease-liver-disorder/': { family: 'health' },
  '/burial-insurance/liver-disease/': { family: 'health' },
  '/burial-insurance/lou-gehrigs-disease-als/': { family: 'health' },
  '/burial-insurance/lung-cancer/': { family: 'health' },
  '/burial-insurance/lung-disease/': { family: 'health' },
  '/burial-insurance/lupus/': { family: 'health' },
  '/burial-insurance/marijuana-use/': { family: 'health' },
  '/burial-insurance/medical-marijuana/': { family: 'health' },
  '/burial-insurance/melanoma-skin-cancer/': { family: 'health', crumb: 'Melanoma' },
  '/burial-insurance/mental-health-conditions/': { family: 'health' },
  '/burial-insurance/multiple-myeloma/': { family: 'health' },
  '/burial-insurance/multiple-sclerosis/': { family: 'health' },
  '/burial-insurance/muscular-dystrophy/': { family: 'health' },
  '/burial-insurance/myelodysplastic-syndrome/': { family: 'health' },
  '/burial-insurance/neurological-disorders/': { family: 'health' },
  '/burial-insurance/nursing-home-residents/': { family: 'health', crumb: 'Nursing Home Residents' },
  '/burial-insurance/organ-transplant/': { family: 'health' },
  '/burial-insurance/ovarian-cancer/': { family: 'health' },
  '/burial-insurance/overweight-obese/': { family: 'health' },
  '/burial-insurance/pacemaker/': { family: 'health' },
  '/burial-insurance/pancreatic-cancer/': { family: 'health' },
  '/burial-insurance/paralysis-paralyzed/': { family: 'health' },
  '/burial-insurance/parkinsons-disease/': { family: 'health' },
  '/burial-insurance/peripheral-vascular-disease-pvd-pad/': { family: 'health', crumb: 'Peripheral Vascular Disease' },
  '/burial-insurance/prion-disease/': { family: 'health' },
  '/burial-insurance/prostate-cancer/': { family: 'health' },
  '/burial-insurance/ptsd/': { family: 'health' },
  '/burial-insurance/respiratory-lung-conditions/': { family: 'health' },
  '/burial-insurance/sarcoma/': { family: 'health' },
  '/burial-insurance/schizophrenia/': { family: 'health' },
  '/burial-insurance/scleroderma/': { family: 'health' },
  '/burial-insurance/sickle-cell-anemia/': { family: 'health', crumb: 'Sickle Cell Anemia' },
  '/burial-insurance/skin-cancer/': { family: 'health' },
  '/burial-insurance/sleep-apnea/': { family: 'health' },
  '/burial-insurance/stroke-tia/': { family: 'health' },
  '/burial-insurance/terminally-ill-patients/': { family: 'health' },
  '/burial-insurance/testicular-cancer/': { family: 'health' },
  '/burial-insurance/thyroid-cancer/': { family: 'health' },
  '/burial-insurance/toileting-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Toileting' },
  '/burial-insurance/traumatic-brain-injury-tbi/': { family: 'health' },
  '/burial-insurance/valvular-heart-disease/': { family: 'health' },
  '/burial-insurance/wheelchair-users/': { family: 'health' },
  '/life-insurance-for-hiv-positive/': { family: 'health', crumb: 'HIV Positive' },

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
