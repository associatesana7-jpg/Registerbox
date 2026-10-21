import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {readBlogArticles} from './blog-catalog.mjs';
const articles=readBlogArticles(),slugs=['gstr-3b-filing-process-online','dir-3-kyc-filing-online-process','esic-registration-online-for-employers','shop-and-establishment-registration-process'];
const jsx=(type,props)=>({type,props});
function load(file,extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URL,require(name){if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name in extra)return extra[name];throw Error(`Unexpected dependency ${name}`);}});return exports;}
const content=load('src/components/website/content.ts');
const services=load('src/components/website/service-pages.ts',{'./content':content});
let session=null;
const {BlogActions}=load('src/components/website/blog-actions.web.tsx',{'expo-router':{Link:'Link'},'@/hooks/use-app':{useApp:()=>({session})},'./content':content,'./service-pages':services});
function links(node){if(Array.isArray(node))return node.flatMap(links);if(!node||typeof node!=='object')return [];return [...(node.type==='Link'||node.type==='a'?[node.props]:[]),...[node.props?.children].flat().flatMap(links)];}
const images=[];
for(const slug of slugs){
 const article=articles.find(a=>a.slug===slug);assert.ok(article,slug);assert.equal(article.publishedAt,'2026-10-21');images.push(article.image);
 assert.ok(article.sections.some(s=>s.id===article.howToSection),'How-to button targets an existing section');
 assert.ok(articles.some(a=>a.slug!==slug&&a.relatedSlugs.includes(slug)),'Existing guides link back to the new topic');
 for(const source of article.sources)assert.ok(/^https:\/\//.test(source.url));
 for(const signedIn of [false,true]){session=signedIn?{user:{id:'fixture'}}:null;const buttons=links(BlogActions({article}));
 assert.ok(buttons.some(b=>String(b.href).startsWith('tel:+918147777843')),'Direct call button');
 assert.ok(buttons.some(b=>b.href===`#${article.howToSection}`),'Guide jump button');
 assert.ok(buttons.some(b=>b.href===article.officialApplication.url),'Official portal button');
 for(const action of article.appActions||[]){assert.equal(content.safeNext(action.destination),action.destination);assert.ok(buttons.some(b=>signedIn?b.href===action.destination:b.href?.pathname==='/auth'&&b.href.params.next===action.destination),`Application choice survives sign-in: ${signedIn} ${action.destination} ${JSON.stringify(buttons.map(b=>b.href))}`);}
 }
}
assert.equal(new Set(images).size,4,'Each topic has its own original image');
const gst=articles.find(a=>a.slug===slugs[0]);assert.match(gst.availabilityNote,/Regular.*not yet been independently verified/);assert.match(gst.availabilityNote,/Neither route is an unattended one-click/);
console.log('Passed: four distinct process guides, exact dates, inbound crosslinks, source/guide/call buttons, preserved GST destinations and truthful filing status.');
