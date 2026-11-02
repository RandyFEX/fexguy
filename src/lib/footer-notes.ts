// The footer disclaimer (site.footer.notes in src/config/site.ts) as one
// compact paragraph: every note in its original order, unwrapped from its
// <small> and joined with single spaces, the copyright line last. Used by the
// site footer and the /facebook/ and /free-quote/ footers (Randy, October
// 2026; wording unchanged). Shown at 12px with line-height 1.4.
export function footerDisclaimer(notes: string[]): string {
  return notes.map((html) => html.replace(/^<small>|<\/small>$/g, '').trim()).join(' ');
}
