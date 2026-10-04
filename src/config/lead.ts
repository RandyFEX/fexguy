// Lead-generation and tracking settings, approved by Randy (October 2026).
// Kept separate from site.ts because client-side scripts import it, and it
// must stay small. See docs in CLAUDE.md ("Lead system") before changing.

export const lead = {
  /** The ONLY phone number presented as a FEXGuy.com contact number.
   * (888-656-4648 is a TV/streaming ad number and never appears on the site.) */
  phone: {
    display: '888-862-9456',
    href: 'tel:8888629456',
    digits: '8888629456',
  },

  /** The single Fillout quote/lead form used everywhere on the site. */
  fillout: {
    formId: 'pJBgSNEtN9us',
    /** Hosted form: the no-JavaScript fallback. */
    publicUrl: 'https://forms.fillout.com/t/pJBgSNEtN9us',
    /** Origin of the embedded form iframe (sender of the form_submit message). */
    embedOrigin: 'https://embed.fillout.com',
    script: 'https://server.fillout.com/embed/v1/',
  },

  tracking: {
    ga4Id: 'G-JMYZE458HQ',
    /** Meta dataset/pixel "FEXGuy Website". */
    metaPixelId: '2351342698972751',
    /** Tracking runs only on these hostnames. Everywhere else (local dev,
     * Vercel previews) events are logged to the console instead. */
    productionHosts: ['fexguy.com', 'www.fexguy.com'],
  },
} as const;
