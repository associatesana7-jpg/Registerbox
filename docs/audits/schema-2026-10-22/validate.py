"""Check snapshot parity, graph references, safe serialization and optional vocabulary domains.

Usage: python3 validate.py [official-schemaorg-vocabulary.jsonld]
This is not a substitute for Google's Rich Results Test or Search Console inspection.
"""
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'https://www.registerbox.in'
manifest = json.loads((ROOT / 'page-manifest.json').read_text())
evidence = json.loads((ROOT / 'live-evidence.json').read_text())
source = {p['url']: p for p in evidence['pages'] if p['status'] == 200}
failures = []
checks = 0

def check(test, message):
    global checks
    checks += 1
    if not test: failures.append(message)

def walk(value):
    if isinstance(value, dict):
        yield value
        for v in value.values(): yield from walk(v)
    elif isinstance(value, list):
        for v in value: yield from walk(v)

def listify(value):
    return value if isinstance(value, list) else [value] if value else []

vocab = {}
if len(sys.argv) > 1:
    vocab = {n['@id']: n for n in json.loads(Path(sys.argv[1]).read_text())['@graph']}

def ancestors(type_name, seen=None):
    seen = set() if seen is None else seen
    if type_name in seen: return seen
    seen.add(type_name)
    for parent in listify(vocab.get(type_name, {}).get('rdfs:subClassOf')):
        ancestors(parent['@id'], seen)
    return seen

check(len(manifest) == len(source) == 43, 'Page manifest must cover all 43 verified live public pages')
for row in manifest:
    page = source[row['url']]
    graph = json.loads((ROOT / row['jsonld']).read_text())
    nodes = graph['@graph']; page_id = row['url'] + '#webpage'
    webpage = next(n for n in nodes if n.get('@id') == page_id)
    check(webpage['url'] == row['url'], row['url'] + ': canonical URL mismatch')
    check(len([n for n in nodes if n.get('@id') == page_id]) == 1, row['url'] + ': duplicate page identity')
    check(webpage.get('isPartOf', {}).get('@id') == BASE + '/#website', row['url'] + ': website relationship missing')
    questions = [n for n in walk(graph) if n.get('@type') == 'Question']
    check(len(questions) == len(page['faqs']), row['url'] + ': FAQ count mismatch')
    for actual, expected in zip(questions, page['faqs']):
        check(actual['name'] == expected['question'].removesuffix('+').strip() and actual['acceptedAnswer']['text'] == expected['answer'], row['url'] + ': visible FAQ text mismatch')
    for offer in [n for n in nodes if n.get('@type') == 'Offer']:
        expected = re.search(r'RegisterBox assistance fee ₹([\d,]+)', page['mainText'])
        check(expected is not None and offer['price'] == str(int(expected.group(1).replace(',', ''))), row['url'] + ': price mismatch')
        check(offer['priceCurrency'] == 'INR' and 'Government charges and taxes' in offer['description'], row['url'] + ': fee scope omitted')
    for article in [n for n in nodes if n.get('@type') == 'BlogPosting']:
        before = next(n for s in page['schema'] for n in s.get('@graph', []) if n.get('@type') == 'BlogPosting')
        for prop in ['headline', 'description', 'image', 'datePublished', 'dateModified', 'citation']:
            check(article[prop] == before[prop], row['url'] + ': changed article fact ' + prop)
        check(article['author']['@id'] == article['publisher']['@id'] == BASE + '/#organization', row['url'] + ': fragmented author')

files = sorted(ROOT.glob('jsonld/*.jsonld')) + sorted(ROOT.glob('optional-product/*.jsonld')) + sorted(ROOT.glob('conditional-future-page/*.jsonld'))
for path in files:
    data = json.loads(path.read_text()); all_nodes = list(walk(data))
    ids = {n['@id'] for n in all_nodes if '@id' in n and len(n) > 1}
    graph_ids = [n['@id'] for n in data['@graph']]
    check(len(graph_ids) == len(set(graph_ids)), path.name + ': duplicate top-level identity')
    for n in all_nodes:
        if set(n) == {'@id'}:
            ref = n['@id']
            # IDs on other canonical documents can resolve through those documents.
            this_page = next(v['url'] for v in data['@graph'] if v.get('@type') in ['WebPage', 'ContactPage', 'AboutPage', 'CollectionPage', 'FAQPage'])
            if ref.split('#')[0] == this_page or ref in [BASE + '/#organization', BASE + '/#website', BASE + '/#logo']:
                check(ref in ids, path.name + ': unresolved local reference ' + ref)
        if not vocab or '@type' not in n: continue
        types = listify(n['@type'])
        classes = set()
        for kind in types:
            check('schema:' + kind in vocab, path.name + ': unknown type ' + kind)
            classes.update(ancestors('schema:' + kind))
        for prop in n:
            if prop.startswith('@'): continue
            term = vocab.get('schema:' + prop)
            check(term is not None, path.name + ': unknown property ' + prop)
            if not term: continue
            domains = {d['@id'] for d in listify(term.get('schema:domainIncludes'))}
            check(not domains or bool(classes & domains), path.name + ': property ' + prop + ' is not expected on ' + ','.join(types))
    script = path.with_suffix('.html').read_text()
    match = re.fullmatch(r'<script type="application/ld\+json">\n([\s\S]*)</script>\n', script)
    check(match is not None and json.loads(match.group(1)) == data, path.name + ': HTML serialization mismatch')
    check(script.count('</script>') == 1, path.name + ': unsafe inline closing script')

result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'pageGraphs': len(manifest), 'allGraphsIncludingOptionalAndConditional': len(files), 'checks': checks, 'officialVocabularyDomainsChecked': bool(vocab), 'failures': failures, 'limitations': ['This local validator does not implement every Schema.org range constraint.', 'Google Rich Results Test, rendered browser navigation and Search Console were not executed.', 'No changes were deployed.']}
(ROOT / 'validation-results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
sys.exit(bool(failures))
