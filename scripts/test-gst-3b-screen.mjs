// Exercise the real shared mobile/web screen with synthetic hooks and API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { blank3b, zeroBlanks } from '../supabase/functions/_shared/gstr3b.ts';
import * as payment from '../supabase/functions/_shared/gst-payment.ts';
import * as workspace from '../src/lib/gst-return-workspace.ts';
import { periodIsClosed } from '../supabase/functions/gst-workspace/domain.ts';
import { validFilingOtp } from '../supabase/functions/_shared/gst-filing-otp.ts';

const compiled=ts.transpileModule(fs.readFileSync('src/app/gst-returns.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const gstin='29ABCDE1234F1Z5',period='082026';
const fixture={id:'saved-draft',form:'gstr-3b',gstin,year:2026,month:8,state:'draft',revision:7,payload:zeroBlanks(blank3b(gstin,period)),payload_hash:'synthetic-hash',acknowledgement:null};
const history={period,records:[{form:'GSTR3B',period,status:'Not filed'}]};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(saved,enabled=false){
  const values=[],effects=[],refs=[],requests=[];
  let slot=0,ref=0,effect=0;
  const react={
    useState(initial){const i=slot++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],value=>{values[i]=typeof value==='function'?value(values[i]):value;}];},
    useRef(initial){return refs[ref++]??={current:initial};},
    useEffect(callback){const i=effect++;if(!(i in effects))effects[i]=callback();},
  };
  const route={form:'gstr-3b',year:'2026',month:'08',mode:'regular'};
  const modules={
    react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{Pressable:'Pressable',Text:'Text',View:'View'},
    'expo-router':{Redirect:'Redirect',Stack:{Screen:'StackScreen'},router:{push(){},back(){}},useLocalSearchParams:()=>route},
    'expo-document-picker':{},'expo-file-system':{},
    '@/hooks/use-app':{useApp:()=>({business:{id:'business'},session:{user:{id:'owner'}},demoMode:false,loadingSession:false})},
    '@/constants/design':{palette:{blue:'#146BFF',ink:'#172D42',muted:'#536476',green:'#127847'}},
    '@/lib/gst-returns-api':{returnAction:async(businessId,action,input)=>{requests.push({businessId,action,input});return action==='list'?{drafts:saved?[structuredClone(saved)]:[],gstin,writesEnabled:enabled}:{draft:structuredClone(saved),writesEnabled:enabled};}},
    '@/lib/gst-return-workspace':workspace,
    '../../supabase/functions/_shared/gst-payment':payment,
    '../../supabase/functions/gst-workspace/domain':{periodIsClosed},
    '../../supabase/functions/_shared/gstr3b':{blank3b},
    '../../supabase/functions/_shared/gst-filing-otp':{validFilingOtp},
    '../../supabase/functions/_shared/gst-ecom':{},'../../supabase/functions/_shared/gst-platform-draft':{},
  };
  for(const [path,names] of Object.entries({
    '@/components/registerbox-ui':['Badge','Button','Card','ErrorBanner','Field','Screen'],
    '@/components/experience':['FlowProgress','SoftNotice'],
    '@/components/gst-ui':['GstHeader'],'@/components/gst-filing-history':['GstFilingHistory'],
    '@/components/gst-return-review':['GstReturnReview'],'@/components/gst-guided-editor':['GstGuidedEditor'],
    '@/components/gst-payment-review':['GstPaymentReview'],'@/components/gst-nil-return':['GstNilReturn'],
    '@/components/gst-platform-review':['GstPlatformReview'],
  }))modules[path]=Object.fromEntries(names.map(name=>[name,name]));
  const exports={};new Function('require','exports',compiled)(name=>modules[name]??assert.fail(name),exports);
  const root=exports.default();
  function render(){slot=ref=effect=0;return root.type(root.props);}
  render();return {render,requests};
}
function nodes(tree){
  if(Array.isArray(tree))return tree.flatMap(nodes);
  if(!tree||typeof tree!=='object')return [];
  return [tree,...nodes(tree.props?.children)];
}
const find=(tree,predicate)=>nodes(tree).find(predicate);
const button=(tree,title)=>find(tree,n=>n.type==='Button'&&n.props.title===title);

