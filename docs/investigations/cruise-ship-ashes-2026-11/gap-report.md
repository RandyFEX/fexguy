# Gap report (round 3, 2026-11-21)

What is still unresolved after round 3. "Couldn't verify" is not "false";
nothing unconfirmed was deleted. Round 2 findings are kept in the git
history of this file.

## 1. Network and access

- Round 3 started with the environment still on Limited network (the 20
  round 2 hosts only). It was switched to unrestricted at the start of
  round 3; tunnels then opened to every host tested.
- Sites with their own bot protection still refused automated reading
  (HTTP 403/401, script-only pages or challenges). These were not
  bypassed.
- web.archive.org: every connection was closed at the proxy egress
  (`ws_closed_mid_exchange`). Reading archived copies of blocked
  cruise-line pages through a page-reading tool was refused by this
  session's permission policy, so no archived copy was used.

## 2. Four lines with a policy page we could not read

Reclassified to Unverified under the round 3 rules. Their round 1
search-summary evidence is kept (answers marked `unconfirmed-official`),
with these open questions:

| Line | Page | What must be confirmed |
| --- | --- | --- |
| Carnival | help.carnival.com answer 1132 (also help.goccl.co.uk) | Full text; 12 nm; documents; urn certificate; flowers bought on board; urn stays aboard; arranged on board only or before sailing; 12-guest limit (secondary only) |
| MSC | msccruisesusa.com, msccruises.com, .co.uk, .com.au FAQs (all 401) | 6+ nights and a sea day; 12 nm; fee; 10-guest limit by region; coordinates certificate; animal ashes |
| P&O Cruises | pocruises.com committal page (403); P&O Australia now redirects to Carnival Australia | GBP 270 charge; minimum cruise length (6 nights or less excluded vs five nights or more); fjords; certificate |
| Cunard | cunard.com en-gb, en-us, en-au committal pages and FAQ719; my.cunard.com (all 403) | 90-day lead time; contact department; package price; fjords and Alaska exclusions; death certificate |

Fastest fix: Randy opens the four pages in a browser and pastes the text,
or each line confirms by email.

## 3. Operators whose official sites could not be read

Official policy unknown because the site blocked or could not render:

- Oceania, Regent Seven Seas, Four Seasons (fourseasons.com) (403)
- AIDA (403), Saga (403), AROYA (403), Resorts World Cruises (no
  connection; a second domain is parked), Hapag-Lloyd (script-only FAQ)
- American Cruise Lines, Aurora Expeditions, Pearl Seas (403), Swan
  Hellenic (429), Star Clippers (challenge page), Coral Expeditions
  (script-only)
- Avalon, Captain Cook Cruises, Riviera (403), AmaWaterways (script-only),
  CroisiEurope, Aqua Expeditions (URLs 404), Heritage Line (no response)

## 4. Operators whose official sites were read and say nothing

All other unverified operators (see each record's `researchLog` and the
research log section of sources.md). For each, the question to send is
in the record's `unresolved` field. Highest priority for direct contact:
Norwegian, Celebrity, Holland America, Disney, Viking, Costa, Seabourn,
Silversea, Hurtigruten, Ponant, Lindblad, HX, Quark.

General overboard clauses found (not ashes policies): Holland America,
Princess (US $500), Costa (clause 10.13), Carnival Australia (clause 37,
$500), Mitsui Ocean Cruises (clause 12(9)).

## 5. Law still not confirmed from official text

- France: the Code general des collectivites territoriales articles
  (Legifrance blocked); the Ministry of Justice guide was read.
- Canada: federal guidance on ashes (canada.ca would not connect).
- Australia: government guidance that ashes need no sea-dumping permit
  (dcceew.gov.au would not connect); Great Barrier Reef Marine Park (no
  rule found on ashes).
- New Zealand (legislation.govt.nz challenge, maritimenz.govt.nz 403).
- Greece (1.5 nm rule is a lead only), Wales, Austria, Hungary (partial),
  Portugal (partial), Egypt (GOV.UK pack only; conflicts with round 1),
  Vietnam and Cambodia, China (Shanghai only).
- Mexico, the Bahamas, Bermuda, British Virgin Islands (page 404) and
  other Caribbean states.
- Alaska and Hawaii state rules: none found (dec.alaska.gov 403).
- Antarctica: the Madrid Protocol annexes read do not mention human
  remains; no IAATO statement on ashes. Galapagos: no rule found.
- London Convention and MARPOL Annex V: no IMO statement on whether ashes
  are "dumping" or "garbage".

## 6. Travel

- TSA page read only through a page-reading tool (two exact quotes).
- Not readable or not addressed: Delta, American, United, Southwest,
  British Airways, Lufthansa, Iberia, LOT, Transavia, Qantas, Emirates,
  Ryanair, US State Department, CDC page (the eCFR rule was read instead),
  CASA (Australia).
- No official page found: Hawaiian, Spirit, easyJet, Singapore Airlines,
  JAL, KLM, Air France, CBP, EU or EASA rules.
- spirit-frontier record now holds verified Frontier rules only; Spirit
  remains unverified (split when building the site data).

## 7. Open family questions with no official answer

Who files the EPA report for a cruise departure (the line or the family);
whether any line confirms coordinates in writing; whether part of the
ashes may be committed; what happens to the request if the ship cannot
reach 12 nm on a sea day.

## 8. Scope notes

- Tokyo Bay Anniversary Cruises (Japan) offers ash-scattering charters on
  its own site; it is a charter operator, kept as context and excluded
  from the cruise-line comparison (`notCruiseLine`).
- Closed operators (Alaskan Dream Cruises, American Queen Voyages) stay
  out of the directory.
