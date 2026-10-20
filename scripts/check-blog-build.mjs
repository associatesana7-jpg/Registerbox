import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBlogArticles } from './blog-catalog.mjs';
const root=process.argv[2]||'dist',articles=readBlogArticles(),site='https://www.registerbox.in';
assert.equal(new Set(articles.map(article=>article.slug)).size,articles.length,'Unique article URLs');
for(const article of articles){
  const html=fs.readFileSync(path.join(root,'blog',article.slug+'.html'),'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,article.slug+' needs one H1');
  assert.ok(html.includes(article.title.replace(/&/g,'&amp;')),article.slug+' needs content before JavaScript');
  assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/);
  assert.ok(html.includes(`rel="canonical" href="${site}/blog/${article.slug}"`));
  assert.doesNotMatch(html,/name="robots" content="noindex/,'No auth-shell noindex on public articles');
  const graph=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match=>JSON.parse(match[1])['@graph']);
  const post=graph.find(item=>item['@type']==='BlogPosting');assert.ok(post);assert.equal(post.headline,article.title);assert.equal(post.image[0],`${site}/images/blog/${article.image}-1200.webp`);
  assert.ok(fs.statSync(path.join(root,'images/blog',article.image+'-1200.webp')).size>0);
  for(const section of article.sections)for(const id of section.sourceIds||[])assert.ok(article.sources.some(source=>source.id===id),`${article.slug}: source ${id}`);
  for(const slug of article.relatedSlugs)assert.ok(articles.some(item=>item.slug===slug),`${article.slug}: related ${slug}`);
  assert.ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(`${site}/blog/${article.slug}`));
}
for(const url of ['blog/index.html','blog/editorial-policy.html'])assert.ok(fs.existsSync(path.join(root,url)),url);
assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="/blog"'),'Homepage links to guides');
console.log(`Verified ${articles.length} public articles: static text, canonical URLs, indexability, Article metadata, images, sources, related links and sitemap.`);
