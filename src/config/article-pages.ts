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
//   quickAnswer  Randy's wording, or a summary of the article's own text that
//                Randy approved; never outside facts
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
    quickAnswer:
      'Burial insurance is a permanent whole life policy that pays your chosen beneficiary when you die, to cover funeral costs, medical bills, and other final expenses. Your premium stays the same for life, and coverage typically ranges from $5,000 to $25,000. You qualify by answering health questions instead of taking a medical exam. The most valuable policies give first-day coverage, while guaranteed acceptance plans with no health questions almost always include a two-year waiting period.',
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
  '/burial-insurance/stent/': {
    family: 'health',
    quickAnswer:
      'Yes, you can get burial insurance after a heart stent, but timing and recovery matter more than anything. Reaching 2 years after your stent is generally when you get the lowest rates and first-day coverage with most top carriers. Within those 2 years, you may get a level or graded plan, and CICA Life is often the best choice for first-day coverage. Finish any pending heart tests or consultations before you apply.',
  },
  '/burial-insurance/oxygen-use/': { family: 'health' },
  '/burial-insurance/hospitalized/': {
    family: 'health',
    quickAnswer:
      'Burial insurance after being hospitalized depends on how recent the stay was and what caused it. No insurance company offers first-day coverage to people who are currently hospitalized, so guaranteed issue burial insurance with no health questions is your only option, and most companies put a two-year waiting period on it. If you die of natural causes during that period, your beneficiary receives the premiums paid plus interest. If your condition improves and enough time passes, better options can open up.',
  },
  '/burial-insurance/terminal-illness/': {
    family: 'health', crumb: 'Terminal Illness',
    quickAnswer:
      'Burial insurance with a terminal illness is limited. No insurance company offers first-day coverage to people with a terminal illness, and most traditional policies will decline you. Your only option is a guaranteed issue policy that asks no health questions but costs more and has a 2-year waiting period. If you die from a health-related cause during those 2 years, your beneficiary gets your premiums back plus interest instead of the full benefit, but accidental death is paid in full.',
  },
  '/burial-insurance/blood-thinner/': {
    family: 'health',
    quickAnswer:
      'Blood thinners don’t automatically disqualify you from burial insurance, and coverage is often available even if you take warfarin or other anticoagulants. The real factor is why you’re taking it: insurance companies look at your condition, stability, and history, not just the drug itself. If things are well controlled, you may still qualify for coverage with no waiting period. If not, you’ll likely be pushed into more expensive plans with delays.',
  },
  '/burial-insurance/sarcoidosis/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with sarcoidosis depends on how serious and stable your condition is. Mild sarcoidosis qualifies you for first-day coverage with most life insurance companies, and moderate sarcoidosis needing minimal treatment may qualify with some companies. If you need supplemental oxygen, it will be challenging to qualify for first-day coverage, but you will be eligible for guaranteed issue. Needing help with daily activities also points to guaranteed issue, which has a two-year waiting period for natural causes of death.',
  },
  '/final-expense-life-insurance-diabetics/': {
    family: 'health',
    quickAnswer:
      'Most people with diabetes still qualify for final expense life insurance, and many companies will approve you even if you use insulin. Insurers look at how stable your diabetes is: your A1C level, your medications and any recent dosage changes, complications like neuropathy or kidney disease, and diabetes-related hospital stays in the last year. Controlled diabetes can qualify for first-day coverage with no medical exam. Unstable cases often get pushed into higher-cost plans with a two-year waiting period.',
  },

  // Health rollout (October 2026): every remaining health-condition and
  // health-category page. Same breadcrumb rule as the pilot.
  '/burial-insurance-breast-cancer/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'If you’re currently in treatment or recently diagnosed, most companies will decline traditional coverage and only offer guaranteed issue plans with higher costs and waiting periods. If you’ve finished treatment, you’re cancer-free, and it’s been more than 24 months since your last treatment, you can honestly answer “no” to the breast cancer question. Then you’re eligible for a level death benefit plan with first-day coverage from companies with only a two-year look-back period on breast cancer.',
  },
  '/burial-insurance-defibrillator/': { family: 'health' },
  '/burial-insurance-diabetic-complications/': { family: 'health', crumb: 'Diabetic Complications' },
  '/burial-insurance-kidney-failure/': { family: 'health' },
  '/burial-insurance-with-lung-cancer/': {
    family: 'health',
    quickAnswer:
      'If you currently have lung cancer or have been treated in the last 24 months, a waiting period is unavoidable, and guaranteed issue whole life insurance is your best option. If you die of lung cancer or another illness in the first two years, it refunds your premiums plus 10% interest. Once you’ve been done with treatment for over two years and are cancer-free, you’re eligible for first-day coverage with companies that only look back two years for lung cancer.',
  },
  '/burial-insurance/adl-activities-of-daily-living/': {
    family: 'health', crumb: 'Activities of Daily Living',
    quickAnswer:
      'If you need help with activities of daily living, such as eating, bathing, dressing, or using the bathroom, you will not qualify for first-day coverage. The only plan you will qualify for is guaranteed issue burial insurance, which asks no health questions. It costs a bit more and limits the death benefit for natural causes during the first two years, then pays 100% for any cause of death.',
  },
  '/burial-insurance/afib/': { family: 'health' },
  '/burial-insurance/aids-hiv/': { family: 'health', crumb: 'AIDS or HIV' },
  '/burial-insurance/alcohol-or-drug-abuse/': { family: 'health' },
  '/burial-insurance/aneurysm/': { family: 'health' },
  '/burial-insurance/angina/': { family: 'health' },
  '/burial-insurance/arrhythmia/': {
    family: 'health',
    quickAnswer:
      'Yes, arrhythmia won’t automatically disqualify you from burial insurance. Insurance companies look at the type, severity, and your overall heart health. If your arrhythmia is mild or well-managed, you may still get first-day coverage, and some companies don’t ask about it at all. If it’s severe or tied to other heart problems, you’ll likely face higher costs or be pushed into guaranteed issue plans with waiting periods.',
  },
  '/burial-insurance/asthma/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with asthma is usually easier than people think. Asthma is often considered a lower-risk condition, especially when it’s well managed, so many people still qualify for burial insurance with immediate coverage. Insurers look at how often you have attacks, what medications you use, and whether you’ve been hospitalized. If your asthma is severe or uncontrolled, you could end up with higher costs or a waiting period policy.',
  },
  '/burial-insurance/autism/': {
    family: 'health',
    quickAnswer:
      'Autism doesn’t automatically disqualify you from burial insurance. Insurance companies look at independence, stability, and overall health, not just the diagnosis itself. Many people with mild or well-managed autism can qualify for immediate coverage and normal rates. More complex cases may be limited to higher-cost options or guaranteed issue policies with waiting periods.',
  },
  '/burial-insurance/basal-cell-squamous-cell-carcinoma/': { family: 'health', crumb: 'Basal Cell & Squamous Cell Carcinoma' },
  '/burial-insurance/bathing-disability-adl/': { family: 'health', crumb: 'Help with Bathing' },
  '/burial-insurance/bipolar-disorder/': {
    family: 'health',
    quickAnswer:
      'Bipolar disorder doesn’t automatically disqualify you from burial insurance. Coverage is often available if you’re consistent with treatment and haven’t had recent severe episodes. Insurance companies look at medication use, hospital history, and overall stability, not just the diagnosis. If everything is controlled, you may qualify for immediate coverage at reasonable rates. If not, you may be pushed into higher-cost plans with waiting periods.',
  },
  '/burial-insurance/bladder-cancer/': {
    family: 'health',
    quickAnswer:
      'Burial insurance is still available to many people with bladder cancer, especially if it was early-stage and treated successfully. Insurance companies focus on recurrence risk, stability, and time since treatment, not just the diagnosis. Many require around 2 years of remission before offering better coverage options. If you currently have bladder cancer or are in treatment, insurance companies will only approve you for a policy with a two-year waiting period.',
  },
  '/burial-insurance/blind/': {
    family: 'health',
    quickAnswer:
      'Burial insurance for the blind is more accessible than most people think. Blindness by itself usually isn’t considered a high-risk factor, so many people can still qualify. What matters is your overall health, any underlying conditions, and how stable things are, and your options are limited if you need help with daily activities like bathing or dressing. Some applicants can qualify for first-day coverage with no waiting period, while others may be pushed into more expensive guaranteed issue plans.',
  },
  '/burial-insurance/blood-cancer-leukemia/': { family: 'health' },
  '/burial-insurance/blood-clot/': { family: 'health' },
  '/burial-insurance/brain-cancer/': { family: 'health' },
  '/burial-insurance/brain-tumor/': {
    family: 'health',
    quickAnswer:
      'Burial insurance is still available in many cases with a brain tumor, depending on the type, treatment, and time since diagnosis. Insurance companies look closely at whether the tumor was removed, if there are ongoing symptoms, and how stable your health is today. If a tumor is benign and treatment was finished over two years ago, first-day coverage is usually available. If your tumor is active or cancerous, a guaranteed-approval policy is still an option, with a 2-year waiting period.',
  },
  '/burial-insurance/breast-cancer/': {
    family: 'health',
    quickAnswer:
      'Burial insurance is still available for many people with breast cancer, but companies care most about how long you’ve been cancer-free. Most insurance companies require you to be cancer-free for at least 24 months before offering first-day coverage. If your diagnosis is recent or treatment is ongoing, you’ll likely be limited to higher-cost policies with waiting periods.',
  },
  '/burial-insurance/burial-insurance-arthritis/': {
    family: 'health',
    quickAnswer:
      'Yes. Getting burial insurance with arthritis is usually easier than people expect, especially if your condition is mild or well-controlled. Taking arthritis medication won’t keep you from securing the best policy. Most applicants with arthritis can still qualify for first-day coverage if they can handle daily activities on their own. If severe arthritis means you need help with daily activities, it’s harder to find a company that offers immediate coverage at the lowest rate, and your best option is guaranteed issue coverage with a two-year waiting period.',
  },
  '/burial-insurance/burial-insurance-with-diverticulitis/': { family: 'health' },
  '/burial-insurance/burial-insurance-with-gout/': {
    family: 'health',
    quickAnswer:
      'Yes. Burial insurance with gout is one of the easier approvals. Gout by itself is usually a non-issue, so most people can qualify for first-day coverage with no waiting period. What matters is everything around it. If severe gout means you need help with daily activities like bathing or dressing, your only option is guaranteed issue coverage, which costs more and has a two-year waiting period.',
  },
  '/burial-insurance/cancer/': {
    family: 'health',
    quickAnswer:
      'Yes, and the date of your last treatment matters most. Most carriers use a 24-month lookback: once you reach two years without treatment, you can get a policy that pays in full from day one. If your treatment ended 12 to 24 months ago, a graded plan is often an option. If you’re in active treatment, which includes daily maintenance pills, insurance companies will require a two-year waiting period, and a guaranteed issue plan can still cover you.',
  },
  '/burial-insurance/cardiomyopathy/': {
    family: 'health',
    quickAnswer:
      'Yes. Your options depend heavily on how stable your cardiomyopathy is and when you apply. If your condition is stable, you’re following your treatment, and you haven’t had recent complications, you may qualify for first-day coverage. If it’s recent or severe, most companies will limit you to plans with a two-year waiting period or higher costs. With two hospital stays in the past two years, first-day coverage might be hard to get, but guaranteed issue coverage is always there.',
  },
  '/burial-insurance/cbd-oil/': {
    family: 'health',
    quickAnswer:
      'Yes. CBD itself, especially products without THC, usually doesn’t impact your approval or rates much, and most companies never ask about it. What matters is the health condition you’re using it for. If it’s a minor condition and you’re otherwise healthy, you can qualify for first-day coverage. If it’s a severe condition like a recent cancer diagnosis or terminal illness, you’ll be declined for first-day coverage, but you can still get guaranteed issue coverage with a two-year waiting period.',
  },
  '/burial-insurance/cerebral-palsy/': {
    family: 'health',
    quickAnswer:
      'Yes. It depends on how independent and stable your condition is today. Insurance companies look at your ability to walk, handle daily tasks, and manage your health, not just the diagnosis. Many people with mild or controlled cerebral palsy can qualify for immediate coverage. If mobility is limited or you need help, you may be pushed into higher-cost plans with waiting periods. If your mobility is very limited, a guaranteed issue plan accepts everyone, with a two-year waiting period.',
  },
  '/burial-insurance/cervical-cancer/': {
    family: 'health',
    quickAnswer:
      'Yes. It depends on timing, stage, and recovery, and companies care most about how long it’s been since treatment ended. Most of the best insurance companies want more than two years since you were last diagnosed or treated before offering first-day coverage. Some carriers may offer immediate protection sooner if you’ve been declared cancer-free. If you’re currently in treatment, a guaranteed issue plan still covers you, with a two-year waiting period.',
  },
  '/burial-insurance/chronic-bronchitis/': { family: 'health' },
  '/burial-insurance/cirrhosis/': {
    family: 'health',
    quickAnswer:
      'Yes, but it depends on how severe your cirrhosis is and how well it’s managed. If it’s stable and you’re following treatment, you may still qualify for first-day coverage with some companies, though most companies won’t offer first-day coverage if you’re still actively drinking. If it’s advanced or recent, you’ll likely be limited to graded or guaranteed issue plans with a two-year waiting period. If you’ve been told you need a liver transplant, guaranteed issue might be your only option.',
  },
  '/burial-insurance/colorectal-cancer/': {
    family: 'health',
    quickAnswer:
      'Yes, but it depends heavily on timing and your current health. If you’re in active treatment, most companies won’t offer first-day coverage, so you’re pushed into guaranteed issue coverage with a two-year waiting period and a higher cost. Colorectal cancer survivors can often qualify for first-day coverage once they’ve been in remission and treatment-free for at least two years.',
  },
  '/burial-insurance/congestive-heart-failure/': { family: 'health' },
  '/burial-insurance/continence-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Continence' },
  '/burial-insurance/coronary-artery-disease/': { family: 'health' },
  '/burial-insurance/crohns-disease/': { family: 'health' },
  '/burial-insurance/cystic-fibrosis/': {
    family: 'health',
    quickAnswer:
      'Yes. It comes down to how stable your cystic fibrosis is right now. Some people can still qualify for whole life insurance with immediate coverage, and you may qualify for first-day coverage if you don’t use supplemental oxygen daily. Taking cystic fibrosis medications won’t make you ineligible. If you use supplemental oxygen or have other medical conditions, you’ll qualify for guaranteed issue coverage, which has higher premiums and a two-year waiting period.',
  },
  '/burial-insurance/dementia-alzheimers/': { family: 'health' },
  '/burial-insurance/depression/': {
    family: 'health',
    quickAnswer:
      'Yes. Getting burial insurance with depression is usually much easier than people think. Most policies don’t treat depression as a major issue if it’s controlled and you’re functioning normally day to day, and many people still qualify for first-day coverage with no waiting period. Staying consistent with common antidepressants like Zoloft or Lexapro is viewed positively. The real factors are severity, medications, and whether you’ve been hospitalized; if you’re not stable, your choices narrow.',
  },
  '/burial-insurance/diabetes/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Getting burial insurance with diabetes is very doable. Burial insurance and whole life policies look closely at your A1C levels, medications, and how well your condition is managed. If your diabetes is stable, you can often qualify for first-day coverage with decent rates. If it’s uncontrolled or comes with complications, you’ll likely be pushed into higher-cost plans or waiting periods.',
  },
  '/burial-insurance/diabetic-amputation/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with a diabetic amputation is possible, and timing is the most critical factor. Insurers see an amputation as a sign of long-term circulation and diabetes complications. If your surgery was recent or you’re still recovering, most companies will push you into a plan with a 2-year waiting period. If it was more than 24 months ago and your health is stable, you may still qualify for first-day coverage with the right company.',
  },
  '/burial-insurance/diabetic-coma/': {
    family: 'health',
    quickAnswer:
      'You can get burial insurance after a diabetic coma, but insurers flag it hard because it suggests your diabetes may be unstable. Underwriters focus heavily on your history over the last two years. If your last coma was over two years ago and your diabetes is stable, carriers like Family Benefit Life and Trinity Life offer first-day coverage. If the coma happened within the last 24 months, you’ll usually face a waiting period of up to two years.',
  },
  '/burial-insurance/diabetic-insulin-shock/': { family: 'health' },
  '/burial-insurance/diabetic-nephropathy/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with diabetic nephropathy depends on how advanced your condition is and how stable your health has been. If it’s mild and controlled, you may still qualify for first-day coverage, and CICA Life is one of the only companies that can offer it. If it’s more advanced or recent, you’ll likely be limited to plans with a 2-year waiting period or higher costs. Insurers judge stability by checking your prescriptions for dosage changes and any hospital stays in the last 24 months.',
  },
  '/burial-insurance/diabetic-neuropathy/': { family: 'health' },
  '/burial-insurance/diabetic-retinopathy/': {
    family: 'health',
    quickAnswer:
      'Yes, you can get burial insurance with diabetic retinopathy, and it isn’t a reason for a flat-out denial. If your condition is stable, CICA Life is one of the only carriers offering first-day coverage for this complication. If you also take anxiety or depression medications, a graded plan from Guarantee Trust Life is the backup. If retinopathy is your only major concern, you can often find immediate coverage without a two-year wait, so avoid guaranteed issue plans.',
  },
  '/burial-insurance/dialysis-patients/': { family: 'health' },
  '/burial-insurance/disability/': { family: 'health' },
  '/burial-insurance/disabled-persons/': {
    family: 'health',
    quickAnswer:
      'Burial insurance for disabled persons is more accessible than most people think. Most companies don’t treat a disability itself as a problem unless it affects daily activities like eating, bathing, or moving around. If your disability is stable, you may qualify for immediate coverage with simple health questions and no medical exam. If you need help with daily activities, you’ll likely be pushed into guaranteed issue plans with higher costs and waiting periods.',
  },
  '/burial-insurance/down-syndrome/': { family: 'health' },
  '/burial-insurance/drug-abuse-treatment/': { family: 'health' },
  '/burial-insurance/drug-alcohol-abuse/': { family: 'health' },
  '/burial-insurance/eating-activities-of-daily-living-adl/': { family: 'health', crumb: 'Help with Eating' },
  '/burial-insurance/emphysema/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Getting burial insurance with emphysema depends on how advanced and stable your condition is. If your symptoms are mild and well-managed, you may still qualify for burial insurance or whole life with immediate coverage. If it’s severe or requires oxygen, you’ll likely be pushed into guaranteed issue plans with higher costs and a 2-year waiting period. Not all companies treat emphysema the same.',
  },
  '/burial-insurance/endocarditis-heart-infection/': { family: 'health' },
  '/burial-insurance/epilepsy-seizures/': {
    family: 'health',
    quickAnswer:
      'Yes, you can get burial insurance with epilepsy or seizures, and how well your condition is managed matters most. Insurers look at seizure type, how often you have them, and how long it’s been since your last one. If your seizures are controlled and it’s been a while, you may qualify for first-day coverage with better pricing. If they’re frequent or recent, you’ll likely face higher premiums or a waiting period plan. If you need help dressing or bathing, a guaranteed issue plan is the only way to protect your family.',
  },
  '/burial-insurance/esophageal-cancer/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with esophageal cancer depends almost entirely on timing and recovery. If you’re fighting the disease or undergoing chemotherapy, you must use a guaranteed issue plan, which pays out fully after two years. Once a doctor declares you cured, CICA Life offers a rare chance at first-day coverage. Most major carriers require a 24-month treatment-free period before offering their best plans.',
  },
  '/burial-insurance/fatty-liver-disease/': { family: 'health' },
  '/burial-insurance/fibromyalgia/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with fibromyalgia is usually easier than people expect. Most burial insurance companies don’t ask about fibromyalgia, and insurers focus more on how it affects your daily life than on the diagnosis itself. With mild or moderate fibromyalgia, you can still qualify for first-day coverage with no two-year waiting period. If it keeps you from doing daily activities like bathing or dressing, guaranteed issue insurance with a two-year waiting period is the only option.',
  },
  '/burial-insurance/for-smokers/': { family: 'health', crumb: 'Smokers' },
  '/burial-insurance/graves-disease/': { family: 'health' },
  '/burial-insurance/heart-attack/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Getting burial insurance after a heart attack comes down to timing and how well your health has stabilized. Policies look closely at when it happened, any procedures like stents or bypass, and your current medications. If it’s been at least 1 to 2 years with no issues, you may qualify for immediate coverage with better rates. If it’s recent, you’ll likely be pushed into guaranteed issue plans with higher costs and a 2-year waiting period.',
  },
  '/burial-insurance/heart-bypass-surgery/': {
    family: 'health',
    quickAnswer:
      'Burial insurance after heart bypass surgery depends almost entirely on timing and recovery. Most insurance companies will decline or restrict coverage if the surgery happened within the last 12 months, and you’ll often be pushed into guaranteed-issue plans with higher costs and a 2-year waiting period. You might still get first-day coverage with some companies if you haven’t been hospitalized two or more times in the past two years and the right plan is offered where you live.',
  },
  '/burial-insurance/heart-conditions/': { family: 'health' },
  '/burial-insurance/heart-disease/': {
    family: 'health',
    quickAnswer:
      'Yes, you can get burial insurance with heart disease, and it comes down to how stable your condition is today. If your condition is well-managed and it’s been some time since a major event, you may qualify for immediate coverage. If it’s recent or more severe, you’ll likely be placed in a graded or guaranteed-issue policy with higher costs and a 2-year waiting period. No medical exam is needed, just a few basic health questions.',
  },
  '/burial-insurance/heart-failure/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with heart failure is possible, but your options are limited and depend on how serious your condition is. Depending on your health and what’s available in your zip code, you might even get first-day coverage with no waiting period. If you’re currently hospitalized or need help with basic daily activities, the answer might be no. Many people end up in guaranteed issue plans with higher costs and a 2-year waiting period.',
  },
  '/burial-insurance/heart-murmur/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with a heart murmur depends on what’s causing it. Most insurance companies view a heart murmur as a minor health issue. If tests show it’s “innocent,” you can often qualify with normal rates, and immediate first-day coverage is widely available for people with heart murmurs. If the murmur is tied to valve problems or other heart issues, your options narrow and costs go up.',
  },
  '/burial-insurance/heart-surgery-2/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance after heart surgery depends heavily on timing and recovery. If your surgery was within the last 12 months, many companies will either decline you or require a policy with a 2-year waiting period before full benefits pay out. If it was over two years ago, companies will treat you like you never had surgery and offer a level death benefit plan with first-day coverage.',
  },
  '/burial-insurance/heart-surgery/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance after heart surgery depends heavily on timing and recovery. If your surgery was more than 2 years ago and you’ve stayed stable, you can qualify for a level plan with no waiting period. If it was within the last 12 to 24 months, most companies will either decline you or make you wait, though some specialized carriers offer first-day coverage for recent procedures. If a heart procedure is still pending, you can’t qualify for a standard plan until it’s done.',
  },
  '/burial-insurance/hepatitis-b/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with Hepatitis B depends on how recent your diagnosis is and whether you’re still in treatment. If your treatment ended over 2 years ago and your condition is stable, you may qualify for first-day coverage at better rates. If you were diagnosed in the last two years and are still in treatment, your best option is a first-day benefit plan, which covers you from the first day but phases in the death benefit over time.',
  },
  '/burial-insurance/hepatitis-c/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with Hepatitis C depends on your current liver health and treatment status. If your treatment is completed and you’ve been virus-free for at least two years, you can qualify for a first-day coverage plan. If you were diagnosed in the last two years and are still in treatment, your best option is a plan that covers you from the first day but phases in the death benefit over time. Liver damage like cirrhosis makes a higher-cost policy with a waiting period more likely.',
  },
  '/burial-insurance/high-blood-pressure/': { family: 'health', crumb: 'Uncontrolled High Blood Pressure' },
  '/burial-insurance/high-cholesterol/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with high cholesterol is usually easier than people think. Most insurance companies don’t ask about high cholesterol or cholesterol medications, so it often won’t stop you from qualifying. Your best option is a first-day coverage plan with no waiting period. If you had a recent stroke because of high cholesterol, most companies won’t approve first-day coverage until two years have passed.',
  },
  '/burial-insurance/hodgkins-disease/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with Hodgkin’s disease depends heavily on how long you’ve been cancer-free. If you’ve been in complete remission and treatment-free for at least two years, you can qualify for first-day coverage. Some specialized carriers may consider you for immediate benefits as soon as your doctor officially declares you cancer-free. If you’re still in chemotherapy or radiation, you can get a guaranteed-issue policy, which typically includes a two-year waiting period.',
  },
  '/burial-insurance/hospice-patients/': { family: 'health', crumb: 'Hospice Patients' },
  '/burial-insurance/huntingtons-disease/': { family: 'health' },
  '/burial-insurance/insulin-diabetics/': { family: 'health' },
  '/burial-insurance/kidney-disease/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Getting burial insurance with kidney disease depends on how advanced your condition is and how stable your health has been. If your condition is in its early stages and well managed, you may still qualify for first-day coverage, depending on your zip code. Guaranteed issue plans ask no health questions, but have a two-year waiting period for health-related causes of death.',
  },
  '/burial-insurance/leukemia/': { family: 'health' },
  '/burial-insurance/liver-disease-liver-disorder/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with liver disease depends on how serious your condition is and how well it’s controlled. Insurers look at your diagnosis, liver test results, medications, and whether your condition is stable or getting worse. If it’s mild or managed, you may still qualify for first-day coverage. If it’s severe or recent, you’ll likely be pushed into a guaranteed issue plan with higher costs and a 2-year waiting period.',
  },
  '/burial-insurance/liver-disease/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with liver disease is possible, but your options depend on how serious your condition is and how stable your health has been. If your condition is mild or well-controlled, you may still qualify for first-day coverage with no medical exam, just a few health questions. If it’s advanced, you’ll likely be limited to guaranteed issue plans with a 2-year waiting period.',
  },
  '/burial-insurance/lou-gehrigs-disease-als/': { family: 'health' },
  '/burial-insurance/lung-cancer/': { family: 'health' },
  '/burial-insurance/lung-disease/': { family: 'health' },
  '/burial-insurance/lupus/': { family: 'health' },
  '/burial-insurance/marijuana-use/': {
    family: 'health',
    quickAnswer:
      'Yes. Most burial insurance and whole life companies will still approve you, but they look at how often you use marijuana, how you use it, and why. Some insurers may treat you like a non-smoker, while others classify you as a smoker, which can double your cost. If you use it for minor issues and have a stable history, you can often qualify for a level plan that pays in full from the first payment.',
  },
  '/burial-insurance/medical-marijuana/': {
    family: 'health',
    quickAnswer:
      'Using medical marijuana doesn’t block you from getting burial insurance. Insurance companies care less about the marijuana and more about why you’re using it. If you use it for a minor health condition and are otherwise healthy, you can qualify for a level death benefit with first-day coverage, though that depends on the individual company. If it treats a severe condition like a recent cancer diagnosis or terminal illness, you’ll be declined for first-day coverage, but you can still get guaranteed issue burial insurance with a two-year waiting period for natural causes of death.',
  },
  '/burial-insurance/melanoma-skin-cancer/': { family: 'health', crumb: 'Melanoma' },
  '/burial-insurance/mental-health-conditions/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with a mental health condition is usually much easier than people think. Insurers focus more on stability than the diagnosis itself. If your condition is managed and you’re living normally, you can often qualify for first-day coverage. If you’ve had recent hospitalizations or severe episodes, your options can narrow and costs can rise. If your mental health requires help with eating or bathing, you’ll likely qualify only for a guaranteed issue plan.',
  },
  '/burial-insurance/multiple-myeloma/': { family: 'health' },
  '/burial-insurance/multiple-sclerosis/': {
    family: 'health',
    quickAnswer:
      'Burial insurance with multiple sclerosis is still possible, but it depends on how your condition is managed and how recently symptoms have progressed. Insurers look closely at flare-ups, mobility, medications, and hospital history. If your MS is stable, some whole life burial insurance plans can offer full coverage from day one. If not, you’ll likely be placed into a policy with a waiting period that delays the payout, and needing help with activities like bathing, dressing, or eating is the primary trigger for a waiting-period plan.',
  },
  '/burial-insurance/muscular-dystrophy/': { family: 'health' },
  '/burial-insurance/myelodysplastic-syndrome/': { family: 'health' },
  '/burial-insurance/neurological-disorders/': { family: 'health' },
  '/burial-insurance/nursing-home-residents/': { family: 'health', crumb: 'Nursing Home Residents' },
  '/burial-insurance/organ-transplant/': { family: 'health' },
  '/burial-insurance/ovarian-cancer/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with ovarian cancer depends almost entirely on timing and recovery. If the cancer is active or recent, most companies will only offer guaranteed issue plans with higher costs and a two-year waiting period. Most carriers want you two years free of all cancer treatments before offering their best “level” rates with first-day coverage. One carrier, CICA Life, allows first-day coverage once you’re declared cancer-free and cured.',
  },
  '/burial-insurance/overweight-obese/': { family: 'health' },
  '/burial-insurance/pacemaker/': { family: 'health' },
  '/burial-insurance/pancreatic-cancer/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with pancreatic cancer is extremely limited. If you’re currently in treatment or taking cancer medications, you’ll be restricted to a guaranteed issue policy with a two-year waiting period. Once a doctor declares you cancer-free, CICA Life may offer first-day coverage. After you’ve been cured for at least two years with no further treatment or medication, carriers like Aflac and Family Benefit Life become available.',
  },
  '/burial-insurance/paralysis-paralyzed/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with paralysis is possible, but your options depend on how severe your condition is. The big question is whether you can handle daily activities like eating, bathing and dressing on your own. If you can, you might get a first-day coverage plan with no waiting period. If you have severe paralysis and need help with these activities, your best bet is guaranteed issue burial insurance, which has a mandatory two-year waiting period.',
  },
  '/burial-insurance/parkinsons-disease/': {
    family: 'health',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Getting burial insurance with Parkinson’s disease comes down to how advanced your condition is right now. Insurance companies look at severity, progression, and whether you can still function independently. If symptoms are mild and stable, you may still qualify for whole life or burial insurance with immediate coverage. If the disease has progressed, you’re more likely to end up in guaranteed issue burial insurance with higher costs and a 2-year waiting period.',
  },
  '/burial-insurance/peripheral-vascular-disease-pvd-pad/': {
    family: 'health', crumb: 'Peripheral Vascular Disease',
    quickAnswer:
      'Burial insurance with peripheral vascular disease (PVD or PAD) is more available than most people think, but it depends on how serious and stable your condition is. If you only use medications to treat it, the best option is a level plan with first-day coverage. If you’ve had surgery like angioplasty, bypass or a stent, timing matters: some companies will offer first-day coverage once it’s been two years or longer. If it’s recent or severe, you’ll likely face higher costs or waiting periods.',
  },
  '/burial-insurance/prion-disease/': {
    family: 'health',
    quickAnswer:
      'Prion disease is one of the most severe conditions you can have when applying for burial insurance. Most life insurance companies won’t provide a first-day coverage plan, so it usually means a guaranteed issue plan, which asks no health questions but has a 2-year waiting period. During that time, it pays 100% only for accidental death; if you die from an illness, your beneficiary gets your premiums back plus 10% interest.',
  },
  '/burial-insurance/prostate-cancer/': { family: 'health' },
  '/burial-insurance/ptsd/': {
    family: 'health',
    quickAnswer:
      'Yes, burial insurance with PTSD is more available than most people think, and insurance companies don’t automatically decline you. Most people who manage their PTSD with consistent treatment can get first-day coverage with no 2-year waiting period. An inpatient psychiatric stay in the last 2 years may limit your immediate options. If your condition is so severe that you need help with bathing or dressing, guaranteed issue, with its 2-year waiting period, is the logical choice.',
  },
  '/burial-insurance/respiratory-lung-conditions/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with a respiratory or lung condition depends on how serious and stable your condition is. Mild or well-managed conditions, like stable COPD or asthma, may still qualify for immediate coverage. Oxygen use typically triggers a two-year waiting period with most insurers, though some specialty carriers look at why you use oxygen and may offer immediate protection. If your lung condition keeps you from bathing, dressing, or eating without help, you’ll likely be limited to a plan with a two-year waiting period.',
  },
  '/burial-insurance/sarcoma/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance with sarcoma depends almost entirely on timing and your treatment status. During treatment, you’re typically pushed into guaranteed issue burial insurance with a 2-year waiting period before full benefits pay. Most carriers require a 24-month wait after treatment for first-day coverage, but CICA Life may offer it much sooner if your doctor officially declares your cancer cured. If your sarcoma has spread to the lungs or other organs, a guaranteed issue plan will likely serve you best.',
  },
  '/burial-insurance/schizophrenia/': {
    family: 'health',
    quickAnswer:
      'Burial insurance with schizophrenia is more available than most people think, but it depends on how stable your condition is. If you’ve stayed out of the hospital for at least 24 months and take your medication consistently, first-day “level” plans become available. A psychiatric facility stay within the last two years typically moves you to a graded or guaranteed issue plan with a waiting period. If you need help with daily activities like bathing or dressing, you’ll be placed in guaranteed issue with a 2-year waiting period.',
  },
  '/burial-insurance/scleroderma/': {
    family: 'health',
    quickAnswer:
      'Burial insurance with scleroderma is more available than most people think. Scleroderma on its own is a non-issue to most final expense insurance providers, and if your symptoms are minimal to moderate, you’ll easily qualify for a level plan with first-day coverage. Complications from systemic scleroderma can mean higher premiums and possibly a waiting period, and some, like amputation, chronic kidney failure, or being advised to get an organ transplant, leave guaranteed issue as your only option.',
  },
  '/burial-insurance/sickle-cell-anemia/': { family: 'health', crumb: 'Sickle Cell Anemia' },
  '/burial-insurance/skin-cancer/': {
    family: 'health',
    quickAnswer:
      'Burial insurance with skin cancer is still available in most cases. Basal and squamous cell skin cancers are treated as low risk and usually qualify for first-day coverage once they’ve been removed. Melanoma is handled more carefully: if it was diagnosed within the last 24 months, many carriers will offer a graded plan with a waiting period, but if it was Stage 0 or Stage 1 and removed more than two years ago, you can often qualify for first-day coverage. If you’re in active treatment, the recommended option is a guaranteed issue plan with a 2-year waiting period.',
  },
  '/burial-insurance/sleep-apnea/': {
    family: 'health',
    quickAnswer:
      'Sleep apnea usually won’t stop you from getting burial insurance. The key is how well it’s managed. If you use a CPAP and your health is stable, many companies will still offer coverage, and consistent CPAP use often gets you first-day coverage. If it’s untreated or tied to other issues like obesity or heart problems, costs go up or options shrink.',
  },
  '/burial-insurance/stroke-tia/': {
    family: 'health',
    quickAnswer:
      'Getting burial insurance after a stroke or TIA depends mostly on timing and recovery. If your stroke or TIA was more than 12 to 24 months ago and your health is stable, you may qualify for first-day coverage. If it’s more recent, most companies will offer graded or guaranteed issue plans with higher costs and delayed payouts, though CICA Life is often an option for first-day coverage. If you have paralysis or need help with eating, bathing, or dressing, guaranteed issue with a 2-year waiting period is your only option.',
  },
  '/burial-insurance/terminally-ill-patients/': { family: 'health' },
  '/burial-insurance/testicular-cancer/': {
    family: 'health',
    quickAnswer:
      'Yes, you can get burial insurance with testicular cancer, but timing controls your options. Most carriers require you to be 24 months past your last treatment or surgery before they offer level coverage with no waiting period. If your doctor has declared you cured and you’re treatment-free, CICA Life may offer first-day coverage right away. If you’re in chemotherapy or radiation now, a guaranteed issue plan, which has a 2-year waiting period, is the best way to get covered while you recover.',
  },
  '/burial-insurance/thyroid-cancer/': { family: 'health' },
  '/burial-insurance/toileting-activities-of-daily-living-adl/': {
    family: 'health', crumb: 'Help with Toileting',
    quickAnswer:
      'If you need help with toileting or any other activity of daily living, you won’t qualify for first-day coverage. Every burial insurance company with health questions asks about it, and answering “yes” means a decline for first-day coverage. Your only option is guaranteed issue burial insurance, which has no medical exam or health questions but costs more and has a 2-year waiting period. If you die during the waiting period, your premiums are returned plus interest.',
  },
  '/burial-insurance/traumatic-brain-injury-tbi/': { family: 'health' },
  '/burial-insurance/valvular-heart-disease/': { family: 'health' },
  '/burial-insurance/wheelchair-users/': { family: 'health' },
  '/life-insurance-for-hiv-positive/': { family: 'health', crumb: 'HIV Positive' },

  // Review pilot (10 pages, October 2026): representative company-review
  // structures before the wider review rollout. Review pages use the bare
  // company, agency or product name as their breadcrumb label (Randy's review
  // convention), so every entry sets `crumb`.
  '/lumico-burial-insurance-review/': { family: 'review', crumb: 'Lumico' },
  '/aig-life-insurance-company-review/': {
    family: 'review', crumb: 'AIG',
    quickAnswer:
      'AIG, now called Corebridge Financial, offers three whole life burial plans for people aged 50 to 85. SimpliNow Legacy Max is the first-day coverage plan, and it asks a few health questions instead of a medical exam. The graded SimpliNow Legacy plan and the guaranteed issue plan both have a 2-year waiting period that pays 110% of premiums for a natural death. AIG is expensive for significant health issues, so it’s rarely your best choice.',
  },
  '/oxford-life-burial-insurance-review/': { family: 'review', crumb: 'Oxford Life' },
  '/royal-neighbors-of-america/': {
    family: 'review', crumb: 'Royal Neighbors of America',
    quickAnswer:
      'Royal Neighbors of America is a legitimate fraternal benefit society with an A (Excellent) rating from A.M. Best, but its burial insurance is often a poor fit. Its Level plan pays the full benefit from day one, yet tighter underwriting now makes first-day coverage harder to get with common chronic conditions, and healthy people often pay more than with other top-rated carriers. Its guaranteed issue plan has a two-year waiting period and can cost up to 2 or 3 times more than other leading companies.',
  },
  '/lincoln-heritage-funeral-advantage-review-old/': {
    family: 'review', crumb: 'Lincoln Heritage',
    quickAnswer:
      'Lincoln Heritage Funeral Advantage is a real whole life burial policy, but it’s usually more expensive than competitors and not the best value in most cases. Its captive agents can only sell Lincoln Heritage products, so if you qualify for a better policy with better pricing, they won’t tell you about it. If you have health issues the company doesn’t like, you may be placed in a modified or guaranteed issue plan where a natural death during the waiting period only returns your premiums plus interest. Most people qualify for first-day coverage elsewhere at a significantly reduced cost.',
  },
  '/mutual-of-omaha-burial-insurance/': { family: 'review', crumb: 'Mutual of Omaha' },
  '/senior-legacy-life-review/': { family: 'review', crumb: 'Senior Legacy Life' },
  '/life-insurance-savings-group-review/': { family: 'review', crumb: 'Life Insurance Savings Group' },
  '/trustage-life-insurance-review/': { family: 'review', crumb: 'TruStage' },
  '/americo-life-insurance-quit-smoking-advantage/': {
    family: 'review', crumb: 'Americo Quit Smoking Advantage',
    quickAnswer:
      'Americo’s Quit Smoking Advantage gives smokers non-smoker rates on select final expense policies for the first three years. By the third policy anniversary, you must prove you’ve been nicotine-free for at least 12 straight months with a cotinine test from an Americo-approved lab. If you miss the deadline or fail the test, Americo cuts your death benefit starting in year four, by up to 30% in some cases, while your premium stays the same. Keeping your original death benefit means calling before the deadline and paying a premium up to 30% higher.',
  },

  // Review rollout (October 2026): the remaining company-review pages, with
  // the same breadcrumb convention as the pilot. Held for content review:
  // Aflac, T2, both Colonial Penn pages and Trinity.
  '/5-reasons-you-should-be-worried-about-aarp-life-insurance/': {
    family: 'review', crumb: 'AARP',
    quickAnswer:
      'AARP life insurance is underwritten by New York Life, not AARP, and you must be an AARP member to buy it. Its term life premiums go up every 5 years, and the coverage ends at age 80. You need to be in great health to pass its health questions. If your health isn’t strong, you may only qualify for guaranteed issue, which costs more and has a 2-year waiting period before full benefits pay out.',
  },
  '/aarp-burial-insurance-review/': {
    family: 'review', crumb: 'AARP',
    quickAnswer:
      'AARP burial insurance is a New York Life group policy sold under the AARP name, and you must be an AARP member to buy it. Its term life premiums jump every five years, and the term coverage ends at age 80. If you don’t pass its health questions, you’re pushed toward the Guaranteed Acceptance plan, which costs more and pays only your premiums plus 10% interest if you die of natural causes in the first 2 years.',
  },
  '/aarp-life-insurance-review/': {
    family: 'review', crumb: 'AARP',
    quickAnswer:
      'For most people, AARP life insurance delivers less coverage at a higher price than first-day coverage options elsewhere. Its term life premiums rise every 5 years, and the coverage ends at age 80. Permanent Life can pay the full benefit from day one, but it costs more per dollar of coverage. Guaranteed Acceptance has a mandatory two-year waiting period, and if death occurs during that time, the company refunds only premiums plus a small amount of interest.',
  },
  '/baltimore-life-burial-insurance-review/': { family: 'review', crumb: 'Baltimore Life' },
  '/big-lou-term-life-insurance-review/': {
    family: 'review', crumb: 'Big Lou',
    quickAnswer:
      'Big Lou isn’t an insurance company. Lou is a marketing character for TermProvider Life Insurance, a licensed brokerage that sells term life from other insurers. It isn’t a scam, but every policy goes through health underwriting that can take weeks, and the coverage expires when the term ends. Big Lou can make sense for healthy people under about 55 who only want temporary coverage, though most seniors are better served elsewhere.',
  },
  '/burial-insurance/american-amicable-life-insurance-review/': {
    family: 'review', crumb: 'American Amicable',
    quickAnswer:
      'American Amicable is a legitimate, financially stable company that pays valid claims, but for most seniors it isn’t the strongest choice. Its policies are usually more expensive, and if your health isn’t great, you may be placed into a plan with a 2-year waiting period before full benefits pay out. If you’re healthy enough to qualify for first-day coverage, there’s no reason to buy a plan that limits benefits for two years.',
  },
  '/cica-life-burial-insurance-review/': { family: 'review', crumb: 'CICA Life' },
  '/ethos-life-insurance-review/': {
    family: 'review', crumb: 'Ethos',
    quickAnswer:
      'Ethos isn’t an insurance company. It’s a licensed online agency that sells term and whole life policies issued by partner insurers like Legal & General America, Ameritas Life, and TruStage. It’s built for speed, often without a medical exam, and works best for healthy young to middle-aged adults who want fast temporary coverage and don’t mind not getting the best pricing. Seniors and people with pre-existing conditions may be automatically placed in graded or small guaranteed-issue plans.',
  },
  '/family-benefit-life-burial-insurance-review/': {
    family: 'review', crumb: 'Family Benefit Life',
    quickAnswer:
      'Family Benefit Life is an excellent choice for most people, mainly because of its Golden Eagle first-day coverage plan, which is known for low rates and easy approval. Its underwriting is flexible, and most health issues qualify for first-day coverage, including diabetes if you started insulin after age 40 and haven’t had insulin shock, diabetic coma, or a diabetic amputation. The weak spot is its graded plan, which phases in the death benefit over the first two years. It also isn’t available in all 50 states and uses a height and weight chart.',
  },
  '/fidelity-life-burial-insurance-review/': {
    family: 'review', crumb: 'Fidelity Life',
    quickAnswer:
      'Fidelity Life’s RapiDecision Final Expense plan offers first-day coverage with no medical exam, but only if you’re healthy or have minor health issues like high blood pressure or high cholesterol, and it tends to cost more than other companies. If you answer yes to any health question, you may be offered its guaranteed issue plan instead, which has a three-year waiting period rather than the two years most guaranteed issue plans have. During that wait, a death from illness pays back only your premiums plus 5% interest.',
  },
  '/foresters-burial-insurance-review/': {
    family: 'review', crumb: 'Foresters',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Foresters burial insurance is whole life insurance called PlanRight, designed to cover final expenses. There’s no medical exam; you only answer a set of health questions. Depending on your health, you can qualify for a level, graded, or modified death benefit, and the level plan has first-day coverage. It’s a decent option in certain situations, but rarely the best value if you actually shop around.',
  },
  '/gerber-life-insurance-review/': {
    family: 'review', crumb: 'Gerber Life',
    quickAnswer:
      'Gerber Life’s Guaranteed Issue policy accepts anyone between 50 and 80 with no health questions or medical exam, but it has a mandatory two-year waiting period, even if you’re healthy. If you die from a health or medical reason in the first two years, your family gets back only your premiums plus 10% interest; accidental death pays from day one. Its premiums are significantly higher than those of most other companies, so it only makes sense if your health is terrible and you have no other options.',
  },
  '/great-western-burial-insurance-review/': { family: 'review', crumb: 'Great Western' },
  '/guarantee-trust-life-insurance-review/': {
    family: 'review', crumb: 'Guarantee Trust Life',
    quickAnswer:
      'Guarantee Trust Life’s Heritage Plan is a graded benefit whole life policy for people 50 to 90 with significant health problems who don’t want a two-year waiting period plan. There’s no medical exam, just limited health questions. If you die in the first 12 months, it pays your premiums plus 5%; in months 13 to 24, it pays 50%; after 24 months, it pays 100%. Accidental death is covered in full from day one. If you can qualify for first-day coverage, that’s the better choice.',
  },
  '/liberty-bankers-burial-insurance-review/': {
    family: 'review', crumb: 'Liberty Bankers',
    quickAnswer:
      'Liberty Bankers sells whole life burial insurance with no medical exam, but you still have to answer health questions. Its SIMPL Preferred and SIMPL Standard plans have no waiting period, and SIMPL Standard offers first-day coverage for some serious illnesses like COPD, kidney disease, and Parkinson’s disease. If you don’t qualify, its Modified Whole Life plan is expensive and comes with a three-year waiting period. A guaranteed issue plan with a two-year waiting period is a better option than that plan.',
  },
  '/open-care-life-insurance-review/': {
    family: 'review', crumb: 'Open Care',
    quickAnswer:
      'Open Care is a marketing company, not an insurer. When you respond to its ads, you end up with a call center representative, and the policies come from other carriers that underwrite the coverage and pay claims. Open Care markets mostly guaranteed acceptance products, which always cost more, and most of its policies have a 2-year waiting period when a death from natural causes only returns the premiums paid plus about 10% interest. Many seniors with controlled conditions still qualify for first-day coverage at lower rates.',
  },
  '/phoenix-life-burial-insurance-review-pros-cons/': {
    family: 'review', crumb: 'Phoenix Life',
    quickAnswer:
      'Phoenix Life burial insurance, now part of Nassau Re, is a whole life plan with no medical exam that can offer first-day coverage if you qualify. The catch is price: it’s often more expensive than other companies offering similar or better coverage, and its financial ratings sit below many top insurers. It can make sense for certain health conditions, like some mental disorders, but most people will find stronger and cheaper options elsewhere.',
  },
  '/primerica-life-insurance-review/': {
    family: 'review', crumb: 'Primerica',
    quickAnswer:
      'Primerica is a legitimate, financially stable company, but it only sells term life insurance, so your coverage is temporary and expires after a set period. Its policies require full medical underwriting, and when the term ends, premiums can rise sharply, which is why many policies lapse at renewal. Term coverage can play a limited role for younger people with short-term income needs, but Primerica isn’t built for final expense planning or lifetime protection.',
  },
  '/prosperity-life-burial-insurance-review-pros-cons/': {
    family: 'review', crumb: 'Prosperity Life',
    quickAnswer:
      'Prosperity Life burial insurance is a no-exam whole life policy for final expenses, with coverage usually between $1,500 and $35,000. If you qualify for its Level Benefit plan, you get full coverage from the first day, and many medical conditions qualify. If your health is worse, you may be placed in a graded plan that pays only part of the benefit in the first two years, or a modified plan with a two-year waiting period that returns premiums instead. Prosperity may be your best option if you qualify for the Level Benefit plan, but not if you only qualify for the graded or modified plans.',
  },
  '/security-national-burial-insurance-review/': { family: 'review', crumb: 'Security National' },
  '/senior-life-insurance-review/': {
    family: 'review', crumb: 'Senior Life',
    quickAnswer:
      'Senior Life Insurance Company is a real, licensed insurer that sells final expense whole life insurance with easy approval, even if you have health issues, and you can often qualify without a medical exam. The tradeoff is cost and limitations: its rates usually run higher than the market average, coverage is usually smaller, and many plans include waiting periods before full benefits are paid. Reviews are mixed, and its captive agents only sell Senior Life products.',
  },
  '/state-farm/': {
    family: 'review', crumb: 'State Farm',
    quickAnswer:
      'State Farm’s burial insurance is a guaranteed issue whole life policy, so there are no health questions or medical exam, but everyone faces a mandatory two-year waiting period. If you die of natural causes in the first two years, your family gets only the premiums paid plus 10% interest. Coverage tops out at $15,000 in most states, and pricing is higher because every applicant is treated as high-risk. If your health is stable, a policy with simple health questions can often give you first-day coverage for a much lower monthly cost.',
  },
  '/transamerica-burial-insurance-review/': {
    family: 'review', crumb: 'Transamerica',
    quickAnswer:
      'Transamerica burial insurance can work, but only in the right situation. If you qualify for its Immediate Solution whole life policy, you get full coverage from day one with no waiting period. Its underwriting is tougher, though, and many people get pushed into more expensive plans or its Easy Solution graded plan with a two-year waiting period, so you could pay more and still not get full protection right away.',
  },
  '/united-heritage-burial-insurance-review/': { family: 'review', crumb: 'United Heritage' },
  '/valife/': {
    family: 'review', crumb: 'VALife',
    quickAnswer:
      'VALife is a legitimate whole life insurance program run by the VA for veterans with a service-connected disability rating from 0% to 100%, with up to $40,000 in coverage and no medical exam or health questions. The catch is a mandatory two-year waiting period: if you die of natural causes in the first 24 months, your family gets back only the premiums you paid plus a small amount of interest. Healthy veterans can often pay less, and get first-day coverage, with a private plan that asks health questions.',
  },
  '/globe-life-price-increase/': {
    family: 'review', crumb: 'Globe Life',
    quickAnswer:
      'Yes, on its term life insurance. Globe Life’s term policy isn’t level term: it renews every five years, and your premium rises automatically at each renewal as you move into a higher age bracket, even if your health never changes. Coverage ends at the policy anniversary after your 90th birthday, with no payout and no refund. Globe Life’s whole life plans have level premiums, but the coverage amounts are small.',
  },
  '/trustage-price-increase/': { family: 'review', crumb: 'TruStage' },
  '/senior-legacy-vs-senior-legacy-life/': { family: 'review', crumb: 'Senior Legacy' },

  // Core final-expense articles (October 2026): general education, buying
  // for family, seniors and Medicaid. Section Burial Insurance; the page's H1
  // is its breadcrumb unless the H1 is too long (then `crumb`).
  '/5-ways-to-get-burial-insurance-with-first-day-coverage/': {
    section: 'burialInsurance', crumb: '5 Ways to Get First-Day Coverage',
    quickAnswer:
      'To get burial insurance with first-day coverage, apply for a policy that asks basic health questions. If you do, you can often get immediate coverage at a lower cost. Avoid burial insurance sold through the mail, which never asks health questions and comes with a two-year waiting period, and most companies advertising on TV, which typically offer insurance with a two-year waiting period. Every company has different underwriting rules, so the key is knowing which one will accept your health issues, and an independent agency can help you find it.',
  },
  '/burial-insurance-calculator/': {
    section: 'burialInsurance',
    quickAnswer:
      'To figure out how much burial insurance you need, add up the cost of the funeral you want, such as burial or cremation, the casket, a viewing, the headstone, and transportation. Then add other end-of-life costs like remaining medical bills, living expenses, legal costs, credit card bills, and past-due accounts. Because of inflation, it’s wise to plan on at least $10,000 to $15,000 for funeral expenses.',
  },
  '/burial-insurance/and-coronavirus/': { section: 'burialInsurance', crumb: 'Burial Insurance and Coronavirus' },
  '/burial-insurance/and-suicide/': { section: 'burialInsurance' },
  '/burial-insurance/borrowing-against-cash-value/': {
    section: 'burialInsurance',
    quickAnswer:
      'Borrowing against cash value comes down to access versus risk. You can borrow from whole life, universal life, or IUL policies once they build enough cash value. The upside is speed and flexibility: there’s no credit check, and you can use the money for anything. The downside is that the loan reduces your death benefit, adds interest, and can cause the policy to lapse if it grows too large. If that happens, you could even owe taxes on the money you took out.',
  },
  '/burial-insurance/build-chart/': {
    section: 'burialInsurance', crumb: 'Height & Weight Build Charts',
    quickAnswer:
      'A life insurance build chart is a height-and-weight guideline insurance companies use to determine your risk level and pricing. Your build places you into a risk class that directly controls how much you pay, and being over or under a company’s limits can mean higher rates or a decline. Every company uses its own chart, so one might approve you at a good rate while another charges more or declines you completely. Burial insurance and simplified-issue whole life policies are usually more lenient than term life.',
  },
  '/burial-insurance/burial-insurance-application-process/': {
    section: 'burialInsurance',
    quickAnswer:
      'The burial insurance application process is straightforward. You start by getting a quote, choosing a policy, and filling out basic personal and health information. Then most people complete a short phone interview and wait for underwriting to approve the policy. Some plans offer same-day approval with no exam, while others add waiting periods if your health is higher risk. Applying with the right company from the start keeps you from getting stuck with worse coverage.',
  },
  '/burial-insurance/burial-insurance-near-me/': {
    section: 'burialInsurance',
    quickAnswer:
      'Affordable burial insurance near you isn’t about location; it’s about how you apply and who you apply with. Every company underwrites health differently, so the wrong match can cost you more or limit your coverage. Most people can qualify without a medical exam. If you answer “no” to all the health questions, you qualify for a level plan with no waiting period, but cheaper plans often come with trade-offs like waiting periods or lower payouts.',
  },
  '/burial-insurance/cheap/': {
    section: 'burialInsurance',
    quickAnswer:
      'Cheap burial insurance exists, but you have to understand what “cheap” actually means. The cheapest plans require answering health questions and qualifying for better rates. If you skip that, you’ll pay more and face a two-year waiting period before full benefits take effect. Policies sold through TV and magazine ads are always more expensive than shopping through a final expense specialist; depending on your age and health, you may overpay by 35% to 100% buying that way.',
  },
  '/burial-insurance/contestability-period/': {
    section: 'burialInsurance',
    quickAnswer:
      'The contestability period is usually the first two years after your burial insurance policy starts. During that time, the insurance company can review your application and investigate a claim to see whether you were honest about your health and lifestyle. If they find missing or incorrect information, they can delay, reduce, or deny the payout. After two years, your policy becomes much harder to challenge, and claims are usually paid without issue unless there’s clear fraud.',
  },
  '/burial-insurance/dui-dwi/': { section: 'burialInsurance' },
  '/burial-insurance/felony-conviction/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, you can get burial insurance with a felony conviction, and it’s more available than most people think. Few insurance companies ask about felony convictions, and some don’t ask at all. If you’re generally healthy, you can easily qualify for a level death benefit with first-day coverage. Timing and severity still matter: if your conviction is recent, violent, or you’re still on probation, many companies will decline you or delay approval.',
  },
  '/burial-insurance/final-expense-life-insurance-dave-ramsey/': { section: 'burialInsurance' },
  '/burial-insurance/how-to-apply-for-burial-insurance/': {
    section: 'burialInsurance',
    quickAnswer:
      'Applying for burial insurance is straightforward. You choose the type and amount of coverage, compare quotes, and fill out an application with an agent by phone or in person, which includes questions about your medical history. Some applications get approved the same day, while others need a quick phone interview or review. Applying with the right company for your health determines whether you get full coverage or a waiting period.',
  },
  '/burial-insurance/is-burial-insurance-permanent/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, burial insurance is permanent coverage, not temporary. It’s a type of whole life insurance, so it stays active for your entire life as long as you keep paying the premium. Your premiums stay the same, and the death benefit does not decrease. That’s the key difference from term life insurance, which only lasts 10 to 30 years and then expires.',
  },
  '/burial-insurance/life-insurance-no-exam/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes. Final expense life insurance with no exam is whole life insurance that skips bloodwork and doctor visits, but you still answer health questions and the insurer checks your prescription records. Most no-exam plans offer full first-day coverage as long as you can pass the basic health questions. If you can’t, guaranteed acceptance plans skip the questions but always come with a 2-year waiting period for natural causes.',
  },
  '/burial-insurance/life-insurance-with-no-waiting-period/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes. Life insurance with no waiting period, also called first-day coverage, pays the full death benefit from the first day the policy takes effect, not just a refund. It’s usually simplified issue, whole life, or burial insurance, and you have to answer health questions to qualify. Guaranteed issue plans skip the health questions but always include a two-year waiting period for natural death.',
  },
  '/burial-insurance/no-questions-asked/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial insurance with no questions asked is guaranteed issue whole life insurance: there’s no medical exam and no health questions, and your approval is guaranteed regardless of your medical conditions. The catch is the waiting period. All guaranteed issue policies come with at least a 2-year waiting period, and if you die of natural causes during that time, your family usually only gets your premiums back. Burial insurance with a few health questions is usually better, since it can give you immediate coverage at a lower cost if you qualify.',
  },
  '/burial-insurance/online/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, you can buy burial insurance online, and it’s quick and convenient. The catch is that online forms don’t always match you with the right company based on your health, so you could get approved with higher rates or a waiting period you didn’t expect. Simplified issue plans ask a few yes-or-no health questions and cover you from day one if you qualify. Guaranteed issue plans skip the health questions but come with a two-year waiting period.',
  },
  '/burial-insurance/scams/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial insurance scams usually come down to confusion and missing details. Watch for term insurance sold as burial insurance, which typically goes up in price every five years and may expire once you pass 80, and no-questions-asked policies that don’t cover natural causes of death from day one. Other scams include teaser rates, fake websites and agents, identity theft emails and calls, and agents who pocket your premiums. Never pay premiums in cash, and make sure the company receives your payments.',
  },
  '/burial-insurance/state-regulated-life-insurance/': {
    section: 'burialInsurance',
    quickAnswer:
      'No, “state-regulated life insurance” isn’t a government program. It only means a private policy follows your state’s insurance laws, which every legitimate life insurance policy already does. Mailers and ads use the phrase to sound official and collect your information to sell to insurance agents. Most of these offers lead to guaranteed-acceptance policies with a two-year waiting period, while first-day coverage plans pay the full death benefit right away.',
  },
  // Rewritten T2/T-2 mailer guide (October 2026; Randy's sourced research).
  '/t2-life-insurance/': {
    section: 'burialInsurance', crumb: 'T2 Life Insurance Form',
    quickAnswer:
      'The T2 (or T-2) form is a mailer, not an insurance company or an insurance policy. Regulators have tied mailers like it to lead generation: if you send the card back, your information can go to an insurance agent or agency who contacts you to sell coverage. The mailer doesn’t decide which insurance company you’re offered, your price, your approval or any waiting period. Those depend on the actual insurance company and policy.',
    related: [
      { href: '/burial-insurance/state-regulated-life-insurance/' },
      { href: '/burial-insurance/scams/' },
    ],
  },
  '/burial-insurance/with-first-day-coverage/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial insurance with first-day coverage pays your full death benefit from day one, whether you die from an accident or a medical cause. To get it, you have to answer basic health questions so the insurance company can judge your risk, but there’s no medical exam. Most people qualify, even when they’re not in perfect health. If you skip the health questions, you’ll be placed into a guaranteed issue plan with a 2-year waiting period, where your family only gets premiums back plus interest if you die of natural causes early on.',
  },
  '/declined-for-life-insurance/': { section: 'burialInsurance' },
  '/finding-affordable-burial-insurance/': {
    section: 'burialInsurance',
    quickAnswer:
      'To find affordable burial insurance, shop around and compare prices from several companies before you apply. The cheapest policies typically ask health questions, because lower risk means lower cost. Guaranteed issue plans skip the health questions but cost more and often include waiting periods. Your price depends on your age, gender, height and weight, tobacco use, health, and coverage amount, and the younger you are, the cheaper it is.',
  },
  '/how-much-burial-insurance-do-i-need/': {
    section: 'burialInsurance',
    quickAnswer:
      'It depends on what you want covered. Add up the cost of the funeral and burial or cremation you want, then add medical bills, debts, and other final expenses. The average funeral and burial costs around $10,000, so it’s wise to plan on at least $15,000 to cover inflation. Most policies fall between $5,000 and $25,000, and you’ll need more if you also want to cover bills or leave extra money behind.',
  },
  '/is-burial-insurance-worth-it/': { section: 'burialInsurance' },
  '/the-importance-of-burial-insurance/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial insurance is a type of whole life insurance designed to cover funeral costs, medical bills and other final expenses, so your family isn’t left scrambling for money when you die. The payout is smaller, usually $5,000 to $25,000, and goes directly to your beneficiary, who can use it however they want. Premiums are fixed, the death benefit never decreases, and the policy lasts a lifetime.',
  },
  '/life-insurance-height-weight-guidelines/': {
    section: 'burialInsurance',
    quickAnswer:
      'Life insurance companies use height and weight “build charts” to decide how risky you are and what you’ll pay. If your height and weight fall within a company’s optimum range, you can potentially get lower rates. If you’re above or below it, you may still qualify, possibly at a higher price, and if you’re well over or under, you may be denied by some companies but not others. Each company has its own chart, and final expense policies often have less strict build charts or may not have them at all.',
  },
  '/funeral-plan-insurance-policies/': { section: 'burialInsurance' },
  '/rapture-life-insurance/': { section: 'burialInsurance', crumb: 'Rapture Life Insurance' },
  '/burial-insurance/brother/': { section: 'burialInsurance' },
  '/burial-insurance/sister/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, you can buy burial insurance on your sister, but you must show “insurable interest,” meaning her death would cause you financial loss. That could be things like shared bills, caregiving, or debt responsibility. She also has to know about the policy and agree to it, and unless she is disabled, she must sign the application, even for no-exam policies. If you skip these steps or set it up wrong, the policy can be denied or canceled.',
  },
  '/burial-insurance/parents/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, you can take out burial insurance on your parents. As their child, you have an insurable interest, but your parents must consent and sign the application. They won’t need a medical exam, but they’ll answer some health questions and the carrier will check their prescription history. Most applicants qualify for first-day coverage even with health issues; a parent with a significant medical condition may only qualify for guaranteed issue, which has a two-year waiting period.',
  },
  '/burial-insurance/can-i-buy-life-insurance-on-my-mother/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, you can buy life insurance on your mother, but there are rules. She has to give her consent and sign the application; buying a policy without her knowledge is illegal. You also need insurable interest, which means her death would cost you money, like funeral expenses or medical bills. If her health is poor, a guaranteed acceptance policy will still accept her, but it has a two-year waiting period and a limited death benefit.',
  },
  '/burial-insurance/on-someone-else/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, buying burial insurance on someone else is possible, but you need two things: consent and insurable interest. The person has to agree to the policy and sign the application, and you must show their death would financially affect you. Children commonly buy it for parents, and spouses for each other. You can’t secretly take out a policy on someone or insure a friend. Coverage on a minor child follows different rules, set by the insurance company and state law.',
  },
  '/burial-insurance/life-insurance-widows/': {
    section: 'burialInsurance',
    quickAnswer:
      'Final expense life insurance for widows is a whole life policy that pays a smaller benefit, usually enough to cover funeral bills, medical expenses, and small debts. Premiums stay level, and the benefit never decreases. Most widows can qualify for first-day coverage through simplified issue plans, even if they take medication or manage chronic conditions. Guaranteed issue plans skip health questions but cost more and come with a two-year waiting period.',
  },
  '/what-happens-when-your-spouse-died-no-life-insurance/': {
    section: 'burialInsurance', crumb: 'When a Spouse Dies Without Life Insurance',
    quickAnswer:
      'When your spouse dies without life insurance, there’s no payout coming in, so funeral costs, medical bills and debts have to be covered by savings, the estate, or family out of pocket. If there isn’t enough money, people take loans, use credit cards or sell assets just to get through it. Some help exists, like Social Security’s one-time $255 death benefit, VA burial benefits for veterans’ families and local indigent burial programs, but government help is small and won’t cover full funeral costs.',
  },
  '/burial-insurance/for-seniors/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial policies for seniors are small whole life insurance plans designed to cover funeral costs. They’re popular because approval is easier and coverage lasts your entire life. With a simplified issue plan, you answer a few health questions and get first-day coverage. Guaranteed issue plans ask no health questions, but they come with a waiting period, typically 24 months, before your beneficiary would receive the full death benefit.',
  },
  '/burial-insurance/funeral-insurance-for-seniors/': {
    section: 'burialInsurance',
    quickAnswer:
      'Funeral insurance for seniors is a type of whole life insurance designed to cover final expenses like funerals, medical bills, and small debts, usually for people between 50 and 85. Simplified issue plans ask basic health questions, and most health conditions will be approved with no waiting period. Guaranteed issue plans ask no health questions, but they typically impose a two-year waiting period before paying the full death benefit.',
  },
  '/burial-insurance/guaranteed-issue-life-insurance-for-seniors/': { section: 'burialInsurance' },
  '/burial-insurance/life-insurance-for-seniors/': {
    section: 'burialInsurance', crumb: 'Life Insurance for Seniors',
    quickAnswer:
      'Life insurance for seniors ages 50 to 85 includes term life, whole life, and burial insurance. Term life is the cheapest, but it can expire before you pass away, while whole life and burial insurance last your entire life. You don’t need a medical exam, and most seniors qualify for a first-day coverage plan even with health issues. Serious conditions often push you into guaranteed issue plans with a 2-year waiting period.',
  },
  '/burial-insurance/over-70/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, burial insurance over 70 is still very possible, but your options depend heavily on your health and timing. Even with health problems, you can get approved. Whole life burial policies have monthly premiums that don’t increase as you age and won’t expire as long as you keep paying, but some TV and magazine policies may increase in price every five years. If you qualify for a plan with first-day coverage, it’s usually much better than guaranteed issue policies that come with a 2-year delay. Most companies accept applicants 85 and younger.',
  },
  '/burial-insurance/over-80/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes, burial insurance over 80 is still available, but your options are limited and more expensive. Even with health problems, you can get approved. Whole life burial policies have monthly premiums that don’t increase as you age and won’t expire as long as you keep paying, but some TV and magazine policies may increase in price every five years. Timing matters most: very few companies will consider coverage for people over 85, so if you’re 80 to 85, now is the best time to buy.',
  },
  '/final-expense-life-insurance-over-80/': {
    section: 'burialInsurance',
    quickAnswer:
      'Yes. Final expense insurance is usually your only real option over 80, and it’s small whole life coverage meant for funeral and final expenses, with no medical exam. If your health matches a company’s guidelines, simplified issue whole life can still give you first-day coverage. If not, guaranteed issue plans accept you without health questions but cost more and have a two-year waiting period for natural causes. Each company sets its own age cutoffs, so another company may still accept you after one says no.',
  },
  '/final-expense-life-insurance-medicaid/': {
    section: 'burialInsurance',
    // Quick Answer re-derived October 2026 after the Medicaid corrections (eCFR SSI and Medicaid rules).
    quickAnswer:
      'A final expense policy doesn’t automatically disqualify you from Medicaid. Whether a policy counts depends on your state and Medicaid program, who owns it, its face value and its cash surrender value. Don’t change who owns a policy just to protect your eligibility without checking your state’s rules first, because changing ownership can count as a transfer of assets.',
  },
  '/medicaid-spend-down-rules-on-life-insurance/': { section: 'burialInsurance' },

  // Remaining editorial articles (October 2026). Funeral, cremation and
  // end-of-life articles have no indexable hub, so they sit at Home › page;
  // flameless cremation is a burial-insurance article.
  '/burial-vs-cremation/': {
    section: 'none',
    quickAnswer:
      'Cremation is usually much cheaper than burial because you avoid paying for a casket, a burial plot, and cemetery fees. It also gives your family more time and options for a memorial, like a service held later or keeping or scattering the ashes. Burial costs more because the cemetery bills separately for the plot, vault, opening and closing, and marker, but it gives your family a permanent place to visit and aligns with many cultural or religious traditions.',
  },
  '/cremation-cost-and-info/': {
    section: 'none',
    quickAnswer:
      'A direct cremation, with no viewing or ceremony, usually runs about $1,000 to $3,000, depending on where you live and the provider. Adding services raises the price fast: the NFDA median for a cremation with a viewing and memorial service is about $6,280. The difference is the extras, like viewings, ceremonies, urns, and funeral home fees. The most expensive part is rarely the cremation itself.',
    related: [
      { href: '/cremation-cost-questions/' },
    ],
  },
  '/cremation-cost-questions/': {
    section: 'none', crumb: 'Cremation Questions',
    quickAnswer:
      'Cremation costs depend heavily on what you choose. Direct cremation, which skips the viewing and ceremony, is the cheapest option. Low advertised prices usually don’t include required fees like death certificates, transportation, and the basic container. Adding a viewing, chapel service, or memorial can make cremation cost about as much as a simple burial package. To save, ask for an itemized price list, compare providers, and know you can use an urn bought elsewhere.',
  },
  '/how-much-does-a-funeral-cost/': {
    section: 'none',
    quickAnswer:
      'A funeral can easily cost thousands of dollars. The median cost of an adult funeral with viewing and burial in the U.S. is $7,848, or up to $9,420 if the cemetery requires a vault. A funeral with viewing and cremation costs $6,970, while a direct cremation can cost less than $1,000. Your total depends on your choices, and items like a cemetery plot, headstone, obituary, and flowers aren’t included in those figures.',
    related: [
      { href: '/burial-vs-cremation/' },
      { href: '/cremation-cost-and-info/' },
    ],
  },
  '/pay-for-a-funeral-without-life-insurance/': {
    section: 'none',
    quickAnswer:
      'Without life insurance, the family typically pays the funeral costs, and most funeral homes require full payment upfront before services are scheduled. Most families scramble by using savings, credit, retirement money, loans, or online fundraisers, which drain savings or add high-interest debt. Simpler choices like direct cremation, green burial, or a memorial service without the body present can lower costs significantly. Government help is limited, such as Social Security’s one-time $255 death benefit.',
  },
  '/prepaid-caskets-pros-and-cons/': {
    section: 'none',
    quickAnswer:
      'A prepaid casket is a merchandise contract: you choose a specific casket, pay upfront, and the funeral home promises to provide that model at the time of death. It can reduce emotional overspending and help someone who wants a very specific design, but most families don’t benefit from one. It ties your family to one funeral home and one set of rules, and portability, refunds, and substitutions depend on state law and the funeral home’s policies. Final expense life insurance pays a cash benefit your family can use at any funeral home.',
  },
  '/prepaid-funeral/': {
    section: 'none',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'A prepaid funeral plan lets you pay a funeral home in advance for specific services, in a lump sum or in installments. The funeral home either puts your money in a state-regulated trust fund or buys a life insurance policy with the death benefit assigned to them. You can lock in today’s prices and reduce stress for your family, but your money is tied to that funeral home.',
    related: [
      { href: '/prepaid-caskets-pros-and-cons/' },
    ],
  },
  '/what-to-do-when-a-loved-one-dies/': {
    section: 'none',
    quickAnswer:
      'First, have the death legally pronounced by someone in authority, such as a doctor, hospice nurse, coroner or medical examiner, and get multiple copies of the death certificate. Then contact a funeral home, notify family, and start planning burial or cremation. After that, you deal with documents like the will, insurance policies and financial accounts, including starting any life insurance claim and notifying Social Security, the bank and credit card companies.',
  },
  '/burial-insurance/donating-your-body-to-science/': {
    section: 'none', crumb: 'Donating Your Body to Science',
    quickAnswer:
      'To donate your body to science, you pre-register with a medical school, university, or whole-body donation program before death and sign a consent form. Tell your family and put instructions in your will so they know who to contact. Many programs cover transportation and cremation, but some don’t cover transportation, and a program may reject your donation. That’s why you still need a backup plan, such as burial insurance, for final expenses your family can still face.',
  },
  '/flameless-cremation-burial-insurance/': { section: 'burialInsurance' },
  // Occupation and member-organization pages: final-expense articles go under
  // Burial Insurance; employer group life is top level.
  '/burial-insurance/final-expense-insurance-for-pastors-and-congregations/': {
    section: 'burialInsurance', crumb: 'Pastors and Congregations',
    quickAnswer:
      'Final expense insurance for pastors and congregations is a type of whole life insurance that covers funeral costs, medical bills, and small debts after someone dies. Many small congregations don’t offer personal life insurance for pastors, and when a pastor dies, many churches have to fundraise to pay final expenses. A policy gives your family and church immediate cash so they’re not scrambling during a crisis. It doesn’t require a medical exam, and every year you wait, the premium goes up.',
  },
  '/burial-insurance/native-americans/': { section: 'burialInsurance' },
  '/burial-insurance/veterans/': {
    section: 'burialInsurance',
    quickAnswer:
      'Burial insurance for veterans fills the gap that VA benefits don’t cover. The VA helps with burial allowances, transportation, and gravesites in national cemeteries, but these payments are limited and often only reimburse part of the cost. Burial insurance pays your family cash directly so they can cover all final expenses. You don’t need a medical exam, and most veterans can answer the health questions and get approved for simplified issue coverage with no waiting period. Veterans with severe conditions, like dialysis, dementia, or needing help with daily activities, qualify only for guaranteed issue, which is graded for the first two years.',
  },
  '/final-expense-life-insurance-retired-truckers/': { section: 'burialInsurance' },
  '/american-legion-life-insurance/': {
    section: 'burialInsurance',
    quickAnswer:
      'American Legion insurance isn’t full life insurance. The no-cost LegionCare benefit is accidental death coverage only: it pays up to $5,000 for a covered accident tied to a Legion event, $1,000 for other covered accidents, and nothing for illness. The Auxiliary senior term plan is guaranteed acceptance, but it caps out at $25,000 under age 65 and $10,000 at 65 or older, premiums rise every five years, and coverage over $5,000 drops to $5,000 at age 80.',
  },
  '/elks-lodge-life-insurance-options/': { section: 'burialInsurance' },
  '/lions-club-member-life-insurance/': {
    section: 'burialInsurance', crumb: 'Lions Club Member Life Insurance',
    quickAnswer:
      'Lions Club membership doesn’t include any life insurance, death benefit, or funeral benefit; the club only maintains liability insurance for official activities. To protect your family, you need your own personal coverage. Term life offers higher coverage for families who still have obligations like a mortgage or dependents, but many companies stop offering it after age 70 to 75. Whole life then becomes the main option, and simplified issue plans offer full immediate benefits and are designed to approve common conditions like high blood pressure or controlled diabetes.',
  },
  '/veterans-of-foreign-wars-vfw-life-insurance-options/': { section: 'burialInsurance', crumb: 'VFW Life Insurance Options' },
  '/life-insurance-for-employees/': {
    section: 'none',
    quickAnswer:
      'Life insurance through your job, usually called group life insurance, can be a good starting point, but it is usually not enough. It’s often free or very cheap, and many people get approved without a medical exam, but most plans only cover 1 to 2 times your salary. If you leave your job, you will usually lose the coverage. If it isn’t enough, you may need to add an individual policy, which you own and can keep even if you leave your job.',
  },
  // Term, mortgage protection and other products: top level for now.
  '/term-life-conversion-to-whole-life/': { section: 'none' },
  '/term-life-insurance-doctors/': {
    section: 'none',
    quickAnswer:
      'Doctors usually need far more life insurance than an employer plan gives them. Group plans often pay one or two times salary, while a common rule of thumb is 10 to 15 times income, and a typical range for physicians is $2,000,000 to $5,000,000, depending on specialty, debt, dependents and goals. Most doctors need longer-term, level coverage, such as a 20- or 30-year term, in a personally owned policy that follows them through every job change.',
  },
  '/term-life-insurance-truckers/': {
    section: 'none',
    quickAnswer:
      'Term life is usually the smartest starting point for truck drivers because it gives you the most coverage for the lowest cost. Trucking is considered higher risk, so insurers look closely at your health, driving history and job details, and your job can raise rates, but most drivers still qualify. Simplified issue term with no medical exam fits life on the road, and term lets you lock in coverage for 10, 20 or 30 years to protect your income, debts and family.',
  },
  '/term-life-insurance-guide-everyone/': {
    section: 'none',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Term life insurance covers you for a set period, usually 10 to 30 years, and pays your family if you die during that time. You pay a set premium, and as long as you pay on time, the company cannot change the price during the guaranteed term. It has no cash value. Term life is usually the right tool when your largest financial risks are temporary.',
    related: [
      { href: '/term-life-insurance-doctors/' },
    ],
  },
  '/mortgage-protection-life-insurance/': { section: 'none' },
  '/cancer-insurance/': { section: 'none' },
  '/children-grandchild-policies/': {
    section: 'none',
    // Rewritten October 2026 from Randy's carrier research (Gerber, Mutual of Omaha).
    quickAnswer:
      'Children’s life insurance is usually permanent whole life coverage that a parent, grandparent or guardian buys on a minor. It can last for life and build cash value. But the details vary by insurance company, including who can apply, whether a parent must sign, who owns the policy and whether the child can buy more coverage later.',
    related: [{ href: '/burial-insurance/on-someone-else/' }],
  },
  // IUL articles: section IUL Playbook (/iul-book/, which keeps its own layout).
  '/iul-book/iul-church-members-faith-based-communities/': {
    section: 'iulPlaybook', crumb: 'IUL for Church Members',
    // Rewritten October 2026 from Randy's source packet (NAIC illustrations, IRS Pub. 525, Rev. Rul. 2007-38).
    quickAnswer:
      'Names like “Kingdom Banking” or “Infinite Banking God’s Way” describe a money strategy, not a different kind of insurance. The policy is usually an indexed universal life (IUL) policy, and religious framing doesn’t change what its contract says. Before you buy, separate the guaranteed values from the illustrated assumptions, understand the charges and how much you must pay in, and know that loans, a lapse or a surrender can create a tax bill. If you mainly need a death benefit, simpler coverage may fit better.',
  },
  '/iul-book/iul-military-members-veterans/': {
    section: 'iulPlaybook',
    quickAnswer:
      'For most military members and veterans, an IUL is an expensive gamble they don’t need. Your gains are capped and reduced by fees, and your cost of insurance increases with age every year. If the policy underperforms, you may have to pay more to keep it active or risk losing it altogether. IULs are only suitable for a narrow group of high-income earners who are comfortable reviewing and adjusting the plan every year. For nearly all veterans, whole life or term life insurance is the safer, smarter path.',
  },
  '/iul-book/iul-police-officers-firefighters/': {
    section: 'iulPlaybook', crumb: 'IULs for Police and Firefighters',
    quickAnswer:
      'For most police officers and firefighters, an IUL adds risk you don’t need. Caps limit your gains, fees erode your value, and the cost of insurance increases with age. Once the cash value is too low, the insurer demands higher premiums, and the policy may lapse if you can’t pay them. IULs only work for high-income buyers who can fund and manage them consistently for decades. Most police officers and firefighters do better with whole life or level term life insurance.',
  },
  '/iul-book/iuls-for-truckers/': {
    section: 'iulPlaybook', crumb: 'IULs for Truckers',
    quickAnswer:
      'For most truckers, an IUL is the wrong tool. Cash value growth is limited by caps and participation rates, while the cost of insurance within the policy increases each year. Missed or reduced payments during slow driving months drain the cash value, and once it drops too low, the policy can lapse unless additional premium is paid. Term life usually gives you far more coverage for the same money, while whole life or burial insurance gives stable, predictable protection that doesn’t depend on market performance.',
  },
  '/iul-book/teachers-indexed-universal-life-iul/': {
    section: 'iulPlaybook', crumb: 'IULs for Teachers',
    quickAnswer:
      'For most teachers, an IUL ends up being more complicated and expensive than simpler options. Your gains are capped and controlled by the insurance company, and internal costs increase over time. If the policy underperforms, you may have to pay more just to keep it active, and policy loans can trigger taxes if the policy lapses. Most teachers benefit from either level term life for income protection or final expense whole life for lifetime peace of mind.',
  },

  // Pillar guides (October 2026): standard article template, section Burial
  // Insurance.
  '/what-is-burial-insurance/': {
    section: 'burialInsurance',
    // Summarized from the article's own text (October 2026 pilot).
    quickAnswer:
      'Burial insurance is a type of whole life insurance designed to cover funeral, burial, and other final expenses. It usually offers smaller coverage amounts and is easier to qualify for because most plans don’t require a medical exam. Coverage lasts a lifetime, and your premiums stay the same. Your beneficiary gets a tax-free check they can use however they see fit.',
  },
  '/final-expense-life-insurance-complete-guide/': {
    section: 'burialInsurance',
    quickAnswer:
      'Final expense life insurance is a type of whole life insurance designed to cover funeral costs, small debts, and end-of-life expenses. You pay a fixed monthly premium that stays the same for life, and coverage is usually $5,000 to $25,000, sometimes more. There’s no medical exam; you answer health questions and the company checks your prescription history. If you qualify for level benefit coverage, the full amount pays from day one. Serious or recent health problems may mean a graded, modified, or guaranteed issue plan that limits the payout during the first 12 to 24 months.',
  },
  '/burial-insurance/top-10-final-expense-life-insurance-companies/': { section: 'burialInsurance' },
  '/buyers-guide/': { section: 'burialInsurance' },
  '/final-expense-life-insurance-pre-existing-conditions/': {
    section: 'burialInsurance',
    crumb: 'Pre-Existing Conditions',
    quickAnswer:
      'Yes, more often than most people think. Many common conditions still qualify for full first-day coverage, and many companies accept past cancer, current COPD, a past heart attack, or a stroke for first-day coverage. More serious or recent conditions can push you into graded or guaranteed issue plans with higher costs and delayed payouts. Guaranteed issue plans skip all health questions, but every one has a mandatory two-year waiting period for natural causes.',
  },

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
  // The "Company Reviews" section page itself (the review pages' parent crumb).
  '/a-z-companies/': {
    section: 'none',
    crumb: 'Company Reviews',
  },
};
