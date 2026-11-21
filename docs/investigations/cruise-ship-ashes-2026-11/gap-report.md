# Gap report (Version 1.6, 2026-11-21)

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

## 2. Carnival, MSC, P&O and Cunard (recovered in Version 1.6)

Now Officially permitted, from the search engine's indexed copies of their
own policy pages (domain-restricted searches; Randy authorized the method
in Version 1.6). The pages and official PDFs still refuse automated
requests (HTTP 403/401). Remaining questions:

| Line | Official page | Still open |
| --- | --- | --- |
| Carnival | https://help.carnival.com/app/answers/detail/a_id/1132/~/scattering-of-ashes | Direct read of the full wording; requirements for animal ashes (the page lists "human or animal ashes"); guest limit and fee (not published); whether arrangements can start before sailing |
| MSC | https://www.msccruisesusa.com/faq/on-board-information (also msccruises.com/int, .co.uk, .ca, .com.au) | Direct read; manufacturer-certificate line seen on the international page but not in the indexed US page |
| P&O Cruises | https://www.pocruises.com/ceremonies-sea-shore/committal-of-ashes | Direct read; minimum cruise length conflict between the committal page (not on 6 nights or less) and the FAQ (five nights or more); lead time and contact; the March 2026 Ceremonies T&Cs PDF (403) |
| Cunard | https://www.cunard.com/en-gb/frequently-asked-questions?categoryId=All&questionId=faq390.summary | Direct read; package price; lead time and contact department (round 1 summaries said 90 days, not seen in Version 1.6) |

## 2b. The benchmark's nine lines (Version 1.6)

| Line | Result |
| --- | --- |
| Royal Caribbean, Princess, Virgin Voyages | Officially permitted (read directly in round 2; re-confirmed in the index) |
| Carnival, MSC | Officially permitted (Version 1.6, indexed official pages) |
| Celebrity, Norwegian, Holland America, Disney | Unverified: no policy on the official site or in its search index. Unconfirmed secondary reporting is kept separately in each record (`secondaryReporting`). Celebrity's and Holland America's general overboard rules are official but are not ash policies |

## 2a. Marella: wording not independently verified

Marella is shown as Officially permitted from its official FAQ, but the
complete official wording has not been independently verified: the page
refused automated reading (HTTP 403), and a page-reading tool returned a
paraphrase plus one exact quote. Its official link and research are kept;
confirm the full text in a browser before publication.

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

## 9. Why rounds 1 to 3 missed recoverable policies (Version 1.6)

- Round 1 found these four policies only as search-engine summaries and
  could not open the pages (network allowlist). Round 3 then applied a
  rule that a search summary is never authoritative, and the session's
  permission system refused archived copies, so the four were downgraded
  to Unverified even though their official pages exist and are indexed.
- The research treated "the page refuses automated requests" as "the
  policy cannot be established". The better method, used in Version 1.6,
  is a search restricted to the operator's own domain, which returns the
  search engine's indexed copy of that official page with quoted wording.
- Effort was spread over 80+ operators (most of which publish nothing)
  instead of concentrating on the few lines that publish a policy.

## 10. Recommendations for a useful article

- Lead with the 11 lines that have an official policy (9 officially
  permitted, Ambassador conditional, Crystal not permitted) in the main
  comparison table, with requirements a family can act on.
- Show the unverified lines as a compact list (name, "no published
  policy", the official contact where read), not as full directory cards.
- Keep the full 92-record register internal (research/ and register.md).
- Before publication, read the four indexed pages directly in a browser
  (Carnival, MSC, P&O, Cunard) and Marella's full FAQ, and ask Celebrity,
  Norwegian, Holland America and Disney in writing.

## 11. Version 1.7B open items

- USA TODAY, Nathan Diller, 2026-11-15
  (https://www.usatoday.com/story/travel/cruises/2026/11/15/spread-ashes-from-cruise-ship-burials-at-sea/92572572007/):
  not readable from this environment (HTTP 402; page-reading tool refused;
  usatoday.com blocks the search crawler; no syndicated copy found).
  Norwegian's attributable company confirmation and the reported Carnival
  ceremony are therefore NOT in the article. Needs the article text from
  Randy. Norwegian stays Unverified until then.
- Carnival Elation Facebook discussion (2026-10-24): used only as described
  by Randy, as anecdotal passenger experience; no URL recorded.
