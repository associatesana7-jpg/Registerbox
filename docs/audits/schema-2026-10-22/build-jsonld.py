"""Build page-specific replacement JSON-LD from the verified public crawl snapshot."""
import copy
import csv
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
BASE = 'https://www.registerbox.in'
ORG = BASE + '/#organization'
SITE = BASE + '/#website'
LOGO = BASE + '/#logo'
BLOG = BASE + '/blog#blog'
BRANCH = BASE + '/#new-thippasandra'
evidence = json.loads((ROOT / 'live-evidence.json').read_text())
pages = [p for p in evidence['pages'] if p['status'] == 200]
by_url = {p['url']: p for p in pages}

def top_nodes(page):
    return [n for s in page['schema'] for n in s.get('@graph', [s])]

def first_type(page, kind):
    return next((copy.deepcopy(n) for n in top_nodes(page) if kind in ([n.get('@type')] if isinstance(n.get('@type'), str) else n.get('@type', []))), None)

def common():
    return [
        {'@type': 'Organization', '@id': ORG, 'name': 'RegisterBox', 'url': BASE + '/',
         'logo': {'@id': LOGO}, 'email': 'registerbox@yahoo.com', 'telephone': '+918147777843',
         'address': {'@type': 'PostalAddress', 'streetAddress': 'BBMP Ward, HAL Aerospace Division, 5th Cross Road, New Thippasandra Main Road, New Thippasandra', 'addressLocality': 'Bengaluru', 'addressRegion': 'Karnataka', 'postalCode': '560075', 'addressCountry': 'IN'},
         'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer support', 'telephone': '+918147777843', 'email': 'registerbox@yahoo.com'},
         'publishingPrinciples': BASE + '/blog/editorial-policy'},
        {'@type': 'ImageObject', '@id': LOGO, 'url': BASE + '/images/registerbox-logo.png', 'contentUrl': BASE + '/images/registerbox-logo.png', 'width': 192, 'height': 192},
        {'@type': 'WebSite', '@id': SITE, 'url': BASE + '/', 'name': 'RegisterBox', 'publisher': {'@id': ORG}, 'inLanguage': 'en-IN'},
    ]

def blog_node():
    return {'@type': 'Blog', '@id': BLOG, 'url': BASE + '/blog', 'name': 'RegisterBox business guides', 'isPartOf': {'@id': SITE}, 'publisher': {'@id': ORG}, 'inLanguage': 'en-IN'}

def filename(url):
    return (urlparse(url).path.strip('/').replace('/', '__') or 'home') + '.jsonld'

def breadcrumb(page, name):
    url = page['url']; path = urlparse(url).path
    current = first_type(page, 'BreadcrumbList')
    if current:
        current['@id'] = url + '#breadcrumb'
        return current
    trail = [('Home', BASE + '/')]
    if path.startswith('/blog/'):
        trail.append(('Guides', BASE + '/blog'))
    trail.append((name, url))
    return {'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': i, 'name': n, 'item': u} for i, (n, u) in enumerate(trail, 1)]}

