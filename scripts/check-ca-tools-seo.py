"""Inspect exported HTML: CA discovery and answers must be readable without JS."""
from pathlib import Path
import runpy

context = runpy.run_path(str(Path(__file__).with_name('check-tax-tools-seo.py')))
read, clean, sitemap = context['read'], context['clean'], context['paths']
hub = read('/tools/ca-tools')
all_tools = context['hub']
slugs = ['presumptive-tax-calculator', 'advance-tax-interest-calculator',
         'itc-set-off-calculator', 'gstr-2b-reconciler', 'bank-statement-to-excel',
         'invoice-to-excel', 'e-invoice-applicability-checker', 'e-way-bill-calculator',
         'place-of-supply-finder', 'reverse-charge-checker', 'depreciation-calculator',
         'mca-additional-fee-calculator', 'karnataka-professional-tax-calculator',
         'financial-statements-generator']
assert '/tools/ca-tools' in context['home'].links
assert '/tools/ca-tools' in all_tools.links
assert hub.h1 == 1
assert hub.canonical == ['https://www.registerbox.in/tools/ca-tools']
for slug in slugs:
    path = '/tools/' + slug
    url = 'https://www.registerbox.in' + path
    page = read(path)
    visible = clean(' '.join(page.text))
    assert page.h1 == 1, (path, 'heading')
    assert page.canonical == [url], (path, 'canonical')
    assert len(page.description) == 1 and len(page.description[0]) > 70, (path, 'description')
    assert url in sitemap and path in hub.links and path in all_tools.links, (path, 'public discovery')
    nodes = [node for schema in page.schemas for node in schema.get('@graph', [])]
    app = next(node for node in nodes if node.get('@type') == 'WebApplication')
    assert app['offers']['price'] == '0' and app['isAccessibleForFree'] is True
    crumbs = next(node for node in nodes if node.get('@type') == 'BreadcrumbList')['itemListElement']
    assert crumbs[2]['item'] == 'https://www.registerbox.in/tools/ca-tools'
    faq = next(node for node in nodes if node.get('@type') == 'FAQPage')
    assert len(faq['mainEntity']) >= 2
    for item in faq['mainEntity']:
        assert clean(item['name']) in visible, (path, 'visible question')
        assert clean(item['acceptedAnswer']['text']) in visible, (path, 'visible answer')
    authorities = ('gov.in', 'nic.in', 'icai.org', 'mozilla.github.io/pdf.js', 'github.com/naptha/tesseract.js')
    assert any(any(authority in link for authority in authorities) for link in page.links), (path, 'primary source')
    assert 'Official sources & rule review' in visible
    for link in page.links:
        if link.startswith('/services/'):
            read(link)  # A suggested next step must resolve to a real exported page.
print('All 14 CA pages and their hub have crawlable answers, matching FAQ schema, official sources and public links.')
