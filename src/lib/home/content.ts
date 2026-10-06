// Homepage sections (src/pages/index.astro): headings, links and copy for the
// redesigned homepage. Every link points straight at a built page (200, no
// redirect). Copy is Randy's brief or sentences already published on
// FEXGuy.com; don't add business facts, statistics, ratings or claims here.

export interface HomeLink {
  title: string;
  href: string;
}

/** Icon names drawn by src/components/home/HomeIcon.astro. */
export type HomeIconName =
  | 'compare'
  | 'person'
  | 'calendar'
  | 'map'
  | 'shield'
  | 'clock'
  | 'home'
  | 'tag';

export const whyPoints: { title: string; text: string; icon: HomeIconName }[] = [
  {
    title: 'Independent Broker',
    text: 'Randy can compare options from multiple insurance companies instead of selling just one.',
    icon: 'compare',
  },
  {
    title: 'No Call Center',
    text: 'You deal directly with Randy, not a call center.',
    icon: 'person',
  },
  {
    title: 'First-Day Coverage',
    text: 'Plans are built to qualify you for first-day coverage whenever possible… not default you into expensive waiting-period plans.',
    icon: 'calendar',
  },
  {
    title: 'Licensed in Most States',
    text: 'Call Randy to find out what options are available in your state.',
    icon: 'map',
  },
];

/** "What Do You Need Help With?": the three core products. */
export const services: (HomeLink & { icon: HomeIconName })[] = [
  { title: 'Final Expense Insurance', href: '/burial-insurance/', icon: 'shield' },
  { title: 'Term Life Insurance', href: '/term-life-insurance-guide-everyone/', icon: 'clock' },
  { title: 'Mortgage Protection', href: '/mortgage-protection-life-insurance/', icon: 'home' },
];

/** Hero rate examples: a representative person paired with a coverage amount
 * and monthly premium. MOCKUP PLACEHOLDERS ONLY: the premiums ($XX.XX) and
 * carrier ("Insurance Company") are deliberately not real and must be
 * replaced with real rate examples Randy supplies before launch; the person
 * images are neutral placeholders until proper photos are chosen. Designed
 * for about nine entries (three per product); no annuities, no names, ages,
 * genders or customer stories. */
export interface RateExample {
  product: 'Burial Insurance' | 'Term Life Insurance' | 'Mortgage Protection';
  coverage: string;
  premium: string;
  company: string;
  /** Person photo (none yet: a neutral placeholder is shown). */
  image?: { src: string; alt: string };
}

export const rateExamples: RateExample[] = [
  { product: 'Burial Insurance', coverage: '$15,000', premium: '$XX.XX', company: 'Insurance Company' },
  { product: 'Term Life Insurance', coverage: '$500,000', premium: '$XX.XX', company: 'Insurance Company' },
  { product: 'Mortgage Protection', coverage: '$250,000', premium: '$XX.XX', company: 'Insurance Company' },
];

/** Positions (data/customer-reviews.json "position") of the reviews shown on
 * the homepage, in display order. Shown complete and word for word. */
export const featuredReviewPositions = [9, 12, 49];

export const healthConditions: HomeLink[] = [
  { title: 'Diabetes', href: '/burial-insurance/diabetes/' },
  { title: 'Heart Conditions', href: '/burial-insurance/heart-conditions/' },
  { title: 'COPD', href: '/burial-insurance/copd/' },
  { title: 'Cancer', href: '/burial-insurance/cancer/' },
  { title: 'Stroke / TIA', href: '/burial-insurance/stroke-tia/' },
  { title: 'Oxygen Use', href: '/burial-insurance/oxygen-use/' },
  { title: 'Kidney Disease', href: '/burial-insurance/kidney-disease/' },
  { title: 'Mental Health', href: '/burial-insurance/mental-health-conditions/' },
];

/** Educational company reviews (not a list of companies Randy represents).
 * Names are set as text: no carrier logos. */
export const companyReviews: HomeLink[] = [
  { title: 'Aetna', href: '/aetna-burial-insurance-review/' },
  { title: 'CICA Life', href: '/cica-life-burial-insurance-review/' },
  { title: 'Aflac', href: '/aflac-burial-insurance-review/' },
  { title: 'Trinity Life', href: '/trinity-life-insurance-review/' },
  { title: 'Family Benefit Life', href: '/family-benefit-life-burial-insurance-review/' },
  { title: 'Mutual of Omaha', href: '/mutual-of-omaha-burial-insurance/' },
];

/** Educational guides. The first is featured. Each description only
 * summarizes what its destination page covers (its opening answer and
 * section headings); no figures, dates or reading times. */
