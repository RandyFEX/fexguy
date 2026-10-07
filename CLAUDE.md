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
  /do-not-sell/ (never rebuilt in the new site), and (Randy, October 2026)
  /gtl/ (reproduced Guarantee Trust Life application/e-consent forms; the GTL
  review article stays), and /senior-dollar/ (Randy, October 2026: Senior
  Dollar is no longer an active project; real 404, no redirect unless a future
  business decision changes that).
- **/reviews/ restored** (Randy, October 2026; reverses the earlier decision
  to retire it): the 476 client reviews published on the WordPress /reviews/
  page were preserved word for word in data/customer-reviews.json (with
  source, capture method and the published numbering anomalies in "notes")
  and data/customer-reviews.csv (Randy's spreadsheet copy). src/pages/
  reviews.astro renders them from the JSON. Never edit, reword, renumber,
  date, rate (no stars) or add review/aggregate-rating schema to them; the
  hotlinked Google Docs images on the old page were not kept.
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
  /category/burial-insurance-cancer/ → /burial-insurance/cancer/
  /category/burial-insurance-company-review/ → /a-z-companies/
  /category/burial-insurance-diabetes/ → /burial-insurance/diabetes/
  /category/burial-insurance-heart-circulatory-conditions/ → /burial-insurance/heart-conditions/
  /category/burial-insurance-kidney-conditions/ → /burial-insurance/kidney-disease/
  /category/burial-insurance-liver/ → /burial-insurance/liver-disease/
  /category/burial-insurance-lung-respiratory/ → /burial-insurance/respiratory-lung-conditions/
  /category/burial-insurance-neurological-impairments/ → /burial-insurance/neurological-disorders/
  /category/final-expense-whole-life-insurance-company-reviews/ → /a-z-companies/
  /category/heart-circulatory-final-expense-whole-life-insurance/ → /burial-insurance/heart-conditions/
  /globe-life-whole-life-insurance-review-pros-cons/ → /globe-life-price-increase/
  /globe-term-life-burial-insurance-review/ → /globe-life-price-increase/
  /globe-whole-life-insurance-review-pros-cons/ → /globe-life-price-increase/
  Intentional real 404s, no redirects (old campaign/workflow URLs): /get-info/, /free-quote-now/, /facebook-quote-request/, /request-quote-compare-rates/, /state-benefits/.
  The 10 category mappings above originally ended at the /category/ archives;
  they were repointed straight to the hubs when the archives were retired
  (see "Legacy archives retired" below).
- **Legacy archives retired** (Randy, October 2026): the frozen WordPress
  archive snapshots are not part of the site's architecture.
  - /blog/ and /blog/page/2/–/9/ stay built (200, self-canonical) but are
    `robots: "noindex, follow"` with `sitemap: false` (which also keeps them
    out of llms.txt and site search). Not `noindex: true`: that flag drops the
    canonical tag (Seo.astro). Don't link them or redirect/404 them without
    Randy's approval.
  - The 11 /category/ archive pages were removed and 301 straight to their
    hubs (one hop): cancer-final-expense-whole-life-insurance →
    /burial-insurance/cancer/; company-reviews-final-expense-whole-life-insurance
    (and its /page/2/) → /a-z-companies/; diabetes-… → /burial-insurance/diabetes/;
    heart-issues-… (and its /page/2/) → /burial-insurance/heart-conditions/;
    kidney-conditions-… → /burial-insurance/kidney-disease/; liver-conditions-…
    → /burial-insurance/liver-disease/; lung-respiratory-conditions-… →
    /burial-insurance/respiratory-lung-conditions/; neurological-impairments-…
    → /burial-insurance/neurological-disorders/ (each "…" is
    -final-expense-whole-life-insurance); /category/term-life-insurance/ →
    /term-life-insurance-guide-everyone/.
  - Every older redirect that ended at those archives now goes straight to the
    hub: the 10 Group E category mappings (above) and 4 Group F pagination
    redirects: /category/burial-insurance-company-review/page/2/, /page/3/ and
    /page/4/ → /a-z-companies/;
    /category/burial-insurance-neurological-impairments/page/3/ →
    /burial-insurance/neurological-disorders/.
- **Two more approved 301s** (Randy, October 2026):
  /lincoln-heritage-funeral-advantage-review/ →
  /lincoln-heritage-funeral-advantage-review-old/ and /sitemap_index.xml →
  /sitemap-index.xml. vercel.json holds 308 redirects (with the 11 retired
  /category/ archives, the cremation-cost consolidation, /planning-guide/,
  /terms-conditions/ → /terms-of-use/, and the five retired legacy quote
  landing pages /start/, /free-quote-fb/, /facebook-1/, /lowest-rates/ and
  /facebook-2/ → /free-quote/, Randy, October 2026). /free-quote/ is the only quote landing
  page (linked from the homepage); new term-insurance landing pages come later.
- Old WordPress drafts are not restored unless Randy decides so page by page.
  /funeral-expenses-people-overlook/ was consolidated into
  /how-much-does-a-funeral-cost/ (301; draft not restored), and /t2-form-scam/
  into /t2-life-insurance/ (301; draft not restored).
- **Cremation-cost pages consolidated** (Randy, October 2026):
  /cremation-cost-and-info/ is the site's cremation-cost article (title "How
  Much Does Cremation Cost? Complete 2026 Guide" and a new description,
  Randy's wording; the "97% of families" claim is gone). /how-much-cremation-cost/
  (weaker duplicate; no content carried over) was removed and 301s to it, as do
  /how-much-does-cremation-cost/ and /how-much-does-cremation-cost-od/ (one hop).
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
- **/t2-life-insurance/ rewritten** (Randy, October 2026; `source: "new"`, on
  ArticleLayout under Burial Insurance): now a sourced explainer of the T2/T-2
  mailer ("What Is the T2 Life Insurance Form?"), built from Randy's research
  (Nebraska DOI 2022 presentation showing a real "T-2" card, Iowa Insurance
  Division 2020 release, DC DISB warning about an "F-1" mailer, DMAchoice FAQ).
  The old star rating, rate table, carrier-review sections, unsupported
  figures, FAQPage JSON-LD and AI-generated "sample" image were removed. No
  source explains what "T-2" stands for: don't add one. Linked from
  /burial-insurance/state-regulated-life-insurance/; not in /a-z-companies/.
  The unused T2 image files remain in public/wp-content/uploads/2026/01/.
- **/children-grandchild-policies/ rewritten** (Randy, October 2026; `source:
  "new"`, top-level, not Burial Insurance): "Life Insurance for Children and
  Grandchildren", built from Randy's carrier research (Gerber Grow-Up Plan,
  Mutual of Omaha/United of Omaha Children's Whole Life) and 34 CFR 685.212.
  Product features (doubling, guaranteed purchase, ownership age) are stated
  per product, never as universal. No blanket consent rule: whether a parent
  or guardian must sign depends on the insurer and state law (the same
  correction was made on /burial-insurance/on-someone-else/, which links to it).
- **/funeral-funds-of-america/ rewritten** (Randy, October 2026; `source:
  "new"`, simple content layout): a short brand-transition notice, "Funeral
  Funds of America Is Now Final Expense Guy" (2015 start, funeralfunds.com,
  2025 rebrand, same owner, DBA of Saturn Street, LLC, "licensed in most
  states", 888-862-9456). No service list, customer counts or licensing
  history. /about/ links to it; it links back to /about/.
- **/iul-book/iul-church-members-faith-based-communities/ rewritten** (Randy,
  October 2026; `source: "new"`, IUL Playbook section): "IUL for Church
  Members: What to Know About Faith-Based IUL Pitches", built from Randy's
  source packet (NAIC life insurance illustrations page, IRS Pub. 525, the
  IRS life insurance proceeds FAQ, Rev. Rul. 2007-38 in IRB 2007-25). It
  separates the product, the strategy and the religious framing; never
  implies churches or pastors generally promote IUL. The old "IRS Position"
  tables, complaint-index, lawsuit, "financial ambassador", SEC/FINRA and
  "every dollar borrowed is taxable" claims, the FAQ and the Scripture were
  removed. Linked once from /iul-book/ Chapter 6 (end of "What the Seminar
  Circuit Doesn't Tell You"); it is not a Chapter 24 entry (church membership
  is not a profession).
- **Migration-fidelity review CLOSED** (Randy, October 2026): three pages
  once flagged as showing much less text than their WordPress-export versions
  were each verified against their published WordPress export item, and no
  substantive article restoration is required. The earlier figures were
  measurement errors: the comparison counted WordPress inline CSS, chart
  script and chart markup as article text. Leave the pages as they are:
  /final-expense-life-insurance-pre-existing-conditions/ (item 64174; "about
  56%"; every paragraph and all 27 condition tables preserved essentially
  100%), /trinity-life-insurance-review/ (item 63982; "about 78%"; all 24
  sections and the 12-question FAQ preserved 100%) and
  /colonial-penn-burial-insurance-review/ (item 64129; "about 82%"; all 10
  sections, the unit-value table, the case stories and the 8-question FAQ
  preserved essentially 100%). On all three only the empty "Funeral Cost
  Percentage Breakdown" chart and its heading were retired (and on Colonial
  Penn the two lost image files, removed earlier). Never incorporate the
  unpublished drafts 62623 (Trinity "2026 Guide"), 62639 (Colonial Penn "2026
  Guide") or 51683 (Colonial Penn whole life, 2022), or the old TablePress
  pricing tables.
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
  The planning-guide cover image (2020/01/Funeral-Funds-Funeral-And-Estate-Planning-Guide.jpg)
  is kept only because it is still the og:image/twitter:image and JSON-LD
  image of /12-step-final-planning-guide/; replacing that social/structured-data
  image needs Randy's approval.
- **/buyers-guide/ updated and migrated** (Randy, October 2026): it uses the
  standard shared ArticleLayout, section Burial Insurance (Home › Burial
  Insurance › Buyers Guide). Before migration: the Funeral Funds-branded
  buyers-guide cover (2025/01/FEX-BUYERS-GUIDE-IMAGE*.png) was removed as its
  og:image/twitter:image and JSON-LD image and not replaced (the page has no
  social image; the files stay in public/, unreferenced); the Funeral
  Funds-branded 2019 inflation chart and its introducing sentence were
  removed; the minimal current-business wording corrections were made (Randy,
  not "our Advisors"/"our agents"; no 24-hour results promise); and the three
  remaining body images got descriptive alt text. Its migrated dates
  (2021-06-02, 2025-03-19) are kept. Broader cleanup (title, all-caps
  headings, tone, carrier verdicts, old screenshots, the "quoting tool" and
  "few minutes" lines, Adviser/Advisor labels) waits for the later content
  audit.
- **Funeral Funds branding** (Randy, October 2026): Final Expense Guy was
  previously Funeral Funds of America. Keep the intentional history (the author
  bio "previously known as Funeral Funds of America", /funeral-funds-of-america/,
  press-article titles/URLs, customer reviews verbatim), ordinary "funeral
  funds" wording, and the JSON-LD `alternateName: "Funeral Funds"`. Obsolete
  visible branding was replaced with Final Expense Guy / FEXGuy.com. The
  Funeral Funds social links were removed and the legal pages rewritten
  (October 2026; see "Business identity, legal pages and privacy"). Still
  pending separate decisions: the Funeral Funds-branded social
  image of /12-step-final-planning-guide/; the missing /senior-benefits/ brochure; unused
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

## Business identity, legal pages and privacy (Randy, October 2026)

- Legal business: **Saturn Street, LLC, DBA Final Expense Guy** — used on the
  legal pages and (Randy, October 2026) on /funeral-funds-of-america/ only. The public brand stays Final Expense Guy / FEXGuy.com.
- Published contact details: website https://fexguy.com, phone 888-862-9456,
  mailing address **2300 Olympia Drive #270179, Flower Mound, TX 75027** (no
  "Dallas, TX Area" on the address; the old "PO Box 270179" form is retired).
  **Never publish an email address** (also not for privacy requests).
