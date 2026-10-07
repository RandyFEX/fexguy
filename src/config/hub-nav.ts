// Hub navigation (approved by Randy, October 2026): the internal-link
// architecture of the three hubs and the health category pages.
//
//   /burial-insurance/ › Burial Insurance Guides (8 clusters) and Health Conditions
//   /a-z-health/ › category pages › conditions, plus selected common conditions
//   /a-z-companies/ › company reviews A–Z, grouped by what the company is
//
// Rendered by src/lib/hub-nav.ts: on the three hubs where the page Markdown
// holds <div data-hub-nav="ID"></div>, and on the health category pages after
// the article (CATEGORY_MORE). Every link must point at a published page; the
// build fails otherwise. Labels are the target page's H1 or breadcrumb label
// (conditions: the condition's name from its H1). Navigation only: no claims.

export interface HubLink {
  href: string;
  label: string;
}

/** A company entry on /a-z-companies/: its primary page, plus related pages. */
export interface CompanyEntry extends HubLink {
  also?: HubLink[];
}

export interface GuideCluster {
  id: string;
  title: string;
  /** The one visually primary page (the cluster's pillar). */
  primary: HubLink;
  supporting: HubLink[];
  /** Shown under "More guides:". */
  more: HubLink[];
}

// --- /burial-insurance/ --------------------------------------------------------

