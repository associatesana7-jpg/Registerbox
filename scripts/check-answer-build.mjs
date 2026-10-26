import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readBlogArticles, readLocalizedBlogCatalog } from './blog-catalog.mjs';

const output = resolve(process.argv[2] || 'dist');
function html(route) {
  const base = route === '/' ? 'index' : route.replace(/^\//, '');
  const file = [resolve(output, base + '.html'), resolve(output, base, 'index.html')].find(existsSync);
  assert(file, `Missing public route ${route}`);
  return readFileSync(file, 'utf8');
}
const text = value => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const home = html('/');
assert.match(text(home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || ''), /How do I register my business in Bengaluru\?/);
assert.doesNotMatch(home, /<details[^>]+class="[^"]*(?:faq|answer)[^"]*"/i, 'Homepage answers are visible without JavaScript or expanding');
assert.equal((home.match(/aria-labelledby="business-answer-\d+"/g) || []).length, 6);
const food = html('/services/fssai-food-business');
assert.equal((food.match(/aria-labelledby="food-answer-\d+"/g) || []).length, 14);
assert.doesNotMatch(food, /<details\b/, 'Every FSSAI answer is visible');
for (const page of [home, food]) {
  const graph = [...page.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1])['@graph'] || []);
  const faq = graph.find(node => node['@type'] === 'FAQPage');
  assert(faq, 'Public FAQ metadata must be backed by real answers');
  for (const question of faq.mainEntity) {
    const escaped = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    const body = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert(body.includes(escaped(question.name)), 'FAQ question present in HTML');
    assert(body.includes(escaped(question.acceptedAnswer.text)), 'FAQ answer present in HTML');
  }
}
const sitemap = readFileSync(resolve(output, 'sitemap.xml'), 'utf8');
const serviceRoutes = [...sitemap.matchAll(/<loc>https:\/\/www\.registerbox\.in(\/services\/[^<]+)<\/loc>/g)].map(match => match[1]);
for (const route of serviceRoutes) {
  const page = html(route);
  assert.match(text(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || ''), /\?$/, route + ': specific question heading');
  const guidance = page.replace(/<details class="rb-package-details">[\s\S]*?<\/details>/g, '');
  assert.doesNotMatch(guidance, /<details\b/, route + ': guidance and FAQ answers remain visible; only detailed package inclusions may expand');
  if (!route.endsWith('fssai-food-business') && !route.endsWith('free-nil-gst-filing')) {
    assert((page.match(/class="rb-answer-detail"/g) || []).length >= 8, route + ': full guidance and sources before JavaScript');
    assert(page.includes('Our recommendation'), route + ': labelled editorial judgment');
  }
}
const directory = html('/services');
const foodCard = directory.match(/<article\b[^>]*>[\s\S]*?Eligible Basic package[\s\S]*?<\/article>/)?.[0];
assert(foodCard?.includes('First annual government fee included'), 'Directory explains the food offer inclusion');
assert.doesNotMatch(directory, /<details\b/, 'Directory answers visible');
const { availableBlogLocales, localizedArticle, blogPath } = readLocalizedBlogCatalog();
let blogCount = 0;
for (const article of readBlogArticles()) for (const locale of availableBlogLocales(article.slug)) {
  const translated = localizedArticle(article.slug, locale.code);
  const page = html(blogPath(locale.code, article.slug));
  if (page.includes('class="rbg-cover"')) assert(page.indexOf('rbg-article-summary') < page.indexOf('class="rbg-cover"'), 'Direct introduction precedes decorative cover');
  const faqSection = page.match(/<section id="common-questions">([\s\S]*?)<\/section>/)?.[1];
  assert(faqSection && !faqSection.includes('<details'), 'Blog FAQs fully visible');
  assert.equal((faqSection.match(/class="rbg-faq"/g) || []).length, translated.faqs.length);
  const offerPanel = page.match(/<aside class="rbg-service-cta rbg-offers"[\s\S]*?<\/aside>/)?.[0];
  assert(offerPanel && !offerPanel.includes('<details'), 'Package inclusions and exclusions visible before purchase');
  blogCount++;
}
console.log(`Verified answer visibility, FAQ parity, specific headings and public scope across ${serviceRoutes.length} services and ${blogCount} regional articles.`);
