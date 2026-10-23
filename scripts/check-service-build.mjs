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
console.log('Verified all ' + services.length + ' service pages, preserved application routes, directory and home actions.');
