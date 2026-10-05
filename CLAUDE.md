# CLAUDE.md — FEXGUY.com

Astro (TypeScript, static output) site deployed on Vercel. Rebuild of the
live WordPress site at fexguy.com. Phase 1 (exact migration of 339 live URLs)
is in place; see src/content/README.md for how pages were migrated.

## Hard rules

- **Never invent business facts**: no insurance claims, carriers, prices,
  rates, licensing/state info, statistics, testimonials, reviews, awards,
  addresses, phone numbers, or page copy. Use only content Randy provides.
  If something is missing, leave the field empty and ask.
- **Never guess WordPress URLs or redirects.** Only use URLs from the
  migration data Randy provides.
- Don't connect domains, change DNS, or set `PUBLIC_ALLOW_INDEXING=true`
  unless Randy explicitly asks. Never touch the production WordPress site.
- Phase 1 is an exact migration: don't change any migrated page's URL,
  title, meta description, H1, body content, robots, canonical, social
  tags, or JSON-LD without Randy's approval.
- **Phone:** 888-862-9456 (`tel:8888629456`) is the ONLY number ever presented
  as a FEXGuy.com / Final Expense Guy / Randy / quote / sales contact number.
  888-656-4648 is Randy's TV/streaming ad number and must never appear on the
  site. Insurance companies' own customer-service numbers in reviews stay as
  they are (never replace them with 888-862-9456).
- The lead system (below) was approved by Randy in October 2026. Don't add
  other forms, quoters, pop-ups, trackers, pixels, or tracking events, or
  change what is sent to GA4/Meta, without his approval.
- **Retired workflows** (never preserve or rebuild): the Google Forms
  suitability-questionnaire/mailed-report funnel (/easy/ pages), the Fluent
  Forms health quizzes, the recruiting/job-application pages, the /book/
  booking links, and the old term-life quote pages with their quoters
  (Quoteplicity, NinjaQuoter). A new term-life quote experience will be built
  from scratch later; the old pages must not influence it. Also the Agent CRM
  do-not-contact/suppression workflow (/do-not-sell/ — it was never a consumer
  privacy opt-out page): its footer link is removed and the URL returns 404.
