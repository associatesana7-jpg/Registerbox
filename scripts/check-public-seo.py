"""Validate exported public HTML, metadata, headings, schema and local links."""
import json, sys, xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
root=Path(sys.argv[1] if len(sys.argv)>1 else 'dist')
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.h=[];self.links=[];self.canonical=[];self.meta={};self.ids=set();self.title=0;self.schema=[];self.script=False;self.buffer=''
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['h1','h2','h3','h4','h5','h6']:self.h.append(int(tag[1]))
  if tag=='title':self.title+=1
  if 'id' in a:self.ids.add(a['id'])
  if tag=='a' and 'href' in a:self.links.append(a['href'])
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if tag=='meta':self.meta.setdefault(a.get('name',a.get('property')),[]).append(a.get('content',''))
  if tag=='script' and a.get('type')=='application/ld+json':self.script=True;self.buffer=''
 def handle_data(self,data):
  if self.script:self.buffer+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.script:self.schema.append(json.loads(self.buffer));self.script=False

def file_for(path):
 path=unquote(path).strip('/')
 candidate = root/'index.html' if not path else root/(path if Path(path).suffix else path+'.html')
 return candidate if candidate.exists() else root/path/'index.html'
errors=[];count=0
for loc in ET.parse(root/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
 url=loc.text;path=urlparse(url).path;file=file_for(path);count+=1
 if not file.exists():errors.append(f'{path}: missing HTML');continue
 page=Page();page.feed(file.read_text())
 if page.h.count(1)!=1:errors.append(f'{path}: expected one H1: {page.h}')
 if any(b>a+1 for a,b in zip(page.h,page.h[1:])):errors.append(f'{path}: heading level skipped: {page.h}')
 if page.title!=1:errors.append(f'{path}: title count {page.title}')
 if page.canonical!=[url]:errors.append(f'{path}: canonical {page.canonical}')
 if len(page.meta.get('description',[]))!=1:errors.append(f'{path}: missing/duplicate description')
 if any('noindex' in v for v in page.meta.get('robots',[])):errors.append(f'{path}: noindex')
 if not page.schema:errors.append(f'{path}: missing schema')
 for key in ['og:image','og:title','og:description','og:url','twitter:card']:
  if key not in page.meta:errors.append(f'{path}: missing {key}')
 for href in page.links:
  u=urlparse(href)
  if u.scheme or u.netloc:continue
  if not u.path:
   if u.fragment and u.fragment not in page.ids:errors.append(f'{path}: broken anchor {href}')
  elif u.path.startswith('/') and not file_for(u.path).exists():errors.append(f'{path}: broken link {href}')
for path in ['/auth','/auth/otp','/dashboard','/control-center','/documents']:
 page=Page();page.feed(file_for(path).read_text())
 if not any('noindex' in v for v in page.meta.get('robots',[])):errors.append(f'{path}: missing private noindex')
# Package offers must be visible in static HTML and agree with the public feed.
feed=json.loads((root/'service-feed.json').read_text())
if len(feed.get('services',[]))!=14:errors.append('service-feed: expected 14 paid packages')
for item in feed.get('services',[]):
 path=urlparse(item['canonical_url']).path
 file=file_for(path)
 if not file.exists():errors.append(f'{path}: missing package landing page');continue
 page=Page();raw=file.read_text();page.feed(raw)
 offers=[offer for graph in page.schema for node in graph.get('@graph',[]) if node.get('@type')=='Service' for offer in node.get('offers',[])]
 offer=next((offer for offer in offers if offer.get('@id','').endswith('#package-'+item['id'])),None)
 if not offer:errors.append(f'{path}: missing Service/Offer for {item["id"]}')
 elif offer.get('price')!=item['price'] or offer.get('priceCurrency')!='INR':errors.append(f'{path}: offer price mismatch for {item["id"]}')
 if item['id'] not in page.ids and 'package-'+item['id'] not in page.ids:errors.append(f'{path}: package anchor missing for {item["id"]}')
 if '/checkout?package='+item['id'] not in page.links:errors.append(f'{path}: checkout link missing for {item["id"]}')
 if item['price']<1:errors.append(f'{path}: paid package below minimum amount')
 if 'No GST' not in raw:errors.append(f'{path}: service fee GST disclosure missing')
if feed.get('free_service',{}).get('price')!=0:errors.append('service-feed: missing free nil GST offer')
robots=(root/'robots.txt').read_text()
if 'Sitemap: https://www.registerbox.in/sitemap.xml' not in robots:errors.append('robots: missing sitemap')
if 'Disallow: /services' in robots:errors.append('robots: public service pages blocked')
assert (root/'images/registerbox-og.jpg').exists()
print(f'Checked {count} public pages and 5 private routes.');print('\n'.join(errors) if errors else 'All SEO and internal-link checks pass.')
sys.exit(bool(errors))