- **No published business/office hours** anywhere (content, footer, schema,
  metadata), and no "24/7" or other availability promise instead.
- **Licensing wording:** Randy no longer holds licenses in all 50 states. The
  approved public wording is "Licensed in most states." Never write "licensed
  in all 50 states" (or similar) about Randy/Final Expense Guy; don't publish a
  list of states unless Randy asks (the old 50-state lists on /about/ and
  /licenses/, and the /about/ JSON-LD `providesServiceIn` list, were
  removed). /licenses/ shows only the NPN (17792459) and Randy's Texas
  resident Life & Health license number (2050599). Current licensing/availability claims must reflect the present;
  truthful historical statements ("I've helped families in all 50 states",
  "Randy's nationwide licenses carried over" on /funeral-funds-of-america/)
  may stay. Insurance companies' own licensing in reviews is unaffected.
- **No social-media links** on the site for now (footer `social: []`); the old
  Funeral Funds profiles were removed and not replaced with FEXGuy ones.
  JSON-LD `sameAs` on Randy's Person entity keeps his current profiles
  (LinkedIn, X, Facebook randyvandervaate.lifeinsurance, Instagram, Medium,
  Flipboard) and youtube.com/@FEXGUY, plus press-article URLs — no visible
  buttons. No Funeral Funds business accounts there. The leftover WordPress
  "wpengine" author entity (and its wpengine.com sameAs) was removed from
  /about/ and /contact/ JSON-LD.
