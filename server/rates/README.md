# Funeral Funds rate engine (server side)

Monthly life insurance premiums from verified carrier rate tables (Randy,
November 2026, Rate Engine V2.0). Presentation-free: the pricing comparison
tool and a future quote wizard call it and render the results. Nothing here is
copied to `dist/` or `public/`; `npm run verify` fails if rate data, a rate
workbook or a rate guide reaches the site.

**This repository is public and the rate guides are producer-only ("for agent
use only"), so the rate tables are never committed.** They live in the
git-ignored `private/` folder, generated from the PDFs Randy supplies.

## Products

| Product id | Carrier and plan | Rate class | Fee | Monthly factor | Issue ages | Source |
|---|---|---|---|---|---|---|
| `aetna-accendo-standard` | Aetna CVS / Accendo Final Expense Whole Life (Level plan) | Standard only | $40 | 0.0875 (EFT) | 40-89 | 2026 AETNA ACCENDO RATE GUIDE.pdf, page 2 |
| `moo-living-promise-level` | Mutual of Omaha Living Promise | Level Benefit only | $36 | 0.089 (bank draft) | 45-85 | 2026 MOO LIVING PROMISE UNDERWRITING - RATE GUIDE.pdf, page 3 |
| `gerber-guaranteed-life` | Gerber Life Guaranteed Life | Guaranteed acceptance (one rate whatever the tobacco answer) | $11 | 0.083334 (ACH) | 50-80 | 2026 GERBER RATE CARD.pdf (GL-RC 0922), page 1, Monthly ACH |

Monthly premium = ROUND(((coverage / 1000 x annual rate) + fee) x factor, 2),
computed with exact decimals (`decimal.js`) and rounded half up to the cent.

Gerber's card prints monthly ACH premiums, not annual rates: each stored rate is
the single 2-decimal value that reproduces all five printed premiums
($5,000-$25,000) for that age and gender, and the tests check that the engine
reproduces every printed premium. The Direct Bill table on page 2 is never used.

State rules come only from the guides: Mutual of Omaha unisex (male) rates in
MT, $5,000-$40,000 in WA, not available in NY; Gerber not issued in MT,
$15,000 maximum in SD, issue age 75 maximum in NY. Aetna's guide lists none.
Face amounts: Mutual of Omaha $2,000-$40,000 (guide); Gerber $5,000-$25,000
(the amounts the card prints); Aetna's guide gives no limits, so the engine
uses the $5,000-$25,000 working range and says so in every result.

## Files

| Path | What it is |
|---|---|
| `products.js` | Product rules: fees, factors, ages, face amounts, state rules, sources |
| `engine.js` | `loadDatasets()`, `createEngine()`, `quote()`, `quoteMany()`, dataset validation |
| `decimal.js` | Exact decimal arithmetic and half-up rounding |
| `xlsx.js` | Dependency-free .xlsx writer for the workbook |
| `private/<product id>.json` | Extracted rate tables (git-ignored, never committed) |
| `private/funeral-funds-rate-workbook.xlsx` | Generated pricing workbook (git-ignored) |

## Commands

```sh
# Extract the tables from the supplied PDFs (kept outside the repository):
npm run rates:extract -- --aetna "<Aetna PDF>" --moo "<MOO PDF>" --gerber "<Gerber PDF>"
# Build the workbook (add --source-dir to re-check every rate against the PDFs
# saved there as aetna.pdf, moo.pdf and gerber.pdf):
npm run rates:workbook -- --source-dir <folder>
# Tests: engine rules with made-up rates (always), real-table checks when
# private/ exists, PDF re-extraction when RATES_SOURCE_DIR is set:
npm run test:rates
```

## Calling the engine

```js
import { createEngine, loadDatasets } from './server/rates/engine.js';
const engine = createEngine(loadDatasets());
engine.quote({ productId: 'gerber-guaranteed-life', age: 60, gender: 'male', tobacco: false, coverage: 10000, state: 'TX' });
// { ok: true, monthlyPremium: '63.89', monthlyPremiumCents: 6389, rateClass, rate, formula, limits, stateRule, source, ... }
engine.quote({ ...sameInput, state: 'MT' });
// { ok: false, reason: 'unavailable_in_state', message: '...' }
```

Results never carry a tier label; the comparison tool decides how to present
them. A product whose table isn't loaded, or an input outside its rules,
returns `{ ok: false, reason }` and never an estimated price.