// Existing regular draft resumes with entered figures and its optimistic revision.
{
  const app=harness(fixture);await flush();let tree=app.render();
  assert.equal(find(tree,n=>n.type==='GstGuidedEditor').props.payload,JSON.stringify(fixture.payload,null,2));
  assert.equal(find(tree,n=>n.type==='Badge'&&n.props.label==='Version 7 · draft').props.label,'Version 7 · draft');
  find(tree,n=>n.type==='GstFilingHistory').props.onStatus(history);tree=app.render();
  find(tree,n=>typeof n.type==='function'&&n.props.label?.startsWith('I approve saving this draft privately')).props.onPress();
  tree=app.render();assert.equal(button(tree,'Save private draft').props.disabled,false,'Not filed must allow a consented private draft');
  await button(tree,'Save private draft').props.onPress();
  assert.equal(app.requests.at(-1).action,'draft');assert.equal(app.requests.at(-1).input.revision,7);
  assert.equal(app.requests.at(-1).input.draftId,'saved-draft');
  tree=app.render();assert.equal(button(tree,'Save to GST portal').props.disabled,true,'Release lock must stay visible and disabled');
  assert.equal(find(tree,n=>n.type==='SoftNotice').props.title,'Draft preparation only');
}
// Resume processing at comparison, not a new draft or editable preparation.
for(const state of ['saved','save_pending','offset_pending','prepared']){
  const app=harness({...fixture,state,reference_id:'synthetic-reference'});await flush();const tree=app.render();
  assert.ok(button(tree,'Fetch & reconcile'));assert.equal(find(tree,n=>n.type==='GstGuidedEditor'),undefined);
  if(state.endsWith('_pending'))assert.equal(button(tree,'Check processing status').props.disabled,true,'Polling still requires explicit consent');
}
// Filed return opens immutable acknowledgement; no duplicate editor or filing button.
{
  const app=harness({...fixture,state:'filed',acknowledgement:'SYNTHETIC-ARN'});await flush();const tree=app.render();
  assert.ok(button(tree,'View GST account'));assert.equal(button(tree,'Verify OTP & file return'),undefined);
  assert.equal(find(tree,n=>n.type==='GstGuidedEditor'),undefined);
}
// New regular drafts start with explicit blanks, never inferred zero/nil activity.
{
  const app=harness(null);await flush();const tree=app.render();
  const data=JSON.parse(find(tree,n=>n.type==='GstGuidedEditor').props.payload);
  assert.equal(data.sup_details.osup_det.txval,'');assert.equal(data.registerbox_nil,undefined);
}
console.log('Shared mobile/web GSTR-3B screen verified: existing draft/revision restored, Not filed allowed, release lock visible, pending/saved returns resumed safely, filed archive immutable and new amounts remain blank. No live API calls.');
{
  const app=harness({...fixture,state:'prepared',source_evidence:{version:'gst-portal-resume-v1',scope:'gst_portal',checkedAt:new Date().toISOString(),paymentState:'settled',previousDraft:{payload:{registerbox_nil:true}}}},true);
  await flush();let tree=app.render();
  assert.ok(button(tree,'Continue from GST portal'));
  assert.equal(find(tree,n=>n.type==='GstNilReturn'),undefined,'Imported portal return must leave the rejected nil screen');
  assert.equal(button(tree,'Continue from GST portal').props.disabled,true);
  find(tree,n=>typeof n.type==='function'&&n.props.label?.startsWith('Load this period’s saved GSTR-3B')).props.onPress();
  tree=app.render();await button(tree,'Continue from GST portal').props.onPress();
  assert.equal(app.requests.at(-1).action,'resume_portal');assert.equal(app.requests.at(-1).input.consent,true);
  tree=app.render();assert.ok(button(tree,'Proceed to Authorize'),'Resumed paid return proceeds to human review');
}
console.log('Portal recovery screen verified: explicit import consent, regular return routing, original declaration evidence handled and review before OTP.');