export const BURIAL_GUIDES: GuideCluster[] = [
  {
    id: 'guides-basics',
    title: 'Burial Insurance Basics',
    primary: { href: '/what-is-burial-insurance/', label: 'What is Burial Insurance?' },
    supporting: [
      { href: '/final-expense-life-insurance-complete-guide/', label: 'Final Expense Whole Life Insurance Complete Guide' },
      { href: '/buyers-guide/', label: 'Buyers Guide' },
      { href: '/is-burial-insurance-worth-it/', label: 'Is Burial Insurance Worth It?' },
      { href: '/the-importance-of-burial-insurance/', label: 'The Importance of Burial Insurance' },
      { href: '/burial-insurance/is-burial-insurance-permanent/', label: 'Is Burial Insurance Permanent?' },
    ],
    more: [
      { href: '/burial-insurance/borrowing-against-cash-value/', label: 'Borrowing Against Cash Value' },
      { href: '/burial-insurance/final-expense-life-insurance-dave-ramsey/', label: 'Final Expense Insurance Vs. Dave Ramsey' },
      { href: '/funeral-plan-insurance-policies/', label: 'Funeral Plan Insurance Policies' },
      { href: '/flameless-cremation-burial-insurance/', label: 'Flameless Cremation Burial Insurance' },
      { href: '/rapture-life-insurance/', label: 'Rapture Life Insurance' },
    ],
  },
  {
    id: 'guides-cost',
    title: 'Cost and Affordability',
    primary: { href: '/how-much-does-final-expense-insurance-cost/', label: 'How Much Does Final Expense Insurance Cost?' },
    supporting: [
      { href: '/how-much-burial-insurance-do-i-need/', label: 'How Much Burial Insurance Do I Need?' },
      { href: '/burial-insurance-calculator/', label: 'Burial Insurance Calculator' },
      { href: '/finding-affordable-burial-insurance/', label: 'Key to Finding Affordable Burial Insurance' },
    ],
    more: [
      { href: '/burial-insurance/cheap/', label: 'Cheap Burial Insurance' },
      { href: '/burial-insurance/burial-insurance-near-me/', label: 'Affordable Burial Insurance Near Me' },
    ],
  },
  {
    id: 'guides-coverage',
    title: 'Coverage Types and Waiting Periods',
    primary: { href: '/burial-insurance/with-first-day-coverage/', label: 'Burial Insurance with First-day Coverage' },
    supporting: [
      { href: '/burial-insurance/life-insurance-with-no-waiting-period/', label: 'Life Insurance With No Waiting Period' },
      { href: '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/', label: 'Guaranteed Issue Life Insurance for Seniors' },
      { href: '/burial-insurance/life-insurance-no-exam/', label: 'Final Expense Life Insurance With No Exam' },
    ],
    more: [
      { href: '/5-ways-to-get-burial-insurance-with-first-day-coverage/', label: '5 Ways to Get First-Day Coverage' },
      { href: '/burial-insurance/no-questions-asked/', label: 'Burial Insurance No Questions Asked' },
      { href: '/burial-insurance/contestability-period/', label: 'Burial Insurance Contestability Period' },
      { href: '/burial-insurance/and-suicide/', label: 'Burial Insurance and Suicide' },
    ],
  },
  {
    id: 'guides-qualifying',
    title: 'Qualifying, Applying and Choosing a Company',
    primary: { href: '/final-expense-life-insurance-pre-existing-conditions/', label: 'Final Expense Life Insurance For People With Pre-Existing Conditions' },
    supporting: [
      { href: '/burial-insurance/top-10-final-expense-life-insurance-companies/', label: 'Top 10 Final Expense Life Insurance Companies' },
      { href: '/burial-insurance/how-to-apply-for-burial-insurance/', label: 'How to Apply For Burial Insurance' },
      { href: '/declined-for-life-insurance/', label: 'Declined for Life Insurance – What To Do Now?' },
    ],
    more: [
      { href: '/burial-insurance/burial-insurance-application-process/', label: 'Burial Insurance Application Process' },
      { href: '/burial-insurance/online/', label: 'Buying Burial Insurance Online' },
      { href: '/burial-insurance/build-chart/', label: 'Height & Weight Build Charts' },
      { href: '/life-insurance-height-weight-guidelines/', label: 'Life Insurance Height and Weight Guidelines' },
      { href: '/burial-insurance/dui-dwi/', label: 'Burial Insurance with a DUI or DWI History' },
      { href: '/burial-insurance/felony-conviction/', label: 'Burial Insurance With A Felony Conviction' },
      { href: '/burial-insurance/and-coronavirus/', label: 'Burial Insurance and Coronavirus' },
    ],
  },
  {
    id: 'guides-age',
    title: 'Coverage by Age and Life Stage',
    primary: { href: '/burial-insurance/for-seniors/', label: 'Burial Policies for Seniors' },
    supporting: [
      { href: '/burial-insurance/over-70/', label: 'Burial Insurance Over 70 – What You Need To Know' },
      { href: '/burial-insurance/over-80/', label: 'Burial Insurance Over 80' },
      { href: '/burial-insurance/life-insurance-for-seniors/', label: 'Life Insurance for Seniors' },
    ],
    more: [
      { href: '/burial-insurance/funeral-insurance-for-seniors/', label: 'Funeral Insurance for Seniors' },
      { href: '/final-expense-life-insurance-over-80/', label: 'Final Expense Insurance for Seniors Over 80' },
      { href: '/burial-insurance/life-insurance-widows/', label: 'Final Expense Life Insurance – Widows Age 50-85' },
      { href: '/what-happens-when-your-spouse-died-no-life-insurance/', label: 'When a Spouse Dies Without Life Insurance' },
    ],
  },
  {
    id: 'guides-family',
    title: 'Buying for a Family Member',
    primary: { href: '/burial-insurance/on-someone-else/', label: 'Buying Burial Insurance on Someone Else' },
    supporting: [{ href: '/burial-insurance/parents/', label: 'Burial Insurance for Parents' }],
    more: [
      { href: '/burial-insurance/can-i-buy-life-insurance-on-my-mother/', label: 'Can I Buy Life Insurance on my Mother?' },
      { href: '/burial-insurance/sister/', label: 'Burial Insurance For A Sister' },
      { href: '/burial-insurance/brother/', label: 'Burial Insurance for Brother' },
    ],
  },
  {
    id: 'guides-groups',
    title: 'Veterans, Groups and Communities',
    primary: { href: '/burial-insurance/veterans/', label: 'Burial Insurance for Veterans' },
    supporting: [
      { href: '/american-legion-life-insurance/', label: 'American Legion Member Life Insurance Options' },
      { href: '/veterans-of-foreign-wars-vfw-life-insurance-options/', label: 'VFW Life Insurance Options' },
    ],
    more: [
      { href: '/elks-lodge-life-insurance-options/', label: 'Elks Lodge Life Insurance Member Options' },
      { href: '/lions-club-member-life-insurance/', label: 'Lions Club Member Life Insurance' },
      { href: '/burial-insurance/native-americans/', label: 'Burial Insurance for Native Americans' },
      { href: '/burial-insurance/final-expense-insurance-for-pastors-and-congregations/', label: 'Pastors and Congregations' },
      { href: '/final-expense-life-insurance-retired-truckers/', label: 'Final Expense Insurance For Retired Truckers' },
    ],
  },
  {
    id: 'guides-medicaid',
    title: 'Medicaid, Rules and Scams',
    primary: { href: '/burial-insurance/burial-insurance-medicaid/', label: 'Burial Insurance And Medicaid' },
    supporting: [
      { href: '/burial-insurance/scams/', label: 'Burial Insurance Scams' },
      { href: '/medicaid-spend-down-rules-on-life-insurance/', label: 'Medicaid Spend Down Rules on Life Insurance' },
    ],
    more: [
      { href: '/final-expense-life-insurance-medicaid/', label: 'Final Expense Insurance And Medicaid' },
      { href: '/burial-insurance/state-regulated-life-insurance/', label: 'State Regulated Life Insurance…Is It A Lie?' },
    ],
  },
];

