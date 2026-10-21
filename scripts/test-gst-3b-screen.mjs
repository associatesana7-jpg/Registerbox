// Exercise the real shared mobile/web screen with synthetic hooks and API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { blank3b, zeroBlanks } from '../supabase/functions/_shared/gstr3b.ts';
import * as payment from '../supabase/functions/_shared/gst-payment.ts';
import * as workspace from '../src/lib/gst-return-workspace.ts';
import { periodIsClosed } from '../supabase/functions/gst-workspace/domain.ts';
import { validFilingOtp } from '../supabase/functions/_shared/gst-filing-otp.ts';
import { gstReturnRecovery } from '../src/lib/gst-return-recovery.ts';
import { gstReconnectParams, gstResumeRoute } from '../src/lib/gst-return-route.ts';

// Recovery is a bounded navigation hint, never a command to send a GST write.
const blocked3b={state:'blocked',form:'gstr-3b'};
for(const [failure,target] of [
  [{providerCode:'IMS002_CD',message:'GST rejected this request.'},'ims'],
  [{providerCode:'RT-3BAS1079',message:'GST rejected this request.'},'saved-return'],
  [{providerCode:'RET13506',message:'GST rejected this request.'},'otp'],
  [{message:'Cash ledger is insufficient.'},'payment'],
  [{message:'GST payment details are missing. Offset and refresh first.'},'payment'],
  [{message:'GST data changed since review.'},'reconcile'],
  [{message:'GST session expired. Reconnect with login OTP.'},'reconnect'],
  [{message:'Unrecognized GST failure.'},'refresh'],
])assert.equal(gstReturnRecovery(blocked3b,failure)?.target,target);
assert.equal(gstReturnRecovery({...blocked3b,last_error:'GST rejected (IMS002_CD): not generated'})?.target,'ims','Persisted provider codes survive remount');
assert.equal(gstReturnRecovery({...blocked3b,state:'unknown',last_error:'GST rejected (IMS002_CD)'})?.target,'check','An uncertain write must not be reset through IMS');
assert.equal(gstReturnRecovery({...blocked3b,state:'offset_pending'}, {providerCode:'RT-3BAS1079'})?.target,'check','Pending offset always checks its existing reference first');
assert.equal(gstReturnRecovery({...blocked3b,state:'unknown'}, {message:'GST session expired.'})?.target,'reconnect','Expired sessions reconnect before their previous operation can be checked');
assert.equal(gstReturnRecovery({...blocked3b,state:'filed'}, {providerCode:'IMS002_CD',message:'Session expired.'}),null,'No recovery can reopen an acknowledged return');
assert.equal(gstReturnRecovery({state:'saved',form:'gstr-3b'}),null);
assert.notEqual(gstReturnRecovery({state:'blocked',form:'gstr-1'},{providerCode:'IMS002_CD'})?.target,'ims','IMS recovery is restricted to GSTR-3B');

// Reconnection returns only to a bounded, same-business filing route.
const resumeRoute={form:'gstr-3b',year:'2026',month:'08',mode:'regular'};
const resumeParams=gstReconnectParams(resumeRoute,'business');
assert.deepEqual(gstResumeRoute(resumeParams,'business'),resumeRoute);
assert.equal(gstResumeRoute(resumeParams,'another-business'),null);
assert.deepEqual(gstResumeRoute({...resumeParams,resumeMonth:'8'},'business'),resumeRoute);
for(const invalid of [
  {resumeForm:'https://attacker.invalid/gst'}, {resumeForm:['gstr-1']},
  {resumeForm:{toString:()=> 'gstr-1'}}, {resumeMode:['regular']},
  {resumeMode:'payment'}, {resumeYear:'26'}, {resumeYear:'2026/../../../auth'},
  {resumeMonth:'00'}, {resumeMonth:'13'}, {resumeMonth:'09?next=https://attacker.invalid'},
])assert.equal(gstResumeRoute({...resumeParams,...invalid},'business'),null);

