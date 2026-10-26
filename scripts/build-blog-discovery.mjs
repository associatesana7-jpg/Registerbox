import fs from 'node:fs';
import { readBlogArticles, readLocalizedBlogCatalog, readBlogModule } from './blog-catalog.mjs';

const articles = readBlogArticles();
const { availableBlogLocales, localizedArticle, blogPath, blogAlternates } = readLocalizedBlogCatalog();
const site = 'https://www.registerbox.in';
const xml = value => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
const entries = [
  ...availableBlogLocales().map(locale => ({ path: blogPath(locale.code), alternates: blogAlternates() })),
  { path: '/blog/editorial-policy', alternates: [] },
  ...articles.flatMap(article => availableBlogLocales(article.slug).map(locale => ({
    path: blogPath(locale.code, article.slug), alternates: blogAlternates(article.slug),
    lastmod: localizedArticle(article.slug, locale.code).modifiedAt,
  }))),
];
const original = fs.readFileSync('public/sitemap.xml', 'utf8');
const sitemap = original
  .replace(/\s*<url>\s*<loc>https:\/\/www\.registerbox\.in\/(?:[a-z]{2,3}(?:-[A-Za-z]+)?\/)?blog(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g, '')
  .replace(/<urlset\b[^>]*>/, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">')
  // Only actual content edits receive lastmod. Never date every page on each build.
  .replace('</urlset>', entries.map(entry => `  <url><loc>${xml(site + entry.path)}</loc>${entry.lastmod ? `<lastmod>${xml(entry.lastmod)}</lastmod>` : ''}${entry.alternates.map(alternate => `<xhtml:link rel="alternate" hreflang="${alternate.language}" href="${xml(site + alternate.path)}"/>`).join('')}</url>`).join('\n') + '\n</urlset>');
fs.writeFileSync('public/sitemap.xml', sitemap);

// Only pages designed primarily for watching belong in the video sitemap.
const { blogVideos } = readBlogModule('src/data/blog-video.ts');
const watchVideos = articles.flatMap(article => {
  const video = blogVideos[article.slug];
  return video?.watchPath === `/blog/${article.slug}` ? [{ article, video }] : [];
});
fs.writeFileSync('public/video-sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n'
  + watchVideos.map(({ video }) => `  <url><loc>${xml(site + video.watchPath)}</loc><video:video><video:thumbnail_loc>${xml(site + video.poster)}</video:thumbnail_loc><video:title>${xml(video.title)}</video:title><video:description>${xml(video.description)}</video:description><video:content_loc>${xml(site + video.src)}</video:content_loc><video:publication_date>${xml(video.uploadDate)}</video:publication_date><video:family_friendly>yes</video:family_friendly><video:requires_subscription>no</video:requires_subscription><video:live>no</video:live></video:video></url>`).join('\n')
  + '\n</urlset>\n');

const existing = fs.readFileSync('public/llms.txt', 'utf8').split('\n## Business questions and guides')[0].trimEnd();
fs.writeFileSync('public/llms.txt', `${existing}\n\n## Business questions and guides\n\nThese public guides contain preparation checklists, practical explanations and linked official sources. Complete language versions have separate crawlable URLs. Language availability is generated from published translations.\n\n`
  + articles.map(article => {
    const translations = availableBlogLocales(article.slug)
      .filter(locale => locale.code !== 'en')
      .map(locale => `[${locale.nativeName}](${site}${blogPath(locale.code, article.slug)})`)
      .join(' · ');
    return `- [${article.title}](${site}/blog/${article.slug}): ${article.description}${translations ? `\n  ${translations}` : ''}`;
  }).join('\n')
  + `\n\n- [Editorial approach](${site}/blog/editorial-policy)\n`
  + availableBlogLocales().map(locale => `- [${locale.nativeName} guides](${site}${blogPath(locale.code)})`).join('\n') + '\n');

const items = articles.flatMap(article => availableBlogLocales(article.slug).map(locale => {
  const translated = localizedArticle(article.slug, locale.code);
  const url = `${site}${blogPath(locale.code, article.slug)}`;
  return { id: url, url, title: translated.title, summary: translated.description,
    content_text: translated.intro.join('\n\n'), language: locale.hreflang,
    image: `${site}/images/blog/${article.image}-1200.webp`,
    date_published: `${article.publishedAt || '2026-10-20'}T00:00:00+05:30`,
    ...(translated.modifiedAt ? { date_modified: `${translated.modifiedAt}T00:00:00+05:30` } : {}),
    authors: [{ name: 'RegisterBox', url: `${site}/blog/editorial-policy` }], tags: [article.category] };
}));
fs.writeFileSync('public/blog-feed.json', JSON.stringify({ version: 'https://jsonfeed.org/version/1.1',
  title: 'RegisterBox business guides', home_page_url: `${site}/blog`, feed_url: `${site}/blog-feed.json`,
  language: 'en-IN', items,
}, null, 2) + '\n');

// Keep analytics restricted to exact published URLs.
fs.writeFileSync('src/data/blog/public-paths.generated.json', JSON.stringify(entries.map(entry => entry.path), null, 2) + '\n');
console.log(`Generated discovery files for ${items.length} articles in ${availableBlogLocales().length} published languages.`);
