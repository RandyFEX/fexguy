import json, collections, sys, re
D = sys.argv[1]
pages = json.load(open(D + '/pages.json')); crawl = json.load(open(D + '/live/crawl.json')); S = json.load(open(D + '/index-sets.json'))
idx = set(S['indexable']); noidx = set(S['noindex'])
P = lambda u: u.replace('https://funeralfunds.com', '')
CONTEXT = {'content', 'related', 'hubnav', 'toc'}
inc = collections.defaultdict(lambda: collections.defaultdict(set)); out = collections.defaultdict(lambda: collections.defaultdict(set))
via_redirect = []; broken = []; nofollow = []; generic = []; anchors = collections.defaultdict(collections.Counter); empty = []
GENERIC = re.compile(r'^(click here|here|read more|learn more|more|this|link|this page|this article|go|details|continue|read this|click)$', re.I)
for u, p in pages.items():
    if u not in idx and u not in noidx: pass
    for l in p['links']:
        if not l['internal'] or l['samePage']: continue
        t = l['abs']; tr = crawl.get(t)
        st = tr['status'] if tr else None
        reg = l['region']
        if reg == 'script': continue
        if st in (301, 302, 307, 308): via_redirect.append((P(u), P(t), tr.get('location'), l['text'][:60], reg))
        if st == 404: broken.append((P(u), P(t), l['text'][:60], reg))
        if l.get('rel') and 'nofollow' in l['rel']: nofollow.append((P(u), P(t), l['text'][:60]))
        txt = l['text'] or l.get('aria') or l.get('imgalt') or ''
        if not txt.strip(): empty.append((P(u), P(t), reg))
        if GENERIC.match(l['text'].strip()) and reg in CONTEXT: generic.append((P(u), P(t), l['text']))
        if t != u:
            inc[t][reg].add(u); out[u][reg].add(t)
            if reg in CONTEXT: anchors[t][l['text'].strip().lower()] += 1
# crawl depth BFS (all regions, following only to 200 pages, through redirects)
def resolve(t):
    seen = 0
    while crawl.get(t, {}).get('status') in (301, 308) and seen < 5:
        loc = crawl[t]['location']; t = ('https://funeralfunds.com' + loc) if loc.startswith('/') else loc; seen += 1
    return t
def bfs(regions):
    start = 'https://funeralfunds.com/'; depth = {start: 0}; q = [start]
    while q:
        u = q.pop(0)
        for reg, ts in out[u].items():
            if regions and reg not in regions: continue
            for t in ts:
                t = resolve(t)
                if t in pages and t not in depth and pages[t]['status'] == 200: depth[t] = depth[u] + 1; q.append(t)
    return depth
dall = bfs(None); dctx = bfs(CONTEXT | {'breadcrumb'})
rows = []
for u in sorted(idx):
    r = inc[u]
    srcs_all = set().union(*r.values()) if r else set()
    ctx = set().union(*(r[k] for k in CONTEXT if k in r)) if r else set()
    body = r.get('content', set())
    rows.append({'url': P(u), 'inAllPages': len(srcs_all), 'inContentPages': len(body), 'inContextPages': len(ctx), 'inNav': len(r.get('nav', ())), 'inFooter': len(r.get('footer', ())), 'inBreadcrumb': len(r.get('breadcrumb', ())), 'inRelated': len(r.get('related', ())), 'inHub': len(r.get('hubnav', ())), 'inSidebar': len(r.get('sidebar', ())),
                 'outContent': len(out[u].get('content', ())), 'depthAll': dall.get(u), 'depthContextual': dctx.get(u), 'contentWords': pages[u]['contentWords'],
                 'topAnchors': anchors[u].most_common(3)})
json.dump({'rows': rows, 'viaRedirect': via_redirect, 'broken': broken, 'nofollow': nofollow, 'generic': generic, 'empty': empty,
           'edges': [[P(u), reg, P(t)] for u in out for reg, ts in out[u].items() for t in ts]}, open(D + '/links.json', 'w'))
c = collections.Counter
print('indexable', len(rows))
print('orphans (no internal link from any page):', [r['url'] for r in rows if r['inAllPages'] == 0])
print('no contextual in-links (body/related/hub):', len([r for r in rows if r['inContextPages'] == 0]))
print('no body-text in-links:', len([r for r in rows if r['inContentPages'] == 0]))
print('depth all:', c(r['depthAll'] for r in rows)); print('depth contextual+breadcrumb:', c(r['depthContextual'] for r in rows))
print('via redirect', len(via_redirect), via_redirect[:5]); print('broken', len(broken), broken[:5]); print('nofollow', len(nofollow), nofollow[:5]); print('generic', len(generic), generic[:8]); print('empty', len(empty), c(e[2] for e in empty), empty[:5])
print('in-links pages distribution (context):', c(min(r['inContextPages'], 10) for r in rows))
