import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBlogArticles, readLocalizedBlogCatalog } from './blog-catalog.mjs';

const root = process.argv[2] || 'dist';
const articles = readBlogArticles();
const { availableBlogLocales, localizedArticle, blogPath, blogAlternates } = readLocalizedBlogCatalog();
const origin = 'https://www.registerbox.in';
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const locale of ['en', 'hi', 'kn', 'ta']) {
  assert.equal(articles.filter(article => localizedArticle(article.slug, locale)).length, articles.length, `${locale} must cover the full published guide catalogue`);
}
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Sitemap URL uniqueness');
const htmlFor = route => {
  const base = path.join(root, route.slice(1));
  const file = [`${base}.html`, path.join(base, 'index.html')].find(candidate => fs.existsSync(candidate));
  assert.ok(file, `Missing static language page ${route}`);
  return fs.readFileSync(file, 'utf8');
};
const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]);
let total = 0;
for (const locale of availableBlogLocales()) {
  const indexPath = blogPath(locale.code);
  const index = htmlFor(indexPath);
  assert.match(index, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.ok(sitemapUrls.includes(origin + indexPath));
  for (const original of articles) {
    const article = localizedArticle(original.slug, locale.code);
    if (!article) continue;
    const route = blogPath(locale.code, article.slug);
    const html = htmlFor(route);
    const nativeScript = { kn: /[\u0C80-\u0CFF]/, ta: /[\u0B80-\u0BFF]/ }[locale.code];
    if (nativeScript) assert.match(article.title, nativeScript, `${route} must have a native-language title`);
    assert.ok(html.includes(`<h1>${escape(article.title)}</h1>`), `${route} needs translated static H1`);
    assert.ok(html.includes(`lang="${locale.code}"`), `${route} needs its own lang`);
    assert.ok(html.includes(`dir="${locale.direction}"`), `${route} needs text direction`);
    assert.ok(html.includes(`rel="canonical" href="${origin}${route}"`), `${route} self canonical`);
    assert.doesNotMatch(html, /name="robots" content="noindex/, `${route} cannot enter auth/noindex shell`);
    for (const alternate of blogAlternates(article.slug)) {
      assert.ok(html.includes(`hrefLang="${alternate.language}" href="${origin}${alternate.path}"`)
        || html.includes(`hreflang="${alternate.language}" href="${origin}${alternate.path}"`), `${route} reciprocal alternate ${alternate.language}`);
    }
    for (const section of article.sections) {
      assert.ok(html.includes(escape(section.heading)), `${route} section ${section.id}`);
      assert.ok(html.includes(escape(section.paragraphs[0])), `${route} body ${section.id} must exist before JS`);
    }
    for (const faq of article.faqs) assert.ok(html.includes(escape(faq.answer)), `${route} translated FAQ`);
    assert.ok(html.includes('tel:'), `${route} call action`);
    assert.ok(sitemapUrls.includes(origin + route), `${route} sitemap discovery`);
    const graph = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph'] || []);
    const post = graph.find(item => item['@type'] === 'BlogPosting');
    assert.equal(post?.inLanguage, locale.hreflang);
    assert.equal(post?.headline, article.title);
    assert.ok(index.includes(`href="${route}"`), `${route} linked from language index`);
    total += 1;
  }
}
for (const url of sitemapUrls.filter(url => /\/(?:[a-z]{2,3}(?:-[A-Za-z]+)?\/)?blog\//.test(url))) {
  if (url.endsWith('/editorial-policy')) continue;
  const route = url.slice(origin.length);
  const parts = route.split('/').filter(Boolean);
  const locale = parts[0] === 'blog' ? 'en' : parts[0];
  assert.ok(localizedArticle(parts.at(-1), locale), `Untranslated URL must not be published: ${url}`);
}
assert.equal(localizedArticle(articles[0].slug, 'zz'), undefined, 'Unknown language must not return an English body');
console.log(`Verified ${total} complete static articles across ${availableBlogLocales().length} languages: full text, links, public access, canonical, reciprocal hreflang and sitemap.`);
