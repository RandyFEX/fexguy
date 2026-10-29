# Health Question Search (server side)

Private data and logic behind the reusable `HealthQuestionSearch` component
(`src/components/health-search/`). The site stays fully static: the only
server code is the Vercel Function `api/health-search.js`
(`POST /api/health-search/`). Nothing in this folder is ever copied to
`dist/` or `public/`; `npm run verify` fails if any of it reaches the build.

**This repository is public, so the carriers' question records are never
committed here.** They live only in the search store (the same Upstash Redis
database as the search limit) under `hqs:questions:preview` and
`hqs:questions:production`. The function loads them at request time (cached
for 5 minutes) and returns only the matching questions. Production serves
records only when the complete, valid 88-question set is published; previews
fall back to the fictional sample when nothing is published.

## Files

| Path | What it is |
|---|---|
| `data/carriers.json` | Carrier identities, plan schedules, outcome rules (approved interpretations) |
| `private/questions/<carrier>.json` | Local working copy of the application questions, **verbatim** (git-ignored, never committed) |
| `data/concepts.json` | Search metadata only: medical terms, equivalents, indicators, related conditions |
| `config.generated.js` | Carriers and concepts, generated from `data/` by `npm run health-search:data` (no questions; do not edit) |
| `question-store.js`, `publish.js` | Loading and checking the stored records; building and exporting the payload |
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

Each file is `{ "carrierId": "<id>", "status": "complete", "source":
"<document and version>", "questions": [ ... ] }`.

## Importing Randy's question set

Randy supplies the questions and their YES/NO outcomes as plain text (one
entry per question: `Carrier N: question`, a `CARRIER: ... | QUESTION N`
line, then `IF YOU ANSWER "YES"` / `"NO"` blocks). Save it in
`private/source/` (git-ignored) and run `npm run health-search:import`. It
writes `private/questions/<carrier>.json`, copying question text and each
outcome line for line (outcomes keep their line breaks and are displayed as
written). Corrections Randy approves go in `private/source/corrections.json`
and are recorded on the record. The real-data tests check every record
against the source text.

## Publishing the records

```
vercel env pull .env.local                       # store credentials (never commit)
node --env-file=.env.local scripts/health-search-publish.mjs --dry-run
node --env-file=.env.local scripts/health-search-publish.mjs --target preview
node --env-file=.env.local scripts/health-search-publish.mjs --target production   # complete 88 only
node --env-file=.env.local scripts/health-search-publish.mjs --export --target preview   # back to private/
```

The script validates the files against `data/carriers.json` with the same
inventory rules the function applies, uploads, reads back and prints counts
only (never wording or credentials). Production refuses anything but the
complete set. Keep a backup of `private/questions/` outside this repository.

## Adding a carrier

1. Add it to `data/carriers.json` (id, name, displayOrder, expected count,
   schedules, rules, `publicDisplay`) and raise `expectedQuestionTotal`.
2. Add `private/questions/<id>.json` with its verbatim questions.
3. Run `npm run health-search:data`, `npm run test:health-search`, then
   publish (above).

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
  visitor cookie, the IP and the normalized query. Entries older than their
  window (24 hours; 1 hour for IPs) are removed on every call, and each key
  expires one window after its last use: visitor data is gone within 48
  hours of the last search, IP data within 2 hours (as /privacy-policy/
  states). The question records (`hqs:questions:*`) never expire. Keep the
  Upstash database's eviction setting off so they are never evicted.
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
HQS_BASE=<preview URL> VERCEL_AUTOMATION_BYPASS_SECRET=... npm run test:health-search:live   # deployed preview
```
