# E. Website Implementation Specification

**Guide:** One Last Amazing Adventure: The Most Beautiful Places to Scatter Ashes Along the Appalachian Trail
**Site:** FuneralFunds.com (Astro, static output, Vercel)
**Status:** specification only. Nothing in this package has been built, merged or deployed.

## 1. Page, address and metadata

| Item | Value |
|---|---|
| Proposed URL | `/scattering-ashes-on-the-appalachian-trail/` (descriptive; matches `/scattering-ashes-in-us-national-parks/` and `/scattering-ashes-from-a-cruise-ship/`). Randy decides the final URL. |
| Page file | `src/pages/scattering-ashes-on-the-appalachian-trail.astro` |
| Data | `src/data/appalachian-trail/destinations.json` (built from `A-master-research-dataset.csv`), `src/data/appalachian-trail/regulations.json`, `src/data/appalachian-trail/image-rights.json` |
| Images | `public/images/appalachian-trail/<state>/<destination-id>.{jpg,webp}`, 1200 px wide, JPEG quality 82 progressive and WebP quality 80, the same as the national parks guide |
| H1 | "Scattering Ashes Along the Appalachian Trail" with "One Last Amazing Adventure" as the subtitle line (the pattern Randy approved for the national parks guide). Final wording is Randy's. |
| Title / description | Randy's wording (to be supplied). The build uses `pageTitle()` from `src/lib/seo/meta.ts`. |
| Preview status | `robots="noindex, nofollow"`, out of the sitemap (exclusion in `astro.config.mjs`), an `X-Robots-Tag: noindex, nofollow` header in `vercel.json`, not linked from the menu, until Randy approves publication. |
| Page classification | `data-page-type="guide"` with a `data-page-reason`, like the national parks guide. |

## 2. Reuse, do not reinvent

Build it as a sibling of the national parks guide (`src/pages/scattering-ashes-in-us-national-parks.astro`, data in `src/data/last-adventure/`). Reuse its:

- hero layout (photo, H1, subtitle, credit line) and the phone hero spacing fix;
- A to Z and state navigation buttons and "Back to State Navigation" buttons;
- destination card, plan grid, scattering panel, GPS rows with "Open in Google Maps" links (`mapsUrl()`), official links list;
- placeholder panel for destinations without a rights-verified photograph;
- credits line and footer pattern, including "This guide is not affiliated with, endorsed by or sponsored by the National Park Service." Extend it to the Appalachian Trail Conservancy and the other land managers: "This guide is not affiliated with, endorsed by or sponsored by the National Park Service, the USDA Forest Service, the Appalachian Trail Conservancy or any state agency."

Do not change the national parks guide, the cruise guide, the site header, menu, footer, quote widgets or any shared component behavior. If a shared component needs a new option, add an optional prop with the current behavior as the default.

## 3. Information architecture

1. Hero
2. Introduction (article sections 1 to 3 of `B-editorial-article.md`)
3. "How scattering rules work on the Appalachian Trail" panel: the four classifications, the remembrance-place versus scattering-place distinction, and the land manager list
4. Filters bar (section 5)
5. Overview map (section 4)
6. State navigation (14 states, north and south order from Georgia to Maine, plus A to Z)
7. One section per state, in trail order: state intro, land managers in that state, then destination cards
8. Planning and accessibility guidance
9. Sources, photography credits and footer disclaimer

## 4. Overview map

- Static-first: an inline SVG outline of the 14 states with one marker per destination that has a verified or ATC-published coordinate. No third-party map embed, tile service or map library (the site has no client frameworks; keep it static and fast, per CLAUDE.md).
- Each marker is a link to its destination card (`#dest-<id>`) with an accessible name ("Max Patch, North Carolina").
- Markers use the destination's `display_point`. Destinations without a usable coordinate get no marker; they still appear in the list.
- Marker style shows the scattering classification (shape plus color, never color alone, for WCAG 1.4.1).
- Each card keeps per-point "Open in Google Maps" links, the same as the national parks guide.

## 5. Filters

Client-side, progressive enhancement: without JavaScript every destination shows.

| Filter | Values | Field |
|---|---|---|
| Category | Accessible, Extraordinary | `category` |
| Difficulty | 1 Very Easy, 2 Easy, 3 Moderate, 4 Challenging, 5 Strenuous | `difficulty_level` |
| Distance | Under 1 mi, 1 to 3 mi, 3 to 6 mi, Over 6 mi, Not established | `round_trip_miles` |
| Scattering | Permitted, Permit or permission required, Prohibited, Unconfirmed | `scattering_classification` |
| State | 14 states | `state` |

