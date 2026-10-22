import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const html = route => {
  const file = [path.join(root, `${route || 'index'}.html`), path.join(root, route, 'index.html')].find(fs.existsSync);
  assert(file, `Missing exported route: ${route || '/'}`);
  return fs.readFileSync(file, 'utf8');
};
const home = html('');
for (const name of ['llms.txt', 'blog-feed.json', 'sitemap.xml']) {
  const content = fs.readFileSync(path.join(root, name), 'utf8');
  assert(!/(?:INR|₹|Rs\.)\s*1,?999/u.test(content), `${name} contains a removed advertised service price`);
}
for (const marker of ['id="our-clients"', 'Tea Day', 'Absolute Shawarma', 'Kunafa Bakery', 'rb-google-reviews', 'rb-footer-map', 'google.com/maps', 'New Thippasandra', 'Marathahalli']) {
  assert(home.includes(marker), `Homepage is missing restored content: ${marker}`);
}
for (const route of ['', 'services', 'contact', 'auth', 'auth/otp', ...fs.readdirSync(path.join(root, 'services')).filter(file => file.endsWith('.html')).map(file => `services/${file.slice(0, -5)}`)]) {
  const page = html(route);
  assert(!/₹\s*[\d०-९೦-೯௦-௯]/u.test(page), `${route || '/'} advertises a price`);
  assert(!/"(?:price|lowPrice|highPrice|priceRange)"\s*:/u.test(page), `${route || '/'} has price structured data`);
}
assert(html('auth').includes('rb-auth-dialog') && html('auth').includes('Your business. One login.'), 'Restored sign-in dialog missing');
// The OTP route intentionally redirects to email entry without a client email.
const authSource = fs.readFileSync('src/components/website/auth.web.tsx', 'utf8');
for (const marker of ['Check your email', 'rb-code-cells', 'verifyEmailOtp', 'refreshAccount(auth.session)', 'router.replace(next as Href)', 'safeNext(requested)']) assert(authSource.includes(marker), `Restored OTP flow missing: ${marker}`);
const cards = [...home.matchAll(/<article class="rbg-card[\s\S]*?<\/article>/g)];
assert(cards.length >= 3, 'Homepage guide cards missing');
for (const [card] of cards) {
  const paths = [...card.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(paths.length, 3, 'Guide image, title and read link must all be clickable');
  assert(paths.every(href => href === paths[0]), 'Guide card links must share the same destination');
  assert(card.includes('class="rbg-card-title"'), 'Readable guide title style missing');
}
console.log('Verified restored clients, reviews, maps, sign-in dialogs, clickable guide cards and price-free public service pages.');
