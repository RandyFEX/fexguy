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

  // Review pilot (10 pages, October 2026): representative company-review
  // structures before the wider review rollout. Review pages use the bare
  // company, agency or product name as their breadcrumb label (Randy's review
  // convention), so every entry sets `crumb`.
  '/lumico-burial-insurance-review/': { family: 'review', crumb: 'Lumico' },
  '/aig-life-insurance-company-review/': { family: 'review', crumb: 'AIG' },
  '/oxford-life-burial-insurance-review/': { family: 'review', crumb: 'Oxford Life' },
  '/royal-neighbors-of-america/': { family: 'review', crumb: 'Royal Neighbors of America' },
  '/lincoln-heritage-funeral-advantage-review-old/': { family: 'review', crumb: 'Lincoln Heritage' },
  '/mutual-of-omaha-burial-insurance/': { family: 'review', crumb: 'Mutual of Omaha' },
  '/senior-legacy-life-review/': { family: 'review', crumb: 'Senior Legacy Life' },
  '/life-insurance-savings-group-review/': { family: 'review', crumb: 'Life Insurance Savings Group' },
  '/trustage-life-insurance-review/': { family: 'review', crumb: 'TruStage' },
  '/americo-life-insurance-quit-smoking-advantage/': { family: 'review', crumb: 'Americo Quit Smoking Advantage' },

  // Review rollout (October 2026): the remaining company-review pages, with
  // the same breadcrumb convention as the pilot. Held for content review:
  // Aflac, T2, both Colonial Penn pages and Trinity.
  '/5-reasons-you-should-be-worried-about-aarp-life-insurance/': { family: 'review', crumb: 'AARP' },
  '/aarp-burial-insurance-review/': { family: 'review', crumb: 'AARP' },
  '/aarp-life-insurance-review/': { family: 'review', crumb: 'AARP' },
  '/baltimore-life-burial-insurance-review/': { family: 'review', crumb: 'Baltimore Life' },
  '/big-lou-term-life-insurance-review/': { family: 'review', crumb: 'Big Lou' },
  '/burial-insurance/american-amicable-life-insurance-review/': { family: 'review', crumb: 'American Amicable' },
  '/cica-life-burial-insurance-review/': { family: 'review', crumb: 'CICA Life' },
  '/ethos-life-insurance-review/': { family: 'review', crumb: 'Ethos' },
  '/family-benefit-life-burial-insurance-review/': { family: 'review', crumb: 'Family Benefit Life' },
  '/fidelity-life-burial-insurance-review/': { family: 'review', crumb: 'Fidelity Life' },
  '/foresters-burial-insurance-review/': { family: 'review', crumb: 'Foresters' },
  '/gerber-life-insurance-review/': { family: 'review', crumb: 'Gerber Life' },
  '/great-western-burial-insurance-review/': { family: 'review', crumb: 'Great Western' },
  '/guarantee-trust-life-insurance-review/': { family: 'review', crumb: 'Guarantee Trust Life' },
  '/liberty-bankers-burial-insurance-review/': { family: 'review', crumb: 'Liberty Bankers' },
  '/open-care-life-insurance-review/': { family: 'review', crumb: 'Open Care' },
  '/phoenix-life-burial-insurance-review-pros-cons/': { family: 'review', crumb: 'Phoenix Life' },
  '/primerica-life-insurance-review/': { family: 'review', crumb: 'Primerica' },
  '/prosperity-life-burial-insurance-review-pros-cons/': { family: 'review', crumb: 'Prosperity Life' },
  '/security-national-burial-insurance-review/': { family: 'review', crumb: 'Security National' },
  '/senior-life-insurance-review/': { family: 'review', crumb: 'Senior Life' },
  '/state-farm/': { family: 'review', crumb: 'State Farm' },
  '/transamerica-burial-insurance-review/': { family: 'review', crumb: 'Transamerica' },
  '/united-heritage-burial-insurance-review/': { family: 'review', crumb: 'United Heritage' },
  '/valife/': { family: 'review', crumb: 'VALife' },
  '/globe-life-price-increase/': { family: 'review', crumb: 'Globe Life' },
  '/trustage-price-increase/': { family: 'review', crumb: 'TruStage' },
  '/senior-legacy-vs-senior-legacy-life/': { family: 'review', crumb: 'Senior Legacy' },

  // Core final-expense articles (October 2026): general education, buying
  // for family, seniors and Medicaid. Section Burial Insurance; the page's H1
  // is its breadcrumb unless the H1 is too long (then `crumb`).
  '/5-ways-to-get-burial-insurance-with-first-day-coverage/': { section: 'burialInsurance', crumb: '5 Ways to Get First-Day Coverage' },
  '/burial-insurance-calculator/': { section: 'burialInsurance' },
  '/burial-insurance/and-coronavirus/': { section: 'burialInsurance', crumb: 'Burial Insurance and Coronavirus' },
  '/burial-insurance/and-suicide/': { section: 'burialInsurance' },
  '/burial-insurance/borrowing-against-cash-value/': { section: 'burialInsurance' },
  '/burial-insurance/build-chart/': { section: 'burialInsurance', crumb: 'Height & Weight Build Charts' },
  '/burial-insurance/burial-insurance-application-process/': { section: 'burialInsurance' },
  '/burial-insurance/burial-insurance-near-me/': { section: 'burialInsurance' },
  '/burial-insurance/cheap/': { section: 'burialInsurance' },
  '/burial-insurance/contestability-period/': { section: 'burialInsurance' },
  '/burial-insurance/dui-dwi/': { section: 'burialInsurance' },
  '/burial-insurance/felony-conviction/': { section: 'burialInsurance' },
  '/burial-insurance/final-expense-life-insurance-dave-ramsey/': { section: 'burialInsurance' },
  '/burial-insurance/how-to-apply-for-burial-insurance/': { section: 'burialInsurance' },
  '/burial-insurance/is-burial-insurance-permanent/': { section: 'burialInsurance' },
  '/burial-insurance/life-insurance-no-exam/': { section: 'burialInsurance' },
  '/burial-insurance/life-insurance-with-no-waiting-period/': { section: 'burialInsurance' },
  '/burial-insurance/no-questions-asked/': { section: 'burialInsurance' },
  '/burial-insurance/online/': { section: 'burialInsurance' },
  '/burial-insurance/scams/': { section: 'burialInsurance' },
  '/burial-insurance/state-regulated-life-insurance/': { section: 'burialInsurance' },
  '/burial-insurance/with-first-day-coverage/': { section: 'burialInsurance' },
  '/declined-for-life-insurance/': { section: 'burialInsurance' },
  '/finding-affordable-burial-insurance/': { section: 'burialInsurance' },
  '/how-much-burial-insurance-do-i-need/': { section: 'burialInsurance' },
  '/is-burial-insurance-worth-it/': { section: 'burialInsurance' },
  '/the-importance-of-burial-insurance/': { section: 'burialInsurance' },
  '/life-insurance-height-weight-guidelines/': { section: 'burialInsurance' },
  '/funeral-plan-insurance-policies/': { section: 'burialInsurance' },
  '/rapture-life-insurance/': { section: 'burialInsurance', crumb: 'Rapture Life Insurance' },
  '/burial-insurance/brother/': { section: 'burialInsurance' },
  '/burial-insurance/sister/': { section: 'burialInsurance' },
  '/burial-insurance/parents/': { section: 'burialInsurance' },
  '/burial-insurance/can-i-buy-life-insurance-on-my-mother/': { section: 'burialInsurance' },
  '/burial-insurance/on-someone-else/': { section: 'burialInsurance' },
  '/burial-insurance/life-insurance-widows/': { section: 'burialInsurance' },
  '/what-happens-when-your-spouse-died-no-life-insurance/': { section: 'burialInsurance', crumb: 'When a Spouse Dies Without Life Insurance' },
  '/burial-insurance/for-seniors/': { section: 'burialInsurance' },
  '/burial-insurance/funeral-insurance-for-seniors/': { section: 'burialInsurance' },
  '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/': { section: 'burialInsurance' },
  '/burial-insurance/life-insurance-for-seniors/': { section: 'burialInsurance', crumb: 'Life Insurance for Seniors' },
  '/burial-insurance/over-70/': { section: 'burialInsurance' },
  '/burial-insurance/over-80/': { section: 'burialInsurance' },
  '/final-expense-life-insurance-over-80/': { section: 'burialInsurance' },
  '/burial-insurance/burial-insurance-medicaid/': { section: 'burialInsurance' },
  '/final-expense-life-insurance-medicaid/': { section: 'burialInsurance' },
  '/medicaid-spend-down-rules-on-life-insurance/': { section: 'burialInsurance' },

  // Remaining editorial articles (October 2026). Funeral, cremation and
  // end-of-life articles have no indexable hub, so they sit at Home › page;
  // flameless cremation is a burial-insurance article.
  '/burial-vs-cremation/': { section: 'none' },
  '/cremation-cost-and-info/': { section: 'none' },
  '/cremation-cost-questions/': { section: 'none', crumb: 'Cremation Questions' },
  '/how-much-cremation-cost/': { section: 'none' },
  '/how-much-does-a-funeral-cost/': { section: 'none' },
  '/pay-for-a-funeral-without-life-insurance/': { section: 'none' },
  '/prepaid-caskets-pros-and-cons/': { section: 'none' },
  '/prepaid-funeral/': { section: 'none' },
  '/what-to-do-when-a-loved-one-dies/': { section: 'none' },
  '/burial-insurance/donating-your-body-to-science/': { section: 'none', crumb: 'Donating Your Body to Science' },
  '/flameless-cremation-burial-insurance/': { section: 'burialInsurance' },
  // Occupation and member-organization pages: final-expense articles go under
  // Burial Insurance; employer group life is top level.
  '/burial-insurance/final-expense-insurance-for-pastors-and-congregations/': { section: 'burialInsurance', crumb: 'Pastors and Congregations' },
  '/burial-insurance/native-americans/': { section: 'burialInsurance' },
  '/burial-insurance/veterans/': { section: 'burialInsurance' },
  '/final-expense-life-insurance-retired-truckers/': { section: 'burialInsurance' },
  '/american-legion-life-insurance/': { section: 'burialInsurance' },
  '/elks-lodge-life-insurance-options/': { section: 'burialInsurance' },
  '/lions-club-member-life-insurance/': { section: 'burialInsurance', crumb: 'Lions Club Member Life Insurance' },
  '/veterans-of-foreign-wars-vfw-life-insurance-options/': { section: 'burialInsurance', crumb: 'VFW Life Insurance Options' },
  '/life-insurance-for-employees/': { section: 'none' },
  // Term, mortgage protection and other products: top level for now.
  '/term-life-conversion-to-whole-life/': { section: 'none' },
  '/term-life-insurance-doctors/': { section: 'none' },
  '/term-life-insurance-truckers/': { section: 'none' },
  '/term-life-insurance-guide-everyone/': { section: 'none' },
  '/mortgage-protection-life-insurance/': { section: 'none' },
  '/long-term-care-insurance-guide/': { section: 'none' },
  '/cancer-insurance/': { section: 'none' },
  '/children-grandchild-policies/': { section: 'none' },
  // IUL articles: section IUL Playbook (/iul-book/, which keeps its own layout).
  '/iul-book/iul-church-members-faith-based-communities/': { section: 'iulPlaybook' },
  '/iul-book/iul-military-members-veterans/': { section: 'iulPlaybook' },
  '/iul-book/iul-police-officers-firefighters/': { section: 'iulPlaybook', crumb: 'IULs for Police and Firefighters' },
  '/iul-book/iuls-for-truckers/': { section: 'iulPlaybook', crumb: 'IULs for Truckers' },
  '/iul-book/teachers-indexed-universal-life-iul/': { section: 'iulPlaybook', crumb: 'IULs for Teachers' },

  // Pillar guides (October 2026): standard article template, section Burial
  // Insurance.
  '/what-is-burial-insurance/': { section: 'burialInsurance' },
  '/final-expense-life-insurance-complete-guide/': { section: 'burialInsurance' },
  '/burial-insurance/top-10-final-expense-life-insurance-companies/': { section: 'burialInsurance' },

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
