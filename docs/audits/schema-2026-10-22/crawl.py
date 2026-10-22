import concurrent.futures, datetime, hashlib, json, pathlib, re, urllib.parse, urllib.request, urllib.error, xml.etree.ElementTree as ET
from html.parser import HTMLParser

BASE='https://www.registerbox.in'
OUT=pathlib.Path(__file__).resolve().parent
RAW=pathlib.Path('/tmp/registerbox-schema-html');RAW.mkdir(exist_ok=True)

class Node:
    def __init__(self,tag='',attrs=None,parent=None):self.tag=tag;self.attrs=dict(attrs or []);self.parent=parent;self.children=[]
    def text(self):return re.sub(r'\s+',' ',''.join(c if isinstance(c,str) else c.text()+' ' for c in self.children)).strip()
    def descendants(self):
        for c in self.children:
            if isinstance(c,Node):yield c;yield from c.descendants()
    def hasclass(self,c):return c in self.attrs.get('class','').split()
class Parser(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.root=Node('root');self.current=self.root
    def handle_starttag(self,t,a):
        n=Node(t,a,self.current);self.current.children.append(n)
        if t not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.current=n
    def handle_startendtag(self,t,a):self.handle_starttag(t,a);self.handle_endtag(t)
    def handle_endtag(self,t):
        n=self.current
        while n.parent:
            if n.tag==t:self.current=n.parent;break
            n=n.parent
    def handle_data(self,t):self.current.children.append(t)

def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':'RegisterBox-Structured-Data-Audit/1.0'})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return r.status,r.url,dict(r.headers),r.read().decode('utf-8',errors='replace')
    except urllib.error.HTTPError as e:return e.code,e.url,dict(e.headers),e.read().decode('utf-8',errors='replace')
    except Exception as e:return None,url,{},str(e)

def nodes(value):
    if isinstance(value,dict):
        if '@type' in value:yield value
        for v in value.values():yield from nodes(v)
    elif isinstance(value,list):
        for v in value:yield from nodes(v)

def crawl(url):
    status,final,headers,html=fetch(url)
    slug=urllib.parse.urlparse(url).path.strip('/').replace('/','__') or 'home'
    raw=RAW/(slug+'.html');raw.write_text(html)
    p=Parser();p.feed(html);allnodes=list(p.root.descendants())
    schema=[];errors=[]
    for n in allnodes:
        if n.tag=='script' and n.attrs.get('type')=='application/ld+json':
            try:schema.append(json.loads(''.join(c for c in n.children if isinstance(c,str))))
            except Exception as e:errors.append(str(e))
    def select(tag):return [n for n in allnodes if n.tag==tag]
    metas={n.attrs.get('name',n.attrs.get('property')):n.attrs.get('content') for n in select('meta')}
    faqs=[]
    for n in allnodes:
        if n.hasclass('rbg-faq') or n.tag=='details':
            children=list(n.descendants());q=next((x for x in children if x.tag in ['h3','summary']),None)
            if q:
                # Include lists and other visible answer blocks, not only paragraphs.
                def without_question(node):
                    if node is q:return ''
                    return ' '.join(c if isinstance(c,str) else without_question(c) for c in node.children)
                answer=re.sub(r'\s+',' ',without_question(n)).strip()
                if answer:faqs.append({'question':q.text(),'answer':answer})
    mains=select('main');main=mains[0] if mains else p.root
    return {'url':url,'status':status,'finalUrl':final,'etag':headers.get('etag'), 'sha256':hashlib.sha256(html.encode()).hexdigest(),'rawFile':str(raw),'title':[n.text() for n in select('title')], 'canonical':[n.attrs['href'] for n in select('link') if n.attrs.get('rel')=='canonical'], 'description':metas.get('description'),'robots':metas.get('robots'),'ogImage':metas.get('og:image'),'h1':[n.text() for n in select('h1')],'headings':[{'tag':n.tag,'text':n.text(),'id':n.attrs.get('id')} for n in allnodes if n.tag in ['h2','h3']], 'schema':schema,'parseErrors':errors,'types':sorted(set(t for n in nodes(schema) for t in (n['@type'] if isinstance(n['@type'],list) else [n['@type']]))),'links':sorted(set(n.attrs['href'] for n in select('a') if 'href' in n.attrs)),'images':[n.attrs for n in select('img')], 'addresses':[n.text() for n in select('address')],'times':[{'text':n.text(),**n.attrs} for n in select('time')],'faqs':faqs,'mainText':main.text()}

status,final,headers,sitemap=fetch(BASE+'/sitemap.xml')
assert status==200,(status,sitemap)
OUT.mkdir(exist_ok=True,parents=True);(OUT/'live-sitemap.xml').write_text(sitemap)
urls=[loc.text for loc in ET.fromstring(sitemap).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
extra=['/privacy','/delete-account','/services/free-nil-gst-filing','/services/business-licence-bengaluru','/services/business-licence-new-thippasandra','/services/business-licence-marathahalli']
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:pages=list(ex.map(crawl,urls+[BASE+x for x in extra if BASE+x not in urls]))
evidence={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sitemapCount':len(urls),'sitemapUrls':urls,'pages':pages}
(OUT/'live-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
for p in pages:print(p['status'],urllib.parse.urlparse(p['url']).path,','.join(p['types']),'FAQ='+str(len(p['faqs'])),'PARSE='+str(len(p['parseErrors'])))
print('Saved evidence:',OUT/'live-evidence.json')
