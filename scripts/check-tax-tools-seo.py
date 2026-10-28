"""Validate shipped tax-tool HTML without depending on JavaScript execution."""
from pathlib import Path
from html.parser import HTMLParser
import json, sys, xml.etree.ElementTree as ET
root=Path(sys.argv[1] if len(sys.argv)>1 else 'dist')
slugs=['gst-calculator','gst-invoice-generator','hsn-sac-gst-rate-finder','income-tax-regime-calculator','tds-calculator','gstin-validator','gst-late-fee-calculator']
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.links=[];self.text=[];self.schemas=[];self.script=False;self.skip=False;self.buffer='';self.canonical=[];self.h1=0;self.description=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  if tag=='a' and 'href'in a:self.links.append(a['href'])
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if tag=='meta' and a.get('name')=='description':self.description.append(a.get('content',''))
  if tag in ['script','style']:self.skip=True
  if tag=='script' and a.get('type')=='application/ld+json':self.script=True;self.buffer=''
 def handle_data(self,data):
  if self.script:self.buffer+=data
  if not self.skip:self.text.append(data)
 def handle_endtag(self,tag):
  if tag=='script' and self.script:self.schemas.append(json.loads(self.buffer));self.script=False
  if tag in ['script','style']:self.skip=False

def read(path):
 p=root/(path.strip('/')+'.html') if path!='/' else root/'index.html'
 if not p.exists():p=root/path.strip('/')/'index.html'
 page=Page();page.feed(p.read_text());return page

def clean(s):return ' '.join(s.split())
paths={loc.text for loc in ET.parse(root/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
home=read('/');hub=read('/tools')
for slug in slugs:
 path='/tools/'+slug;page=read(path);visible=clean(' '.join(page.text));url='https://www.registerbox.in'+path
 assert page.h1==1,(path,'one heading')
 assert page.canonical==[url],(path,'self canonical')
 assert len(page.description)==1 and len(page.description[0])>70,(path,'description')
 assert url in paths,(path,'sitemap')
 assert path in home.links and path in hub.links,(path,'direct public discovery')
 nodes=[node for schema in page.schemas for node in schema.get('@graph',[])]
 app=next(node for node in nodes if node.get('@type')=='WebApplication')
 assert app['offers']['price']=='0' and app['isAccessibleForFree'] is True
 faq=next(node for node in nodes if node.get('@type')=='FAQPage')
 assert len(faq['mainEntity'])>=4
 for question in faq['mainEntity']:
  assert clean(question['name']) in visible,(path,'question not visible')
  assert clean(question['acceptedAnswer']['text']) in visible,(path,'answer not visible')
 assert len([link for link in page.links if 'gov.in' in link or 'nic.in' in link])>=2,(path,'official sources')
 for other in slugs:assert '/tools/'+other in page.links,(path,'tool navigation')
 assert 'Official sources & rule review' in visible
 assert 'How to use this ' in visible
 assert '2026' in visible
print('All seven tax-tool pages have crawlable answers, matching FAQs, official sources, free-tool schema and direct public links.')