- **No third-party video embeds** (YouTube, Vimeo, Adilo) — all removed with
  their VideoObject schema and og:video tags.
- /privacy-policy/ and /terms-of-use/ were rewritten (`source: "new"`) to
  describe the actual site and practices: Fillout form fields, CRM contents
  (no SSNs or banking data; the CRM vendor is not named), indefinite record
  retention, Randy's own calls (no AI or prerecorded calls), automated texts
  and emails with STOP/unsubscribe, no lead selling, carrier sharing, the
  occasional specialist agent (client told first), GA4 and Meta settings, and
  site-search privacy. /terms-of-use/ is the only Terms page and holds the
  accessibility statement; /terms-conditions/ 301s to it. Don't add legal
  promises or facts Randy hasn't provided.
- Standard form disclosure, exactly: "Submit to give Randy permission to
  call, text, or email you. Msg & data rates may apply. No purchase
  required." It lives inside the Fillout form (edited in Fillout, not in this
  repo; Randy updated it October 2026). Don't duplicate it on the page and
  don't add Privacy/Terms links under forms just for it (they're in the
  footer). Don't hack Fillout's iframe internals from Astro.
- GA4 property settings (verified by Randy): Google Signals off,
  user-provided data off, optional enhanced measurement off, email redaction
  on, q/s URL-parameter redaction on, 14-month retention, no Google Ads links.
  Retired Meta Pixel IDs 1757709920950272 and 422716154769594 must never
  return.
