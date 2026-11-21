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