export const resources: (HomeLink & { description: string })[] = [
  {
    title: 'How Much Does Final Expense Insurance Cost?',
    href: '/how-much-does-final-expense-insurance-cost/',
    description:
      'What shapes the monthly price, including your age, health and coverage amount, and the kinds of policies to avoid.',
  },
  {
    title: 'Term Life Insurance Guide For Everyone',
    href: '/term-life-insurance-guide-everyone/',
    description:
      'How term life works, choosing a term length, how much coverage families usually need, and how pricing and medical underwriting affect your rate.',
  },
  {
    title: 'Mortgage Protection Life Insurance',
    href: '/mortgage-protection-life-insurance/',
    description:
      'How mortgage protection works, how much coverage you need and for how long, and whether term, whole life or final expense fits best.',
  },
  {
    title: 'Declined for Life Insurance: What To Do',
    href: '/declined-for-life-insurance/',
    description: 'Common reasons applications are declined, and what to do next.',
  },
];

/** Homepage FAQ. Each answer restates, in shorter words, what the retained
 * FEXGuy pages in `sources` say; no approval, first-day or exam promises,
 * and no figures. No FAQPage schema (if added later it must match this text
 * exactly). */
export const faqs: { question: string; answer: string[]; sources: string[] }[] = [
  {
    question: 'What’s the difference between final expense, term life and mortgage protection insurance?',
    answer: [
      'Final expense insurance, often called burial insurance, is a small whole life policy that helps your family pay for a funeral and other final expenses. It lasts for life as long as you pay the premiums. Term life insurance covers you for a set number of years, such as 10, 20 or 30, and usually costs the least per dollar of coverage, which makes it a common way to replace your income while your family depends on it. Mortgage protection is mainly a reason for buying life insurance rather than a separate type: a policy, often term life, with enough coverage for the right length of time so your family can pay off the mortgage or keep making the payments.',
    ],
    sources: [
      '/final-expense-life-insurance-pre-existing-conditions/',
      '/term-life-insurance-guide-everyone/',
      '/mortgage-protection-life-insurance/',
    ],
  },
  {
    question: 'How much life insurance do I need?',
    answer: [
      'It depends on what you want the money to cover. Start with funeral, burial or cremation costs, then add your mortgage balance, other debts such as car loans, credit cards and medical bills, and any income your family relies on. Final expense coverage usually focuses on the funeral and final bills, while term life and mortgage protection are usually sized to pay off a home or replace income. There’s no single right number; it depends on your family’s needs.',
    ],
    sources: [
      '/how-much-burial-insurance-do-i-need/',
      '/mortgage-protection-life-insurance/',
      '/term-life-insurance-guide-everyone/',
    ],
  },
  {
    question: 'Can I get life insurance if I have health problems?',
    answer: [
      'In many cases, yes. Each insurance company looks at health conditions differently, so a condition that leads to a decline at one company may be accepted by another. For term life, conditions such as high blood pressure, diabetes and heart problems can raise the premium, shorten the term lengths available or limit the coverage amount. For final expense, many common conditions can still qualify for first-day coverage, while more serious or recent conditions may limit the types of coverage available.',
    ],
    sources: [
      '/declined-for-life-insurance/',
      '/term-life-insurance-guide-everyone/',
      '/final-expense-life-insurance-pre-existing-conditions/',
    ],
  },
  {
    question: 'Do I need a medical exam?',
    answer: [
      'Often not. Most final expense plans ask health questions instead of requiring a medical exam, and the insurance company may also check your prescription history. Some term life applicants can skip the exam through accelerated underwriting or nonmedical programs; nonmedical programs often have stricter health rules and lower coverage limits, and other applicants may still need an exam. Guaranteed-acceptance plans skip the health questions too, but they come with a two-year waiting period for death from natural causes.',
    ],
    sources: [
      '/burial-insurance/burial-insurance-near-me/',
      '/final-expense-life-insurance-pre-existing-conditions/',
      '/term-life-insurance-guide-everyone/',
      '/burial-insurance/life-insurance-no-exam/',
    ],
  },
  {
    question: 'Can my premium go up?',
    answer: [
      'It depends on the policy. With a level-premium whole life or final expense policy, the monthly payment is set when the policy starts and doesn’t rise as you get older. With level term life, the premium stays the same for the term you choose; if you renew after the term ends, the price usually goes up, sometimes sharply. Some policies are built with increasing prices, so it’s worth checking before you buy.',
    ],
    sources: [
      '/final-expense-life-insurance-pre-existing-conditions/',
      '/term-life-insurance-guide-everyone/',
      '/mortgage-protection-life-insurance/',
      '/how-much-does-final-expense-insurance-cost/',
    ],
  },
  {
    question: 'What’s the difference between first-day coverage and a two-year waiting period?',
    answer: [
      'With first-day coverage, the full death benefit is available as soon as the policy is approved and in force. With a two-year waiting period, if you die from natural causes during the first two years, your beneficiary generally receives the premiums you paid plus interest instead of the full benefit. Which one you qualify for depends on your answers to the health questions and the company you apply with.',
    ],
    sources: ['/burial-insurance/life-insurance-no-exam/', '/burial-insurance/with-first-day-coverage/'],
  },
];