const compiled=ts.transpileModule(fs.readFileSync('src/app/gst-returns.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const gstin='29ABCDE1234F1Z5',period='082026';
const fixture={id:'saved-draft',form:'gstr-3b',gstin,year:2026,month:8,state:'draft',revision:7,payload:zeroBlanks(blank3b(gstin,period)),payload_hash:'synthetic-hash',acknowledgement:null};
const history={period,records:[{form:'GSTR3B',period,status:'Not filed'}]};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(saved,enabled=false,options={}){
  const values=[],effects=[],refs=[],requests=[],navigations=[];
  let slot=0,ref=0,effect=0,refresh;
  let serverDraft=saved?structuredClone(saved):null;
  const react={
    useState(initial){const i=slot++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],value=>{values[i]=typeof value==='function'?value(values[i]):value;}];},
    useRef(initial){return refs[ref++]??={current:initial};},
    useEffect(callback){const i=effect++;if(!(i in effects))effects[i]=callback();},
  };
  const route={form:'gstr-3b',year:'2026',month:'08',mode:'regular'};
  const modules={
    react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{Pressable:'Pressable',Text:'Text',View:'View'},
    'expo-router':{Redirect:'Redirect',Stack:{Screen:'StackScreen'},router:{push(value){navigations.push({method:'push',value});},replace(value){navigations.push({method:'replace',value});},back(){}},useLocalSearchParams:()=>route},
    'expo-document-picker':{},'expo-file-system':{},
    '@/hooks/use-app':{useApp:()=>({business:{id:'business'},session:{user:{id:'owner'}},demoMode:false,loadingSession:false})},
    '@/hooks/use-gst-refresh':{useGstRefresh(callback){refresh=callback;}},
    '@/components/gst-checkbox':{GstCheckbox:'GstCheckbox'},
    '@/components/gst-ims-recovery':{GstImsRecovery:'GstImsRecovery'},
    '@/constants/design':{palette:{blue:'#146BFF',ink:'#172D42',muted:'#536476',green:'#127847'}},
    '@/lib/gst-returns-api':{returnAction:async(businessId,action,input)=>{requests.push({businessId,action,input});const override=await options.onRequest?.(action,input);if(override!==undefined)return override;return action==='list'?{drafts:serverDraft?[structuredClone(serverDraft)]:[],gstin,writesEnabled:enabled}:{draft:structuredClone(serverDraft),writesEnabled:enabled};}},
    '@/lib/gst-return-workspace':workspace,
    '@/lib/gst-return-recovery':{gstReturnRecovery},
    '@/lib/gst-return-route':{gstReconnectParams},
    '@/components/gst-recovery-card':{GstRecoveryCard:'GstRecoveryCard'},
    '../../supabase/functions/_shared/gst-payment':payment,
    '../../supabase/functions/gst-workspace/domain':{periodIsClosed},
    '../../supabase/functions/_shared/gstr3b':{blank3b},
    '../../supabase/functions/_shared/gst-filing-otp':{validFilingOtp},
    '../../supabase/functions/_shared/gst-ecom':{},'../../supabase/functions/_shared/gst-platform-draft':{},
  };
  for(const [path,names] of Object.entries({
    '@/components/registerbox-ui':['Badge','Button','Card','ErrorBanner','Field','Screen'],
    '@/components/experience':['FlowProgress','SoftNotice'],
    '@/components/workspace-ui':['JourneyRail'],
    '@/components/gst-ui':['GstHeader'],'@/components/gst-filing-history':['GstFilingHistory'],
    '@/components/gst-return-review':['GstReturnReview'],'@/components/gst-guided-editor':['GstGuidedEditor'],
    '@/components/gst-payment-review':['GstPaymentReview'],'@/components/gst-nil-return':['GstNilReturn'],
    '@/components/gst-platform-review':['GstPlatformReview'],
  }))modules[path]=Object.fromEntries(names.map(name=>[name,name]));
  const exports={};new Function('require','exports',compiled)(name=>modules[name]??assert.fail(name),exports);
  const root=exports.default();
  function render(){slot=ref=effect=0;return root.type(root.props);}
  render();return {render,requests,navigations,refresh:()=>refresh?.(),setDraft(next){serverDraft=next?structuredClone(next):null;}};
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
  if(state.endsWith('_pending'))assert.equal(button(tree,'Fetch & reconcile'),undefined,'Do not offer reconciliation before processing finishes');
  else assert.ok(button(tree,'Fetch & reconcile'));
  assert.equal(find(tree,n=>n.type==='GstGuidedEditor'),undefined);
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
  const app=harness({...fixture,state:'prepared',reconciliation:{matched:true,differences:[],scope:'saved GST return'},source_evidence:{version:'gst-portal-resume-v1',scope:'gst_portal',checkedAt:new Date().toISOString(),paymentState:'settled',previousDraft:{payload:{registerbox_nil:true}}}},true);
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
// A matched imported return goes straight to its next real step after reload.
{
  const app=harness({...fixture,state:'saved',reconciliation:{matched:true,differences:[],scope:'saved GST return'}},true);
  await flush();const tree=app.render();
  assert.ok(button(tree,'Fetch ledger balances'),'Saved return must expose in-app payment immediately');
  assert.equal(button(tree,'Authorize liability offset'),undefined,'Offset stays hidden until an allocation is reviewed');
  assert.equal(button(tree,'Fetch & reconcile'),undefined,'No redundant compare loop after importing matching portal figures');
}
{
  const app=harness({...fixture,state:'prepared',reconciliation:{matched:true,differences:[],scope:'saved GST return'}},true);
  await flush();const tree=app.render();
  assert.ok(button(tree,'Proceed to Authorize'),'Confirmed post-offset return resumes final review');
}

// A known IMS rejection has one bounded recovery, preserving the same return.
{
  const restored={...fixture,state:'saved',last_error:null,reconciliation:{matched:true,differences:[],scope:'saved GST return'}};
  const app=harness({...fixture,state:'blocked',last_error:'GST rejected (IMS002_CD): GSTR-2B is not generated.'},true,{
    onRequest:async action=>action==='recover_ims'?{draft:restored,writesEnabled:true}:undefined,
  });
  await flush();let tree=app.render();
  const recovery=find(tree,n=>n.type==='GstRecoveryCard');
  assert.equal(recovery.props.recovery.target,'ims');
  assert.equal(find(tree,n=>n.type==='GstGuidedEditor'),undefined,'Known IMS rejection must not strand the user at a blank preparation editor');
  const before=app.requests.length;recovery.props.onResolve();tree=app.render();
  assert.equal(find(tree,n=>n.type==='GstImsRecovery').props.visible,true);
  assert.equal(app.requests.length,before,'Opening IMS is navigation, not a GST write');
  find(tree,n=>n.type==='GstImsRecovery').props.onComplete();await flush();tree=app.render();
  assert.equal(app.requests.at(-1).action,'recover_ims');
  assert.equal(app.requests.at(-1).input.draftId,fixture.id);
  assert.equal(app.requests.at(-1).input.consent,true);
  assert.ok(button(tree,'Fetch ledger balances'),'Resolved IMS continues to the saved return payment stage');
  assert.equal(app.requests.some(request=>['resume_portal','save','offset','evc','file'].includes(request.action)),false,'IMS completion does not overwrite the draft or automatically pay/file');
}

// Completing IMS without a known rejection only reloads the existing draft.
{
  const app=harness({...fixture,state:'prepared',snapshot_hash:'same-snapshot',reconciliation:{matched:true,differences:[],scope:'saved GST return'}},true);
  await flush();let tree=app.render();const before=app.requests.length;
  find(tree,n=>n.type==='GstImsRecovery').props.onComplete();await flush();tree=app.render();
  assert.deepEqual(app.requests.slice(before).map(request=>request.action),['list']);
  assert.ok(button(tree,'Proceed to Authorize'));
}

// A missing/expired connection carries only a same-business resume target.
{
  const app=harness({...fixture,state:'blocked',last_error:'GST session expired. Reconnect with login OTP.'},true);
  await flush();const tree=app.render();const before=app.requests.length;
  find(tree,n=>n.type==='GstRecoveryCard').props.onResolve();
  assert.equal(app.requests.length,before);
  assert.deepEqual(app.navigations.at(-1),{method:'push',value:{pathname:'/gst',params:gstReconnectParams(resumeRoute,'business')}});
}

// A pending/unknown offset checks the previous operation; it never retries it.
for(const state of ['offset_pending','unknown']){
  const restored={...fixture,state:'prepared',snapshot_hash:'settled-snapshot',reconciliation:{matched:true,differences:[],scope:'saved GST return'}};
  const app=harness({...fixture,state,reference_id:'synthetic-offset'},true,{
    onRequest:async action=>action==='poll'?{draft:restored,writesEnabled:true}:undefined,
  });
  await flush();let tree=app.render();const recovery=find(tree,n=>n.type==='GstRecoveryCard');
  assert.equal(recovery.props.recovery.target,'check');
  const before=app.requests.length;recovery.props.onResolve();await flush();tree=app.render();
  assert.deepEqual(app.requests.slice(before).map(request=>request.action),['poll']);
  assert.equal(app.requests.at(-1).input.consent,true);
  assert.ok(button(tree,'Proceed to Authorize'));
}

// Structured provider codes survive a generic message and expose support context.
{
  const app=harness({...fixture,state:'saved',reconciliation:{matched:true,differences:[],scope:'saved GST return'}},true,{
    onRequest:async action=>{if(action==='ledger')throw Object.assign(new Error('GST rejected this request.'),{providerCode:'IMS002_CD',operationId:'synthetic-operation'});},
  });
  await flush();let tree=app.render();
  find(tree,n=>typeof n.type==='function'&&n.props.label?.startsWith('I approve fetching cash, credit')).props.onPress();
  tree=app.render();await button(tree,'Fetch ledger balances').props.onPress();tree=app.render();
  assert.equal(find(tree,n=>n.type==='GstRecoveryCard').props.recovery.target,'ims');
  assert.ok(nodes(tree).some(n=>n.type==='Text'&&JSON.stringify(n.props.children).includes('synthetic-operation')));
  assert.deepEqual(app.requests.map(request=>request.action),['list','ledger','list'],'Read failure only refreshes saved status; no write is retried');
}
console.log('Recovery verified: bounded error targets, strict same-business reconnect routes, structured provider codes, IMS return continuity and reference-only pending recovery. No automatic GST save, offset, OTP or filing.');
