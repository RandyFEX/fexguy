import json, re, sys, os
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote
D = sys.argv[1]
crawl = json.load(open(D + '/live/crawl.json'))
HOST = 'funeralfunds.com'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr','param'}
def region_of(stack):
    # innermost-first decision
    for tag, a in reversed(stack):
        cls = a.get('class', '') or ''
        if a.get('aria-label') == 'Breadcrumb' or 'crumbs' in cls.split(): return 'breadcrumb'
        if a.get('data-article-part') == 'toc' or 'toc' in cls.split(): return 'toc'
        if 'related' in cls.split(): return 'related'
        if 'author-bio' in cls.split() or a.get('data-article-part') == 'byline': return 'author'
        if 'hub-nav' in cls or a.get('data-hub-nav') is not None: return 'hubnav'
        if tag == 'aside': return 'sidebar'
        if 'pre-footer' in cls.split(): return 'cta'
        if tag == 'footer' and 'site-footer' in cls: return 'footer'
        if tag == 'header' and 'site-header' in cls: return 'nav'
        if tag == 'nav' and (a.get('aria-label') in ('Primary',) or a.get('data-mega-nav') is not None): return 'nav'
        if tag == 'script' or tag == 'template' or tag == 'noscript': return 'script'
    for tag, a in stack:
        if tag == 'main': return 'content'
    return 'other'
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.stack=[]; s.links=[]; s.cur=None; s.meta={}; s.title=None; s.intitle=False
        s.h=[]; s.inh=None; s.htext=''; s.jsonld=[]; s.injs=False; s.js=''; s.imgs=[]; s.canon=[]; s.text_main=0; s.inmain=0
        s.robots=[]; s.hreflang=[]; s.inbody_words=0; s.instyle=False
    def handle_starttag(s, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href') is not None:
            s.cur = {'href': a['href'], 'text': '', 'region': region_of(s.stack), 'rel': a.get('rel'), 'aria': a.get('aria-label'), 'title': a.get('title'), 'imgalt': None}
        if tag == 'img':
            s.imgs.append({**{k: a.get(k) for k in ('src','srcset','sizes','width','height','loading','fetchpriority','decoding','alt')}, 'region': region_of(s.stack), 'inpicture': any(t=='picture' for t,_ in s.stack)})
            if s.cur is not None: s.cur['imgalt'] = a.get('alt')
        if tag == 'meta':
            n = (a.get('name') or a.get('property') or '').lower()
            if n: s.meta.setdefault(n, []).append(a.get('content'))
            if n in ('robots','googlebot'): s.robots.append((n, a.get('content')))
        if tag == 'link':
            rel = (a.get('rel') or '').lower()
            if rel == 'canonical': s.canon.append(a.get('href'))
            if rel == 'alternate' and a.get('hreflang'): s.hreflang.append((a.get('hreflang'), a.get('href')))
        if tag == 'title' and not any(t=='svg' for t,_ in s.stack): s.intitle=True; s.title=''
        if re.fullmatch(r'h[1-6]', tag): s.inh=int(tag[1]); s.htext=''
        if tag == 'script' and (a.get('type') or '') == 'application/ld+json': s.injs=True; s.js=''
        if tag == 'main': s.inmain += 1
        if tag in ('script','style'): s.instyle=True
        if tag not in VOID: s.stack.append((tag, a))
    def handle_endtag(s, tag):
        if tag == 'a' and s.cur is not None: s.cur['text']=re.sub(r'\s+',' ',s.cur['text']).strip(); s.links.append(s.cur); s.cur=None
        if tag == 'title' and s.intitle: s.intitle=False
        if s.inh and tag == f'h{s.inh}': s.h.append((s.inh, re.sub(r'\s+',' ',s.htext).strip(), region_of(s.stack))); s.inh=None
        if tag == 'script' and s.injs: s.jsonld.append(s.js); s.injs=False
        if tag == 'main': s.inmain -= 1
        if tag in ('script','style'): s.instyle=False
        for i in range(len(s.stack)-1, -1, -1):
            if s.stack[i][0] == tag: del s.stack[i:]; break
    def handle_data(s, d):
        if s.cur is not None: s.cur['text'] += d
        if s.intitle: s.title += d
        if s.inh: s.htext += d
        if s.injs: s.js += d
        if s.inmain and not s.instyle and region_of(s.stack) == 'content': s.inbody_words += len(d.split())
def norm(u, base):
    try: x = urlsplit(urljoin(base, u))
    except Exception: return None
    if x.scheme not in ('http','https'): return None
    return urlunsplit((x.scheme, x.netloc.lower(), x.path or '/', x.query, ''))
pages = {}
for url, rec in crawl.items():
    if not rec.get('file'): continue
    p = P(); html = open(D + '/live/html/' + rec['file'], encoding='utf8', errors='replace').read(); p.feed(html)
    links = []
    for l in p.links:
        n = norm(l['href'], url)
        if not n: continue
        internal = urlsplit(n).netloc == HOST
        same_page = n.split('#')[0] == url or l['href'].startswith('#')
        links.append({**l, 'abs': n.split('#')[0], 'internal': internal, 'samePage': same_page, 'httpScheme': n.startswith('http://')})
    jl = []
    for j in p.jsonld:
        try: jl.append(json.loads(j))
        except Exception as e: jl.append({'__invalid__': str(e)[:120]})
    pages[url] = {'status': rec['status'], 'xRobots': rec.get('xRobots'), 'title': (p.title or '').strip(), 'meta': {k: v for k, v in p.meta.items() if k in ('description','robots','googlebot','og:title','og:url','og:image','og:type','twitter:card','twitter:image','viewport','og:description')},
        'robots': p.robots, 'canonical': p.canon, 'hreflang': p.hreflang, 'headings': p.h, 'jsonld': jl, 'images': p.imgs, 'links': links, 'contentWords': p.inbody_words, 'bytes': rec['bytes'], 'ms': rec['ms']}
json.dump(pages, open(D + '/pages.json', 'w'))
print(len(pages))
