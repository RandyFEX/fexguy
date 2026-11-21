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
def cell(s): return " ".join(str(s).replace("|","/").split())
def short(s, n=160):
    s = cell(s); return s if len(s) <= n else s[:n-3].rsplit(" ",1)[0] + "..."
def restrictions(r):
    a = r["answers"]; out = []
    for k, lab in [("distanceOffshore","Distance"),("leadTime","Notice"),("containerRequirements","Container"),("deathOrCremationCertificate","Documents"),("fees","Fees")]:
        v = a.get(k, {})
        if v.get("basis") in ("official","secondary"):
            out.append(f"{lab}: {short(v['answer'],110)}" + (" (secondary)" if v["basis"]=="secondary" else ""))
    return "; ".join(out) or "None published"
rows = []; counts = {}
for f, g in GROUPS:
    for r in json.load(open(os.path.join(HERE,"research",f))):
        counts[r["status"]] = counts.get(r["status"],0)+1
        off = [s for s in r["sources"] if s["type"].startswith("official") or s["type"]=="passenger-contract"]
        url = off[0]["url"] if off else "none found"
        ver = off[0]["verified"] if off and r.get("wordingConfirmed") else ("not confirmed" if off else "")
        rows.append((g, r, url, ver))
L = ["# Research register: cruise ship ash scattering (round 2)", "",
     "Generated from `research/operators-*.json` by `tools/build_register.py`.",
     "Do not edit by hand; edit the JSON and rebuild. Checked 2026-11-21.", "",
     "Status categories (see article-draft.md):", "",
     "- **Officially permitted**: the line's own page, read in round 2, says it allows it and explains how.",
     "- **Conditionally permitted**: the line's own material says it may be possible case by case, or the official wording could not yet be confirmed from the page (round 1 search summary only).",
     "- **Not permitted**: the line's own page says it does not offer it from the ship.",
     "- **Unverified**: no official statement found. Never read as yes or no.", "",
     "Counts: " + ", ".join(f"{LABEL[k]} {counts.get(k,0)}" for k in LABEL) + f" (total {sum(counts.values())}).", ""]
cur = None
for g, r, url, ver in rows:
    if g != cur:
        cur = g
        L += ["", f"## {g}", "", "| Operator | Region | Fleet | Status | Evidence | Round 2 check | Best official URL | Verified | Key restrictions | Unresolved |",
              "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    unres = short("; ".join(r.get("unresolved",[])) or "None", 200)
    L.append("| " + " | ".join([cell(r["name"]), short(", ".join(r.get("regions",[])),80), cell(r.get("fleetType","")), LABEL[r["status"]],
        cell(r["evidenceLevel"]), R2.get(r.get("round2",""),""), cell(url), cell(ver), restrictions(r), unres]) + " |")
open(os.path.join(HERE,"register.md"),"w").write("\n".join(L)+"\n")
print(counts)
