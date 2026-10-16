import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
let params={}, session=null;
const calls=[];
const router={push:href=>calls.push(href),replace:href=>calls.push(href),back:()=>calls.push('BACK')};
const hooks={useState:value=>[value,()=>{}],useEffect:()=>{},useRef:value=>({current:value}),useCallback:fn=>fn};
const rn={Text:'Text',View:'View',Linking:{},StyleSheet:{create:v=>v}};
const ui=Object.fromEntries(['Button','Card','ErrorBanner','Field','PageHeader','Screen'].map(name=>[name,name]));
const experience=Object.fromEntries(['NavTile','ScreenTitle','SoftNotice','StatTile','SectionHeading','Eyebrow'].map(name=>[name,name]));
function load(file,overrides={}){
  const exports={};
  const modules={'expo-router':{router,Redirect:'Redirect',Link:'Link',useLocalSearchParams:()=>params},react:hooks,'react-native':rn,'@/components/registerbox-ui':ui,'@/components/experience':experience,'@/constants/design':{palette:{}},...overrides};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,URL,require(name){if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name in modules)return modules[name];throw Error('Unexpected dependency '+name);}});
  return exports;
}
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];}
const content=load('src/components/website/content.ts');
const categories=load('src/data/application-categories.ts');
const pages=load('src/components/website/service-pages.ts',{'./content':content});
const data=load('src/components/website/service-details.ts');
const presentation=load('src/components/website/service-presentation.ts');
assert.equal(new Set(content.services.map(s=>content.servicePath(s.category))).size,11);
assert.equal(pages.publicServicePath('trademark'),'/services/trademark-registration');
assert.equal(pages.publicServicePath('missing'),'/services');
assert.equal(content.servicePath('missing'),'/services');
const intent=load('src/app/onboarding/intent.tsx',{'@/data/application-categories':categories,'@/components/website/content':content}).default;
assert.equal(intent().type,'Screen','No-prompt legacy URL must present a service chooser, not bounce home');
const tiles=nodes(intent()).filter(n=>n.type==='NavTile');assert.equal(tiles.length,11);
for(let i=0;i<tiles.length;i++){tiles[i].props.onPress();assert.equal(calls.at(-1),content.servicePath(content.services[i].category));}
params={prompt:'GST returns'};assert.equal(intent().props.href,'/gst');params={};
const welcome=load('src/app/onboarding/welcome.tsx',{'@/components/illustrations':{BotIllustration:'BotIllustration'}}).default();
const welcomeTiles=nodes(welcome).filter(n=>n.type==='NavTile');
for(const tile of welcomeTiles)tile.props.onPress();
assert.equal(calls.at(-3),'/(tabs)/ai');assert.equal(calls.at(-2).params.category,'existing');assert.equal(calls.at(-1),'/(tabs)/documents');
const documents=load('src/app/(tabs)/documents.tsx',{'@/hooks/use-app':{useApp:()=>({business:{}})},'@/hooks/use-business-records':{useBusinessRecords:()=>({data:null,loading:false,refresh:()=>{}})},'@/lib/registerbox-api':{},'@/lib/supabase':{}}).default();
await nodes(documents).find(n=>n.type==='Button'&&n.props.title==='Set up business to upload').props.onPress();
assert.equal(calls.at(-1).params.category,'existing');
const report=load('src/app/onboarding/report.tsx',{'@/hooks/use-app':{useApp:()=>({compliances:[]})},'@/components/flow-parts':{ComplianceCard:'ComplianceCard'}}).default();
nodes(report).find(n=>n.type==='Button'&&n.props.title==='Update business details').props.onPress();assert.equal(calls.at(-1).params.category,'existing');
const ServicePage=load('src/components/website/service-page.web.tsx',{
  '@/hooks/use-app':{useApp:()=>({session})},'./brand.web':{WebBrand:'WebBrand'},'./content':content,'./service-pages':pages,'./service-details':data,'./service-presentation':presentation,'./seo.web':{Seo:'Seo',siteUrl:'https://www.registerbox.in'},'./local-support.web':{BranchDetails:'BranchDetails',ContactActions:'ContactActions',CustomerFeedback:'CustomerFeedback'},
}).default;
for(const service of pages.publicServices){
  for(const signedIn of [false,true]){
    session=signedIn?{user:{id:'inert'}}:null;
    const primary=nodes(ServicePage({slug:service.slug})).find(n=>n.type==='Link'&&n.props.className==='rb-button rb-sx-primary');assert.ok(primary);
    if(service.category==='trademark')assert.equal(primary.props.href,'/contact?service=trademark');
    else if(signedIn)assert.equal(primary.props.href,content.servicePath(service.category));
    else assert.equal(primary.props.href.params.next,content.servicePath(service.category));
  }
}
params={service:'trademark'};
const contact=load('src/components/website/contact.web.tsx',{'./brand.web':{WebBrand:'WebBrand'},'./content':content,'./service-pages':pages,'./seo.web':{Seo:'Seo'},'./local-support.web':{BranchDetails:'BranchDetails',ContactActions:'ContactActions',CustomerFeedback:'CustomerFeedback'}}).default();
assert.equal(nodes(contact).find(n=>n.type==='select').props.value,'Trademark application');
console.log('Passed: 11 distinct service targets; 24 signed-in/out service CTAs; meaningful legacy chooser, welcome actions, document setup, profile edits and preselected trademark enquiry. No backend calls.');