- **Search-term privacy:** search terms (?q= / ?s=) must never reach GA4 or
  Meta. An inline script at the top of BaseLayout's <head> removes q and s
  from the address bar before any tracking runs (on /search/ the term moves
  into `history.state` for `src/scripts/search.ts`); tracking.ts also passes
  GA4 a sanitized page_location/page_referrer and skips the Meta Pixel on any
  page view whose URL or referrer still carries q/s. Keep the term out of
  the URL, page title and anything sent to a third party.

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

## Site search (Pagefind, built October 2026)

- /search/ is `src/pages/search.astro` + `src/scripts/search.ts`; the index
  is built by `pagefind` after `astro build` (`npm run build`; config in
  `pagefind.yml`) into dist/pagefind/. Queries use `/search/?q=term`; the old
  WordPress `?s=term` also works. For privacy the term is then removed from
  the address bar (kept in `history.state`, so reload and back/forward still
  work; see "Search-term privacy" above).
  Don't add a redirect for `/?s=`. Results: H1, URL path, highlighted
  excerpt, by relevance, 10 at a time with "Show more". Empty query shows
  the Resources-menu guides; no results shows tips, the guides and the
  888-862-9456 call button. No GA4/Meta events for search.
- What is indexed: only the H1 and article body (`data-pagefind-body` on the
  ContentLayout prose), never nav, footer, sidebar, quote forms or CTAs.
  Which pages: `isSearchable()` in `src/lib/pages.ts` — content pages that
  are not draft, noindex, `sitemap: false`, landing layout or /category/
  archives. Frontmatter `search: true|false` overrides it (Randy, October
  2026): `search: true` on /12-step-final-planning-guide/ (stays noindex for
  Google); `search: false` on /lbl/, /forms/, /privacy-policy/,
  /funeral-relief-program/, /senior-benefits/, /welcome/. Redirected,
  retired and 404 URLs have no page, so they can't be indexed.