// --- Health --------------------------------------------------------------------

/** The nine health category pages (each lists all of its conditions). */
export const HEALTH_CATEGORIES: HubLink[] = [
  { href: '/burial-insurance/heart-conditions/', label: 'Heart and Circulatory' },
  { href: '/burial-insurance/cancer/', label: 'Cancer' },
  { href: '/burial-insurance/diabetes/', label: 'Diabetes' },
  { href: '/burial-insurance/respiratory-lung-conditions/', label: 'Lung and Respiratory' },
  { href: '/burial-insurance/neurological-disorders/', label: 'Brain and Nervous System' },
  { href: '/burial-insurance/mental-health-conditions/', label: 'Mental Health' },
  { href: '/burial-insurance/kidney-disease/', label: 'Kidney' },
  { href: '/burial-insurance/liver-disease/', label: 'Liver' },
  { href: '/burial-insurance/adl-activities-of-daily-living/', label: 'Daily Living and Disability' },
];

/** Linked directly from /a-z-health/ as well as from their category page. */
export const COMMON_CONDITIONS: HubLink[] = [
  { href: '/burial-insurance/copd/', label: 'COPD' },
  { href: '/burial-insurance/heart-attack/', label: 'Heart Attack' },
  { href: '/burial-insurance/congestive-heart-failure/', label: 'Congestive Heart Failure' },
  { href: '/burial-insurance/stroke-tia/', label: 'Stroke and TIA' },
  { href: '/burial-insurance/dementia-alzheimers/', label: 'Dementia and Alzheimer’s' },
  { href: '/burial-insurance/parkinsons-disease/', label: 'Parkinson’s Disease' },
  { href: '/burial-insurance/oxygen-use/', label: 'Oxygen Use' },
  { href: '/burial-insurance/insulin-diabetics/', label: 'Insulin Dependent Diabetics' },
  { href: '/burial-insurance-kidney-failure/', label: 'Kidney Failure' },
  { href: '/burial-insurance/dialysis-patients/', label: 'Dialysis Patients' },
  { href: '/burial-insurance/high-blood-pressure/', label: 'High Blood Pressure' },
  { href: '/burial-insurance/heart-surgery/', label: 'Heart Surgery' },
];

