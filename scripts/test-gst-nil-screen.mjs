import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {nilNextStep} from '../src/lib/gst-nil-flow.ts';
import {filingBlock} from '../supabase/functions/_shared/gst-filing-history.ts';
import {validFilingOtp} from '../supabase/functions/_shared/gst-filing-otp.ts';
import {periodIsClosed,validPeriod} from '../supabase/functions/gst-workspace/domain.ts';
import {gstReturnRecovery} from '../src/lib/gst-return-recovery.ts';
import {gstReconnectParams} from '../src/lib/gst-return-route.ts';
const compiled=ts.transpileModule(fs.readFileSync('src/components/gst-nil-return.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(form,options={}){const state=[],refs=[],effects=[],calls=[],navigations=[];let index=0,ref=0,effect=0;let draft={id:'draft',form,year:2026,month:8,gstin:'29ABCDE1234F1Z5',state:'prepared',revision:1,payload:{registerbox_nil:true},payload_hash:'hash',signatory_pan:'ABCDE1234F',...options.draft};
 const react={useState(initial){const n=index++;if(!(n in state))state[n]=typeof initial==='function'?initial():initial;return [state[n],value=>{state[n]=typeof value==='function'?value(state[n]):value;}];},useRef(initial){return refs[ref++]??=( {current:initial} );},useEffect(fn){if(!effects[effect++]){effects[effect-1]=true;fn();}}};
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'react-native':{Text:'Text',View:'View'},'expo-router':{Stack:{Screen:'StackScreen'},router:{replace(value){navigations.push({method:'replace',value});},push(value){navigations.push({method:'push',value});}}},'@/constants/design':{palette:{}},'@/lib/gst-nil-flow':{nilNextStep},'@/lib/gst-return-recovery':{gstReturnRecovery},'@/lib/gst-return-route':{gstReconnectParams},'../../supabase/functions/_shared/gst-filing-otp':{validFilingOtp},'../../supabase/functions/_shared/gst-filing-history':{filingBlock},'../../supabase/functions/gst-workspace/domain':{periodIsClosed,validPeriod},'@/hooks/use-gst-refresh':{useGstRefresh:fn=>react.useEffect(()=>queueMicrotask(fn))},'@/lib/gst-returns-api':{returnAction:async(_id,action,input)=>{calls.push({action,input});const override=await options.onRequest?.(action,input,draft);if(override!==undefined){if(override.draft)draft=structuredClone(override.draft);return override;}if(action==='list')return {drafts:[structuredClone(draft)],gstin:draft.gstin,writesEnabled:true};if(action==='history')return {history:{period:'082026',records:[{form:'GSTR1',status:form==='gstr-1'?'Not filed':'Filed'}]}};if(action==='evc'){draft={...draft,state:'otp_sent'};return {draft:structuredClone(draft),writesEnabled:true};}throw Error(action);}}};
 for(const [path,names]of Object.entries({'./registerbox-ui':['Badge','Button','Card','ErrorBanner','Field','Screen'],'./gst-ui':['GstHeader'],'./gst-signatory-selector':['GstSignatorySelector'],'./workspace-ui':['JourneyRail'],'./gst-checkbox':['GstCheckbox'],'./gst-ims-recovery':['GstImsRecovery'],'./gst-recovery-card':['GstRecoveryCard']}))modules[path]=Object.fromEntries(names.map(name=>[name,name]));
 const exports={};new Function('require','exports',compiled)(name=>modules[name]??assert.fail(name),exports);
 const render=()=>{index=ref=effect=0;return exports.GstNilReturn({businessId:'business',form,year:2026,month:8});};render();return {render,calls,state,navigations,setDraft:value=>{draft={...draft,...value};}};
}
function all(tree){if(Array.isArray(tree))return tree.flatMap(all);if(!tree||typeof tree!=='object')return [];return [tree,...all(tree.props?.children)];}
const button=(tree,title)=>all(tree).find(n=>n.type==='Button'&&n.props.title===title);
for(const form of ['gstr-1','gstr-3b']){
 const app=harness(form);await flush();let tree=app.render();
 for(const prefix of ['I checked my complete books','I authorize saving this declaration'])all(tree).find(n=>n.props?.label?.startsWith(prefix)).props.onPress();
 tree=app.render();const send=button(tree,'Resend OTP');assert.equal(send.props.disabled,false);await send.props.onPress();await flush();tree=app.render();assert.ok(button(tree,'Resend OTP'));await button(tree,'Resend OTP').props.onPress();await flush();
 assert.equal(app.calls.filter(c=>c.action==='evc').length,2);assert.equal(app.calls.filter(c=>['draft','proceed','file'].includes(c.action)).length,0);
 app.setDraft({state:'prepared'});all(app.render()).find(n=>n.type==='Button'&&n.props.title==='Refresh filing status').props.onPress();await flush();tree=app.render();
 assert.equal(all(tree).find(n=>n.props?.label?.startsWith('I checked my complete books')).props.checked,true,'Resend must retain books declaration');
 assert.equal(all(tree).find(n=>n.props?.label?.startsWith('I authorize saving this declaration')).props.checked,true,'Resend must retain preparatory authorization');
 assert.equal(button(tree,'Resend OTP').props.disabled,false);
}
const workspace=fs.readFileSync('src/app/gst.tsx','utf8');assert.ok(!workspace.includes('setSection(value);setReadConsent(false);setResult(null);setFilingHistory(null)'),'Tab switch must not discard status without refetching');
const tabs=fs.readFileSync('src/app/(tabs)/_layout.tsx','utf8');assert.match(tabs,/useSafeAreaInsets/);assert.match(tabs,/height: 62 \+ bottom/);
console.log('Nil screens verified for GSTR-1 and GSTR-3B: direct resend, existing signatory reused, declarations retained, no preparation replay or filing; status-tab regression and Android insets guarded.');
