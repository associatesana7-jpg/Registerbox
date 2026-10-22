import fs from 'node:fs';
import { readBlogArticles } from './blog-catalog.mjs';

const articles = readBlogArticles();
const site = 'https://www.registerbox.in';
const date = '2026-10-22';
const xml = value => value.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[char]);

const blogPaths = [
  '/blog',
  '/hi/blog',
  '/blog/editorial-policy',
  ...articles.flatMap(article => [`/blog/${article.slug}`, `/hi/blog/${article.slug}`]),
];
const dates = new Map(articles.flatMap(article => [
  [`/blog/${article.slug}`, article.publishedAt || date],
  [`/hi/blog/${article.slug}`, date],
]));
const alternate = path => {
  if (path === '/blog' || path === '/hi/blog') return ['/blog', '/hi/blog'];
  if (path === '/blog/editorial-policy') return null;
  const slug = path.split('/').at(-1);
  return [`/blog/${slug}`, `/hi/blog/${slug}`];
};
const sitemapEntry = path => {
  const languages = alternate(path);
  const links = languages ? languages.map((href, index) =>
    `<xhtml:link rel="alternate" hreflang="${index ? 'hi-IN' : 'en-IN'}" href="${xml(site + href)}"/>`
  ).join('') : '';
  return `  <url><loc>${xml(site + path)}</loc><lastmod>${dates.get(path) || date}</lastmod>${links}</url>`;
};
const original = fs.readFileSync('public/sitemap.xml', 'utf8');
const sitemap = original
  .replace(/\s*<url>\s*<loc>https:\/\/www\.registerbox\.in\/(?:hi\/)?blog(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g, '')
  .replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
  .replace('</urlset>', blogPaths.map(sitemapEntry).join('\n') + '\n</urlset>');
fs.writeFileSync('public/sitemap.xml', sitemap);

const existing = fs.readFileSync('public/llms.txt', 'utf8').split('\n## Business questions and guides')[0].trimEnd();
fs.writeFileSync('public/llms.txt', existing + '\n\n## Business questions and guides\n\n'
  + 'These public guides contain practical examples, preparation checklists and linked official sources. Each article displays its publication and source-check date. English and Hindi are separately crawlable pages.\n\n'
  + articles.map(article => `- [${article.title}](${site}/blog/${article.slug}) — [हिन्दी में पढ़ें](${site}/hi/blog/${article.slug}): ${article.description}`).join('\n')
  + `\n\n- [Editorial approach](${site}/blog/editorial-policy)\n- [All business guides](${site}/blog)\n- [सभी गाइड हिन्दी में](${site}/hi/blog)\n`);

fs.writeFileSync('public/blog-feed.json', JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1',
  title: 'RegisterBox business guides',
  home_page_url: `${site}/blog`,
  feed_url: `${site}/blog-feed.json`,
  language: 'en-IN',
  items: articles.map(article => ({
    id: `${site}/blog/${article.slug}`,
    url: `${site}/blog/${article.slug}`,
    title: article.title,
    summary: article.description,
    content_text: article.intro.join('\n\n'),
    image: `${site}/images/blog/${article.image}-1200.webp`,
    date_published: `${article.publishedAt || date}T00:00:00+05:30`,
    authors: [{ name: 'RegisterBox', url: `${site}/blog/editorial-policy` }],
    tags: [article.category],
  })),
}, null, 2) + '\n');
console.log(`Generated sitemap, guide index and public JSON feed for ${articles.length} bilingual articles.`);
