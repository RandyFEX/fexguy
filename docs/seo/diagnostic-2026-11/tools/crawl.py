# Live production crawl of funeralfunds.com (no redirect following; records each hop).
import json, os, re, ssl, sys, threading, time, urllib.request, urllib.error, hashlib, gzip
from urllib.parse import urljoin, urlsplit, urlunsplit
from concurrent.futures import ThreadPoolExecutor
OUT = sys.argv[1]; REPO = sys.argv[2]
os.makedirs(OUT + '/html', exist_ok=True)
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
opener = urllib.request.build_opener(NoRedir, urllib.request.HTTPSHandler(context=CTX), urllib.request.ProxyHandler())
UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 FuneralFunds-SEO-Diagnostic'
HOST = 'funeralfunds.com'
def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
    t = time.time()
    try:
        r = opener.open(req, timeout=40); code = r.status; hdr = dict(r.headers); body = r.read()
    except urllib.error.HTTPError as e:
        code = e.code; hdr = dict(e.headers); body = e.read() if code < 300 or code >= 400 else b''
    except Exception as e:
        return {'url': url, 'status': 0, 'error': str(e)}
    if hdr.get('Content-Encoding') == 'gzip' or hdr.get('content-encoding') == 'gzip':
        try: body = gzip.decompress(body)
        except Exception: pass
    h = {k.lower(): v for k, v in hdr.items()}
    rec = {'url': url, 'status': code, 'ms': int((time.time()-t)*1000), 'location': h.get('location'), 'contentType': h.get('content-type'),
           'xRobots': h.get('x-robots-tag'), 'cacheControl': h.get('cache-control'), 'bytes': len(body), 'link': h.get('link'), 'server': h.get('server')}
    if code == 200 and 'text/html' in (h.get('content-type') or ''):
        fn = hashlib.sha1(url.encode()).hexdigest() + '.html'
        open(OUT + '/html/' + fn, 'wb').write(body); rec['file'] = fn
    elif code == 200 and url.endswith('.xml') or url.endswith('.txt'):
        rec['text'] = body.decode('utf8', 'replace')
    return rec
def norm(u):
    s = urlsplit(u)
    if s.scheme not in ('http', 'https'): return None
    return urlunsplit(('https', s.netloc.lower(), s.path or '/', s.query, ''))
results = {}; lock = threading.Lock()
seeds = ['https://funeralfunds.com/', 'https://funeralfunds.com/robots.txt', 'https://funeralfunds.com/sitemap-index.xml', 'https://funeralfunds.com/sitemap-0.xml', 'https://funeralfunds.com/llms.txt']
# built pages
dist = REPO + '/dist'
for root, d, files in os.walk(dist):
    if 'index.html' in files and '/_astro' not in root and '/pagefind' not in root:
        p = root[len(dist):] + '/'; seeds.append('https://funeralfunds.com' + p.replace('//', '/'))
vj = json.load(open(REPO + '/vercel.json'))
for r in vj.get('redirects', []):
    if '(' not in r['source'] and ':' not in r['source']: seeds.append('https://funeralfunds.com' + r['source'])
queue = list(dict.fromkeys(seeds)); seen = set(queue)
HREF = re.compile(r'<a\b[^>]*?\bhref\s*=\s*"([^"]+)"', re.I)
def work(url):
    rec = fetch(url); out = []
    if rec.get('file'):
        html = open(OUT + '/html/' + rec['file'], encoding='utf8', errors='replace').read()
        for h in HREF.findall(html):
            h = h.replace('&amp;', '&')
            n = norm(urljoin(url, h))
            if n and urlsplit(n).netloc == HOST and not re.search(r'\.(pdf|jpg|jpeg|png|webp|avif|svg|gif|xml|txt|ico|js|css)$', urlsplit(n).path, re.I): out.append(n.split('#')[0])
    if rec.get('status') in (301, 302, 307, 308) and rec.get('location'):
        n = norm(urljoin(url, rec['location']))
        if n and urlsplit(n).netloc == HOST: out.append(n)
    return rec, out
with ThreadPoolExecutor(8) as ex:
    while queue and len(results) < 3000:
        batch, queue = queue[:64], queue[64:]
        for rec, out in ex.map(work, batch):
            results[rec['url']] = rec
            for n in out:
                if n not in seen: seen.add(n); queue.append(n)
json.dump(results, open(OUT + '/crawl.json', 'w'), indent=0)
from collections import Counter
print(len(results), Counter(r['status'] for r in results.values()))