/** Conditions without a suitable category page: linked from /a-z-health/. */
export const MORE_CONDITIONS: { id: string; title: string; links: HubLink[] }[] = [
  {
    id: 'more-substance-tobacco-weight',
    title: 'Substance Use, Tobacco and Weight',
    links: [
      { href: '/burial-insurance/drug-alcohol-abuse/', label: 'Drug or Alcohol Abuse' },
      { href: '/burial-insurance/alcohol-or-drug-abuse/', label: 'Alcohol or Drug Abuse' },
      { href: '/burial-insurance-substance-abuse-drug-abuse/', label: 'Substance Abuse' },
      { href: '/burial-insurance/drug-abuse-treatment/', label: 'Drug Abuse or Treatment' },
      { href: '/burial-insurance/marijuana-use/', label: 'Marijuana Use' },
      { href: '/burial-insurance/medical-marijuana/', label: 'Medical Marijuana Use' },
      { href: '/burial-insurance/cbd-oil/', label: 'CBD Oil Users' },
      { href: '/burial-insurance/for-smokers/', label: 'Smokers (Ex and Current)' },
      { href: '/burial-insurance/overweight-obese/', label: 'Overweight and Obese' },
    ],
  },
  {
    id: 'more-hospital-hospice-terminal',
    title: 'Hospital, Hospice and Terminal Illness',
    links: [
      { href: '/burial-insurance/hospitalized/', label: 'Hospitalized' },
      { href: '/burial-insurance/nursing-home-residents/', label: 'Nursing Home Residents' },
      { href: '/burial-insurance/hospice-patients/', label: 'Hospice Patients' },
      { href: '/burial-insurance/terminal-illness/', label: 'Terminal Illness' },
      { href: '/burial-insurance/terminally-ill-patients/', label: 'Terminally Ill Patients' },
    ],
  },
  {
    id: 'more-immune-digestive-blood-other',
    title: 'Immune, Digestive, Blood and Other',
    links: [
      { href: '/burial-insurance/aids-hiv/', label: 'AIDS or HIV' },
      { href: '/life-insurance-for-hiv-positive/', label: 'HIV Positive' },
      { href: '/burial-insurance/burial-insurance-arthritis/', label: 'Arthritis' },
      { href: '/burial-insurance/burial-insurance-with-gout/', label: 'Gout' },
      { href: '/burial-insurance/fibromyalgia/', label: 'Fibromyalgia' },
      { href: '/burial-insurance/lupus/', label: 'Lupus' },
      { href: '/burial-insurance/scleroderma/', label: 'Scleroderma' },
      { href: '/burial-insurance/crohns-disease/', label: 'Crohn’s Disease' },
      { href: '/burial-insurance/burial-insurance-with-diverticulitis/', label: 'Diverticulitis' },
      { href: '/burial-insurance/graves-disease/', label: 'Graves’ Disease' },
      { href: '/burial-insurance/sickle-cell-anemia/', label: 'Sickle Cell Anemia' },
    ],
  },
];

/** Each health category page's conditions that its article doesn't already
 * link (shown after the article, so every condition is one click from its
 * category). Mental Health already links all of its conditions. */
