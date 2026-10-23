import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { readBlogArticles, readBlogModule, readLocalizedBlogCatalog } from './blog-catalog.mjs';
const output = readBlogModule('src/lib/public-analytics.ts');
const { publicAnalyticsUrl, analyticsPublicPaths } = output;
const { availableBlogLocales, blogPath } = readLocalizedBlogCatalog();
for (const path of analyticsPublicPaths) {
  assert.equal(publicAnalyticsUrl(`https://registerbox.in${path}?email=private@example.invalid#token`), `https://www.registerbox.in${path}`);
}
assert.ok(analyticsPublicPaths.includes('/hi/blog'));
for (const article of readBlogArticles()) {
  for (const locale of availableBlogLocales(article.slug)) {
    assert.ok(analyticsPublicPaths.includes(blogPath(locale.code, article.slug)), 'Published language versions remain public');
  }
}
for (const path of ['/auth', '/auth/otp', '/onboarding/application', '/onboarding/payment', '/checkout', '/dashboard', '/documents', '/control-center', '/gst-returns', '/blog/private-secret', '/blog%2fsecret', '/hi/blog/private-secret', '/hi/blog%2fsecret', '/hi/blog/gst-registration-small-ecommerce-sellers-november-2026']) {
  assert.equal(publicAnalyticsUrl(`https://www.registerbox.in${path}?token=secret`), null);
}
for (const host of ['http://registerbox.in', 'https://admin.registerbox.in', 'https://preview.vercel.app', 'http://localhost:4187', 'https://registerbox.in.evil.invalid', 'https://user:pass@registerbox.in', 'https://registerbox.in:444']) assert.equal(publicAnalyticsUrl(`${host}/blog`), null);
assert.equal(publicAnalyticsUrl('not a URL'), null);
let browserUrl='https://www.registerbox.in/blog?private=removed', route='/blog';
const component={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/public-analytics.web.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:component,URL,window:{location:{get href(){return browserUrl;}}},require(name){
    if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props})};
    if(name==='react')return {useSyncExternalStore:(_subscribe,snapshot)=>snapshot()};
    if(name==='expo-router')return {usePathname:()=>route};
    if(name==='@vercel/analytics/react')return {Analytics:'Analytics'};
    if(name==='@/lib/public-analytics')return output;
    throw new Error(`Unexpected analytics dependency: ${name}`);
  },
});
let tree=component.PublicAnalytics();
assert.equal(tree.type,'Analytics');
assert.equal(tree.props.route,'/blog');
assert.equal(tree.props.path,'/blog');
assert.equal(tree.props.beforeSend({type:'pageview',url:browserUrl}).url,'https://www.registerbox.in/blog');
assert.equal(tree.props.beforeSend({type:'event',url:browserUrl,name:'private'}),null);
const oldCallback=tree.props.beforeSend;
browserUrl='https://www.registerbox.in/onboarding/application?customer=private';route='/onboarding/application';
assert.equal(component.PublicAnalytics(),null);
assert.equal(oldCallback({type:'pageview',url:'https://www.registerbox.in/blog'}),null,'Already-loaded script must reject private SPA navigation');
browserUrl='http://localhost:4187/blog';route='/blog';
assert.equal(component.PublicAnalytics(),null);
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.ok(config.headers.some(rule => rule.source === '/:path*' && rule.headers.some(header => header.key === 'Referrer-Policy' && header.value === 'strict-origin')));
console.log(`Passed: ${analyticsPublicPaths.length} public analytics paths, canonical URL sanitization, private/preview/native exclusion and origin-only referrers.`);
