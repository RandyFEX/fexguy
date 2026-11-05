# Quote funnel (server side)

Lead submission, quote sessions and the lead (evidence) record for
`/free-quote/`. The page is `src/pages/free-quote.astro` and its script is
`src/scripts/quote-funnel.ts`. Prices come from the rate engine
(`server/rates/`) only for a quote session the server opened.

**V3.3 (Randy, November 2026): no SMS verification.** Twilio Verify, the
temporary access code (123456), the code entry, resend and the `check` /
`resend` actions were removed (`twilio.js` deleted). The phone number is never
verified, and no record, CRM note or page says it is
(`verification: { status: 'not-required', phoneVerified: false }`). Records
created before V3.3 keep their old verification fields.

## Flow

1. The visitor answers one question per screen: sex, age, tobacco, intended
   use, coverage and state. State is lead information only; prices are
   representative (Texas) rates for every state.
2. The visitor enters a full name (`name.js`) and a mobile number and taps SEE
   MY RATES. V3.8: no checkbox; the consent disclosure sits directly under the
   button and the click is the consent (recorded as `method:
   'button-submission'` with the time, version and exact text). The server
   refuses any disclosure version but the current one.
   `POST /api/quote/ {action: 'start'}` validates the inputs, applies the
   submission limits, saves the lead record, and then:
   - **production**: delivers the lead to Agent CRM (`crm.js`). Only after a
     successful delivery does it open the quote session (the `ff_qs` cookie:
     HttpOnly, Secure, SameSite=Strict, 12 hours, visit-scoped, signed and
     checked against the store on every use) and answer `status: 'verified'`
     with `leadConversion` (once per lead, never for a name starting with
     TEST). A failed or unconfigured delivery keeps the saved lead, logs it
     on the lead's events and answers 502 `delivery-failed` with the lead id
     (no session, no conversion); the page keeps every input, and its retry
     sends `retry: <lead id>`, which re-delivers that same lead (same visit,
     not yet delivered) instead of creating a duplicate.
   - **previews and local** (`VERCEL_ENV !== 'production'`): test mode; no
     Agent CRM delivery, `mode: 'test'`, never a conversion.
3. `/api/price-explorer/` returns prices only for that session. Changing age,
   sex, tobacco or coverage needs nothing more, and a refresh returns to the
   results (`session`).
4. `apply` re-prices the chosen category on the server, records it, and the
   page continues to /facebook/.

v6.2: the funnel sends no notifications and makes no Formspark, Cloudflare
Turnstile or email-service requests. Every lead is saved in the Redis
evidence record at contact submission (`start`, before any code is
entered): name, mobile, state, intended use, quote, consent, attribution
(`source`) and client details; Apply Now, call taps and health answers are
added to the same record. Retrieve leads with `scripts/quote-evidence.mjs`.
`apply` returns `saved: true` once the record is written; /help/ counts the
conversion only then.

## v2.5 pricing screen and Apply Now intake

- After name and mobile, the pricing screen shows the three cards with
  blurred, safe stand-ins: fixed example amounts and generic company text,
  never real prices or carriers. The browser can't get prices until the
  server verifies the phone. The Unlock Your Rates panel has the
  number prefilled; verifying reveals the prices in place. Carrier names and
  logos stay blurred.
- Categories: Lowest Preferred = Mutual of Omaha Living Promise Level;
  Average Standard = mean of at least two verified standard products, so it
  is pending while Aetna Standard is the only one; Guaranteed Acceptance =
  Gerber ACH.
- Apply Now -> `intake-next` / `intake-answer`: the carrier's own questions,
  one at a time, from the published Health Question Search records (never
  the sample). Every answer is stored with its outcome. A YES the carrier
  treats as a decline stops that carrier's questions and flags
  `may-not-qualify`; the lead stays open. Gerber (guaranteed issue) has no
  questions; Mutual of Omaha has no question set in the database yet, so the
  visitor continues to agent assistance.

## v2.7 visit-scoped sessions and full reveal

- Every new visit or tab starts at the first question. The page keeps a
  random visit id in sessionStorage (per tab, gone when the tab closes) and
  sends it as `x-quote-visit`. The session record stores its hash, and
  `verifiedLead` requires a match, so an earlier visit's cookie never
  verifies a new tab or visit. The cookie is a browser-session cookie; the
  server record expires after 12 hours.
