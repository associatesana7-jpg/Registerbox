"""Check the licence checker's actual exported content, including text available without JS."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'dist')
base = '/tools/business-licence-checker'
site = 'https://www.registerbox.in'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.schema = []
        self.links = []
        self.canonical = []
        self.alternates = {}
        self.description = []
        self.hidden = None
        self.buffer = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self.hidden = tag
            self.buffer = ''
            self.json_script = a.get('type') == 'application/ld+json'
        if tag == 'a':
            self.links.append(a.get('href', ''))
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href'))
        if tag == 'link' and a.get('rel') == 'alternate':
            self.alternates[a.get('hreflang')] = a.get('href')
        if tag == 'meta' and a.get('name') == 'description':
            self.description.append(a.get('content', ''))

    def handle_data(self, data):
        if self.hidden:
            self.buffer += data
        else:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == self.hidden:
            if tag == 'script' and self.json_script:
                self.schema.extend(json.loads(self.buffer).get('@graph', []))
            self.hidden = None


expected = {'en-IN': base, 'hi-IN': base + '/hi', 'kn-IN': base + '/kn', 'x-default': base}
for language, path in list(expected.items())[:3]:
    file = root / (path.strip('/') + '.html')
    if not file.exists():
        file = root / path.strip('/') / 'index.html'
    page = Page()
    page.feed(file.read_text())
    visible = re.sub(r'\s+', ' ', ' '.join(page.text))
    assert page.canonical == [site + path], (path, 'self canonical')
    assert page.alternates == {key: site + value for key, value in expected.items()}, (path, 'language alternates')
    assert len(page.description) == 1 and all(term in page.description[0] for term in ('GST', 'FSSAI', 'MSME')), (path, 'specific description')
    assert all(term in visible for term in ('GST', 'FSSAI', 'MSME', 'IEC')), (path, 'visible registration names')
    faqs = [node for node in page.schema if node.get('@type') == 'FAQPage']
    assert len(faqs) == 1 and len(faqs[0]['mainEntity']) == 12, (path, 'business examples and FAQs')
    for question in faqs[0]['mainEntity']:
        for value in (question['name'], question['acceptedAnswer']['text']):
            assert re.sub(r'\s+', ' ', value) in visible, (path, 'schema answer missing from visible HTML', value[:60])
    for route in ('gst-registration', 'fssai-food-business', 'shop-establishment-registration', 'online-ecommerce-business', 'manufacturing-business'):
        assert '/services/' + route in page.links, (path, 'useful service link', route)
    if language == 'en-IN':
        assert 'Business licence & registration checker for India.' in visible
        assert 'Which licences does your business need?' not in visible
        assert all(term in visible for term in ('home kitchen', 'retail shop', 'freelancer', 'online seller', 'manufacturing business'))
print('All three licence-checker pages contain clear, crawlable answers, matching FAQ schema, language alternates and service links.')