- Buttons with `aria-pressed`, a live count ("Showing 23 of 61 destinations", `aria-live="polite"`), and a "Clear filters" button.
- A destination with distance "Not established" is shown only under that value, never guessed into a range.
- Filter state may be kept in `localStorage` (wrapped in try/catch), never in the URL query string.

## 6. Destination card

In this order:

1. Photo (or the placeholder panel), with the credit, license name and license link under it. CC BY and CC BY-SA photos show title, author, source link, license link and a "cropped and resized" change notice (the national parks guide already supports `title` and `license`).
2. Name, state, category badges (Accessible, Extraordinary), "On the A.T." or "Via side trail" badge
3. Scattering classification badge (text label, not only color)
4. Description (from the article)
5. Plan grid: Round trip, Elevation gain, Estimated time, Difficulty (number and word), Terrain, Accessibility, Seasonal notes, Land manager, Nearest town
6. Scattering panel: classification, conditions (setbacks, permit, fee, ceremony limits, nothing left behind), contact, and source link. If the destination is a **remembrance place only**, the panel says so plainly and names the separate authorized scattering location when one is established.
7. GPS rows: Parking or trailhead, Destination, each with its source label ("Official NPS coordinates", "ATC published map point", "Not established"). Never show a coordinate whose source is "not established".
8. Official links (land manager page, ATC page, official map)
9. Verification status line in small text: "Verified", "Partly verified" or "Unverified details marked".

## 7. Data model (`destinations.json`)

One object per row of `A-master-research-dataset.csv`:

```ts
interface AtPoint { label: string; lat: number; lon: number; source: 'nps' | 'atc-map' | 'official-other'; sourceUrl: string; }
interface AtDestination {
  id: string;                 // kebab-case, unique
  state: string;              // e.g. "North Carolina"
  stateOrder: number;         // 1 Georgia ... 14 Maine
  name: string;
  category: 'accessible' | 'extraordinary';
  onAT: 'on-trail' | 'side-trail' | 'not-established';
  region: string;
  nearestTown: string | null;
  landManager: string;
  landManagerVerified: boolean;
  roundTripMiles: number | null;
  distanceSource: string | null;
  elevationGainFt: number | null;
  time: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5 | null;
  terrain: string | null;
  accessibility: string | null;
  seasonal: string | null;
  points: AtPoint[];          // only points with a real source
  scatter: {
    classification: 'permitted' | 'permit-required' | 'prohibited' | 'unconfirmed';
    remembranceOnly: boolean;
    conditions: string[];
    contact: string | null;
    sourceUrls: string[];
    alternative?: { name: string; classification: string; sourceUrl: string };
  };
  photo: Photo | null;        // the national parks guide's Photo type
  links: { label: string; url: string }[];
  verification: 'verified' | 'partial' | 'unverified';
  notes: string[];            // unresolved items, shown only in the review copy
}
```

The build script (`scripts/appalachian-trail/build-data.mjs`, like `scripts/cruise-ashes/build-data.mjs`) reads the CSV, refuses rows with missing required fields, and refuses any coordinate whose source is blank.

## 8. Photographs and rights

- Only rows marked `APPROVED` in `C-photography-manifest.csv` may be used.
- Download each approved file once, resize to 1200 px, save JPEG and WebP. No hotlinking.
- Keep a rights record per photo in `src/data/appalachian-trail/image-rights.json` (source page, file URL, license, author, attribution text, checked date), the same discipline as `src/data/last-adventure/image-rights.json`.
- Re-check each license page at build time of the preview; if a license has changed, drop the photo and use the placeholder.
- No AI images, no photos with identifiable people as the main subject, brand logos or the NPS arrowhead emblem.

## 9. Responsive and accessibility

- Mobile first; cards single column under 40rem, two columns from 48rem, three from 75rem, the same breakpoints as the national parks guide.
- Touch targets at least 44 px; filters scroll horizontally on phones with visible focus.
- One H1; state sections are H2, destination names H3.
- Every image has real alt text; decorative map shapes are `aria-hidden`.
- WCAG 2.2 AA target; contrast checked for badges and map markers.

## 10. Copy rules

- No em dashes anywhere (`npm run verify -- --strict` fails on them).
- No new insurance claims, prices, statistics or business facts.
- Wording comes from `B-editorial-article.md` as approved by Randy; the builder does not rewrite it.
- Unverified facts are labeled "not established" in the page, never filled in.

## 11. Verification before handing back

- `npm run check`, `npm run build`, `npm run verify -- --strict`: 0 errors, 0 problems.
- Screenshots at 1440 and 390 px of the hero, filters, map and two state sections.
- A count check: number of cards equals rows in the dataset marked for publication.
- No changes outside the new page, its data, its images, the build script and the noindex/sitemap preview settings.
