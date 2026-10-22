import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
let pathname='/privacy';
const jsx=(type,props)=>({type,props});
const modules={
 'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
 'react':{useState:()=>[false,()=>{}]},
 'expo-router':{Link:'Link',Redirect:'Redirect',usePathname:()=>pathname,useSegments:()=>[]},
 'expo-router/head':{default:'Head',__esModule:true},
 '@/hooks/use-app':{useApp:()=>({session:null,loadingSession:false})},
 './brand.web':{WebBrand:'Brand'},
 './content':{contact:{whatsapp:'https://example.invalid'},safeNext:value=>value},
 '../app-icon':{AppIcon:'AppIcon'},
 './workspace-shell.css':{},
 '@/data/blog/locales.json': {default:JSON.parse(fs.readFileSync('src/data/blog/locales.json','utf8')),__esModule:true},
};
const code=ts.transpileModule(fs.readFileSync('src/components/website/shell.web.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function('require','exports',code)(name=>modules[name]??assert.fail(name),exports);
function nodes(value){if(Array.isArray(value))return value.flatMap(nodes);if(value&&typeof value==='object')return [value,...nodes(value.props?.children)];return [value];}
for(pathname of ['/privacy','/policies','/delete-account','/privacy-operations','/hi/blog','/hi/blog/fast-gst-registration-three-hours','/kn/blog','/kn/blog/gstr-3b-filing-process-online','/ta/blog','/ta/blog/gstr-3b-filing-process-online']){
 const tree=nodes(exports.WebShell({children:'PRIVACY_CONTENT'}));
 assert.ok(tree.includes('PRIVACY_CONTENT'),pathname+' must not hide its public notice / staff access instructions');
 assert.equal(tree.some(n=>n?.type==='Redirect'),false);
}
pathname='/gst';
assert.ok(nodes(exports.WebShell({children:'PROTECTED_CUSTOMER_DATA'})).some(n=>n?.type==='Redirect'),'GST customer data retains its sign-in guard');
console.log('Privacy notice stays public; operator endpoint retains server authority; customer workspace stays protected.');
