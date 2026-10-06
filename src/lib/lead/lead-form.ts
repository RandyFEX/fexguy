// Markup for the native FEXGuy lead form (submitted to Formspark). One source
// for every placement: the sidebar box (QuoteBox.astro), the inline box
// (<div data-quote-form></div> in page Markdown, via quote-form-plugin.ts)
// and any component that renders it directly. It replaces the Fillout embed
// when lead.quoteForm is 'formspark' (src/config/lead.ts).
//
// The fields, their order, the button and the consent text reproduce the
// Fillout form pJBgSNEtN9us. Field names are the visible labels, so Randy's
// notification email reads like the form. Without JavaScript the browser
// validates the fields and the form posts straight to Formspark, which sends
// the visitor to /help/ (_redirect); with JavaScript, src/scripts/lead-form.ts
// validates, shows inline errors and submits in the background.
import { lead } from '../../config/lead';

export type LeadFormVariant = 'sidebar' | 'inline';

/** The 50 US states, as on the Fillout form (no DC or territories). */
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

/** A US phone number: 10 digits (area code 2–9), optionally with +1/1, and
 * any common punctuation. The browser checks this without JavaScript; the
 * script applies the same rule (see lead-form.ts). */
export const US_PHONE_PATTERN = String.raw`\s*(\+?1[\s.\-]?)?\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\s*`;

const field = (id: string, label: string, control: string, wide = false) =>
  `<div class="lead-form__field${wide ? ' lead-form__field--wide' : ''}">` +
  `<label class="lead-form__label" for="${id}">${label}</label>` +
  control +
  `<p class="lead-form__error" id="${id}-error" hidden></p>` +
  '</div>';

export function leadFormHtml(variant: LeadFormVariant): string {
  const { endpoint, successPath } = lead.formspark;
  const title =
    variant === 'sidebar' ? '<p class="quote-box__title" id="quote-title">Get a Quote</p>' : '';
  // The titled sidebar box is a named region (landmark); the form itself is
  // named by the same heading there, or by a visually hidden one inline.
  const region = variant === 'sidebar' ? ' role="region" aria-labelledby="quote-title"' : '';
  const formName =
    variant === 'sidebar'
      ? ' aria-labelledby="quote-title"'
      : ' aria-label="Request help from Randy"';
  const states = US_STATES.map((s) => `<option>${s}</option>`).join('');
  const origin = new URL(successPath, 'https://fexguy.com').href;

  return (
    `<div class="quote-box quote-box--${variant} quote-box--native" data-quote-box="${variant}"${region}>` +
    title +
    `<form class="lead-form" id="quote" action="${endpoint}" method="post" data-lead-form${formName}>` +
    '<p class="lead-form__note">All fields are required.</p>' +
    '<div class="lead-form__grid">' +
    field(
      'lf-first',
      'First Name',
      '<input class="lead-form__input" id="lf-first" name="First Name" type="text" autocomplete="given-name" required aria-describedby="lf-first-error">',
    ) +
    field(
      'lf-last',
      'Last Name',
      '<input class="lead-form__input" id="lf-last" name="Last Name" type="text" autocomplete="family-name" required aria-describedby="lf-last-error">',
    ) +
    field(
      'lf-email',
      'Email',
      '<input class="lead-form__input" id="lf-email" name="Email" type="email" autocomplete="email" spellcheck="false" required aria-describedby="lf-email-error">',
    ) +
    field(
      'lf-phone',
      'Phone Number',
      `<input class="lead-form__input" id="lf-phone" name="Phone Number" type="tel" inputmode="tel" autocomplete="tel-national" pattern="${US_PHONE_PATTERN}" required aria-describedby="lf-phone-error">`,
    ) +
    field(
      'lf-state',
      'State',
      `<select class="lead-form__input lead-form__select" id="lf-state" name="State" autocomplete="address-level1" required aria-describedby="lf-state-error"><option value="">Select your state</option>${states}</select>`,
      true,
    ) +
    field(
      'lf-help',
      'What can Randy help you with?',
      '<textarea class="lead-form__input lead-form__textarea" id="lf-help" name="What can Randy help you with?" rows="4" required aria-describedby="lf-help-error"></textarea>',
      true,
    ) +
    '</div>' +
    // Spam trap: Formspark discards any submission with _honeypot filled in.
    // Hidden from everyone (not just visually), so people never fill it in.
    '<div class="lead-form__trap" aria-hidden="true">' +
    '<label for="lf-hp">Leave this field empty</label>' +
    '<input id="lf-hp" name="_honeypot" type="text" tabindex="-1" autocomplete="off">' +
    '</div>' +
    // Without JavaScript, Formspark sends the visitor here after submitting.
    `<input type="hidden" name="_redirect" value="${origin}">` +
    '<button class="btn btn--primary btn--block lead-form__submit" type="submit">YES, I WANT HELP!</button>' +
    '<p class="lead-form__status" role="status" aria-live="polite" tabindex="-1" data-lead-status></p>' +
    '<p class="lead-form__consent">Submit to give Randy permission to call, text, or email you. Msg &amp; data rates may apply. No purchase required.</p>' +
    `<p class="lead-form__call">Prefer to talk? Call Randy at <a class="lead-form__phone" href="${lead.phone.href}">${lead.phone.display}</a></p>` +
    '</form>' +
    '</div>'
  );
}
