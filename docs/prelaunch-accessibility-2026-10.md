# Prelaunch accessibility record

Date: October 8, 2026. Build tested: `main` at 0a2aa28 plus the homepage
hero contrast fix (`src/components/home/HomeHero.astro`), served locally
from `dist/` and on https://fexguy.vercel.app (noindex preview).

This records the prelaunch accessibility gate in CLAUDE.md ("Prelaunch
checklist", item 2) and the lead-form test (item 3).

## Automated accessibility

- axe-core 4.10.2, WCAG 2.0 / 2.1 / 2.2 A and AA rules, 1280px viewport.
- 304 of 304 built pages tested: 0 violations.
- axe best-practice rules on all 304 pages: 0 violations.
- axe listed color contrast as "needs review" (not measurable automatically)
  on 287 pages. Each kind was measured from rendered pixels: quote-form
  message box 15.6:1, article FAQ boxes 15.6:1, rate cards 6.95:1, hero
  buttons 6.7:1 or better, hero text as below.
- Automated testing does not establish complete WCAG conformance.

## Semantic review (all 304 pages)

- Exactly one H1 and one `<main>` per page; no skipped heading levels.
- Every image has an alt attribute.
- No positive tabindex; no focusable elements inside `aria-hidden` regions.
- Navigation regions are labelled (Primary, Breadcrumb, table of contents).
- Seven landing/funnel pages have no site header or nav by design:
  /free-quote/, /888-672-0762/, /call-now/, /rates-from-randy/,
  /buyer-info/, /congratulations/, /pricing/.

## Quote form (native Formspark form)

- All six fields have visible labels associated with the field, and are
  marked required ("All fields are required." is shown).
- Each field's error message is linked with `aria-describedby`.
- Submitting the empty form marks all six fields `aria-invalid`, shows a
  specific message under each, and moves focus to First Name. Error text
  contrast is 6.5:1.
- The status message uses `role="status"` with `aria-live="polite"`.
- The spam-trap field is inside `aria-hidden` and has `tabindex="-1"`.
- The form has an accessible name.
- End-to-end lead delivery passed (owner test on
  https://fexguy.vercel.app/free-quote/): validation worked, the form
  submitted, the visitor reached /help/ and Randy received the Formspark
  email. No customer autoresponder exists or is required.

## Manual owner review

- Desktop visual review: passed (homepage, navigation, About, Get a Quote,
  a representative article, the quote page and form).
- Keyboard and navigation: no issue observed.
- Zoom and reflow: no issue observed; content enlarges without overlap, and
  wide tables and charts scroll inside their own area.
- Real phone: passed (homepage, articles, quote experience, navigation);
  wide tables and charts scroll horizontally with a finger, with no
  page-wide sideways scrolling.

## Homepage hero contrast (found and fixed before launch)

The hero places white text over a photograph, so its contrast needed
manual review. Measuring the rendered page showed that, before the fix,
the sunset glare behind the end of the text fell below the WCAG AA
minimum on desktop and tablet:

| Width | Text | Required | Lowest measured before |
|---|---|---|---|
| 1280-1920px | "Protection" (product line) | 3:1 | 2.20-2.29:1 |
| 1920px | "CALL 888-862-9456" button text | 4.5:1 | 3.96:1 |
| 1024px | "Life" (H1), "Protection" | 3:1 | 2.66:1, 2.36:1 |
| 768px | "Life" (H1), "Mortgage" | 3:1 | 2.10:1, 2.22:1 |
| 768px | "CALL 888-862-9456" button text | 4.5:1 | 2.27:1 |

The existing dark overlay gradient was adjusted (tablet and desktop only)
to hold its strength to just past the end of the text before fading over
the couple. Photo, copy, layout and buttons are unchanged.

After the fix, lowest measured contrast (darkest-case pixel behind each
element's text) at each width:

| Width | H1 (3:1) | Product line | CALL button (4.5:1) | GET A QUOTE (4.5:1) |
|---|---|---|---|---|
| 1920px | 8.34:1 | 6.59:1 (needs 3:1) | 8.77:1 | 11.67:1 |
| 1600px | 8.46:1 | 6.08:1 (needs 3:1) | 9.82:1 | 11.67:1 |
| 1280px | 8.45:1 | 5.88:1 (needs 3:1) | 10.01:1 | 11.67:1 |
| 1024px | 8.99:1 | 8.01:1 (needs 3:1) | 9.71:1 | 11.67:1 |
| 768px | 5.65:1 | 4.22:1 (needs 3:1) | 8.15:1 | 11.67:1 |
| 390px | 3.81:1 | 8.10:1 (needs 4.5:1) | 12.26:1 | 11.67:1 |

All hero text meets the applicable WCAG AA contrast threshold at every width
tested (also 320, 360, 480, 600, 720, 900, 1119 and 1120px). Phones were
not changed by the fix; their thinnest margin is the H1 at 320-360px
(lowest pixel 3.35-3.47:1 against 3:1; 98% of the area behind it is
5.2:1 or higher).

## Screen-reader limitation

No usability issue was identified during automated accessibility
scanning, owner keyboard/visual/zoom/mobile testing, and semantic markup
review. Testing by an experienced assistive-technology/screen-reader user
was not performed, so this does not constitute a claim of complete WCAG
conformance.

## Remaining checks after cutover

- One controlled Formspark lead on https://fexguy.com: redirect to /help/,
  email received, GA4 `generate_lead` and Meta `Lead` each fire once
  (tracking runs only on fexguy.com).
- Phone tap on a real phone: GA4 `click_to_call`.

## Launch preparation (October 8, 2026)

- Public launch date: October 8, 2026. The Privacy Policy and Terms of
  Use show "Effective date: October 8, 2026"; their og:updated_time,
  article:modified_time and JSON-LD dateModified are
  2026-10-08T00:00:00-05:00.
- Google Search Console: a Domain property for fexguy.com was verified
  through a Cloudflare DNS TXT record on October 8, 2026. The site needs
  no verification file or meta tag; the old WordPress HTML-file and meta
  methods were not carried over.
- Cloudflare: no CAA records exist for fexguy.com. A DNS export was saved
  before any cutover change. Rollback values: fexguy.com and
  www.fexguy.com are CNAME wp.wpenginepowered.com, DNS only. WP Engine
  stays running as the rollback origin.
- fexguy.vercel.app: `vercel.json` sends `X-Robots-Tag: noindex,
  nofollow` on every response for that host, so it cannot be indexed once
  the production build has indexing enabled.
- Indexing gate: `PUBLIC_ALLOW_INDEXING=true` is set only in the Vercel
  Production environment, at cutover, followed by a fresh production
  build.

Remaining manual cutover steps, in order:

1. Vercel > Settings > Environment Variables: add
   `PUBLIC_ALLOW_INDEXING` = `true`, Production only.
2. Vercel > Deployments: redeploy the current production deployment
   (without the build cache) so the build picks up the variable; check it
   is Ready.
3. Vercel > Settings > Domains: add `fexguy.com` (production) and
   `www.fexguy.com` set to redirect (308) to `fexguy.com`. Note the DNS
   values Vercel shows.
4. Cloudflare > DNS: change only the `fexguy.com` and `www` records to the
   values Vercel shows, DNS only (grey cloud). Leave every other record,
   including the Search Console TXT record, unchanged.
5. Wait until Vercel shows both domains valid with SSL issued, then run
   the post-cutover checks.

Rollback: restore both records in Cloudflare to CNAME
wp.wpenginepowered.com, DNS only.