- **Ninja Forms is retired**, along with its integrations (including the old
  Agent CRM workflows). Never preserve or rebuild Ninja Forms functionality.
  But don't delete a page just because it once held a Ninja Form: judge the
  page itself (content, traffic, links, SEO value, current purpose) and, if it
  stays, replace the old form appropriately (with Randy's approval).
- Removed URLs return a real 404 (no redirect) unless Randy approves a
  redirect. Removed so far: /application/, /conservation/, /careers/, /apply/,
  /leave-a-review/, /quiz/, /video-info-quiz-2/, /easy/, /easy-whole-life/,
  /easy-term-life/, /quote-final-expense/, /term-life-quote/, /term-quote/,
  /do-not-sell/ (never rebuilt in the new site).
- Redirects must be approved by Randy before they're added to vercel.json.
  Old URLs decided as 404 with no redirect: /book/, the two
  /jonathan-lawson-actor-colonial-penn*/ URLs, /burial-insurance-neuropathy/,
  /best-whole-life-insurance-plans/ (draft not restored; also no redirect for
  its -old slug), /selling-a-burial-plot/ (draft not restored; don't rebuild
  this topic unless Randy asks — its traffic was people selling cemetery
  plots), /how-to-write-an-obituary/ (same: not restored, not rebuilt —
  bereavement-writing intent). Don't redirect these without Randy's approval.
- **The Life Insurance Podcast is permanently retired** (Randy, October 2026).
  Never restore or rebuild it: no podcast pages, episode pages, archives,
  categories, feeds, embeds, navigation or redirects. Its 36 URLs are
  intentional real 404s with no redirects (don't send episodes to unrelated
  articles): /life-insurance-podcast/ (draft not restored), /podcast-episodes/,
  /category/podcast/, /category/life-insurance-podcast/ (and /page/4/), every
  /…-podcast-episode-N/ URL (episodes 2, 3, 5–15, 17–31, 35), and episodes 1
  and 16, whose slugs lack "podcast": /benefits-of-burial-insurance-episode-1/
  and /7-ways-to-get-the-lowest-pricing-on-burial-insurance-episode-16/.
- **Group G2 decided** (Randy, October 2026; 39 old URLs, none in the
  WordPress export, all unpublished in December 2025): 2 approved 301s
  (/category/guaranteed-issue-whole-life-insurance/ →
  /burial-insurance/guaranteed-issue-life-insurance-for-seniors/ and
  /funeral-planning-checklist/ → /12-step-final-planning-guide/) and 37
  intentional real 404s with no redirects. Don't restore or rebuild these
  just because the URLs existed; new content on a topic (e.g. retiree
  coverage) is a separate content decision. The 404s:
  /burial-plot-prices-save-money/, /funeral-trust-pros-and-cons/,
  /burial-life-insurance-for-alcoa-retirees/,
  /burial-life-insurance-sears-retirees/, /life-insurance-for-allstate-retirees/,
  /burial-insurance-3m-retirees/, /top-20-uplifting-poems-after-loss-of-mother/,
  /top-20-uplifting-poems-after-loss-of-father/,
  /the-history-of-hearses-in-the-united-states/,
  /top-25-bible-verses-for-celebration-of-life-service-funeral/,
  /best-bible-verses-for-a-funeral/,
  /how-pilgrim-burials-were-handled-after-the-mayflower-landed-in-the-usa/,
  /mushroom-burial-suit-for-green-burial/, /tree-pod-burial-green-burials/,
  /burial-insurance-human-composting/, /how-to-select-a-headstone/,
  /how-to-liquidate-assets-after-parents-death/,
  /payable-on-death-account-pros-and-cons/, /how-to-post-an-obituary/,
  /medicare-coverage-helpline-review/,
  /jimmie-walker-medicare-tv-commercial-review/,
  /medicare-benefits-questions-line-tv-commercial-review/,
  /joe-namath-medicare-advantage-commercial-review/,
  /lose-it-review-for-seniors/, /how-to-buy-a-casket/, /how-to-buy-an-urn/,
  /funeral-home-scams/, /funeral-scams-to-watch-out-for-how-to-protect-yourself/,
  /how-to-sell-parents-house-after-their-death/,
  /preventing-identity-theft-after-death/, /senior-discounts/,
  /how-to-choose-a-funeral-home/,
  /nursing-home-checklist-find-the-best-nursing-home/,
  /buying-flowers-for-a-funeral/, /how-to-dispose-of-medications-after-a-death/,
  /the-history-of-life-insurance/, /how-to-get-a-death-certificate/.
- **Group G3 decided** (Randy, October 2026): the 31 remaining low-traffic
  URLs are intentional real 404s with no redirects (episodes 1 and 16 are in
  the podcast list above; the other 29 follow). Don't redirect old archives,
  pagination, duplicates or workflow/campaign/thank-you URLs just to preserve
  them; the unpublished veteran-life-insurance draft is a separate content
  decision. Old workflow/campaign URLs: /application-received/,
  /compare-burial-insurance-quotes/, /youtube/, /you-tube-free-quote/.
  Duplicates of retired G2 pages: /the-history-of-hearses-in-the-united-states-copyscaped/,
  /burial-plot-prices-explained-costs-options/. Old articles:
  /6-questions-to-ask-before-buying-burial-insurance/, /state-regulated-programs/,
  /funeral-service-planning/, /33-scams-targeting-seniors-how-to-avoid-them/,
  /17-ways-to-pay-for-long-term-care/. Categories: /category/retiree-life-insurance/,
  /category/veteran-life-insurance/, /category/medicare/,
  /category/after-a-death-occurs/, /category/blog/. Blog pagination:
  /blog/page/10/, /12/, /13/, /26/, /27/, /28/. Author archives:
  /author/rvanderv8/page/2/, /3/, /9/, /12/, /14/, /19/, /21/. With G1, G2 and
  G3 done, every Group G URL has a final disposition.
- **Redirect Groups A, C, D, E** (238 old URLs from the original redirect map)
  were found by the October 2026 link audit, reviewed by Randy, and the 233
  approved ones were implemented together in vercel.json (October 2026).
- **Group A approved and implemented** (Randy, October 2026): all 91 old
  URLs that were active Rank Math 301s → 301 to the same destinations (all
  exist and return 200; no chains or loops). Includes
  /burial-insurance-amputation-amputee/ → /burial-insurance/diabetic-amputation/
  (kept despite the narrower destination: active Rank Math rule, 355 hits, 6
  internal links, no better amputation page). Approved mappings:
  /aetna-burial-insurance-review-pros-cons/ → /aetna-burial-insurance-review/
  /american-legion-member-life-insurance/ → /american-legion-life-insurance/
  /bipolar-disorder-burial-insurance/ → /burial-insurance/bipolar-disorder/
  /burial-insurance-abdominal-aortic-aneurysm/ → /burial-insurance/aneurysm/
  /burial-insurance-aids-hiv/ → /burial-insurance/aids-hiv/
  /burial-insurance-alcohol-abuse/ → /burial-insurance/drug-alcohol-abuse/
  /burial-insurance-als-lou-gehrigs-disease/ → /burial-insurance/lou-gehrigs-disease-als/
  /burial-insurance-amputation-amputee/ → /burial-insurance/diabetic-amputation/
  /burial-insurance-and-coronavirus/ → /burial-insurance/and-coronavirus/
  /burial-insurance-and-suicide/ → /burial-insurance/and-suicide/
  /burial-insurance-angina/ → /burial-insurance/angina/
  /burial-insurance-angioplasty/ → /burial-insurance/heart-surgery/
  /burial-insurance-asthma/ → /burial-insurance/asthma/
  /burial-insurance-atrial-fibrillation-afib/ → /burial-insurance/afib/
  /burial-insurance-autism/ → /burial-insurance/autism/
  /burial-insurance-brain-tumor/ → /burial-insurance/brain-tumor/
  /burial-insurance-cerebral-palsy/ → /burial-insurance/cerebral-palsy/
  /burial-insurance-chronic-bronchitis/ → /burial-insurance/chronic-bronchitis/
  /burial-insurance-circulatory-surgery/ → /burial-insurance/heart-surgery/
  /burial-insurance-coronary-artery-disease/ → /burial-insurance/coronary-artery-disease/
  /burial-insurance-dementia/ → /burial-insurance/dementia-alzheimers/
  /burial-insurance-depression/ → /burial-insurance/depression/
  /burial-insurance-diabetic-coma/ → /burial-insurance/diabetic-coma/
  /burial-insurance-disabled-persons/ → /burial-insurance/disabled-persons/
  /burial-insurance-emphysema/ → /burial-insurance/emphysema/
  /burial-insurance-for-smokers/ → /burial-insurance/for-smokers/
  /burial-insurance-heart-infection-endocarditis/ → /burial-insurance/endocarditis-heart-infection/
  /burial-insurance-heart-murmur/ → /burial-insurance/heart-murmur/
  /burial-insurance-heart-valve-surgery/ → /burial-insurance/heart-surgery/
  /burial-insurance-huntingtons-disease/ → /burial-insurance/huntingtons-disease/
  /burial-insurance-multiple-sclerosis/ → /burial-insurance/multiple-sclerosis/
  /burial-insurance-near-me/ → /burial-insurance/burial-insurance-near-me/
  /burial-insurance-no-questions-asked/ → /burial-insurance/no-questions-asked/
  /burial-insurance-organ-transplant/ → /burial-insurance/organ-transplant/
  /burial-insurance-over-80/ → /burial-insurance/over-80/
  /burial-insurance-oxygen/ → /burial-insurance/oxygen-use/
  /burial-insurance-parkinsons-disease/ → /burial-insurance/parkinsons-disease/
  /burial-insurance-retinopathy/ → /burial-insurance/diabetic-retinopathy/
  /burial-insurance-schizophrenia/ → /burial-insurance/schizophrenia/
  /burial-insurance-seizures/ → /burial-insurance/epilepsy-seizures/
  /burial-insurance-sickle-cell-anemia/ → /burial-insurance/sickle-cell-anemia/
  /burial-insurance-sleep-apnea/ → /burial-insurance/sleep-apnea/
  /burial-insurance-tia-attack/ → /burial-insurance/stroke-tia/
  /burial-insurance-traumatic-brain-injury/ → /burial-insurance/traumatic-brain-injury-tbi/
  /burial-insurance-valvular-heart-disease/ → /burial-insurance/valvular-heart-disease/
  /burial-insurance-with-congestive-heart-failure/ → /burial-insurance/congestive-heart-failure/
  /burial-insurance-with-diverticulitis/ → /burial-insurance/burial-insurance-with-diverticulitis/
  /burial-insurance/arthritis/ → /burial-insurance/burial-insurance-arthritis/
  /burial-insurance/burial-insurance-adl-activities-of-daily-living/ → /burial-insurance/adl-activities-of-daily-living/
  /burial-insurance/burial-insurance-aids-hiv/ → /burial-insurance/aids-hiv/
  /burial-insurance/burial-insurance-and-coronavirus/ → /burial-insurance/and-coronavirus/
  /burial-insurance/burial-insurance-and-suicide/ → /burial-insurance/and-suicide/
  /burial-insurance/burial-insurance-arrhythmia/ → /burial-insurance/arrhythmia/
  /burial-insurance/burial-insurance-disabled-persons/ → /burial-insurance/disabled-persons/
  /burial-insurance/burial-insurance-for-smokers/ → /burial-insurance/for-smokers/
  /burial-insurance/burial-insurance-hospitalized/ → /burial-insurance/hospitalized/
  /burial-insurance/burial-insurance-no-questions-asked/ → /burial-insurance/no-questions-asked/
  /burial-insurance/burial-insurance-online/ → /burial-insurance/online/
  /burial-insurance/burial-insurance-over-70/ → /burial-insurance/over-70/
  /burial-insurance/burial-insurance-over-80/ → /burial-insurance/over-80/
  /burial-insurance/burial-insurance-sickle-cell-anemia/ → /burial-insurance/sickle-cell-anemia/
  /burial-insurance/burial-insurance-with-first-day-coverage/ → /burial-insurance/with-first-day-coverage/
  /burial-insurance/burial-policies-for-seniors/ → /burial-insurance/for-seniors/
  /burial-insurance/buying-burial-insurance-on-someone-else/ → /burial-insurance/on-someone-else/
  /burial-insurance/cheap-burial-insurance/ → /burial-insurance/cheap/
  /burial-insurance/diabetic-retinopathy-burial-insurance/ → /burial-insurance/diabetic-retinopathy/
  /burial-life-insurance-copd/ → /burial-insurance/copd/
  /burial-policies-for-seniors/ → /burial-insurance/for-seniors/
  /buying-burial-insurance-on-someone-else/ → /burial-insurance/on-someone-else/
  /can-i-buy-life-insurance-on-my-mother/ → /burial-insurance/can-i-buy-life-insurance-on-my-mother/
  /cheap-burial-insurance/ → /burial-insurance/cheap/
  /crohns-disease/ → /burial-insurance/crohns-disease/
  /epilepsy-burial-insurance/ → /burial-insurance/epilepsy-seizures/
  /family-benefit-life-burial-insurance-review-pros-cons-old/ → /family-benefit-life-burial-insurance-review/
  /family-benefit-life-burial-insurance-review-pros-cons/ → /family-benefit-life-burial-insurance-review/
  /final-expense-insurance-diabetic-nephropathy/ → /burial-insurance/diabetic-nephropathy/
  /final-expense-life-insurance-aneurysm/ → /burial-insurance/aneurysm/
  /final-expense-life-insurance-complete-guide-2/ → /final-expense-life-insurance-complete-guide/
  /final-expense-life-insurance-dave-ramsey/ → /burial-insurance/final-expense-life-insurance-dave-ramsey/
  /final-expense-life-insurance-diabetic-neuropathy/ → /burial-insurance/diabetic-neuropathy/
  /final-expense-life-insurance-heart-attack/ → /burial-insurance/heart-attack/
  /final-expense-life-insurance-pacemaker/ → /burial-insurance/pacemaker/
  /final-expense-life-insurance-stent/ → /burial-insurance/stent/
  /final-expense-life-insurance-type-1-diabetes/ → /burial-insurance/diabetes/
  /funeral-insurance-for-seniors/ → /burial-insurance/funeral-insurance-for-seniors/
  /guaranteed-issue-life-insurance-for-seniors/ → /burial-insurance/guaranteed-issue-life-insurance-for-seniors/
  /iul-book/iul-for-military-members-veterans/ → /iul-book/iul-military-members-veterans/
  /prepaid-funeral-pros-and-cons/ → /prepaid-funeral/
  /ptsd-burial-insurance/ → /burial-insurance/ptsd/
  /state-regulated-life-insurance/ → /burial-insurance/state-regulated-life-insurance/
  /top-10-final-expense-life-insurance-companies/ → /burial-insurance/top-10-final-expense-life-insurance-companies/
- **Group C approved and implemented** (Randy, October 2026): all 26 old
  URLs that WordPress records as former slugs (_wp_old_slug) of currently
  published posts → 301 to that post's current URL (all return 200; no chains
  with Groups A or the live redirects). Approved mappings:
  /best-term-life-insurance/ → /term-life-insurance-guide-everyone/
  /burial-insurance-after-a-tia-or-transient-ischemic-attack/ → /burial-insurance/stroke-tia/
  /burial-insurance-amputation/ → /burial-insurance/diabetic-amputation/
  /burial-insurance-angioplasty-2/ → /burial-insurance/heart-surgery/
  /burial-insurance-diabetes-diabetic-complications-2/ → /burial-insurance-diabetic-complications/
  /burial-insurance-diabetes-diabetic-complications/ → /burial-insurance-diabetic-complications/
  /burial-insurance-heart-stent/ → /burial-insurance/stent/
  /burial-insurance-kidney-disease-kidney-failure/ → /burial-insurance-kidney-failure/
  /burial-insurance-medicaid/ → /final-expense-life-insurance-medicaid/
  /burial-insurance-nephropathy/ → /burial-insurance/diabetic-nephropathy/
  /burial-insurance-pacemaker/ → /burial-insurance/pacemaker/
  /burial-insurance-with-sleep-apnea/ → /burial-insurance/sleep-apnea/
  /cheap-burial-insurance-2/ → /finding-affordable-burial-insurance/
  /complete-guide-to-burial-insurance-and-final-expense/ → /final-expense-life-insurance-complete-guide/
  /final-expense-life-insurance-heart-stent/ → /burial-insurance/stent/
  /finding-cheap-burial-insurance/ → /finding-affordable-burial-insurance/
  /how-much-does-a-funeral-cost-in-2022/ → /how-much-does-a-funeral-cost/
  /how-much-does-burial-insurance-cost/ → /how-much-does-final-expense-insurance-cost/
  /life-insurance-diabetic-neuropathy/ → /burial-insurance/diabetic-neuropathy/
  /life-insurance-medicaid/ → /final-expense-life-insurance-medicaid/
  /life-insurance-over-80/ → /final-expense-life-insurance-over-80/
  /lions-club-member-life-insurance-options/ → /lions-club-member-life-insurance/
  /long-term-care-insurance/ → /long-term-care-insurance-guide/
  /primerica-life-insurance-review-bad-deal/ → /primerica-life-insurance-review/
  /primerica-life-insurance-review-protected-or-neglected/ → /primerica-life-insurance-review/
  /term-life-insurance-for-doctors/ → /term-life-insurance-doctors/
