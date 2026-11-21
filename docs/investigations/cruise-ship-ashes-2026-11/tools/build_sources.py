"""Build sources.md from research/*.json. Run: python3 tools/build_sources.py"""
import json, glob, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(HERE, "research")
def cell(s): return " ".join(str(s).replace("|", "/").split())
def short(s, n=140):
    s = cell(s); return s if len(s) <= n else s[:n-3].rsplit(" ", 1)[0] + "..."
def check(note):
    n = (note or "").lower()
    if n.startswith("version 1.6: read through the search engine's index") or n.startswith("version 1.6: from the search engine's indexed copy"): return "Read via search-engine index of the official page (V1.6)"
    if re.search(r"opened directly( on)? 2026-11-21|read directly|re-opened directly|opened directly \(http 200", n): return "Read directly (rounds 2-3)"
    if (n.startswith("round 2") or n.startswith("round 3")) and ("bot protection" in n or "refused" in n or "401" in n): return "Blocked; search summary only"
    if ("fetch tool" in n and "read on 2026-11-21" in n) or "read via webfetch" in n: return "Read via fetch tool"
    if "round 2 (2026-11-21): the fetch tool confirmed" in n: return "Read via fetch tool"
    if "re-opened directly" in n or "opened directly (http 200)" in n or "read on ecfr" in n: return "Read directly (rounds 2-3)"
    if "ecfr" in n and "api" in n: return "Read directly (eCFR, round 1)"
    if n.startswith("round 2") or n.startswith("round 3"): return "Rounds 2-3: not found or not readable"
    return "Search summary only (round 1)"
rows = {}
def add(url, typ, supports, verified, note):
    if not url: return
    e = rows.setdefault(url, {"type": typ, "supports": [], "verified": verified, "check": check(note)})
    e["supports"].append(supports)
    if check(note).startswith("Read"): e["check"] = check(note); e["verified"] = verified
for f in sorted(glob.glob(os.path.join(R, "operators-*.json"))):
    for r in json.load(open(f)):
        for s in r["sources"]:
            keys = [k for k, v in r["answers"].items() if s["id"] in v["sources"]]
            add(s["url"], s["type"], f"{r['name']}: {', '.join(keys) or 'status/notes'}", s.get("verified", ""), s.get("accessNote", ""))
for e in json.load(open(os.path.join(R, "law-maritime.json"))):
    note = e.get("notes", "")
    if e.get("confidence") == "confirmed" and "ecfr.gov" in (e.get("url") or ""): note = "ecfr api " + note
    elif e.get("confidence") == "confirmed": note = "read directly " + note
    add(e.get("url"), e.get("sourceType", ""), f"Law {e['id']} ({e['jurisdiction']}): {e['topic']}", e.get("verified", ""), note)
for e in json.load(open(os.path.join(R, "travel-with-remains.json"))):
    add(e.get("url"), e.get("entityType", ""), f"Travel {e['id']}: {e['topic']}", e.get("verified", ""), e.get("accessNote", ""))
for e in json.load(open(os.path.join(R, "law-inland-waterways.json"))):
    add(e.get("url"), "law-inland", f"Inland waters: {e['jurisdiction']}", e.get("verified") or "not verified", e.get("notes", ""))
for e in json.load(open(os.path.join(R, "polar-protected-areas.json"))):
    for s in e.get("sources", []):
        add(s.get("url"), s.get("type", ""), f"Protected area: {e['area']}", s.get("verified", ""), s.get("accessNote", ""))
extra = [
 ("https://shannon.cruisebrothers.com/cb/blog/shannon-hawkins-2026-07-13-cruise-with-shannons-guide-to-scattering-ashes-at-sea-on-a-cruise-ship/", "secondary-blog (benchmark)", "Competitor analysis (competitors-seo.md section 1)", "2026-11-21", "opened directly on 2026-11-21"),
 ("https://www.epa.gov/sites/default/files/2019-05/documents/burial_at_sea_reporting_tool_factsheet_may_13_2019.pdf", "government", "EPA reporting tool: who reports, what is asked", "2026-11-21", "opened directly on 2026-11-21"),
]
for u, t, s, v, n in extra: add(u, t, s, v, n)
order = ["Read directly (rounds 2-3)", "Read via search-engine index of the official page (V1.6)", "Read via fetch tool", "Read directly (eCFR, round 1)", "Blocked; search summary only", "Rounds 2-3: not found or not readable", "Search summary only (round 1)"]
L = ["# Sources: cruise ship ash scattering guide", "",
     "Generated from the research JSON by `tools/build_sources.py`. Every URL",
     "recorded in the research, with its type, what it supports, the date it",
     "was checked and how. Forum and blog sources never establish a cruise",
     "line's status; they are kept as leads. Competitor pages are listed in",
     "research/competitors-seo.md.", ""]
for grp in order:
    items = sorted((u, e) for u, e in rows.items() if e["check"] == grp)
    if not items: continue
    L += [f"## {grp} ({len(items)})", "", "| URL | Type | Supports | Checked |", "| --- | --- | --- | --- |"]
    for u, e in items:
        L.append(f"| {cell(u)} | {cell(e['type'])} | {short('; '.join(dict.fromkeys(e['supports'])), 220)} | {cell(e['verified'])} |")
    L.append("")
L += ["## Research log: pages searched per operator (round 3)", "",
      "Each operator's `researchLog` from the JSON: every official URL tried and",
      "the result. These document that a policy was looked for; a page with no",
      "mention of ashes is not evidence of a prohibition.", ""]
for f in sorted(glob.glob(os.path.join(R, "operators-*.json"))):
    for r in json.load(open(f)):
        log = r.get("researchLog", [])
        if not log: continue
        L.append(f"- **{r['name']}** ({r['status']}):")
        for x in log: L.append(f"  - {cell(x)}")
L.append("")
open(os.path.join(HERE, "sources.md"), "w").write("\n".join(L))
print({g: sum(1 for e in rows.values() if e['check'] == g) for g in order})
