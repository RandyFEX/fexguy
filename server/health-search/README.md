# Health Question Search (server side)

Private data and logic behind the reusable `HealthQuestionSearch` component
(`src/components/health-search/`). The site stays fully static: the only
server code is the Vercel Function `api/health-search.js`
(`POST /api/health-search/`). Nothing in this folder is ever copied to
`dist/` or `public/`; `npm run verify` fails if any of it reaches the build.

## Files

| Path | What it is |
|---|---|
| `data/carriers.json` | Carrier identities, plan schedules, outcome rules (approved interpretations) |
| `data/questions/<carrier>.json` | The application questions, **verbatim** from the source application |
| `data/concepts.json` | Search metadata only: medical terms, equivalents, indicators, related conditions |
| `dataset.generated.js` | Generated from `data/` by `npm run health-search:data` (do not edit) |
| `validate.js` | Inventory and consistency rules (7 carriers, 88 questions, sections, variants, shared wording) |
| `search.js`, `normalize.js` | Matching and ranking |
| `quota.js`, `stores.js` | 3-searches-per-24-hours allowance (Redis Lua, atomic) and the Upstash REST client |
| `handler.js` | Request validation, cookie, quota, response |
| `sample-dataset.js` | Fictional sample data for previews and tests only |

## Question record

```json
{
  "id": "aflac-A-3A",
  "section": "Part A",
  "number": "3A",
  "variant": null,
  "text": "<exact wording from the application, character for character>",
  "sharedKey": "A-3A",
  "yes": { "rule": "part-a" },
  "no": null,
  "search": { "direct": ["heart-attack"], "related": [] },
  "source": { "document": "<file name and version>", "page": 2 }
}
```

- `text` is copied exactly. Never reword, correct or reformat it. If it looks
  wrong, report it; don't fix it here. An em dash in source wording is flagged
  by the validator for Randy's decision.
- `yes` / `no` use a carrier `rule` from `carriers.json`, or an explicit
  `classification` and plain-English `explanation`, both approved.
- `search.direct` lists concepts the question asks about under broader
  wording; `search.related` lists concepts it is only connected to. Words
  that appear in `text` match automatically: don't repeat them.
- `variant` is required for CICA (`D-1` or `D-2`).
- `sharedKey` pairs shared questions across a `sharedWordingGroup`
  (Family Benefit Life and Trinity Life; Aetna and Aflac). The validator
  reports any difference beyond the carrier name.

When a carrier's file is filled in, set its `"status"` to `"complete"` and
record the source document in `"source"`.

## Adding a carrier

1. Add it to `data/carriers.json` (id, name, displayOrder, expected count,
   schedules, rules, `publicDisplay`) and raise `expectedQuestionTotal`.
2. Add `data/questions/<id>.json` with its verbatim questions.
3. Run `npm run health-search:data` and `npm run test:health-search`.

No component or API code changes are needed.

## Configuration (Vercel project settings, server-side only)

| Variable | Purpose |
|---|---|
| `HEALTH_SEARCH_SECRET` | 32+ random characters; HMAC key for all stored identifiers |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Redis REST credentials, from Vercel Marketplace (Upstash for Redis); `UPSTASH_REDIS_REST_URL` / `_TOKEN` also work |
| `HEALTH_SEARCH_ALLOWED_ORIGINS` | Optional extra allowed origins, comma separated |

Without the secret or the store, the API answers 503 and the component
offers the phone number: the limit is never faked.

## Privacy and limits

- Search terms are never logged or stored. Redis keeps only HMACs of the
  visitor cookie, the IP and the normalized query, all expiring within 24
  hours.
- Visitor cookie `ff_hqs`: random, HttpOnly, Secure, SameSite=Strict,
  path `/api/health-search`, 7 days.
- Each visitor gets 3 new searches per rolling 24 hours. Reopening or paging
  a search already accepted is free, and so are searches with no matches.
  Each IP also has a separate limit of 40 searches an hour, so shared networks
  work while bulk scraping is slowed. Clearing cookies resets the per-visitor
  count, so this discourages scraping without preventing it.
- Responses contain only the matched questions (at most 40, 3 carriers per
  page), never search metadata or internal ids.

## Testing

```
npm run health-search:data -- --check   # generated data is current
npm run test:health-search              # needs redis-server installed locally
npm run build && node tests/health-search/ui-smoke.mjs   # browser checks
```