- **Group D approved and implemented** (Randy, October 2026): all 98 old
  URLs of articles that were duplicated to new URLs in May–June 2026 and
  archived as "-old" drafts without redirects; each archived original's text
  is 97–100% contained in the destination. Approved mappings:
  /affordable-burial-insurance-with-gout/ → /burial-insurance/burial-insurance-with-gout/
  /american-amicable-life-insurance-review/ → /burial-insurance/american-amicable-life-insurance-review/
  /american-amicable-review/ → /burial-insurance/american-amicable-life-insurance-review/
  /big-lou-term-life-insurance-review-scam/ → /big-lou-term-life-insurance-review/
  /borrowing-against-cash-value-pros-and-cons/ → /burial-insurance/borrowing-against-cash-value/
  /burial-insurance-adl-activities-of-daily-living/ → /burial-insurance/adl-activities-of-daily-living/
  /burial-insurance-arrhythmia/ → /burial-insurance/arrhythmia/
  /burial-insurance-arthritis/ → /burial-insurance/burial-insurance-arthritis/
  /burial-insurance-bathing-disability-adl/ → /burial-insurance/bathing-disability-adl/
  /burial-insurance-brother/ → /burial-insurance/brother/
  /burial-insurance-cbd-oil/ → /burial-insurance/cbd-oil/
  /burial-insurance-cirrhosis/ → /burial-insurance/cirrhosis/
  /burial-insurance-contestability-period/ → /burial-insurance/contestability-period/
  /burial-insurance-cystic-fibrosis/ → /burial-insurance/cystic-fibrosis/
  /burial-insurance-dave-ramsey/ → /burial-insurance/final-expense-life-insurance-dave-ramsey/
  /burial-insurance-disability-2/ → /burial-insurance/disability/
  /burial-insurance-disability/ → /burial-insurance/disability/
  /burial-insurance-donating-your-body-to-science/ → /burial-insurance/donating-your-body-to-science/
  /burial-insurance-down-syndrome/ → /burial-insurance/down-syndrome/
  /burial-insurance-drug-abuse-treatment/ → /burial-insurance/drug-abuse-treatment/
  /burial-insurance-dui-dwi/ → /burial-insurance/dui-dwi/
  /burial-insurance-felony-conviction/ → /burial-insurance/felony-conviction/
  /burial-insurance-fibromyalgia/ → /burial-insurance/fibromyalgia/
  /burial-insurance-for-blood-thinner-users/ → /burial-insurance/blood-thinner/
  /burial-insurance-for-dialysis-patients/ → /burial-insurance/dialysis-patients/
  /burial-insurance-for-hospice-patients/ → /burial-insurance/hospice-patients/
  /burial-insurance-for-overweight-and-obese-people/ → /burial-insurance/overweight-obese/
  /burial-insurance-for-parents/ → /burial-insurance/parents/
  /burial-insurance-for-sister/ → /burial-insurance/sister/
  /burial-insurance-for-terminally-ill-patients/ → /burial-insurance/terminally-ill-patients/
  /burial-insurance-for-the-blind/ → /burial-insurance/blind/
  /burial-insurance-for-veterans/ → /burial-insurance/veterans/
  /burial-insurance-heart-bypass-surgery/ → /burial-insurance/heart-bypass-surgery/
  /burial-insurance-heart-disease-circulatory-issues/ → /burial-insurance/heart-disease/
  /burial-insurance-heart-disease/ → /burial-insurance/heart-disease/
  /burial-insurance-help-with-continence-activities-of-daily-living-adl/ → /burial-insurance/continence-activities-of-daily-living-adl/
  /burial-insurance-help-with-eating-activities-of-daily-living-adl/ → /burial-insurance/eating-activities-of-daily-living-adl/
  /burial-insurance-help-with-toileting-activities-of-daily-living-adl/ → /burial-insurance/toileting-activities-of-daily-living-adl/
  /burial-insurance-help-with-transferring/ → /burial-insurance/transferring-activities-of-daily-living-adl/
  /burial-insurance-hepatitis-b/ → /burial-insurance/hepatitis-b/
  /burial-insurance-hepatitis-c/ → /burial-insurance/hepatitis-c/
  /burial-insurance-high-blood-pressure/ → /burial-insurance/high-blood-pressure/
  /burial-insurance-high-cholesterol/ → /burial-insurance/high-cholesterol/
  /burial-insurance-hospitalized/ → /burial-insurance/hospitalized/
  /burial-insurance-insulin-dependent-diabetics/ → /burial-insurance/insulin-diabetics/
  /burial-insurance-insulin-use/ → /burial-insurance/insulin-diabetics/
  /burial-insurance-kidney-disease/ → /burial-insurance/kidney-disease/
  /burial-insurance-leukemia/ → /burial-insurance/leukemia/
  /burial-insurance-liver-disease/ → /burial-insurance/liver-disease/
  /burial-insurance-lupus/ → /burial-insurance/lupus/
  /burial-insurance-medical-marijuana/ → /burial-insurance/medical-marijuana/
  /burial-insurance-melanoma-skin-cancer/ → /burial-insurance/melanoma-skin-cancer/
  /burial-insurance-muscular-dystrophy/ → /burial-insurance/muscular-dystrophy/
  /burial-insurance-need-help-with-dressing-activities-of-daily-living-adl/ → /burial-insurance/need-help-with-dressing-activities-of-daily-living-adl/
  /burial-insurance-nursing-home-residents/ → /burial-insurance/nursing-home-residents/
  /burial-insurance-on-blood-thinners/ → /burial-insurance/blood-thinner/
  /burial-insurance-paralysis-paralyzed/ → /burial-insurance/paralysis-paralyzed/
  /burial-insurance-peripheral-vascular-disease-pvd-pad/ → /burial-insurance/peripheral-vascular-disease-pvd-pad/
  /burial-insurance-scams/ → /burial-insurance/scams/
  /burial-insurance-scleroderma/ → /burial-insurance/scleroderma/
  /burial-insurance-terminal-illness/ → /burial-insurance/terminal-illness/
  /burial-insurance-wheelchair-users/ → /burial-insurance/wheelchair-users/
  /burial-insurance-with-crohns-disease/ → /burial-insurance/crohns-disease/
  /burial-insurance-with-first-day-coverage/ → /burial-insurance/with-first-day-coverage/
  /burial-insurance-with-no-exam/ → /burial-insurance/life-insurance-no-exam/
  /burial-insurance-with-no-waiting-period/ → /burial-insurance/life-insurance-with-no-waiting-period/
  /burial-insurance-with-prion-disease/ → /burial-insurance/prion-disease/
  /burial-insurance-with-sarcoidosis-3/ → /burial-insurance/sarcoidosis/
  /burial-insurance-with-sarcoidosis/ → /burial-insurance/sarcoidosis/
  /burial-vs-cremation-pros-cons/ → /burial-vs-cremation/
  /cancer-insurance-what-is-it-why-you-need-it/ → /cancer-insurance/
  /colonial-penn-life-insurance-review/ → /colonial-penn-burial-insurance-review/
  /declined-for-life-insurance-what-to-do-now/ → /declined-for-life-insurance/
  /elks-lodge-member-life-insurance/ → /elks-lodge-life-insurance-options/
  /ethos-life-insurance-review-term-life-whole-life-plans/ → /ethos-life-insurance-review/
  /fidelity-life-burial-insurance-review-pros-cons/ → /fidelity-life-burial-insurance-review/
  /final-expense-insurance-for-pastors-and-congregations/ → /burial-insurance/final-expense-insurance-for-pastors-and-congregations/
  /final-expense-life-insurance-no-exam/ → /burial-insurance/life-insurance-no-exam/
  /final-expense-life-insurance-with-cardiomyopathy/ → /burial-insurance/cardiomyopathy/
  /final-expense-life-insurance-with-pre-existing-conditions/ → /final-expense-life-insurance-pre-existing-conditions/
  /foresters-burial-insurance-review-pros-cons/ → /foresters-burial-insurance-review/
  /gerber-guaranteed-issue-life-insurance-review/ → /gerber-life-insurance-review/
  /guaranteed-issue-life-insurance-for-seniors-2/ → /burial-insurance/guaranteed-issue-life-insurance-for-seniors/
  /how-to-apply-for-burial-insurance/ → /burial-insurance/how-to-apply-for-burial-insurance/
  /how-to-pay-for-a-funeral-without-life-insurance/ → /pay-for-a-funeral-without-life-insurance/
  /is-burial-insurance-permanent/ → /burial-insurance/is-burial-insurance-permanent/
  /life-insurance-build-chart/ → /burial-insurance/build-chart/
  /life-insurance-for-dialysis-patients/ → /burial-insurance/dialysis-patients/
  /life-insurance-for-seniors-your-best-option-at-50-to-85-years-old/ → /burial-insurance/life-insurance-for-seniors/
  /life-insurance-policies-with-no-waiting-period-2/ → /burial-insurance/life-insurance-with-no-waiting-period/
  /open-care-seniors-burial-insurance-review-pros-cons/ → /open-care-life-insurance-review/
  /senior-legacy-life-insurance-review/ → /senior-legacy-life-review/
  /senior-life-insurance-company-review/ → /senior-life-insurance-review/
  /term-life-insurance-truckers-2/ → /term-life-insurance-truckers/
  /trinity-life-burial-insurance-review-pros-cons-2/ → /trinity-life-insurance-review/
  /trinity-life-burial-insurance-review-pros-cons/ → /trinity-life-insurance-review/
  /trinity-life-burial-insurance-review/ → /trinity-life-insurance-review/
  /united-heritage-burial-insurance-review-pros-cons/ → /united-heritage-burial-insurance-review/
