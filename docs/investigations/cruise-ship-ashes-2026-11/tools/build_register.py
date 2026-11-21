"""Build register.md from research/operators-*.json. Run: python3 tools/build_register.py"""
import json, glob, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUPS = [("operators-major.json","Major ocean lines"),("operators-international.json","International and UK lines"),
          ("operators-luxury.json","Luxury and premium lines"),("operators-expedition.json","Expedition and small-ship lines"),
          ("operators-river-regional.json","River and regional operators")]
LABEL = {"officially-permitted":"Officially permitted","conditionally-permitted":"Conditionally permitted",
         "not-permitted":"Not permitted","unverified":"Unverified"}
R2 = {"verified-direct":"Official page read directly","verified-via-fetch-tool-paraphrase":"Official page read via fetch tool (paraphrase)",
      "blocked-by-bot-protection":"Official page blocked; search summary only","official-site-searched-nothing-found":"Official site searched; nothing found",
      "not-in-scope-domain-not-allowed":"Domain not reachable this round"}
R3 = {"verified-official":"Official page read (round 3)","searched-no-official-policy":"Official site searched; no policy found",
      "reclassified-unconfirmed-official-page":"Official page still blocked; reclassified to Unverified"}
def cell(s): return " ".join(str(s).replace("|","/").split())
def short(s, n=160):
    s = cell(s); return s if len(s) <= n else s[:n-3].rsplit(" ",1)[0] + "..."
def restrictions(r):
    a = r["answers"]; out = []
    for k, lab in [("distanceOffshore","Distance"),("leadTime","Notice"),("containerRequirements","Container"),("deathOrCremationCertificate","Documents"),("fees","Fees")]:
        v = a.get(k, {})
        if v.get("basis") in ("official","secondary","unconfirmed-official"):
            out.append(f"{lab}: {short(v['answer'],110)}" + {"secondary":" (secondary)","unconfirmed-official":" (unconfirmed)"}.get(v["basis"],""))
    return "; ".join(out) or "None published"
rows = []; counts = {}
for f, g in GROUPS:
    for r in json.load(open(os.path.join(HERE,"research",f))):
        counts[r["status"]] = counts.get(r["status"],0)+1
        off = [s for s in r["sources"] if s["type"].startswith("official") or s["type"]=="passenger-contract"]
        url = off[0]["url"] if off else "none found"
        ver = off[0]["verified"] if off and r.get("wordingConfirmed") else ("policy not confirmed" if off else "")
        rows.append((g, r, url, ver))
L = ["# Research register: cruise ship ash scattering (round 3)", "",
     "Generated from `research/operators-*.json` by `tools/build_register.py`.",
     "Do not edit by hand; edit the JSON and rebuild. Checked 2026-11-21.", "",
     "Status categories (see article-draft.md):", "",
     "- **Officially permitted**: an authoritative operator source, read by us, explicitly permits it, subject to its published requirements.",
     "- **Conditionally permitted**: an authoritative operator source, read by us, says it may be approved individually or only in specified circumstances.",
     "- **Not permitted**: an authoritative operator source, read by us, explicitly says it is not allowed from its vessels.",
     "- **Unverified**: no authoritative evidence read (search summaries and secondary sources do not count). Never read as yes or no.", "",
     "Rows marked (charter) are charter operators kept as context, not cruise lines.", "",
     "Counts: " + ", ".join(f"{LABEL[k]} {counts.get(k,0)}" for k in LABEL) + f" (total {sum(counts.values())}).", ""]
cur = None
for g, r, url, ver in rows:
    if g != cur:
        cur = g
        L += ["", f"## {g}", "", "| Operator | Region | Fleet | Status | Evidence | Latest check | Best official URL | Verified | Key restrictions | Unresolved |",
              "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    unres = short("; ".join(r.get("unresolved",[])) or "None", 200)
    latest = R3.get(r.get("round3",""), "") or R2.get(r.get("round2",""),"")
    L.append("| " + " | ".join([cell(r["name"]) + (" (charter)" if r.get("notCruiseLine") else ""), short(", ".join(r.get("regions",[])),80), cell(r.get("fleetType","")), LABEL[r["status"]],
        cell(r["evidenceLevel"]), latest, cell(url), cell(ver), restrictions(r), unres]) + " |")
open(os.path.join(HERE,"register.md"),"w").write("\n".join(L)+"\n")
print(counts)
