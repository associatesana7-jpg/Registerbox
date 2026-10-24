import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { readBlogArticles, readLocalizedBlogCatalog } from './blog-catalog.mjs';
const root=process.argv[2]||'dist',articles=readBlogArticles(),site='https://www.registerbox.in';
const { localizedArticle, availableBlogLocales }=readLocalizedBlogCatalog();
let hindiVerified=0;
function readTsModule(filename, imports = {}) {
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const output={};new Function('exports','require',code)(output,name=>{assert.ok(name in imports,`Unexpected import ${name}`);return imports[name];});return output;
}
const catalogue=readTsModule('supabase/functions/_shared/service-catalog.ts');
const {blogServiceOffers,blogPackagePrice}=readTsModule('src/components/website/blog-offers.ts',{'@/lib/service-catalog':catalogue});
const coveredPackages=new Set();
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
  assert.equal(post.datePublished,article.publishedAt||'2026-10-20','Actual publication date');
  if(article.howToSection)assert.ok(html.includes(`href="#${article.howToSection}"`),'Guide jump button');
  if(article.availabilityNote)assert.ok(html.includes(article.availabilityNote.replace(/&/g,'&amp;')),'Visible filing availability note');
  assert.ok(fs.statSync(path.join(root,'images/blog',article.image+'-1200.webp')).size>0);
  for(const section of article.sections)for(const id of section.sourceIds||[])assert.ok(article.sources.some(source=>source.id===id),`${article.slug}: source ${id}`);
  for(const slug of article.relatedSlugs)assert.ok(articles.some(item=>item.slug===slug),`${article.slug}: related ${slug}`);
  assert.ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(`${site}/blog/${article.slug}`));
  const panel=html.match(/<aside class="rbg-service-cta rbg-offers".*?<\/aside>/s)?.[0];
  assert.ok(panel,`${article.slug}: crawlable service, process and price panel`);
  const processLink=panel.match(/<div class="rbg-offer-actions">(<a\b[^>]*>)/)?.[1];
  assert.ok(processLink,`${article.slug}: service process link`);
  const processUrl=new URL(processLink.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'), `${site}/blog/${article.slug}`);
  const processPath=processUrl.pathname==='/'?'index':processUrl.pathname.replace(/^\//,'');
  const processFile=[path.join(root,processPath+'.html'),path.join(root,processPath,'index.html')].find(file=>fs.existsSync(file));
  assert.ok(processFile,`${article.slug}: process page exists`);
  if(processUrl.hash)assert.ok(fs.readFileSync(processFile,'utf8').includes(`id="${processUrl.hash.slice(1)}"`),`${article.slug}: process anchor exists`);
  const offers=blogServiceOffers(article.slug,article.serviceCategory);
  if(offers.freeNil){
    assert.ok(panel.includes('₹0'),`${article.slug}: free nil price`);
    assert.ok(panel.includes('href="/gst"'),`${article.slug}: free workspace link`);
    assert.ok(!panel.includes('/checkout?'),`${article.slug}: no paid checkout for eligible free nil filing`);
  }
  if(offers.quoteRequired)assert.ok(panel.includes('scope and fee by quotation'),`${article.slug}: quote before payment`);
  for(const item of offers.packages){
    coveredPackages.add(item.id);
    assert.ok(panel.includes(item.title.replace(/&/g,'&amp;')),`${article.slug}: package ${item.id}`);
    assert.ok(panel.includes(blogPackagePrice(item.amountPaise)),`${article.slug}: catalogue price ${item.id}`);
    if(item.serviceCategory === 'food') assert.ok(panel.includes('href="/onboarding/application?category=food"'),`${article.slug}: food category review before payment`);
    else assert.ok(panel.includes(`href="/checkout?package=${item.id}"`),`${article.slug}: secure checkout ${item.id}`);
    assert.ok(panel.includes('No GST is added'),`${article.slug}: no extra GST`);
  }
  const hindiFile=path.join(root,'hi','blog',article.slug+'.html');
  if(!localizedArticle(article.slug,'hi')){
    assert.ok(!fs.existsSync(hindiFile),`${article.slug}: do not generate a false Hindi article`);
    for(const locale of availableBlogLocales().filter(item=>item.code!=='en'))assert.ok(!html.includes(`${site}/${locale.code}/blog/${article.slug}`),`${article.slug}: do not advertise an unavailable translation`);
    continue;
  }
  const hindiHtml=fs.readFileSync(hindiFile,'utf8');
  assert.equal((hindiHtml.match(/<h1\b/g)||[]).length,1,article.slug+' Hindi page needs one H1');
  assert.match(hindiHtml,/<h1[^>]*>[^<]*[\u0900-\u097F]/,article.slug+' needs static Hindi text');
  assert.match(hindiHtml,/name="robots" content="index,follow,max-image-preview:large"/,article.slug+' Hindi page must be indexable');
  assert.ok(hindiHtml.includes(`rel="canonical" href="${site}/hi/blog/${article.slug}"`),article.slug+' Hindi canonical');
  assert.ok(hindiHtml.includes(`href="${site}/blog/${article.slug}"`),article.slug+' English alternate');
  assert.ok(hindiHtml.includes(`href="${site}/hi/blog/${article.slug}"`),article.slug+' Hindi alternate');
  assert.doesNotMatch(hindiHtml,/name="robots" content="noindex/,article.slug+' Hindi article must not fall back to noindex');
  const hindiGraph=[...hindiHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match=>JSON.parse(match[1])['@graph']);
  const hindiPost=hindiGraph.find(item=>item['@type']==='BlogPosting');
  assert.ok(hindiPost,article.slug+' Hindi article schema');
  assert.equal(hindiPost.inLanguage,'hi-IN');
  assert.ok(hindiPost.headline.match(/[\u0900-\u097F]/));
  assert.ok(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').includes(`${site}/hi/blog/${article.slug}`));
  hindiVerified+=1;
}
assert.ok(hindiVerified>=23,'Preserve all 23 existing complete Hindi guides');
for(const item of catalogue.servicePackages)assert.ok(coveredPackages.has(item.id),`${item.id}: published in a relevant business guide`);
for(const url of ['blog/index.html','blog/editorial-policy.html','hi/blog/index.html'])assert.ok(fs.existsSync(path.join(root,url)),url);
assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="/blog"'),'Homepage links to guides');
console.log(`Verified ${articles.length} English and ${hindiVerified} complete Hindi public articles: static text, canonical/hreflang URLs, indexability, Article metadata, images, sources, prices, service links and sitemap.`);