export const CATEGORY_MORE: Record<string, { title: string; links: HubLink[] }> = {
  '/burial-insurance/heart-conditions/': {
    title: 'More in Heart and Circulatory',
    links: [
      { href: '/burial-insurance/arrhythmia/', label: 'Arrhythmia' },
      { href: '/burial-insurance/blood-clot/', label: 'Blood Clot' },
      { href: '/burial-insurance/blood-thinner/', label: 'Blood Thinner Users' },
      { href: '/burial-insurance/cardiomyopathy/', label: 'Cardiomyopathy' },
      { href: '/burial-insurance-defibrillator/', label: 'Defibrillator' },
      { href: '/burial-insurance/heart-bypass-surgery/', label: 'Heart Bypass Surgery' },
      { href: '/burial-insurance/heart-disease/', label: 'Heart Disease' },
      { href: '/burial-insurance/heart-failure/', label: 'Heart Failure' },
      { href: '/burial-insurance/heart-surgery-2/', label: 'Burial Insurance After Heart Surgery' },
      { href: '/burial-insurance/high-blood-pressure/', label: 'High Blood Pressure' },
      { href: '/burial-insurance/high-cholesterol/', label: 'High Cholesterol' },
      { href: '/burial-insurance/peripheral-vascular-disease-pvd-pad/', label: 'Peripheral Vascular Disease (PVD or PAD)' },
    ],
  },
  '/burial-insurance/cancer/': {
    title: 'More in Cancer',
    links: [
      { href: '/burial-insurance/leukemia/', label: 'Burial Insurance with Leukemia' },
      { href: '/burial-insurance-breast-cancer/', label: 'Burial Insurance After Breast Cancer' },
      { href: '/burial-insurance-with-lung-cancer/', label: 'Burial Insurance with Lung Cancer' },
      { href: '/burial-insurance/melanoma-skin-cancer/', label: 'Melanoma (Skin Cancer)' },
      { href: '/burial-insurance/myelodysplastic-syndrome/', label: 'Myelodysplastic Syndrome' },
    ],
  },
  '/burial-insurance/diabetes/': {
    title: 'More in Diabetes',
    links: [
      { href: '/burial-insurance-diabetic-complications/', label: 'Diabetic Complications' },
      { href: '/burial-insurance/insulin-diabetics/', label: 'Insulin Dependent Diabetics' },
      { href: '/final-expense-life-insurance-diabetics/', label: 'Final Expense Life Insurance For Diabetics' },
    ],
  },
  '/burial-insurance/respiratory-lung-conditions/': {
    title: 'More in Lung and Respiratory',
    links: [
      { href: '/burial-insurance/lung-disease/', label: 'Lung Disease' },
      { href: '/burial-insurance/sarcoidosis/', label: 'Sarcoidosis' },
      { href: '/burial-insurance/cystic-fibrosis/', label: 'Cystic Fibrosis' },
    ],
  },
  '/burial-insurance/neurological-disorders/': {
    title: 'More in Brain and Nervous System',
    links: [
      { href: '/burial-insurance/muscular-dystrophy/', label: 'Muscular Dystrophy' },
      { href: '/burial-insurance/prion-disease/', label: 'Prion Disease' },
      { href: '/burial-insurance/down-syndrome/', label: 'Down Syndrome' },
    ],
  },
  '/burial-insurance/kidney-disease/': {
    title: 'More in Kidney',
    links: [
      { href: '/burial-insurance-kidney-failure/', label: 'Kidney Failure' },
      { href: '/burial-insurance/dialysis-patients/', label: 'Dialysis Patients' },
      { href: '/burial-insurance/organ-transplant/', label: 'Organ Transplant' },
    ],
  },
  '/burial-insurance/liver-disease/': {
    title: 'More in Liver',
    links: [
      { href: '/burial-insurance/liver-disease-liver-disorder/', label: 'Liver Disease or Liver Disorder' },
      { href: '/burial-insurance/cirrhosis/', label: 'Liver Cirrhosis' },
      { href: '/burial-insurance/fatty-liver-disease/', label: 'Fatty Liver Disease' },
      { href: '/burial-insurance/hepatitis-b/', label: 'Hepatitis B' },
      { href: '/burial-insurance/hepatitis-c/', label: 'Hepatitis C' },
    ],
  },
  '/burial-insurance/adl-activities-of-daily-living/': {
    title: 'More in Daily Living and Disability',
    links: [
      { href: '/burial-insurance/bathing-disability-adl/', label: 'Help with Bathing' },
      { href: '/burial-insurance/continence-activities-of-daily-living-adl/', label: 'Help with Continence' },
      { href: '/burial-insurance/need-help-with-dressing-activities-of-daily-living-adl/', label: 'Help with Dressing' },
      { href: '/burial-insurance/eating-activities-of-daily-living-adl/', label: 'Help with Eating' },
      { href: '/burial-insurance/toileting-activities-of-daily-living-adl/', label: 'Help with Toileting' },
      { href: '/burial-insurance/transferring-activities-of-daily-living-adl/', label: 'Help with Transferring' },
      { href: '/burial-insurance/disability/', label: 'Disability' },
      { href: '/burial-insurance/disabled-persons/', label: 'Disabled Persons' },
      { href: '/burial-insurance/wheelchair-users/', label: 'Wheelchair Users' },
      { href: '/burial-insurance/paralysis-paralyzed/', label: 'Paralysis' },
      { href: '/burial-insurance/blind/', label: 'The Blind' },
    ],
  },
};

// --- /a-z-companies/ ------------------------------------------------------------
// Grouped by what each company is, as its own review page describes it. Aflac
// (its page still carries Aetna text) and T2 stay off until Randy decides.

