// Explicit table-of-contents labels, by page and section id, for headings
// whose stored text can't be turned into Title Case safely (headings stored
// in capitals). Each label is the heading's own wording in Title Case,
// written by hand so names and acronyms stay right. The article heading
// itself is unchanged; ArticleToc fails the build on an ALL CAPS heading
// with no label here (src/lib/article/title-case.ts).
export const TOC_LABELS: Record<string, Record<string, string>> = {
  // Migrated headings stored in capitals (Randy, October 2026).
  '/colonial-penn-burial-insurance-review/': {
    'h-why-colonial-penn-is-a-bad-deal-for-most-people': 'What Is Colonial Penn’s $9.95 Life Insurance Plan?',
    'how-much-coverage-do-you-really-get-for-9-95': 'How Much Coverage Do You Really Get for $9.95?',
    'does-colonial-penn-have-a-waiting-period': 'Does Colonial Penn Have a Waiting Period?',
    'colonial-penn-background-and-financial-ratings': 'Colonial Penn Background & Financial Ratings',
    'colonial-penn-complaints-and-consumer-reviews': 'Colonial Penn Complaints and Consumer Reviews',
    'who-is-the-colonial-penn-9-95-plan-good-for': 'Who Is the Colonial Penn $9.95 Plan Good For?',
    'better-alternatives-to-colonial-penn': 'Better Alternatives to Colonial Penn',
    'how-to-compare-final-expense-policies-properly': 'How to Compare Final Expense Policies Properly',
    'final-verdict-is-colonial-penn-9-95-a-scam': 'Final Verdict – Is Colonial Penn $9.95 a Scam?',
    'frequently-asked-questions-colonial-penn-9-95-life-insurance': 'Frequently Asked Questions: Colonial Penn $9.95 Life Insurance Review',
  },
};
