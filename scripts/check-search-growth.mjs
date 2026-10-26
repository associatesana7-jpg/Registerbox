import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBlogArticles, readLocalizedBlogCatalog } from './blog-catalog.mjs';

const root = process.argv[2] || 'dist';
const site = 'https://www.registerbox.in';
const catalog = readBlogArticles();
const { localizedArticle, availableBlogLocales, blogPath } = readLocalizedBlogCatalog();
const focus = ['gstr-1-vs-gstr-3b', 'gst-registration-documents-and-address-proof', 'shop-establishment-registration-karnataka', 'shop-and-establishment-registration-process'];
const read = route => fs.readFileSync(path.join(root, `${route.slice(1)}.html`), 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
let count = 0;
for (const article of catalog) for (const locale of availableBlogLocales(article.slug)) {
  const translated = localizedArticle(article.slug, locale.code);
  const route = blogPath(locale.code, article.slug);
  const page = read(route);
  const graph = [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph']);
  const post = graph.find(node => node['@type'] === 'BlogPosting');
  assert.equal(post.datePublished, article.publishedAt || '2026-10-20');
  assert.equal(post.dateModified, translated.modifiedAt || article.publishedAt || '2026-10-20');
  const entry = sitemap.match(new RegExp(`<url><loc>${site}${route}</loc>[\\s\\S]*?</url>`))?.[0];
  assert(entry, `Sitemap preserves ${route}`);
  if (translated.modifiedAt) assert(entry.includes(`<lastmod>${translated.modifiedAt}</lastmod>`), 'Only actual edits get lastmod');
  if (locale.code !== 'en' && locale.code !== 'hi') assert(!translated.modifiedAt, 'No false review date on unchanged regional translations');
  if (focus.includes(article.slug)) {
    assert(page.includes('id="quick-answer"'));
    assert(page.indexOf('id="quick-answer"') < page.indexOf('class="rbg-pricing-lead"'), 'Direct answer before commercial next step');
    assert(page.includes(escape(translated.intro[0])), 'Full answer exists in static HTML');
    for (const section of translated.sections) for (const target of section.relatedSlugs || []) {
      const linked = localizedArticle(target, locale.code);
      if (linked) assert(page.includes(`href="${blogPath(locale.code, target)}"`), 'Contextual link uses an available same-language guide');
    }
  }
  count++;
}
assert.equal(count, 94, 'Preserve all published language articles');
assert.equal(localizedArticle('gstr-1-vs-gstr-3b', 'hi').modifiedAt, '2026-10-26', 'Review the actual GSC Hindi landing page');
assert(!read('/hi/blog/gstr-1-vs-gstr-3b').match(/<title\b[^>]*>(.*?)<\/title>/s)[1].includes('…'), 'Complete search title for the actual Hindi landing page');
for (const slug of focus) {
  const page = read(`/blog/${slug}`);
  assert(!page.match(/<title\b[^>]*>(.*?)<\/title>/s)[1].includes('…'), `${slug}: complete, concise search title`);
  assert(page.includes('<lastmod>') === false, 'Sitemap markup must not leak into article HTML');
}
for (const category of ['llp-registration', 'gst-registration']) {
  const page = read(`/services/${category}`);
  assert.match(page, /<title\b[^>]*>[^<]*Bangalore/);
  assert.match(page, /<h1[^>]*>[^<]*Bangalore/);
  assert(page.includes('href="#bengaluru-branches"'), 'Link to genuine local branches');
}
assert(read('/services/gst-registration').includes('href="/blog/gst-registration-documents-and-address-proof"'));
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const slug of ['gstr-1-vs-gstr-3b', 'shop-and-establishment-registration-process', 'gst-registration-documents-and-address-proof']) assert(home.includes(`href="/blog/${slug}"`));
console.log(`Verified search-intent answers, contextual links, genuine local service metadata and truthful edit dates across ${count} language articles.`);
