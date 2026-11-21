# Research register record format (operators)

One JSON file per research group: `operators-<group>.json`, an array of
records. Verification date for this round: 2026-11-21.

```json
{
  "id": "carnival-cruise-line",
  "name": "Carnival Cruise Line",
  "parent": "Carnival Corporation & plc",
  "fleetType": "ocean | river | expedition | coastal | sailing | yacht",
  "regions": ["Caribbean", "Alaska", "Europe"],
  "headquarters": "Miami, Florida, USA",
  "status": "officially-permitted | conditionally-permitted | not-permitted | unverified",
  "statusRationale": "One or two sentences tying the status to the evidence.",
  "evidenceLevel": "official-policy | written-confirmation | secondary-reporting | none",
  "answers": {
    "permitted": {"answer": "...", "basis": "official | secondary | unknown", "sources": ["s1"]},
    "documentedOrIndividualApproval": {...},
    "advanceNotice": {...},
    "leadTime": {...},
    "contactDepartment": {...},
    "writtenApplication": {...},
    "deathOrCremationCertificate": {...},
    "containerRequirements": {...},
    "biodegradableUrns": {...},
    "scatterOrReleaseUrn": {...},
    "privateCeremony": {...},
    "designatedArea": {...},
    "crewParticipation": {...},
    "chaplainCelebrant": {...},
    "fees": {...},
    "distanceOffshore": {...},
    "shipSelectsLocation": {...},
    "familyRequestLocation": {...},
    "weatherItineraryLimits": {...},
    "gpsCoordinates": {...},
    "certificateConfirmation": {...},
    "differsByVesselItinerary": {...},
    "petAshes": {...},
    "otherMemorialAssistance": {...}
  },
  "sources": [
    {"id": "s1", "url": "exact page or PDF", "title": "...",
     "type": "official-policy-page | official-faq | passenger-contract | official-pdf | official-form | government | secondary-news | secondary-blog | forum-anecdote",
     "quote": "short exact quote (max ~40 words)", "verified": "2026-11-21",
     "accessNote": "e.g. page blocked automated fetch; text from search snippet"}
  ],
  "conflicts": ["..."],
  "unresolved": ["..."],
  "needsDirectContact": true,
  "notes": "..."
}
```

Rules: an answer with no source is "unknown" (answer text "Not published").
Never infer an answer from silence. Forum posts and blogs are labelled as
such and never establish "officially-permitted". No em dashes anywhere.

## Round 3 additions (2026-11-21)

Status categories (round 3 rules, applied to every record):

- `officially-permitted`: an authoritative operator source, read by us,
  explicitly permits it, subject to its published requirements.
- `conditionally-permitted`: an authoritative operator source, read by us,
  says it may be approved individually or only in specified circumstances.
- `not-permitted`: an authoritative operator source, read by us, explicitly
  says it is not allowed or offered from its vessels.
- `unverified`: no authoritative evidence read. A search-engine summary of
  an official page is not enough; neither is any secondary source.

Extra fields:

- `basis` may be `unconfirmed-official`: the answer comes from a
  search-engine summary of the operator's official page, which we could not
  open (Carnival, MSC, P&O Cruises, Cunard). Kept as evidence, not as fact.
- `previousStatus`: the status before round 3 reclassification.
- `round2`, `round3`: how the record was checked in that round
  (`verified-direct`, `verified-via-fetch-tool-paraphrase`,
  `blocked-by-bot-protection`, `official-site-searched-nothing-found`,
  `verified-official`, `searched-no-official-policy`,
  `reclassified-unconfirmed-official-page`).
- `wordingConfirmed`: true only when the official wording was read.
- `researchLog`: every URL tried and its result, so a "no policy found"
  status is documented rather than assumed.
- `officialContact`: guest-services contact read on the official site.
- `notCruiseLine`: true for charter operators kept as context (they are
  excluded from the cruise-line comparison).