def make_graph(page):
    url = page['url']; path = urlparse(url).path
    graph = common()
    name = (page['title'][0] if page['title'] else page['h1'][0]).removesuffix(' | RegisterBox')
    descriptions = {
        '/privacy': 'RegisterBox privacy information, processing choices and privacy request routes for app and website users.',
        '/delete-account': 'How to request deletion of a RegisterBox account or selected data, verify ownership and understand retention.'}
    webpage = {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': name, 'description': page['description'] or descriptions.get(path, name), 'isPartOf': {'@id': SITE}, 'publisher': {'@id': ORG}, 'inLanguage': 'en-IN'}
    graph.append(webpage)
    if path != '/':
        crumb = breadcrumb(page, name)
        graph.append(crumb); webpage['breadcrumb'] = {'@id': crumb['@id']}
    if path == '/':
        webpage['mainEntity'] = {'@id': ORG}
        app = {'@type': 'WebApplication', '@id': BASE + '/#web-application', 'name': 'RegisterBox', 'url': BASE + '/', 'applicationCategory': 'BusinessApplication', 'description': 'A business workspace for business profiles, application drafts, saved documents and connected GST tools.', 'publisher': {'@id': ORG}, 'inLanguage': 'en-IN'}
        graph.append(app); webpage['about'] = {'@id': app['@id']}
    elif path == '/contact':
        webpage['@type'] = 'ContactPage'; webpage['mainEntity'] = {'@id': ORG}
        maps = next(u for u in page['links'] if 'google.com/maps' in u)
        graph[0]['location'] = {'@id': BRANCH}
        graph.append({'@type': 'LocalBusiness', '@id': BRANCH, 'name': 'RegisterBox — New Thippasandra', 'url': url, 'parentOrganization': {'@id': ORG}, 'address': copy.deepcopy(graph[0]['address']), 'telephone': '+918147777843', 'email': 'registerbox@yahoo.com', 'logo': {'@id': LOGO}, 'hasMap': maps})
        webpage['about'] = {'@id': BRANCH}
    elif path == '/services' or path == '/blog':
        webpage['@type'] = 'CollectionPage'
        listing = first_type(page, 'ItemList')
        if listing is None:
            listing = first_type(page, 'CollectionPage')['mainEntity']
        listing['@id'] = url + '#list'; listing['numberOfItems'] = len(listing['itemListElement'])
        listing['name'] = 'RegisterBox services' if path == '/services' else 'RegisterBox business guides'
        for entry in listing['itemListElement']:
            item_url = entry.pop('url')
            item_name = entry.pop('name')
            item_type = 'Service' if path == '/services' else 'BlogPosting'
            entry['item'] = {'@type': item_type, '@id': item_url + ('#service' if item_type == 'Service' else '#article'), 'url': item_url, 'name': item_name}
        graph.append(listing); webpage['mainEntity'] = {'@id': listing['@id']}
        if path == '/blog':
            graph.append(blog_node()); webpage['about'] = {'@id': BLOG}
    elif path.startswith('/services/'):
        service = first_type(page, 'Service')
        assert service is not None, url
        service['@id'] = url + '#service'; service['serviceType'] = service['name']
        service['mainEntityOfPage'] = {'@id': webpage['@id']}
        service['termsOfService'] = BASE + '/policies'
        graph.append(service); webpage['mainEntity'] = {'@id': service['@id']}
        match = __import__('re').search(r'RegisterBox assistance fee ₹([\d,]+)', page['mainText'])
        if match:
            price = str(int(match.group(1).replace(',', '')))
            offer = {'@type': 'Offer', '@id': url + '#assistance-offer', 'name': service['name'] + ' — RegisterBox assistance', 'url': url, 'price': price, 'priceCurrency': 'INR', 'seller': {'@id': ORG}, 'itemOffered': {'@id': service['@id']}, 'description': 'RegisterBox assistance fee only. Government charges and taxes, where applicable, are separate. Confirm the scope before proceeding.'}
            service['offers'] = {'@id': offer['@id']}; graph.append(offer)
    elif path == '/blog/editorial-policy':
        webpage['@type'] = 'AboutPage'; webpage['about'] = {'@id': ORG}
    elif path.startswith('/blog/'):
        article = first_type(page, 'BlogPosting')
        assert article is not None, url
        article['author'] = {'@id': ORG}
        article['mainEntityOfPage'] = {'@id': webpage['@id']}
        article['isPartOf'] = {'@id': BLOG}
        graph.extend([blog_node(), article]); webpage['mainEntity'] = {'@id': article['@id']}
        webpage['datePublished'] = article['datePublished']; webpage['dateModified'] = article['dateModified']
    else:
        webpage['about'] = {'@id': ORG}
    if page['faqs']:
        faq_id = url + '#faq-section'
        faq = {'@type': 'WebPageElement', '@id': faq_id, 'name': 'Common questions', 'isPartOf': {'@id': webpage['@id']}, 'mainEntity': []}
        for i, qa in enumerate(page['faqs'], 1):
            faq['mainEntity'].append({'@type': 'Question', '@id': url + '#question-' + str(i), 'name': qa['question'].removesuffix('+').strip(), 'acceptedAnswer': {'@type': 'Answer', 'text': qa['answer']}})
        webpage['hasPart'] = {'@id': faq_id}; graph.append(faq)
    return {'@context': 'https://schema.org', '@graph': graph}

def write_graph(folder, name, data):
    target = ROOT / folder / name; target.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    target.write_text(content)
    snippet = content.replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    target.with_suffix('.html').write_text('<script type="application/ld+json">\n' + snippet + '</script>\n')

manifest = []
graphs = {}
for page in pages:
    data = make_graph(page); graphs[page['url']] = data
    name = filename(page['url']); write_graph('jsonld', name, data)
    types = [n['@type'] for n in data['@graph']]
    manifest.append({'url': page['url'], 'inLiveSitemap': page['url'] in evidence['sitemapUrls'], 'jsonld': 'jsonld/' + name, 'script': 'jsonld/' + name.replace('.jsonld', '.html'), 'types': types, 'visibleFaqs': len(page['faqs']), 'missingCanonicalInLiveHtml': not bool(page['canonical'])})

# Optional complete replacement graphs: Schema.org Product can include an offered service.
# These do not assert Shopping eligibility and are not the recommended default.
for url, data in graphs.items():
    if any(n.get('@type') == 'Offer' for n in data['@graph']):
        variant = copy.deepcopy(data)
        service = next(n for n in variant['@graph'] if n.get('@type') == 'Service')
        service['@type'] = ['Service', 'Product']
        write_graph('optional-product', filename(url), variant)

# FAQPage is appropriate if this proposed dedicated public FAQ page is created.
# It is not a deployable replacement for the current homepage or a service page.
faq_url = BASE + '/faqs'
home = by_url[BASE + '/']
faq_graph = common()
faq_graph.append({'@type': 'FAQPage', '@id': faq_url + '#webpage', 'url': faq_url, 'name': 'RegisterBox frequently asked questions', 'isPartOf': {'@id': SITE}, 'publisher': {'@id': ORG}, 'about': {'@id': ORG}, 'inLanguage': 'en-IN', 'mainEntity': [{'@type': 'Question', 'name': qa['question'].removesuffix('+').strip(), 'acceptedAnswer': {'@type': 'Answer', 'text': qa['answer']}} for qa in home['faqs']]})
write_graph('conditional-future-page', 'faqs.jsonld', {'@context': 'https://schema.org', '@graph': faq_graph})

(ROOT / 'page-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with (ROOT / 'page-inventory.csv').open('w') as f:
    writer = csv.writer(f)
    writer.writerow(['url', 'live_sitemap', 'existing_top_level_types', 'replacement_file', 'new_graph_types', 'visible_faq_count', 'live_canonical_missing'])
    for row in manifest:
        page = by_url[row['url']]
        writer.writerow([row['url'], row['inLiveSitemap'], '|'.join(n['@type'] for n in top_nodes(page)), row['jsonld'], '|'.join(row['types']), row['visibleFaqs'], row['missingCanonicalInLiveHtml']])
print(f'Generated {len(manifest)} full replacement graphs, 3 optional Product/Service variants, and 1 conditional future FAQPage graph.')
