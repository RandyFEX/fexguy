// Pages outside the article template (rendered by ContentLayout) whose body
// is article content. They follow the article heading standard: body H2-H6
// display in ALL CAPS (global.css, `.page--article`). About, legal, form,
// contact and other utility or landing pages are deliberately not listed,
// so they keep their own typography (Randy, October 2026).
export const contentArticles: ReadonlySet<string> = new Set([
  '/12-step-final-planning-guide/',
  '/colonial-penn-burial-insurance-review/',
  '/colonial-penn-two-year-wait/',
  '/final-expense-life-insurance-book/',
  '/iul-book/',
]);