- A reload in the same tab keeps the verified prices and selections.
- `end-session` removes the session record and clears the cookie (the page's
  Start New Quote button was removed in November 2026: every pricing input can
  be changed on the results screen; a new tab or visit starts fresh). The lead, its consent record and events are kept, and a
  `quote-restarted` event is added. Each new request is a new lead with its
  own consent choice (never carried forward); the CRM handles duplicates.
- With one verified standard product (Aetna Standard) the card is "Standard
  Rate" with its own premium. After verification all blurring is removed:
  prices, carrier names (`CARRIER_DISPLAY`, only in verified pricing
  responses) and logos. Products without a logo file show the company name.

## Environment variables (server-side only)

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | The existing Upstash Redis |
| `QUOTE_SESSION_SECRET` (optional; else `HEALTH_SEARCH_SECRET`) | Session signing and HMAC hashing (32+ chars) |
| `AGENT_CRM_TOKEN` / `AGENT_CRM_LOCATION_ID` | Agent CRM (production); without them production refuses to report a lead as accepted |
| `QUOTE_SMS_DAILY_LIMIT` (optional, default 300) | Global daily submission cap (name kept) |

The Twilio variables are no longer read.

## Abuse and duplicate protection

- US numbers only; toll-free, premium, N11 and fictional ranges are rejected.
- Per IP: 5 submissions an hour and 15 a day.
- Per phone: 4 an hour and 6 a day.
- Global daily cap.
- A retry after a failed delivery reuses the saved lead (no duplicate); the
  page also ignores a second tap while a submission is in flight.
- Same-site Origin only; strict input whitelists.
- The pricing endpoint keeps its own per-IP limits.

## Evidence (durable, access-controlled)

Records live in the private Upstash Redis, namespaced by deployment
(`qe:preview:*` and `qe:production:*`). Evidence records and their event lists
have no expiry, so they remain retrievable after the session ends.

Each lead record holds:
- the lead id, first name and E.164 phone;
- the state;
- the submission time;
- the consent choice (given or not), with its timestamp, version and exact
  text;
- the verification status (V3.3: `not-required`, `phoneVerified: false`);
- the Agent CRM delivery (`crm.delivered`, contact id) and submission attempts;
- the quote at submission;
- the source page, landing page, traffic source, referrer and UTM values;
- the IP address and user agent;
- every Apply Now (category, server-computed premium, quote, product codes).

The event list records:
- contact submitted and resubmitted;
- Agent CRM delivered, failed or not configured;
- lead accepted (and whether it counted as a conversion);
- Apply Now.
(Records from before V3.3 also show their SMS and code events.)

Retrieval is logged. Every lookup needs `--by` and `--reason`, and is
appended to `qe:<ns>:access`:

```sh
vercel env pull .env.local
node --env-file=.env.local scripts/quote-evidence.mjs --lead <id> --by "Randy" --reason "inquiry"
node --env-file=.env.local scripts/quote-evidence.mjs --phone 2145550123 --by "Randy" --reason "inquiry"
node --env-file=.env.local scripts/quote-evidence.mjs --access-log --by "Randy" --reason "audit"
```

Retention: records are kept until deleted, in line with the privacy policy's
indefinite record retention. The Agent CRM contact note is a second copy of
the contact, quote and consent details.

## Tests

`npm run test:quote` runs the tests against a real local Redis and a fake
Agent CRM API; no SMS is sent and no lead is delivered. It covers:
- the submission and Agent CRM delivery (upsert, tag, note);
- a failed or unconfigured delivery (no session, no conversion) and the retry
  of the same lead;
- conversions (once, never for TEST names or previews);
- the pricing gate with forged, tampered and expired tokens;
- repricing;
- evidence persistence after session expiry;
- consent versions;
- IP and phone limits;
- origins;
- separation of preview and production records.

`npm run test:quote:browser` (after a build) includes
`tests/quote/funnel-direct.browser.mjs`: the V3.3 contact step on desktop,
iPhone and Android, SEE MY RATES straight to the cards, the delivery-failure
path and the analytics events, against the production handlers with a fake
Agent CRM.