- **Group E approved and implemented** (Randy, October 2026): 18 of 23 old URLs
  whose own Rank Math rules were trashed on 2026-02-05 (the live site sent them
  to the /search/ catch-all). Includes the 10 renamed categories (consistent
  with the Group F category redirects) and /buried-in-lies-e-book/ (an old
  giveaway book asset of Randy's). Approved mappings:
  /burial-insurance-aneurysm/ → /burial-insurance/aneurysm/
  /burial-insurance-heart-attack/ → /burial-insurance/heart-attack/
  /burial-insurance-with-type-1-diabetes/ → /burial-insurance/diabetes/
  /burial-life-insurance-book/ → /final-expense-life-insurance-book/
  /buried-in-lies-e-book/ → /final-expense-life-insurance-book/
  /category/burial-insurance-cancer/ → /category/cancer-final-expense-whole-life-insurance/
  /category/burial-insurance-company-review/ → /category/company-reviews-final-expense-whole-life-insurance/
  /category/burial-insurance-diabetes/ → /category/diabetes-final-expense-whole-life-insurance/
  /category/burial-insurance-heart-circulatory-conditions/ → /category/heart-issues-final-expense-whole-life-insurance/
  /category/burial-insurance-kidney-conditions/ → /category/kidney-conditions-final-expense-whole-life-insurance/
  /category/burial-insurance-liver/ → /category/liver-conditions-final-expense-whole-life-insurance/
  /category/burial-insurance-lung-respiratory/ → /category/lung-respiratory-conditions-final-expense-whole-life-insurance/
  /category/burial-insurance-neurological-impairments/ → /category/neurological-impairments-final-expense-whole-life-insurance/
  /category/final-expense-whole-life-insurance-company-reviews/ → /category/company-reviews-final-expense-whole-life-insurance/
  /category/heart-circulatory-final-expense-whole-life-insurance/ → /category/heart-issues-final-expense-whole-life-insurance/
  /globe-life-whole-life-insurance-review-pros-cons/ → /globe-life-price-increase/
  /globe-term-life-burial-insurance-review/ → /globe-life-price-increase/
  /globe-whole-life-insurance-review-pros-cons/ → /globe-life-price-increase/
  Intentional real 404s, no redirects (old campaign/workflow URLs): /get-info/, /free-quote-now/, /facebook-quote-request/, /request-quote-compare-rates/, /state-benefits/.
- **Two more approved 301s** (Randy, October 2026):
  /lincoln-heritage-funeral-advantage-review/ →
  /lincoln-heritage-funeral-advantage-review-old/ and /sitemap_index.xml →
  /sitemap-index.xml. vercel.json holds 290 redirects (with /planning-guide/).
- Old WordPress drafts are not restored unless Randy decides so page by page.
  /funeral-expenses-people-overlook/ was consolidated into
  /how-much-does-a-funeral-cost/ (301; draft not restored), and /t2-form-scam/
  into /t2-life-insurance/ (301; draft not restored).
- /mortgage-protection-life-insurance/ is a rewritten, fact-checked article
  Randy approved (October 2026; `source: "new"`), not the old WordPress post.
  Mortgage protection is a legitimate part of the business: present it as a
  reason for buying life insurance, never as a scam. Its contextual link to
  /t2-life-insurance/ waits for that page's pre-launch review.
  /mortgage-protection/ 301s to it (approved; old page not restored); the old quote
  URLs (/mortgage-protection-quote/, /mortgage-protection-2/,
  /mortgage-protection-quoter/) stay retired 404s.
- **T2 is not an insurer or a policy.** A "T2 form" is a lead-generation
  mailer marketed to seniors so it looks tied to a government program or
  special benefit; its purpose is collecting their details for agents selling
  ordinary life insurance. /t2-life-insurance/ must eventually read as an
  article exposing that mailer, not a review of a company or product.
- **Pre-launch content review list** (don't change these until reviewed with
  Randy): /t2-life-insurance/ — check the carrier-style star rating, the
  financial-strength section, the rate-analysis/premium table, any implication
  that T2 sells/issues insurance or that the premiums are T2 rates, claims
  about government affiliation (or its appearance), and regulatory/legal
  claims needing verification or sourcing.
- **Pre-launch content review (migration fidelity)**: these pages show
  substantially less text than their WordPress-export versions (the new pages
  were built from what the live pages display). Don't restore or change them
  until reviewed with Randy: /final-expense-life-insurance-pre-existing-conditions/
  (about 56% of the export text), /trinity-life-insurance-review/ (about 78%),
  /colonial-penn-burial-insurance-review/ (about 82%).
- **Internal-link cleanup done** (Randy, October 2026): every internal link
  now points straight at its final 200 URL (no links through redirects, none
  to intentional 404s). Links to retired pages (whole-life plans, payable-on-
  death, the wp-admin edit link) were unlinked with their text kept; self-links
  were unlinked; the 11 obsolete "READ THE FULL … ARTICLE" buttons on
  /12-step-final-planning-guide/ were removed (weeks 3–12 and the Bible-verses
  button; the planning text stays). "Neuropathy" on /a-z-health/ is plain
  text: don't link generic neuropathy to /burial-insurance/diabetic-neuropathy/
  (/burial-insurance-neuropathy/ stays a real 404). The old Funeral Funds
  consent/disclosure text on the remaining pages is still held until Randy
  decides.
- **Both old PDFs are permanently retired** (Randy, October 2026): the Funeral
  Funds "Funeral & Estate Planning Guide"
  (/wp-content/uploads/2020/01/Funeral-Funds-Funeral-Estate-Planning-Guide.pdf)
  and the Funeral Funds "Final Expense Insurance Buyers Guide"
  (/wp-content/uploads/2025/01/FEX-BUYERS-GUIDE-091024-3.pdf). Never migrate,
  rebuild, rebrand or restore them; their URLs stay real 404s with no
  redirects. /planning-guide/ (the old opt-in page for the planning PDF) is
  retired and 301s to /12-step-final-planning-guide/ (approved); the
  Resources menu item is "FUNERAL PLANNING GUIDE" linking straight to
  /12-step-final-planning-guide/. /buyers-guide/ stays as the HTML article.
  The two cover images (2020/01/Funeral-Funds-Funeral-And-Estate-Planning-Guide.jpg,
  2025/01/FEX-BUYERS-GUIDE-IMAGE*.png) are kept only because they are still the
  og:image/twitter:image and JSON-LD images of /12-step-final-planning-guide/
  and /buyers-guide/; replacing those social/structured-data images needs
  Randy's approval.
- **Funeral Funds branding** (Randy, October 2026): Final Expense Guy was
  previously Funeral Funds of America. Keep the intentional history (the author
  bio "previously known as Funeral Funds of America", /funeral-funds-of-america/,
  press-article titles/URLs, customer reviews verbatim), ordinary "funeral
  funds" wording, and the JSON-LD `alternateName: "Funeral Funds"`. Obsolete
  visible branding was replaced with Final Expense Guy / FEXGuy.com. Still
  pending separate decisions: the Funeral Funds social URLs (footer,
  /buyer-info/, /funeral-relief-program/) until Randy confirms his current
  accounts; the legal pages (/privacy-policy/, /terms-conditions/,
  /terms-of-use/), which need a full rewrite; the Funeral Funds-branded social
  images of /buyers-guide/ and /12-step-final-planning-guide/; the inflation
  chart on /buyers-guide/; the missing /senior-benefits/ brochure; unused
  Funeral Funds files in public/; and the 67 missing image files.
- **Missing images** (October 2026): WordPress lost 68 referenced image files
  (404 on the live site too; not in the media library). Batch 1 fixed the
  article byline/bio logo (now the current wordmark via
  /images/logo/final-expense-guy-logo-*), the JSON-LD worksFor logo (now
  2025/09/FEX-GUY-SQUALE-FB-AD-IMAGE.png), and removed obsolete references
  (12-step "Week" banners, 2021/2022 carrier application screenshots, the
  2018 AARP letter, the Funeral Funds brochure, the Free Funeral For Family
  image, an unidentified Colonial Penn image, and the 2023 kidney-failure
  sample pricing with its intro sentence). Later batches restored the Mutual
  of Omaha logo from the backup, reused 2026/01/Burial-Insurance-With-
  Diabetes-Image.png on /final-expense-life-insurance-diabetics/, removed the
  check-mark graphics, arthritis photo, Jonathan Lawson photo and all carrier
  logos on the top-10 page, and replaced 26 lost header images with new
  illustrations in public/images/articles/ (Randy-approved prompts; built by
  scripts/optimize-article-images.mjs from the original PNGs, which are kept
  outside the repo: <name>.jpg for the fallback and og/twitter/JSON-LD,
  <name>-{800,1200,1600}.{avif,webp} for <picture>). The last one, the 2026
  state-regulated mailer on /burial-insurance/state-regulated-life-insurance/,
  was removed with its metadata (Randy: no generated stand-in for a real
  mailer). npm run verify now reports 0 missing images. Pages left without a
  social image will get a site-wide FEXGuy default social card later.
- Keep pages static. Don't add an SSR adapter, a CSS framework, web fonts, or
  client-side frameworks without a clear reason: speed and Core Web Vitals
  come first.

## Lead system

- One form everywhere: Fillout form `pJBgSNEtN9us` (settings in
  `src/config/lead.ts`). Markup: `src/lib/lead/quote-box.ts`; loader:
  `src/scripts/quote-form.ts` (loads the ~4 MB embed late — keep it that way).
- Sidebar form: frontmatter `sidebar: true` (pages that had the WordPress
  sidebar). In-content form: put `<div data-quote-form></div>` on its own line
  in the page body. At most one form per page.
- Tracking (`src/scripts/tracking.ts`): GA4 `G-JMYZE458HQ` and Meta pixel
  `2351342698972751`, loaded directly — no GTM, Stape, server-side tagging,
  or Conversions API. GA4 `generate_lead` + Meta `Lead` fire only on Fillout's
  verified `form_submit` message; GA4 `click_to_call` on taps of
  `tel:8888629456` (no Meta event for phone taps). Never send personal
  information. Meta Automatic Advanced Matching and automatic event setup
  stay off. Tracking runs only on fexguy.com; elsewhere it logs to the console.
- Phone placements: header nav, CTA bar under the header, pre-footer CTA,
  mobile call button (`src/components/lead/`). No pop-ups.

## Planned: site search (build after the URL/redirect cleanup)

- Randy wants real site search at /search/ (requirement recorded October
  2026; not built yet). It searches the published Astro content (titles and
  body text) and returns relevant existing pages only: never retired URLs,
  404s, drafts, or obsolete workflow/utility pages.
- A search box must be available near the bottom of every page, as on the
  old site.
- The old WordPress/Rank Math behavior that sent missing URLs to /search/ is
  permanently retired and must never be recreated. The migrated /search/ page
  ("SEARCH - 404 REDIRECT") is not content to keep; the new search replaces
  it. Don't retire or redirect /search/ in the meantime.

## Where things go

- Business details, phone, nav menus, footer: `src/config/site.ts`
- Lead form and tracking IDs: `src/config/lead.ts`
- Pages: Markdown files in `src/content/pages/` (path = URL; `index.md` is
  the homepage). Template: `src/content/_templates/page.example.md`.
  Schema: `src/content.config.ts`. Rendered by `src/layouts/ContentLayout.astro`.
- Images: `public/wp-content/uploads/` (original WordPress paths).
- Redirects: `vercel.json` → `redirects`.
- Structured data: migrated pages carry verbatim JSON-LD in frontmatter
  (`jsonLd`). For new pages, builders live in `src/lib/seo/schema.ts`.
- Colors/spacing: CSS custom properties at the top of `src/styles/global.css`.

## Conventions

- Exactly one `<h1>` per page, inside the page body.
- Components that depend on unset config render nothing. Keep that pattern.
- Mobile-first CSS: base styles for small screens, `min-width` queries up.
  Touch targets ≥ 44px (`--tap-target`).
- URLs use trailing slashes (`trailingSlash: 'always'`, matched in vercel.json).

## Before committing

Run `npm run check` and `npm run build`. Both must pass with 0 errors. Then
run `npm run verify` (scripts/check-dist.mjs): it crawls dist/ for internal
links that are broken, go through a redirect or miss the trailing slash, and
for missing image files, split into visible images (`<img>`/srcset) and
metadata (Open Graph, Twitter, JSON-LD). Add `-- --strict` to fail on any.
