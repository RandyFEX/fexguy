# Quote funnel (server side)

Phone verification, verified sessions, and consent and verification evidence
for `/free-quote/` (Quote System v2.2, Randy, November
2026). The page is `src/pages/final-expense-insurance-prices.astro` and its
script is `src/scripts/quote-funnel.ts`. Prices come from the rate engine
(`server/rates/`) only after the server has verified the phone.

## Flow

1. The visitor answers one question per screen: sex, age, tobacco, coverage
   and state. State is lead information only; prices are representative
   (Texas) rates for every state.
2. The visitor enters a first name and a mobile number. The consent box is
   optional and never pre-checked. `POST /api/quote/ {action: 'start'}`
   creates the evidence record and sends a Twilio Verify SMS.
3. `check` sends the 6-digit code. When Twilio approves it, the server
   records the verification and sets the `ff_qs` session cookie: HttpOnly,
   Secure, SameSite=Strict, 24 hours, signed and checked against the store on
   every use.
4. `/api/price-explorer/` returns prices only for a verified session.
   Changing age, sex, tobacco or coverage needs no new code, and a refresh
   returns to the results (`session`).
5. `apply` re-prices the chosen category on the server, records it, and the
   page continues to /help/.

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
| `TWILIO_ACCOUNT_SID` | Twilio account (AC...) |
| `TWILIO_AUTH_TOKEN`, or `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET` | Twilio authentication |
| `TWILIO_VERIFY_SERVICE_SID` | The Verify Service (VA...) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | The existing Upstash Redis |
| `QUOTE_SESSION_SECRET` (optional; else `HEALTH_SEARCH_SECRET`) | Session signing and HMAC hashing (32+ chars) |
| `QUOTE_SMS_DAILY_LIMIT` (optional, default 300) | Global daily SMS cap |
| `QUOTE_VERIFY_MODE=test` (optional, previews only) | Force test mode |
| `QUOTE_PUBLIC_TEST_CODE=on` (optional, production) | Explicitly allow the temporary public test code (v5.3); without it and without Twilio, production refuses verification |

## v5.3 temporary public test code (production, until Twilio is connected)

Production without Twilio credentials runs `public-test` mode only when
`QUOTE_PUBLIC_TEST_CODE=on` is set explicitly (Randy, November 2026: never a
silent fallback; otherwise verification is refused with the phone number)
and `PUBLIC_TEST_CODE_ENABLED` in `twilio.js` is true: the existing SMS screens stay,
no SMS is sent, and the code 123456 unlocks that visitor's own quotes only
(the same visit-scoped session, rate limits and 5-attempt cap). The lead is
real, but it is never an advertising conversion (GA4 generate_lead and
Meta Lead fire only for a real Twilio-approved verification). The record never
claims SMS verification: `verification.status` is `test-code-accepted`,
`phoneVerified` is false and `verifiedAt` is null. It ends automatically when
the Twilio variables are set, or at once by removing `QUOTE_PUBLIC_TEST_CODE=on`
or setting `PUBLIC_TEST_CODE_ENABLED = false`.

Without Twilio credentials, previews run in **test mode**: the page says so,
no SMS is sent, the code is `123456`, and every record is marked `mode:
"test"`. Production never uses test mode: without credentials it refuses
verification (503).

## Abuse protection

- US numbers only; toll-free, premium, N11 and fictional ranges are rejected.
- Per IP: 5 code requests an hour and 15 a day.
- Per phone: 4 an hour and 6 a day.
- Global daily cap.
- 30-second resend cooldown and at most 3 resends.
- 5 code attempts per verification; a pending verification expires after 10
  minutes.
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
- the verification notice version and text;
- the Twilio Verify references, outcome and verified time;
- the quote at submission;
- the source page, landing page, traffic source, referrer and UTM values;
- the IP address and user agent;
- every Apply Now (category, server-computed premium, quote, product codes).

The event list records:
- SMS sent, resent and failed;
- rejected codes;
- verification;
- Apply Now.

Retrieval is logged. Every lookup needs `--by` and `--reason`, and is
appended to `qe:<ns>:access`:

```sh
vercel env pull .env.local
node --env-file=.env.local scripts/quote-evidence.mjs --lead <id> --by "Randy" --reason "inquiry"
node --env-file=.env.local scripts/quote-evidence.mjs --phone 2145550123 --by "Randy" --reason "inquiry"
node --env-file=.env.local scripts/quote-evidence.mjs --access-log --by "Randy" --reason "audit"
```

Retention: records are kept until deleted, in line with the privacy policy's
indefinite record retention. Randy's Formspark email for each verified lead
is a second, independent copy of the contact, consent and verification
details.

## Tests

`npm run test:quote` runs the tests against a real local Redis and a fake
Twilio API; no SMS is sent. It covers:
- Twilio requests;
- test mode and production refusal;
- the pricing gate with forged, tampered and expired tokens;
- repricing;
- evidence persistence after session expiry;
- consent versions;
- attempt and resend limits;
- IP and phone limits;
- origins;
- separation of preview and production records.
