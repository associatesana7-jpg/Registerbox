import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readBlogArticles, readLocalizedBlogCatalog, readBlogModule } from './blog-catalog.mjs';

const root = process.argv[2] || 'dist';
const { availableBlogLocales, blogPath } = readLocalizedBlogCatalog();
const prices = {};
const catalogue = readBlogModule('supabase/functions/_shared/service-catalog.ts');
const offerCode = ts.transpileModule(fs.readFileSync('src/components/website/blog-offers.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', 'require', offerCode)(prices, name => { assert.equal(name, '@/lib/service-catalog'); return catalogue; });
const html = route => {
  const base = path.join(root, route === '/' ? 'index' : route.replace(/^\//, ''));
  return fs.readFileSync([`${base}.html`, path.join(base, 'index.html')].find(fs.existsSync), 'utf8');
};
let count = 0;
for (const article of readBlogArticles()) for (const locale of availableBlogLocales(article.slug)) {
  const page = html(blogPath(locale.code, article.slug));
  const lead = page.match(/<aside class="rbg-pricing-lead"[\s\S]*?<\/aside>/)?.[0];
  assert(lead, `${article.slug}: early pricing panel`);
  assert(page.indexOf('class="rbg-pricing-lead"') < page.indexOf('rbg-article-summary'), 'Offer before long editorial introduction');
  if (page.includes('class="rbg-cover"')) assert(page.indexOf('class="rbg-pricing-lead"') < page.indexOf('class="rbg-cover"'), 'Offer before decorative image');
  assert(lead.includes('rbg-lead-primary') && lead.includes('href="tel:+918147777843"'), 'Prominent next action and direct call');
  assert(page.includes('class="rbg-pricing-dock"'), 'Persistent mobile price and action');
  assert.equal((page.match(/id="registerbox-services"/g) || []).length, 1, 'Unique full-scope destination');
  const offer = prices.blogServiceOffers(article.slug, article.serviceCategory);
  if (offer.freeNil) {
    assert(lead.includes('₹0') && lead.includes('href="/gst"') && !lead.includes('/checkout?'), 'Free nil stays eligibility-first without payment');
  } else if (offer.quoteRequired || article.enquiryOnly) {
    assert(lead.includes('Get my quote') && !/₹[\d,]+/.test(lead), 'Quotation must not imply a related-package incorporation price');
  } else if (offer.packages.length) {
    assert(lead.includes(prices.blogPackagePrice(offer.packages[0].amountPaise)), 'Price comes from catalogue');
    if (['food', 'gst_registration', 'retail', 'udyam'].includes(article.serviceCategory)) {
      const primary = lead.match(/<a\b[^>]*class="rbg-lead-primary"[^>]*>/)?.[0];
      const url = new URL(primary.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'), 'https://www.registerbox.in');
      assert.equal(url.pathname, '/auth', 'Guest goes through explicit sign-in');
      assert.equal(url.searchParams.get('next'), `/onboarding/application?category=${article.serviceCategory}`, 'Registration service survives sign-in');
    }
  }
  const panel = page.match(/<aside class="rbg-service-cta rbg-offers"[\s\S]*?<\/aside>/)?.[0];
  for (const card of panel.matchAll(/<article class="rbg-offer-card"[\s\S]*?<\/article>/g)) assert(card[0].indexOf('rbg-package-choose') < card[0].indexOf('rbg-offer-inclusions'), 'Package action before long inclusion list');
  count++;
}
console.log(`Verified early catalogue-backed price/action panels, call links, mobile docks and safe service destinations across ${count} language articles.`);
const returns = html('/services/gst-returns');
for (const button of returns.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*See packages[\s\S]*?<\/a>/g)) assert.equal(button[1], '/services/gst-returns#packages', 'A See packages action must open the packages, not the GST workspace');
const checkout = html('/checkout');
assert(checkout.indexOf('rb-ck-quick-summary') < checkout.indexOf('id="checkout-details"'), 'Selected price and next step precede checkout form');
const home = html('/');
assert(home.includes('id="home-prices"'), 'Homepage has a direct pricing anchor');
assert(home.indexOf('id="home-prices"') < home.indexOf('id="services"'), 'Homepage decision strip precedes the large catalogue');
