import json, re, sys, collections
from html.parser import HTMLParser
D = sys.argv[1]; REPO = sys.argv[2]
pages = json.load(open(D + '/pages.json')); crawl = json.load(open(D + '/live/crawl.json')); L = json.load(open(D + '/links.json'))
S = json.load(open(D + '/index-sets.json')); idx = set(S['indexable'])
P = lambda u: u.replace('https://funeralfunds.com', '')
sys.path.insert(0, D + '/tools')
from analyze_region import region_of
class T(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.stack = []; s.ina = 0; s.blocks = []; s.cur = None; s.skip = 0
    def handle_starttag(s, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript', 'template'): s.skip += 1
        if tag == 'a': s.ina += 1
        if tag in ('p', 'li', 'td') and s.cur is None and region_of(s.stack + [(tag, a)]) == 'content' and any(t == 'main' for t, _ in s.stack): s.cur = [tag, '']
        if tag not in ('img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr'): s.stack.append((tag, a))
    def handle_endtag(s, tag):
        if tag in ('script', 'style', 'noscript', 'template'): s.skip -= 1
        if tag == 'a': s.ina -= 1
        if s.cur is not None and tag == s.cur[0]: s.blocks.append(re.sub(r'\s+', ' ', s.cur[1]).strip()); s.cur = None
        for i in range(len(s.stack) - 1, -1, -1):
            if s.stack[i][0] == tag: del s.stack[i:]; break
    def handle_data(s, d):
        if s.cur is not None and not s.skip: s.cur[1] += ('\u0000' * len(d)) if s.ina else d  # mask linked text
def crumbname(u):
    for j in pages[u]['jsonld']:
        g = j.get('@graph', [j]) if isinstance(j, dict) else j
        for n in g:
            if isinstance(n, dict) and n.get('@type') == 'BreadcrumbList' and n.get('itemListElement'):
                li = n['itemListElement'][-1]; return li.get('name') or (li.get('item') or {}).get('name')
    return None
# targets: tools + weakly linked indexable pages
rows = {r['url']: r for r in L['rows']}
targets = {}
for u in idx:
    r = rows[P(u)]
    if r['inContextPages'] <= 2 or P(u) in ('/funeral-cost-map/', '/life-insurance-health-questions/', '/12-step-final-planning-guide/', '/final-expense-life-insurance-book/', '/burial-insurance-calculator/'):
        targets[u] = r
MANUAL = {'/funeral-cost-map/': ['funeral costs by state', 'funeral costs in your state', 'average funeral cost', 'funeral costs vary', 'cost of a funeral', 'funeral costs'],
          '/life-insurance-health-questions/': ['health questions', 'application questions', 'medical questions'],
          '/12-step-final-planning-guide/': ['final planning', 'funeral planning', 'plan a funeral', 'planning guide'],
          '/burial-insurance-calculator/': ['burial insurance calculator', 'how much coverage', 'how much burial insurance'],
          '/final-expense-life-insurance-book/': ['final expense life insurance book']}
srcblocks = {}
for u in idx:
    t = T(); t.feed(open(D + '/live/html/' + crawl[u]['file'], encoding='utf8', errors='replace').read()); srcblocks[u] = t.blocks
linked = collections.defaultdict(set)
for s, reg, t in L['edges']:
    if reg in ('content', 'related', 'hubnav', 'toc', 'breadcrumb'): linked[s].add(t)
live = set()
for root in ['src/content/pages']:
    import os
    for dp, dn, fn in os.walk(REPO + '/' + root):
        for f in fn:
            if f.endswith('.md'):
                txt = open(dp + '/' + f, encoding='utf8').read()
                if re.search(r'^source:\s*"?live', txt, re.M):
                    rel = (dp + '/' + f)[len(REPO + '/src/content/pages'):].replace('.md', '/').replace('/index/', '/')
                    live.add(rel if rel != '/index/' else '/')
props = []; nohit = []
STOP = {'burial','insurance','life','final','expense','review','with','pros','cons','what','your'}
BADCTX = re.compile(r'(?i)estate planning guide|\\(pdf\\)')
PREFER = {'/funeral-cost-map/': ['/how-much-does-a-funeral-cost/', '/cremation-cost-and-info/', '/burial-vs-cremation/', '/pay-for-a-funeral-without-life-insurance/', '/how-much-does-final-expense-insurance-cost/', '/what-to-do-when-a-loved-one-dies/'],
  '/life-insurance-health-questions/': ['/final-expense-life-insurance-pre-existing-conditions/', '/burial-insurance/how-to-apply-for-burial-insurance/', '/declined-for-life-insurance/', '/burial-insurance/copd/', '/a-z-health/', '/burial-insurance/'],
  '/12-step-final-planning-guide/': ['/what-to-do-when-a-loved-one-dies/', '/how-much-does-a-funeral-cost/', '/prepaid-funeral/'],
  '/burial-insurance-calculator/': ['/how-much-does-final-expense-insurance-cost/', '/how-much-does-a-funeral-cost/', '/what-is-burial-insurance/']}
ACRO = re.compile(r'^[A-Z0-9-]{2,6}$')
AMBIG = {'senior life','senior legacy','senior legacy life','open care','ethos','aarp','state farm','veterans','widows','seniors','over 80','over 70','online','cheap','scams','buyers guide','hospice patients','disabled persons','native americans','pastors and congregations','children and grandchildren','employees','term for doctors','term for truckers','is worth it?','is worth it','what is','randy vandervaate'}
for tu, r in targets.items():
    tp = P(tu)
    names = MANUAL.get(tp) or []
    cn = crumbname(tu)
    if not names and cn:
        k = re.sub(r'(?i)\b(affordable|burial insurance|final expense( life)? insurance|life insurance|insurance)\b', ' ', cn.replace('\u2019', "'"))
        k = re.sub(r'(?i)^\s*(with an?|with|for|after|and|on|of)\s+|\s+(with|for|after|and|on|of)\s*$', ' ', k)
        k = re.sub(r'(?i)^\s*(with an?|with|for|after|and|on|of)\s+', '', re.sub(r'\s+', ' ', k).strip(' :-?'))
        k = re.sub(r'\s+', ' ', k).strip(' :-?')
        if k.lower() in AMBIG: k = ''
        if len(k) >= 5 or ACRO.match(k): names = [k]
    if not names: continue
    if not names: continue
    found = []
    for su in idx:
        if su == tu or tp in linked[P(su)] or P(su) in ('/reviews/', '/search/', '/', '/privacy-policy/', '/terms-of-use/', '/life-insurance-health-questions/', '/health-question-search-preview/'): continue
        for b in srcblocks[su]:
            hit = None
            for nm in names:
                m = re.search(r'(?<![\w\u0000])' + re.escape(nm) + r'(?![\w\u0000])', b, re.I)
                if m: hit = (nm, m.group(0), b[max(0, m.start() - 70):m.end() + 70].replace('\u0000', ''), m.start()); break
            if hit:
                same_section = P(su).split('/')[1] == tp.split('/')[1]
                found.append({'source': P(su), 'target': tp, 'anchor': hit[1], 'context': hit[2], 'phase1Source': P(su) in live, 'sameSection': same_section, 'manual': tp in MANUAL})
                break
    pref = PREFER.get(tp, [])
    words = lambda x: set(w for w in re.split(r'[^a-z0-9]+', x.lower()) if len(w) > 3 and w not in STOP)
    tw = words(tp + ' ' + ' '.join(names))
    for f in found: f['relevance'] = (10 if f['source'] in pref else 0) + len(words(f['source']) & tw) + (1 if f['sameSection'] else 0)
    found = [f for f in found if not BADCTX.search(f['context'])]
    found.sort(key=lambda f: (-f['relevance'], f['phase1Source']))
    props += found[:3]
    if not found: nohit.append((tp, names))
json.dump({'nohit': nohit, 'targets': [P(u) for u in targets], 'proposals': props, 'phase1Live': sorted(live)}, open(D + '/opps.json', 'w'), indent=1)
print('targets', len(targets), 'proposals', len(props), 'targets with a proposal', len({p['target'] for p in props}))
for p in props[:12]: print(p['source'], '->', p['target'], '|', p['anchor'], '| live' if p['phase1Source'] else '')
