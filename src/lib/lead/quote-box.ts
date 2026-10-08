// Markup for the quote box that holds the Fillout form. One source for both
// placements:
//  - "sidebar": the right-hand sidebar on former WordPress sidebar pages
//    (rendered by ContentLayout via QuoteBox.astro);
//  - "inline": inside page content, wherever a page's Markdown has
//    <div data-quote-form></div> (replaced at build time by
//    quote-form-plugin.ts).
//
// The box is a lightweight placeholder. src/scripts/quote-form.ts swaps in
// the real Fillout embed later (inline: when it nears the screen; sidebar:
// after the page has loaded and the browser is idle, when it nears the
// screen; either: immediately on click). Without JavaScript the button opens
// the hosted Fillout form. All visible text is copy from the live site.
//
// With lead.quoteForm set to 'formspark' (the default), the native FEXGuy
// form (lead-form.ts) is rendered instead and none of the Fillout code runs:
// the native box has no [data-quote-slot], so quote-form.ts does nothing.
import { lead } from '../../config/lead';
import { leadFormHtml } from './lead-form';

export type QuoteBoxVariant = 'sidebar' | 'inline';

export function quoteBoxHtml(variant: QuoteBoxVariant): string {
  if (lead.quoteForm === 'formspark') return leadFormHtml(variant);
  const title =
    variant === 'sidebar' ? '<p class="quote-box__title" id="quote-title">Get a Quote</p>' : '';
  // aria-labelledby needs a role on a <div>: the titled sidebar box is a named
  // region (landmark) for screen-reader users.
  const labelledBy = variant === 'sidebar' ? ' role="region" aria-labelledby="quote-title"' : '';
  return (
    `<div class="quote-box quote-box--${variant}" id="quote" data-quote-box="${variant}"${labelledBy}>` +
    title +
    '<div class="quote-box__slot" data-quote-slot>' +
    `<a class="btn btn--primary quote-box__open" href="${lead.fillout.publicUrl}" data-quote-open>GET QUOTES NOW</a>` +
    `<a class="quote-box__phone" href="${lead.phone.href}">${lead.phone.display}</a>` +
    '</div>' +
    '</div>'
  );
}
