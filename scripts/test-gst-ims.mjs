// Production IMS handler against synthetic DB/provider only. Never contacts GST.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as ims from '../supabase/functions/_shared/gst-ims.ts';
import * as purchases from '../supabase/functions/_shared/gst-purchases.ts';
import {validPeriod,periodIsClosed} from '../supabase/functions/gst-workspace/domain.ts';
import {filingBlock} from '../supabase/functions/_shared/gst-filing-history.ts';
const gstin='29ABCDE1234F1Z5',record={hash:'synthetic-hash',stin:'29ABCDE1234F1Z5',rtnprd:'092026',action:'N',inum:'TEST-1',idt:'01-09-2026',val:118,txval:100,iamt:0,camt:9,samt:9,cess:0,pos:'29',inv_typ:'R',srcform:'R1',ispendactblocked:'N'};
let handler,workspace,operations,calls,owner,blocked,fail,changed,available,writeEnabled,processing,processingErrors,documentFailure,wrongDocument;
const connection={id:'connection',status:'linked',gstin,expires_at:'2099-01-01',token_ciphertext:'synthetic'};
function reset(){workspace={id:'workspace',gstin,invoices:[],snapshot_hash:null,fetched_at:null};operations=[];calls=[];owner='owner';blocked=false;fail='';changed=false;available=true;writeEnabled=true;processing='P';processingErrors=0;documentFailure='';wrongDocument=false;}
function query(table){let values,insert=false,id,head=false;
 const q={select(_x,options){head=!!options?.head;return q;},eq(k,v){if(k==='id')id=v;return q;},is(){return q;},or(){return q;},match(){return q;},gte(){return q;},order(){return q;},limit(){return q;},upsert(){return q;},insert(v){insert=true;values=v;return q;},update(v){values=v;return q;},single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
 function result(){if(table==='business_profiles')return {data:{id:'business',user_id:owner}};if(table==='gst_connections')return {data:connection};if(table==='gst_ims_workspaces'){if(values)workspace={...workspace,...values};return {data:workspace};}if(table==='gst_ims_operations'){if(head)return {count:0};if(insert){const row={id:'op-'+operations.length,...values};operations.unshift(row);return {data:row};}if(values){const row=operations.find(row=>row.id===id);Object.assign(row,values);return {data:row};}return {data:operations[0]||null};}throw Error(table);}return q;
}
const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:query};
const modules={'npm:@supabase/supabase-js@2.117.1':{createClient:()=>client},'../_shared/http.ts':{corsHeaders:{},json:(value,status=200)=>Response.json(value,{status})},'../gst-workspace/domain.ts':{validPeriod,periodIsClosed,decryptToken:async()=> 'token'},'../_shared/gst-filing-history.ts':{filingBlock,fetchFilingHistory:async()=>({period:'092026',records:blocked?[{form:'GSTR3B',status:'Filed',arn:'SYNTHETIC'}]:[]})},'../_shared/gst-ims.ts':ims,'../_shared/gst-purchases.ts':purchases};
new Function('require','exports','Deno','fetch',ts.transpileModule(fs.readFileSync('supabase/functions/gst-ims/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>modules[name]??assert.fail(name),{},{serve:fn=>{handler=fn;},env:{toObject:()=>({SUPABASE_URL:'synthetic',SANDBOX_API_KEY:'key_live_synthetic',SANDBOX_API_SECRET:'synthetic',GST_RETURN_WRITES_ENABLED:String(writeEnabled)})}},async(url,options)=>{
  calls.push({url,options});
  if(options.method==='POST'&&fail==='timeout')throw Error('synthetic timeout');
  if(options.method==='POST'&&fail==='rejected')return Response.json({data:{status_cd:'0',error:{error_cd:'TEST_REJECT',message:'Synthetic rejection'}}});
  let data={};
  if(url.includes('/invoices/count'))data={all_oth:Object.fromEntries(Object.keys(ims.imsSections).map(section=>[section,{accept:0,noaction:section==='b2b'?1:0,reject:0,pending:0}]))};
  else if(url.includes('/invoices?'))data={b2b:[{...record,...(changed?{action:'A'}:{})}]};
  else if(url.includes('reference_id='))data={status_cd:processing,proc_cnt:'1',err_cnt:String(processingErrors),err_cd:'',err_msg:''};
  else if(options.method==='POST')data={reference_id:'synthetic-reference'};
  else if(url.includes('/gstr-2b/')){if(documentFailure==='session')return Response.json({code:401}, {status:401});if(documentFailure)return Response.json({data:{status_cd:'0',error:{error_cd:documentFailure,message:'Synthetic document error'}}});if(!available)return Response.json({data:{status_cd:'0',error:{error_cd:'IMS002_CD',message:'not generated'}}});data={gstin,rtnprd:wrongDocument?'082026':'092026',docdata:{}};}
  return Response.json({data:{status_cd:'1',data}});
});
async function act(action,extra={}){const response=await handler(new Request('https://synthetic.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({businessId:'business',year:2026,month:9,action,consent:true,consentVersion:'gst-ims-v1',snapshotHash:workspace.snapshot_hash,choices:{'b2b:synthetic-hash':'A'},...extra})}));return {status:response.status,body:await response.json()};}
reset();owner='other';assert.equal((await act('load')).status,403);assert.equal(calls.length,0);
reset();assert.equal((await act('refresh',{consent:false})).status,502);assert.equal(calls.length,0);
reset();assert.equal((await act('refresh')).status,200);assert.equal(workspace.invoices.length,1);assert.ok(workspace.snapshot_hash);
assert.equal((await act('save',{snapshotHash:'stale'})).status,502);assert.equal(calls.filter(c=>c.options.method==='POST').length,0);
assert.equal((await act('save')).status,200);assert.equal(operations[0].outcome,'pending');const payload=JSON.parse(calls.at(-1).options.body);assert.equal(payload.rtin,gstin);assert.equal(payload.invdata.b2b[0].prev_status,'N');assert.equal(payload.invdata.b2b[0].action,'A');
assert.equal((await act('save')).status,502,'Never duplicate pending write');assert.equal((await act('poll')).body.operation.outcome,'succeeded');
assert.equal((await act('compute')).status,200);available=false;assert.equal((await act('poll')).body.ready,false);available=true;assert.equal((await act('poll')).body.ready,true);
reset();await act('refresh');changed=true;assert.equal((await act('save')).status,502);assert.equal(calls.filter(c=>c.options.method==='POST').length,0,'Revalidate supplier hash/current action');
reset();await act('refresh');blocked=true;assert.equal((await act('save')).status,502);assert.equal(calls.filter(c=>c.options.method==='POST').length,0,'Filed duplicate blocked');
reset();await act('refresh');fail='timeout';assert.equal((await act('save')).status,502);assert.equal(operations[0].outcome,'unknown');fail='';assert.equal((await act('compute')).status,502);assert.equal((await act('verify')).status,502,'Do not mistake old 2B for unknown-write completion');
reset();await act('refresh');fail='rejected';await act('save');assert.equal(operations[0].outcome,'failed');
reset();writeEnabled=false;assert.equal((await act('compute')).status,502);assert.equal(calls.length,0);
assert.throws(()=>ims.imsSavePayload(gstin,[{id:'cn',section:'b2bcn',record}],{cn:'A'}),/ITC-reduction/);
assert.throws(()=>ims.imsSavePayload(gstin,[{id:'inv',section:'b2b',record:{...record,ispendactblocked:'Y'}}],{inv:'P'}),/Pending/);
assert.equal(ims.imsProcessed({status_cd:'PE',proc_cnt:1,err_cnt:1},1),'failed');
assert.equal(ims.imsProcessed({status_cd:'IP',proc_cnt:0},1),'pending');
assert.equal(ims.imsProcessed({status_cd:'P',proc_cnt:1},NaN),'pending','Missing approval count cannot prove invoice save');
assert.equal(ims.imsComputationProcessed({status_cd:'P'}),'succeeded','Computation does not provide an invoice count');
assert.equal(ims.imsComputationProcessed({status_cd:'P',err_cnt:1}),'failed','Completed marker must not hide partial errors');
reset();await act('compute');processingErrors=1;const partial=await act('poll');assert.equal(partial.body.ready,false);assert.equal(partial.body.operation.outcome,'failed');assert.equal(calls.filter(c=>c.url.includes('/gstr-2b/2026/09')&&c.options.method==='GET').length,0,'Do not fetch an old document to bypass compute failure');
reset();await act('compute');available=false;const waiting=await act('poll');assert.equal(waiting.body.operation.outcome,'pending');assert.match(waiting.body.message,/not available yet/);available=true;const finished=await act('poll');assert.equal(finished.body.ready,true);assert.equal((await act('load')).body.operation.outcome,'succeeded');assert.equal((await act('poll')).body.ready,true,'Reopened completed operations can be checked without another write');assert.equal(calls.filter(c=>c.options.method==='POST').length,1);
reset();await act('compute');documentFailure='session';const expired=await act('poll');assert.equal(expired.status,502);assert.match(expired.body.error,/session expired/);assert.equal(operations[0].outcome,'pending','Session failure does not manufacture a completed or failed computation');
documentFailure='UNEXPECTED';const explicit=await act('poll');assert.equal(explicit.body.code,'UNEXPECTED');assert.match(explicit.body.error,/Synthetic document error/,'Surface a provider rejection instead of endless pending');
documentFailure='';wrongDocument=true;const mismatch=await act('poll');assert.equal(mismatch.status,502);assert.match(mismatch.body.error,/does not match/);assert.equal(operations[0].outcome,'pending');
reset();await act('refresh');fail='rejected';await act('save');assert.match(operations[0].result.err_msg,/Synthetic rejection/,'Durably keep the actual rejected operation message on reopen');assert.equal(operations[0].result.err_cd,'TEST_REJECT');

// Exercise the real modal component with synthetic hooks and deterministic timers.
// These reads and writes are test doubles: no browser or GST service is contacted.
const compiled=ts.transpileModule(fs.readFileSync('src/components/gst-ims-recovery.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
function uiHarness(initialOperation=null){
 const state=[],refs=[],effects=[],timers=new Map(),requests=[];let index=0,ref=0,effect=0,timerId=0,completed=0,reconnected=0,currentOperation=initialOperation,writeFailure=false,statusFailure=false,documentReady=false;
 const react={useState(initial){const n=index++;if(!(n in state))state[n]=initial;return [state[n],value=>{state[n]=typeof value==='function'?value(state[n]):value;}];},useRef(initial){return refs[ref++]??={current:initial};},useEffect(fn,deps){const n=effect++,previous=effects[n];if(previous&&deps.length===previous.deps.length&&deps.every((v,i)=>Object.is(v,previous.deps[i])))return;previous?.cleanup?.();const next={deps};effects[n]=next;queueMicrotask(()=>{next.cleanup=fn();});}};
 const jsx=(type,props)=>({type,props}),exports={},mockWorkspace={invoices:[],snapshot_hash:null,fetched_at:null};
 const request=async body=>{requests.push(body.action);if(body.action==='compute'){currentOperation={id:'ui-op',action:'compute',outcome:'pending',reference_id:'ui-ref'};if(writeFailure)throw Error('Synthetic connection timeout');}if(body.action==='poll'&&statusFailure)throw Error('Synthetic session expired');return {workspace:mockWorkspace,operation:currentOperation,ready:body.action==='poll'&&documentReady};};
 const modules={react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Text:'Text',View:'View',Modal:'Modal',Linking:{}},'@/lib/supabase':{},'./registerbox-ui':Object.fromEntries(['Badge','Button','Card','ErrorBanner','Screen'].map(x=>[x,x])),'./gst-ui':{GstHeader:'GstHeader',GstSelect:'GstSelect'},'./gst-checkbox':{GstCheckbox:'GstCheckbox'},'@/constants/design':{palette:{}}};
 new Function('require','exports','setTimeout','clearTimeout',compiled)(name=>modules[name]??assert.fail(name),exports,fn=>{const id=++timerId;timers.set(id,fn);return id;},id=>timers.delete(id));
 const render=()=>{index=ref=effect=0;return exports.ImsWorkspace({businessId:'b',year:2026,month:9,onClose(){},onComplete(){completed++;},onReconnect(){reconnected++;},request});};
 render();return {render,requests,timers,get completed(){return completed;},get reconnected(){return reconnected;},set writeFailure(v){writeFailure=v;},set statusFailure(v){statusFailure=v;},set documentReady(v){documentReady=v;}};
}
function nodes(tree){return Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];}
function button(tree,title){return nodes(tree).find(n=>n.type==='Button'&&n.props.title===title);}
const reopened=uiHarness({id:'old-op',action:'compute',outcome:'succeeded',reference_id:'old-ref'});reopened.documentReady=true;await flush();assert.equal(reopened.completed,1);assert.deepEqual(reopened.requests,['load','poll'],'Reopen checks the original reference and returns automatically');
const interrupted=uiHarness();interrupted.writeFailure=true;await flush();let tree=interrupted.render();nodes(tree).find(n=>n.type==='GstCheckbox'&&n.props.label.startsWith('I authorize computing')).props.onPress();tree=interrupted.render();await button(tree,'Compute / recompute GSTR-2B').props.onPress();await flush();tree=interrupted.render();assert.deepEqual(interrupted.requests,['load','compute','load']);assert.ok(button(tree,'Continue checking GST status'));assert.equal(button(tree,'Compute / recompute GSTR-2B').props.disabled,true,'Unknown client result restores the durable pending write');
const paused=uiHarness({id:'pending-op',action:'compute',outcome:'pending',reference_id:'pending-ref'});await flush();paused.statusFailure=true;tree=paused.render();await button(tree,'Check processing status').props.onPress();await flush();tree=paused.render();await flush();assert.equal(paused.timers.size,0,'Session/provider failure pauses automatic polling rather than looping');assert.ok(button(tree,'Continue checking GST status'));button(tree,'Reconnect GST & continue').props.onPress();assert.equal(paused.reconnected,1,'Session errors offer the parent reconnect flow directly');paused.statusFailure=false;paused.documentReady=true;await button(tree,'Continue checking GST status').props.onPress();await flush();assert.equal(paused.completed,1,'A recovered read resumes filing without repeating compute');assert.equal(paused.requests.filter(a=>a==='compute').length,0);
const prolonged=uiHarness({id:'slow-op',action:'compute',outcome:'pending',reference_id:'slow-ref'});await flush();
for(let i=0;i<20;i++){prolonged.render();await flush();const [id,timer]=prolonged.timers.entries().next().value;prolonged.timers.delete(id);timer();prolonged.render();await flush();}
prolonged.render();await flush();tree=prolonged.render();assert.equal(prolonged.timers.size,0);assert.ok(button(tree,'Continue checking GST status'),'The polling budget ends in an explained, resumable state rather than a dead end');assert.equal(prolonged.requests.filter(a=>a==='poll').length,20);prolonged.documentReady=true;await button(tree,'Continue checking GST status').props.onPress();await flush();assert.equal(prolonged.completed,1);
console.log('IMS handler and modal verified: isolation, approvals, snapshot freshness, tracked async writes, truthful errors, partial-error protection, timeout restoration, reopened completion, paused polling and automatic return only with matching GSTR-2B evidence. No live GST writes.');
