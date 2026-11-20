// The state-regulated life insurance investigation (Randy, November 2026):
// served by src/pages/burial-insurance/state-regulated-life-insurance.astro
// (it replaced the migrated article at that established URL) and shown on the
// noindex review copy /state-regulated-investigation-preview/. The H1 is
// Randy's approved title, used by the page and by the build's page index
// (hub links and Related Topics read a page's H1 from there).
export const INVESTIGATION = {
  path: '/burial-insurance/state-regulated-life-insurance/',
  h1: 'State-Regulated Life Insurance Scam Exposed (2027 Update)',
  /** The URL's existing approved meta description (kept from the migrated page). */
  description: 'Got a state-regulated program or Benefit Information for State Citizens Only mailer? Here’s what regulators found and what to know before you reply.',
  /** The investigation's official publication date (Randy, V12.5). */
  published: '2026-11-20',
  /** Social image: the first annotated mailer (existing asset). */
  image: { path: '/images/mailers/2026-f2-benefit-information-mailer-redacted.jpg', width: 1496, height: 627 },
} as const;
