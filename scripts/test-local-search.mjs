import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const root = process.env.REGISTERBOX_SEARCH_BUILD_DIRECTORY || 'dist';
const serviceSlugs = ['gst-registration', 'gst-returns', 'fssai-food-business', 'trademark-registration', 'private-limited-company-registration', 'llp-registration', 'shop-establishment-registration', 'start-a-business', 'online-ecommerce-business', 'manufacturing-business', 'business-branch', 'business-compliance-check'];
const routes = ['', 'contact', ...serviceSlugs.map(slug => `services/${slug}`)];
for (const route of routes) {
  test(`${route || '/'}: local search and enquiry contract`, async () => {
    const html = await readFile(join(root, route ? `${route}.html` : 'index.html'), 'utf8');
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Bengaluru/);
    assert.match(html, /href="tel:\+918147777843"/);
    assert.match(html, /href="https:\/\/docs.google.com\/forms\/d\/e\/1FAIpQLSfFF7938FGJPuLRipOPcH1VndwzDA17RIFMDOU4AMcpzzpSMA\/viewform"/);
    assert.match(html, /above Kookie Kids/);
    assert.match(html, /Trinity English School Road/);
    assert.match(html, /https:\/\/g.page\/r\/CeRt8CUDmIO6EBM\/review/);
    assert.doesNotMatch(html, /registerbox@yahoo.com/);
    const graphs = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph']);
    const branches = graphs.filter(item => item['@type'] === 'LocalBusiness');
    assert.equal(branches.length, 2);
    assert.deepEqual(branches.map(item => item.address.postalCode), ['560075', '560037']);
    assert.equal(graphs.some(item => item.aggregateRating || item.review), false, 'Do not manufacture review markup');
    if (route.startsWith('services/')) {
      assert.match(html, /in Bengaluru<\/span><\/h1>/);
      assert.equal(graphs.find(item => item['@type'] === 'Service').areaServed.name, 'Bengaluru');
      assert.match(html, /class="rb-sx-start-card"/);
      assert.match(html, /Your preparation stage/);
      assert.ok((html.match(/class="rb-sx-disclosure"/g) || []).length >= 7, 'Keep detailed guidance behind accessible disclosures');
      const hero = html.slice(html.indexOf('class="rb-sx-hero"'), html.indexOf('class="rb-sx-confidence"'));
      assert.equal((hero.match(/class="[^"]*\brb-sx-primary\b[^"]*"/g) || []).length, 1, 'One main action in the decision area');
      const primary = hero.match(/<a\b(?=[^>]*class="[^"]*\brb-sx-primary\b)[^>]*>/)?.[0];
      assert.ok(primary, 'Primary application link must render');
      assert.doesNotMatch(primary, /wa\.me|docs\.google\.com/, 'Support must not replace the application flow');
      if (route.endsWith('trademark-registration')) assert.match(primary, /href="\/contact\?service=trademark"/);
      else {
        assert.match(primary, /href="\/auth\?next=/, 'Signed-out customers keep their chosen service through sign-in');
        if (route.endsWith('gst-returns')) assert.match(primary, /next=%2Fgst"/);
        if (route.endsWith('gst-registration')) assert.match(primary, /category%3Dgst_registration/);
      }
    }
  });
}
test('trademark route is discoverable and does not invent an application workflow', async () => {
  const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8');
  const directory = await readFile(join(root, 'services/index.html'), 'utf8');
  const trademark = await readFile(join(root, 'services/trademark-registration.html'), 'utf8');
  assert.match(sitemap, /\/services\/trademark-registration/);
  assert.match(directory, /href="\/services\/trademark-registration"/);
  assert.doesNotMatch(trademark, /category=trademark/);
});
