// Production IMS handler against synthetic DB/provider only. Never contacts GST.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as ims from '../supabase/functions/_shared/gst-ims.ts';
import * as purchases from '../supabase/functions/_shared/gst-purchases.ts';
import {validPeriod,periodIsClosed} from '../supabase/functions/gst-workspace/domain.ts';
import {filingBlock} from '../supabase/functions/_shared/gst-filing-history.ts';
const gstin='29ABCDE1234F1Z5',record={hash:'synthetic-hash',stin:'29ABCDE1234F1Z5',rtnprd:'092026',action:'N',inum:'TEST-1',idt:'01-09-2026',val:118,txval:100,iamt:0,camt:9,samt:9,cess:0,pos:'29',inv_typ:'R',srcform:'R1',ispendactblocked:'N'};
let handler,workspace,operations,calls,owner,blocked,fail,changed,available,writeEnabled,processing;
const connection={id:'connection',status:'linked',gstin,expires_at:'2099-01-01',token_ciphertext:'synthetic'};
function reset(){workspace={id:'workspace',gstin,invoices:[],snapshot_hash:null,fetched_at:null};operations=[];calls=[];owner='owner';blocked=false;fail='';changed=false;available=true;writeEnabled=true;processing='P';}
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
  else if(url.includes('reference_id='))data={status_cd:processing,proc_cnt:'1',err_cnt:'0',err_cd:'',err_msg:''};
  else if(options.method==='POST')data={reference_id:'synthetic-reference'};
  else if(url.includes('/gstr-2b/')){if(!available)return Response.json({data:{status_cd:'0',error:{error_cd:'IMS002_CD',message:'not generated'}}});data={gstin,rtnprd:'092026',docdata:{}};}
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
console.log('IMS handler verified: ownership, consent, snapshot freshness, invoice revalidation, selection payload, pending/unknown duplicate guards, release gate, async save, generated 2B evidence and ITC-declaration protection. No live GST writes.');