- /search/ is `noindex, follow` (production), not in the sitemap, llms.txt
  or the index. A plain HTML search form sits at the bottom of the normal
  footer (not on landing pages).
- The old WordPress/Rank Math behavior that sent missing URLs to /search/ is
  permanently retired and must never be recreated: no redirect, rewrite or
  404 handler may point to /search/ (`npm run verify` fails on such a
  redirect).

## Where things go

- Business details, phone, nav menus, footer: `src/config/site.ts`
- Lead form and tracking IDs: `src/config/lead.ts`
- Pages: Markdown files in `src/content/pages/` (path = URL; `index.md` is
  the homepage). Template: `src/content/_templates/page.example.md`.
  Schema: `src/content.config.ts`. Rendered by `src/layouts/ContentLayout.astro`.
- Images: `public/wp-content/uploads/` (original WordPress paths).
- Redirects: `vercel.json` → `redirects`.
- Structured data: migrated pages carry verbatim JSON-LD in frontmatter
  (`jsonLd`), printed as-is. Pages on the article template (ArticleLayout)
  instead emit one shared graph from `src/lib/seo/schema.ts` (canonical
  Organization, WebSite and Randy Person; WebPage, Article, BreadcrumbList from
  the visible H1 and breadcrumbs); their frontmatter `jsonLd` is not printed
  and only supplies the migrated dates (never build time). No FAQPage, sameAs,
  credentials or other schema is generated.