export const COMPANY_GROUPS: { id: string; title: string; byLetter: boolean; entries: CompanyEntry[] }[] = [
  {
    id: 'reviews-carriers',
    title: 'Insurance Carriers',
    byLetter: true,
    entries: [
      { href: '/aetna-burial-insurance-review/', label: 'Aetna' },
      { href: '/aig-life-insurance-company-review/', label: 'AIG (Corebridge)' },
      { href: '/burial-insurance/american-amicable-life-insurance-review/', label: 'American Amicable' },
      { href: '/americo-life-insurance-quit-smoking-advantage/', label: 'Americo' },
      { href: '/baltimore-life-burial-insurance-review/', label: 'Baltimore Life' },
      { href: '/cica-life-burial-insurance-review/', label: 'CICA Life' },
      { href: '/colonial-penn-burial-insurance-review/', label: 'Colonial Penn' },
      { href: '/family-benefit-life-burial-insurance-review/', label: 'Family Benefit Life' },
      { href: '/fidelity-life-burial-insurance-review/', label: 'Fidelity Life' },
      { href: '/foresters-burial-insurance-review/', label: 'Foresters' },
      { href: '/gerber-life-insurance-review/', label: 'Gerber' },
      { href: '/globe-life-price-increase/', label: 'Globe Life' },
      { href: '/great-western-burial-insurance-review/', label: 'Great Western' },
      { href: '/guarantee-trust-life-insurance-review/', label: 'Guarantee Trust Life' },
      { href: '/liberty-bankers-burial-insurance-review/', label: 'Liberty Bankers' },
      { href: '/lincoln-heritage-funeral-advantage-review-old/', label: 'Lincoln Heritage' },
      { href: '/lumico-burial-insurance-review/', label: 'Lumico' },
      { href: '/mutual-of-omaha-burial-insurance/', label: 'Mutual of Omaha' },
      { href: '/oxford-life-burial-insurance-review/', label: 'Oxford Life' },
      { href: '/phoenix-life-burial-insurance-review-pros-cons/', label: 'Phoenix Life' },
      { href: '/prosperity-life-burial-insurance-review-pros-cons/', label: 'Prosperity Life' },
      { href: '/royal-neighbors-of-america/', label: 'Royal Neighbors of America' },
      { href: '/security-national-burial-insurance-review/', label: 'Security National' },
      { href: '/senior-life-insurance-review/', label: 'Senior Life' },
      { href: '/state-farm/', label: 'State Farm' },
      { href: '/transamerica-burial-insurance-review/', label: 'Transamerica' },
      { href: '/trinity-life-insurance-review/', label: 'Trinity Life' },
      {
        href: '/trustage-life-insurance-review/',
        label: 'TruStage',
        also: [{ href: '/trustage-price-increase/', label: 'TruStage Price Increase' }],
      },
      { href: '/united-heritage-burial-insurance-review/', label: 'United Heritage' },
    ],
  },
  {
    id: 'reviews-programs',
    title: 'Associations, Programs and Agencies',
    byLetter: false,
    entries: [
      {
        href: '/aarp-burial-insurance-review/',
        label: 'AARP',
        also: [
          { href: '/aarp-life-insurance-review/', label: 'AARP Life Insurance Review' },
          { href: '/5-reasons-you-should-be-worried-about-aarp-life-insurance/', label: '5 Reasons You Should Be Worried About AARP Life Insurance' },
        ],
      },
      { href: '/primerica-life-insurance-review/', label: 'Primerica' },
      { href: '/valife/', label: 'VALife' },
    ],
  },
  {
    id: 'reviews-marketing',
    title: 'Marketing Brands and Lead-Generation Sites',
    byLetter: false,
    entries: [
      { href: '/big-lou-term-life-insurance-review/', label: 'Big Lou' },
      { href: '/ethos-life-insurance-review/', label: 'Ethos' },
      { href: '/life-insurance-savings-group-review/', label: 'Life Insurance Savings Group' },
      { href: '/open-care-life-insurance-review/', label: 'Open Care' },
      {
        href: '/senior-legacy-life-review/',
        label: 'Senior Legacy Life',
        also: [{ href: '/senior-legacy-vs-senior-legacy-life/', label: 'Senior Legacy vs. Senior Legacy Life' }],
      },
    ],
  },
];

/** Every link above (the build checks each one is a published page). */
export function allHubNavLinks(): HubLink[] {
  const out: HubLink[] = [];
  for (const c of BURIAL_GUIDES) out.push(c.primary, ...c.supporting, ...c.more);
  out.push(...HEALTH_CATEGORIES, ...COMMON_CONDITIONS);
  for (const g of MORE_CONDITIONS) out.push(...g.links);
  for (const m of Object.values(CATEGORY_MORE)) out.push(...m.links);
  for (const g of COMPANY_GROUPS) for (const e of g.entries) out.push(e, ...(e.also ?? []));
  return out;
}

/** Guide summaries for the two A–Z hubs (Randy's wording), shown where a
 *  Quick Answer would be (ArticleSummary). Not a Quick Answer: these pages
 *  answer no single question. */
export const HUB_SUMMARIES: Record<string, { label: string; text: string }> = {
  '/a-z-companies/': {
    label: 'Company Review Guide',
    text: "Compare final expense life insurance companies and read individual company reviews before you buy. This guide organizes insurers, programs, agencies, and marketing brands so you can quickly find the company you're researching.",
  },
  '/a-z-health/': {
    label: 'Health Condition Guide',
    text: 'Find burial insurance information for specific health conditions and medical histories. This guide organizes conditions by category so you can quickly find the information that applies to you.',
  },
};
