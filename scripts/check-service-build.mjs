import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] || 'dist');
const services = [
  ['private-limited-company-registration', 'company'],
  ['llp-registration', 'llp'],
  ['gst-registration', 'gst_registration'],
  ['udyam-registration', 'udyam'],
  ['fssai-food-business', 'food'],
  ['shop-establishment-registration', 'retail'],
  ['gst-returns', 'gst'],
  ['start-a-business', 'new'],
  ['online-ecommerce-business', 'online'],
  ['manufacturing-business', 'manufacturing'],
  ['business-branch', 'branch'],
  ['business-compliance-check', 'existing'],
  ['trademark-registration', 'trademark'],
];
function html(path) {
  const candidates = [resolve(output, path + '.html'), resolve(output, path, 'index.html')];
  const file = candidates.find(existsSync);
  assert(file, 'Missing exported page: ' + path);
  return readFileSync(file, 'utf8');
}
for (const [slug, category] of services) {
  const page = html('services/' + slug);
  assert.equal((page.match(/<h1\b/g) || []).length, 1, slug + ': one H1');
  const primary = page.match(/<a\b[^>]*class="[^"]*rb-sx-primary[^"]*"[^>]*>/)?.[0];
  assert(primary, slug + ': prominent application action');
  const href = primary.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&');
  assert(href, slug + ': action destination');
  if (category === 'trademark') {
    assert.equal(href, '/services/trademark-registration#packages');
  } else if (category === 'gst') {
    assert.equal(href, '/gst', slug + ': GST workspace remains available before any package purchase');
  } else if (['gst_registration', 'food', 'retail', 'udyam'].includes(category)) {
    const target = new URL(href, 'https://www.registerbox.in');
    assert.equal(target.pathname, '/onboarding/application', slug + ': registration before payment');
    assert.equal(target.searchParams.get('category'), category, slug + ': preserve registration type');
  } else {
    const target = new URL(href, 'https://www.registerbox.in');
    assert.equal(target.pathname, '/auth', slug + ': public sign-in entry');
    assert.equal(target.searchParams.get('next'), category === 'gst' ? '/gst' : '/onboarding/application?category=' + category, slug + ': preserve service choice');
  }
  assert(page.indexOf(primary) < page.indexOf('id="documents"'), slug + ': action precedes long details');
  assert(page.includes('rb-sx-mobile-action'), slug + ': mobile start action');
  assert(!/<meta[^>]+name="robots"[^>]+content="noindex/.test(page), slug + ': public service remains indexable');
}
const directory = html('services');
for (const [slug] of services) assert(directory.includes('/services/' + slug), 'Directory missing ' + slug);
const home = html('index');
assert(home.includes('rb-entry-start') && home.includes('rb-entry-details'), 'Home has separate start and detail actions');
// The FSSAI offer is registration-first and includes the first-year Basic fee.
// Inspect exported body text independently of schema so client-only claims cannot pass.
const food = html('services/fssai-food-business');
const cleanText = value => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const foodText = cleanText(food);
const graph = [...food.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])['@graph'] || []);
const serviceNodes = graph.filter(node => node['@type'] === 'Service');
assert.equal(serviceNodes.length, 1, 'FSSAI: one public Service description');
const offers = Array.isArray(serviceNodes[0].offers) ? serviceNodes[0].offers : [serviceNodes[0].offers];
assert.equal(offers.length, 1, 'FSSAI: one fixed Basic offer; other routes quoted');
assert.equal(offers[0]['@id'], 'https://www.registerbox.in/services/fssai-food-business#package-fssai-licence');
assert.equal(offers[0].price, 1999, 'FSSAI: exported offer price must match the ₹1,999 total');
assert.equal(offers[0].priceCurrency, 'INR');
assert.match(offers[0].description, /Basic/i, 'FSSAI: offer identifies its eligible Basic scope');
assert.match(offers[0].description, /first.(?:year|annual) government/i, 'FSSAI: schema states included government fee period');
assert(food.includes('id="package-fssai-licence"'), 'FSSAI: stable package anchor');
assert(food.includes('rel="canonical" href="https://www.registerbox.in/services/fssai-food-business"'), 'FSSAI: self canonical');
assert.match(foodText, /₹1,999/, 'FSSAI: price exists in static body text');
assert.doesNotMatch(foodText, /₹2,999/, 'FSSAI: no obsolete food price');
assert.match(foodText, /first.(?:year|annual) government (?:registration )?fee/i, 'FSSAI: static included fee scope');
assert.match(foodText, /one (?:eligible new Basic Registration at one )?premises/i, 'FSSAI: fixed offer does not imply multiple locations');
assert.match(foodText, /State.{0,20}Central.{0,80}(?:quote|quoted)/i, 'FSSAI: other licence routes require a quote');
assert.match(foodText, /later annual government fees|later years are outside/i, 'FSSAI: later fees disclosed');
assert(food.includes('id="application-start"'), 'FSSAI: existing guide process anchor preserved');
const crumbs = graph.filter(node => node['@type'] === 'BreadcrumbList');
assert.equal(crumbs.length, 1, 'FSSAI: one breadcrumb graph');
assert.deepEqual(crumbs[0].itemListElement.map(item => item.position), [1, 2, 3]);
assert.equal(crumbs[0].itemListElement[2].item, 'https://www.registerbox.in/services/fssai-food-business');
const faq = graph.filter(node => node['@type'] === 'FAQPage');
assert.equal(faq.length, 1, 'FSSAI: FAQ metadata');
assert(faq[0].mainEntity.length >= 10, 'FSSAI: practical questions available before JavaScript');
const visibleFaqs = [...food.matchAll(/<article\b[^>]*aria-labelledby="food-answer-\d+"[^>]*>([\s\S]*?)<\/article>/g)].map(match => cleanText(match[1]));
assert.doesNotMatch(food, /<details\b/, 'FSSAI: answers must not require an expand action');
for (const question of faq[0].mainEntity) {
  assert.equal(question['@type'], 'Question');
  assert.equal(question.acceptedAnswer?.['@type'], 'Answer');
  assert(visibleFaqs.some(text => text.includes(cleanText(question.name)) && text.includes(cleanText(question.acceptedAnswer.text))), 'FSSAI: FAQ schema must match a readable question and answer: ' + question.name);
}
const webPage = graph.find(node => node['@type'] === 'WebPage');
assert.equal(webPage?.dateModified, '2026-10-25', 'FSSAI: actual content review date');
const feed = JSON.parse(readFileSync(resolve(output, 'service-feed.json'), 'utf8'));
const baselinePrices = { 'gst-registration': 1999, 'fssai-licence': 1999, 'udyam-registration': 499, 'shop-establishment': 4499, 'income-tax-filing': 1999, 'mca-compliance-annual': 9999, 'trademark-instant': 1899, 'trademark-non-msme': 2988, 'trademark-form48': 2988, 'digital-signature-individual': 2100, 'digital-signature-organisation': 2100, 'gst-registration-monthly': 1499, 'proprietorship-gst': 7899, 'gst-annual-itr': 19899 };
assert.equal(feed.services.length, Object.keys(baselinePrices).length, 'Preserve paid catalogue scope');
for (const [id, price] of Object.entries(baselinePrices)) assert.equal(feed.services.find(item => item.id === id)?.price, price, 'Published feed amount for ' + id);
const sitemap = readFileSync(resolve(output, 'sitemap.xml'), 'utf8');
const foodMapEntry = sitemap.match(/<url>\s*<loc>https:\/\/www\.registerbox\.in\/services\/fssai-food-business<\/loc>([\s\S]*?)<\/url>/)?.[1];
assert.match(foodMapEntry || '', /<lastmod>2026-10-25<\/lastmod>/, 'FSSAI: truthful sitemap modification date');
const llms = readFileSync(resolve(output, 'llms.txt'), 'utf8');
assert.match(llms, /\[FSSAI[^\n]*₹1,999[^\n]*fssai-food-business/, 'FSSAI: discovery price agrees');
assert.match(llms, /Basic[^\n]*first.(?:year|annual)[^\n]*government|first.(?:year|annual)[^\n]*government[^\n]*Basic/i, 'FSSAI: discovery includes Basic fee scope');
for (const slug of ['fssai-home-kitchen-cloud-kitchen', 'fssai-licence-cost-government-fees']) {
  assert(food.includes('href="/blog/' + slug + '"'), 'FSSAI: relevant guide crosslink ' + slug);
  for (const language of ['', 'hi/', 'kn/', 'ta/']) {
    const guide = html(language + 'blog/' + slug);
    assert(guide.includes('/services/fssai-food-business'), 'Food guide links back to service: ' + language + slug);
    assert(guide.includes('https://www.registerbox.in/' + language + 'blog/' + slug), 'Food guide canonical/alternate is published: ' + language + slug);
  }
}
console.log('Verified FSSAI static price/scope, matching FAQ/Service/Breadcrumb metadata, discovery dates, unchanged catalogue amounts and four-language guide crosslinks.');
console.log('Verified all ' + services.length + ' service pages, preserved application routes, directory and home actions.');
