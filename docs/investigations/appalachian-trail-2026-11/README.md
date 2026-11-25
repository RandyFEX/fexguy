# Appalachian Trail research package (November 23, 2026)

Research and editorial production only. Nothing on FuneralFunds.com was changed, merged or deployed.

| File | What it is |
|---|---|
| A-master-research-dataset.csv | 72 records across 14 states: 31 marked publish = YES, 36 HOLD (reason given), 5 merged or legal-location records. Each record has its classification, evidence labels, route facts and photo status. |
| B-editorial-article.md | The complete article draft, built only from A and D. |
| C-photography-manifest.csv | Photo licensing results: 10 APPROVED (8 mapped to destinations), 1 NOT APPROVED, 8 REJECTED, 46 NOT FOUND or not checked. |
| D-regulatory-verification-report.md | The scattering rules by land manager, with sources, discrepancies and open questions. |
| E-website-implementation-spec.md | The build specification. |
| F-claude-code-implementation-prompt.md | A copy-ready prompt for a preview-only build. |
| work/ | Full research notes (NPS quotations, land-manager findings, the raw photo manifest). |
| scripts/build_dataset.py | Rebuilds A from the v6 inventory and the research. |
| inputs/ | The v6 inventory and brief you supplied. |

## Follow-up research (November 24, 2026)

| File | What it is |
|---|---|
| updates-2026-11-24.json | Route facts, parking, official map links, mapped GPS points (OpenStreetMap via Nominatim, labeled as not official; NPS coordinates where published) and scattering findings, each with its source and evidence label. Applied on top of A by scripts/appalachian-trail/build-data.mjs. |
| photos-2026-11-24.json | Photo licensing results for the destinations without a photo (file-page license checks on Wikimedia Commons). Weverton Cliffs was approved but not used (panorama too narrow). |

Scattering totals after the follow-up: 4 Permitted, 4 Permit or permission required, 4 Prohibited (Bear Mountain NY, and the Maryland state park destinations Washington Monument, Gathland and Weverton Cliffs, from Maryland DNR's statement that spreading ashes on public lands is not legal, seen via search summary), 19 Unconfirmed.