- Colors/spacing: CSS custom properties at the top of `src/styles/global.css`.
- Quick Answers (ArticleLayout): the `quickAnswer` field in
  `src/config/article-pages.ts`, rendered by ArticleSummary above the Bottom
  Line (not in schema or the search index). Randy's wording, or a summary of
  that article's own text that Randy approved (October 2026: COPD, a 10-page
  pilot, then the 152 audited GREEN pages). The article is the source of
  truth: no outside facts, no added or removed qualifiers, same certainty
  (can/may/most/often/usually/will), every sentence supported by the page.
  Don't add one to a page whose article contradicts itself on its main
  question (the audit's FLAG list) until Randy resolves the conflict; no
  Quick Answer on /a-z-health/, /a-z-companies/, and (held by Randy)
  /mortgage-protection-life-insurance/, /buyers-guide/,
  /mutual-of-omaha-burial-insurance/.

## Conventions

- Exactly one `<h1>` per page, inside the page body.
- Components that depend on unset config render nothing. Keep that pattern.
- Mobile-first CSS: base styles for small screens, `min-width` queries up.
  Touch targets ≥ 44px (`--tap-target`).
- URLs use trailing slashes (`trailingSlash: 'always'`, matched in vercel.json).

## Accessibility (WCAG 2.2 Level AA is a mandatory target)

- Every new or changed template, component and page must target WCAG 2.2 AA.
  The accessibility statement on /terms-of-use/ states the commitment; never
  claim "fully compliant" / "100% ADA compliant".
- Reusable components already handle: skip link, landmarks, labelled search
  forms, a high-contrast two-tone focus ring (global.css `--color-focus`),
  focus kept clear of the mobile call bar (`--call-sticky-h`,
  src/scripts/sticky-call.ts), keyboard-focusable scrolling tables
  (src/scripts/scroll-tables.ts), focus kept on the quote box when the
  Fillout embed replaces its button, and a meaningful Fillout iframe title.
- Heading outline: one H1 per page (landing pages without a visible headline
  use `<h1 class="visually-hidden">` from the page title); no skipped
  levels. When a migrated heading's level is raised to repair the outline,
  add `as-hN` (global.css) so it keeps its original look.
- Automated checks (axe-core) never prove conformance. Don't merge to main
  on automated results alone.

## Prelaunch checklist (mandatory before the new site goes live)

1. Set the Privacy Policy and Terms of Use effective dates to the actual
   publication date (replace "To be set at launch" on both pages;
   `npm run verify` lists them as `[prelaunch]` until done). Update those
   pages' dateModified / article:modified_time metadata at the same time.
2. Accessibility gate — all of these, with results recorded:
   1. automated accessibility testing (axe-core or equivalent, all pages);
   2. keyboard-only testing;
   3. focus order and focus visibility testing;
   4. zoom/reflow testing (200% text, 400% zoom / 320px width);
   5. screen-reader and semantic review;
   6. form testing (the Fillout form, site search, footer search);
   7. remediation of every identified issue;
   8. a final re-test.
3. Fillout form (third-party iframe; Fillout itself is not proven WCAG 2.2
   AA) — manual test and record: keyboard entry into and exit out of the
   form, visible field labels, validation/error messages, focus order, zoom
   behavior, contrast, and screen-reader behavior.

## Post-launch notes

- Review the former video locations (the 13 pages whose YouTube/Vimeo/Adilo
  embeds were removed in October 2026) and identify pages where new
  FEXGuy-branded videos would materially improve the page.
- **Post-migration SEO/compliance review list** (existing wording carried
  over verbatim from WordPress; don't change it until reviewed with Randy):
  - /trinity-life-insurance-review/: the meta description (also
    og:description and twitter:description), "Trinity Life Burial Insurance
    Review guarantees you the best cremation, final expense, or life
    insurance pricing - 99% discount rate!" ("guarantees you the best",
    "99% discount rate").
  - /colonial-penn-burial-insurance-review/:
    - aggressive title/meta wording ("It's Really Bad"; "now the worst life
      insurance plan senior citizens could ever buy") and scam wording (the
      "IS COLONIAL PENN $9.95 A SCAM?" verdict section);
    - the undated Colonial Penn unit-value/rate table ("According to Colonial
      Penn's official rate chart…", ages 50–80);
    - current A.M. Best, BBB and other carrier-rating claims (A (Excellent)
      "which is average"; Mutual of Omaha and Aetna "A- or A+"; BBB A+);
    - BBB/NAIC complaint claims, including the inconsistent "hundreds of
      complaints" vs "thousands of reviews and complaints";
    - the NAIC "complaint index higher than the industry average" claim;
    - undated premium/rate examples ($41 vs about $79.60, $71, $179.10 for 18
      units, "$60 to $120… even over $200");
    - the 7% refund-interest statement;
    - the "10-30% refund of premium interest rates" statement about other
      companies;
    - the absolute "Guaranteed-issue life insurance like Colonial Penn's
      should never be an option";
    - the Frank, Linda and "Accidental Coverage Wasn't the Plan" case
      stories: confirm they are genuine client experiences or label them
      appropriately;
    - current "A-rated" / "top-rated carrier" claims (e.g. Trinity Life,
      Family Benefit Life).
  - /about/: "main office located in the Dallas, TX area" (the "Dallas, TX
    Area" form is retired for the published address) and "I work with
    strategic A+ rated insurance companies" (a rating claim).

## Post-redesign cleanup notes

Found during the October 2026 homepage redesign; don't fix until Randy
schedules the cleanup.

- /aflac-burial-insurance-review/: the H1 is correct (Aflac), but the title,
  meta description and og:/twitter: title and description still carry the
  Aetna review's text ("Aetna Burial Insurance Review - [Pros, Cons, Pricing
  Secrets]"), and the meta description makes an unacceptable claim:
  "…guarantees you the best cremation, final expense, or life insurance
  pricing - 99% discount rate!"
- /a-z-companies/ omits CICA Life and Aflac, although both review pages are
  kept (/cica-life-burial-insurance-review/, /aflac-burial-insurance-review/).

## Before committing

Run `npm run check` and `npm run build`. Both must pass with 0 errors. Then
run `npm run verify` (scripts/check-dist.mjs): it crawls dist/ for internal
links that are broken, go through a redirect or miss the trailing slash, and
for missing image files, split into visible images (`<img>`/srcset) and
metadata (Open Graph, Twitter, JSON-LD). It also checks the search index:
the pages marked for Pagefind must match `isSearchable()` and the Pagefind
page count; /search/ must be noindex, out of the sitemap/llms.txt and never
a redirect destination. Redirects must not chain, shadow a built page or
point to a missing page, and content guards fail on 888-656-4648, retired
Meta Pixel IDs, video embeds, Funeral Funds social links, a FEXGuy email
address, "licensed in all 50 states" about Randy, office hours, the old PO
Box or old consent wording (the GA4/Meta IDs must still be present), and
/gtl/ must stay a real 404 (not built, not redirected). Add `-- --strict` to fail on any.
