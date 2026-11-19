import json, csv, os, sys, collections, re
D, OUT, REPO = sys.argv[1], sys.argv[2], sys.argv[3]
pages = json.load(open(D + '/pages.json')); crawl = json.load(open(D + '/live/crawl.json')); S = json.load(open(D + '/index-sets.json'))
L = json.load(open(D + '/links.json')); O = json.load(open(D + '/opps.json'))
rows = {r['url']: r for r in L['rows']}; idx = set(S['indexable']); noidx = set(S['noindex']); sm = set(S['sitemap'])
P = lambda u: u.replace('https://funeralfunds.com', '')
live = set(O['phase1Live'])
def nodes(x):
    if isinstance(x, list):
        for i in x: yield from nodes(i)
    elif isinstance(x, dict):
        if '@graph' in x: yield from nodes(x['@graph'])
        else: yield x
SEV = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'EDITORIAL REVIEW REQUIRED', 'UNVERIFIED', 'OK']
prop_targets = collections.Counter(p['target'] for p in O['proposals'])
out = []; issue_counts = collections.Counter()
INTENTIONAL_NOINDEX = {'/888-672-0762/','/blog/','/buyer-info/','/call-now/','/congratulations/','/facebook/','/forms/','/free-quote/','/funeral-relief-program/','/get-help/','/get-rates/','/health-question-search-preview/','/help/','/lbl/','/pricing/','/rates-from-randy/','/roku/','/search/','/senior-benefits/','/trin-fbl/','/welcome/'}
for u, rec in sorted(crawl.items()):
    p = P(u); st = rec['status']; pg = pages.get(u)
    iss = []
    if st == 200 and pg:
        arts = [n for j in pg['jsonld'] for n in nodes(j) if n.get('@type') == 'Article']
        crumbs = [n for j in pg['jsonld'] for n in nodes(j) if n.get('@type') == 'BreadcrumbList']
        if u in noidx:
            if p in ('/editorial-guidelines/', '/licenses/', '/terms-of-use/'): iss.append(('MEDIUM', 'T1 trust page is noindex, nofollow'))
            elif '?' in p: pass
            elif not (p in INTENTIONAL_NOINDEX or p.startswith('/blog/page/')): iss.append(('LOW', 'noindex page (confirm intent)'))
        if u in idx:
            r = rows[p]
            if p in ('/funeral-cost-map/', '/life-insurance-health-questions/'): iss.append(('HIGH', 'L1 research/tool page has no contextual (in-text) links; menu links only'))
            elif r['inContextPages'] == 0: iss.append(('HIGH', 'L2 no contextual in-links'))
            elif r['inContextPages'] == 1: iss.append(('HIGH', 'L3 only one page links to it in context (usually a hub list)'))
            if r['depthContextual'] is None or (r['depthContextual'] or 0) >= 4: iss.append(('MEDIUM', f"L4 contextual click depth {r['depthContextual'] if r['depthContextual'] is not None else 'unreachable'} (menu depth {r['depthAll']})"))
            if not pg['meta'].get('description'): iss.append(('EDITORIAL REVIEW REQUIRED', 'M1 no meta description'))
            if arts and not arts[0].get('image'): iss.append(('EDITORIAL REVIEW REQUIRED', 'S1 Article markup has no image (and no og:image): needs a representative image'))
            if arts and not (arts[0].get('datePublished') and arts[0].get('dateModified')): iss.append(('LOW', 'S2 Article markup missing datePublished/dateModified'))
            if any(isinstance(li.get('position'), str) for c in crumbs for li in c.get('itemListElement', [])): iss.append(('MEDIUM', 'S3 BreadcrumbList position given as text, not Integer (migrated JSON-LD)'))
            if crumbs and not any(l['region'] == 'breadcrumb' for l in pg['links']): iss.append(('MEDIUM', 'S4 BreadcrumbList markup but no visible breadcrumb trail'))
            if p in ('/about/', '/contact/'): iss.append(('LOW', 'S5 page typed as Article (About/Contact page)'))
            if p == '/randy-vandervaate/': iss.append(('MEDIUM', 'S6 author profile page has no ProfilePage markup'))
            big = [i['src'] for i in pg['images'] if i['region'] == 'content' and i['src'] and not i['inpicture'] and not i['srcset'] and os.path.exists(REPO + '/public' + i['src'].split('?')[0]) and os.path.getsize(REPO + '/public' + i['src'].split('?')[0]) > 300_000]
            if big: iss.append(('MEDIUM', f'I1 {len(big)} content image(s) over 300 KB with no responsive/modern variants'))
            nod = [i['src'] for i in pg['images'] if i['region'] in ('content', 'other') and not (i['width'] and i['height'])]
            if nod: iss.append(('LOW', 'I2 image without width/height attributes'))
            content = [i for i in pg['images'] if i['region'] == 'content']
            if content and content[0]['loading'] == 'lazy': iss.append(('LOW', 'I3 first content image is lazy-loaded (check if above the fold)'))
            if any(l.get('rel') and 'nofollow' in l['rel'] and l['internal'] for l in pg['links']): iss.append(('LOW', 'L5 internal link with rel=nofollow'))
            if p in prop_targets: iss.append(('EDITORIAL REVIEW REQUIRED', f'L6 {prop_targets[p]} proposed contextual link(s) to this page (link-proposals.csv)'))
            if p == '/life-insurance-health-questions/': iss.append(('EDITORIAL REVIEW REQUIRED', 'A1 only ~130 words of crawlable text; tool results are not crawlable by design'))
        if '?state=' in p: iss.append(('LOW', 'D1 parameter URL linked with <a href>; canonical points to /funeral-cost-map/ (correct)'))
    elif st in (301, 308):
        if p.startswith('/search/$'): iss.append(('LOW', 'D2 URL-like string in inline script (not a real link)'))
    elif st == 404:
        if '$%7B' in p: iss.append(('LOW', 'D2 URL-like string in inline script (not a real link)'))
    for s, t in iss: issue_counts[(s, t.split(' ')[0])] += 1
    sev = min((SEV.index(s) for s, _ in iss), default=6)
    r = rows.get(p, {})
    out.append({'url': p, 'status': st, 'redirectTo': rec.get('location') or '', 'indexable': 'yes' if u in idx else ('noindex' if u in noidx else ('n/a' if st != 200 else 'no')),
                'inSitemap': 'yes' if u in sm else 'no', 'canonical': P((pg or {}).get('canonical', [''])[0] if pg and pg.get('canonical') else ''),
                'phase1Migrated': 'yes' if p in live else 'no', 'contextualInlinkPages': r.get('inContextPages', ''), 'allInlinkPages': r.get('inAllPages', ''),
                'depthViaMenu': r.get('depthAll', ''), 'depthContextual': r.get('depthContextual', ''), 'title': (pg or {}).get('title', ''), 'severity': SEV[sev], 'findings': '; '.join(t for _, t in iss)})
with open(OUT + '/url-audit.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
print(len(out), collections.Counter(r['severity'] for r in out))
for k, v in sorted(issue_counts.items()): print(k, v)
