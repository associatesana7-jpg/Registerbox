// Runs the production handler with an in-memory DB and synthetic provider.
// No real credentials, network, taxpayer data, money or GST writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as validation from '../supabase/functions/gst-returns/validation.ts';
import * as nil from '../supabase/functions/gst-returns/nil.ts';
import * as payment from '../supabase/functions/_shared/gst-payment.ts';
import * as portalResume from '../supabase/functions/_shared/gst-portal-resume.ts';
import * as purchases from '../supabase/functions/_shared/gst-purchases.ts';
import * as amendmentLinks from '../supabase/functions/_shared/gst-amendment-links.ts';
import { filingBlock } from '../supabase/functions/_shared/gst-filing-history.ts';
import { validFilingOtp } from '../supabase/functions/_shared/gst-filing-otp.ts';
import { periodIsClosed, validPeriod } from '../supabase/functions/gst-workspace/domain.ts';
import { blank3b, zeroBlanks } from '../supabase/functions/_shared/gstr3b.ts';
import { returnHistoryReason, returnPhase } from '../src/lib/gst-return-workspace.ts';

const gstin='29ABCDE1234F1Z5', period='082026';
let handler, draft, portal, ledger, calls, operations, history, writes, failure, status, owner, locked;
const connection={id:'connection',gstin,status:'linked',token_ciphertext:'synthetic',expires_at:'2099-01-01'};
function query(table) {
  let values, filters={}, countQuery=false;
  const q={select(_columns, options){countQuery=options?.head===true;return q;},eq(key,value){filters[key]=value;return q;},is(){return q;},or(){return q;},gte(){return q;},limit(){return q;},order(){return q;},
    update(v){values=v;return q;},insert(v){values=v;return q;},single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
  function result() {
    if(table==='business_profiles')return {data:{id:'business',user_id:owner}};
    if(table==='gst_connections')return {data:values?.lock_id&&!locked?null:connection};
    if(table==='gst_return_drafts'){
      if(values)draft={...draft,...values};
      return {data:structuredClone(draft)};
    }
    if(table==='gst_return_operations'){
      if(countQuery)return {count:0};
      if(values?.action){const op={id:'op-'+operations.length,...values};operations.push(op);return {data:{id:op.id}};}
      if(values){Object.assign(operations.find(o=>o.id===filters.id),values);return {data:null};}
      return {data:operations.filter(o=>Object.entries(filters).every(([k,v])=>o[k]===v))};
    }
    throw Error('Unexpected table: '+table);
  }
  return q;
}
const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:query};
const modules={
  '../_shared/gst-purchases.ts':purchases,
  'npm:@supabase/supabase-js@2.117.1':{createClient:()=>client},
  '../_shared/http.ts':{corsHeaders:{},json:(data,status=200)=>Response.json(data,{status})},
  '../gst-workspace/domain.ts':{validPeriod,periodIsClosed,decryptToken:async()=>'test-token'},
  '../_shared/gst-amendment-links.ts':amendmentLinks,'./validation.ts':validation,'./nil.ts':nil,
  '../_shared/gst-payment.ts':payment,'../_shared/gst-filing-otp.ts':{validFilingOtp},
  '../_shared/gst-portal-resume.ts':portalResume,
  '../_shared/gst-filing-history.ts':{filingBlock,fetchFilingHistory:async()=>{if(history===null)throw Error('Unavailable');return structuredClone(history);}},
};
const source=ts.transpileModule(fs.readFileSync('supabase/functions/gst-returns/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports','Deno','fetch',source)(name=>modules[name]??assert.fail(name),{}, {
  serve:fn=>{handler=fn;},env:{toObject:()=>({GST_RETURN_WRITES_ENABLED:String(writes),SANDBOX_API_KEY:'key_live_synthetic',SANDBOX_API_SECRET:'synthetic'})},
},async(url,options)=>{
  const path=new URL(url).pathname;
  calls.push({path,method:options.method,payload:options.body?JSON.parse(options.body):undefined});
  const action=path.endsWith('/file')?'file':path.endsWith('/offset-liability')?'offset':path.endsWith('/otp')?'evc':options.method==='POST'?'save':'read';
  if(failure?.action===action){
    if(failure.kind==='timeout')throw Error('Synthetic network timeout');
    if(failure.kind==='no-ack')return Response.json({data:{status_cd:'1',data:{}}});
    return Response.json({data:{status_cd:'0',error:{error_cd:failure.code??'TEST_REJECTED',message:'Synthetic provider rejection'}}});
  }
  if(action==='save'){portal={...JSON.parse(options.body),tx_pmt:portal.tx_pmt};return Response.json({data:{status_cd:'1',data:{reference_id:'save-reference'}}});}
  if(action==='offset')return Response.json({data:{status_cd:'1',data:{reference_id:'offset-reference'}}});
  if(action==='evc')return Response.json({data:{status_cd:'1'}});
  if(action==='file')return Response.json({data:{status_cd:'1',data:{ack_num:'SYNTHETIC-ARN-NOT-A-REAL-RETURN'}}});
  if(path.endsWith('/status'))return Response.json({data:{status_cd:'1',data:{status_cd:status}}});
  if(path.includes('/ledgers/bal/'))return Response.json({data:{status_cd:'1',data:ledger}});
  return Response.json({data:{status_cd:'1',data:portal}});
});
async function reset(){
  const payload=zeroBlanks(blank3b(gstin,period));
  payload.sup_details.osup_det={txval:1000,iamt:180,camt:0,samt:0,csamt:0};
  payload.itc_elg.itc_avl[4].iamt=40;payload.itc_elg.itc_net.iamt=40;
  validation.validateDraft(payload,'gstr-3b',gstin,period);
  draft={id:'draft',user_id:'owner',business_id:'business',form:'gstr-3b',gstin,year:2026,month:8,state:'draft',revision:1,payload,payload_hash:await validation.hash(payload),snapshot:null,snapshot_hash:null,snapshot_at:null};
  const charges=Object.fromEntries(payment.HEADS.map(h=>[h,{tx:h==='igst'?180:0,intr:0,fee:0}]));
  portal={...structuredClone(payload),tx_pmt:{net_tax_pay:[{liab_ldg_id:1,trans_typ:30002,...charges}]}};
  ledger={gstin,cash_bal:Object.fromEntries(payment.HEADS.map(h=>[h,{tx:h==='igst'?140:0,intr:0,fee:0}])),itc_bal:Object.fromEntries(payment.HEADS.map(h=>[h+'_bal',h==='igst'?40:0])),itc_blck_bal:Object.fromEntries(payment.HEADS.map(h=>[h+'_blck_bal',0]))};
  history={period,checkedAt:new Date().toISOString(),records:[{form:'GSTR1',period,status:'Filed',arn:'SYNTHETIC-GSTR1'}]};
  calls=[];operations=[];writes=true;failure=null;status='P';owner='owner';locked=true;
}
async function act(action,overrides={}){
  const input={businessId:'business',action,consent:true,consentAction:action,consentVersion:validation.VERSION,draftId:draft.id,revision:draft.revision,
    approvedHash:['evc','file'].includes(action)?draft.snapshot_hash:draft.payload_hash,booksReviewed:true,itcReviewed:true,priorReturnsReviewed:true,...overrides};
  const response=await handler(new Request('https://local.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify(input)}));
  return {status:response.status,body:await response.json()};
}
async function prepared(){
  draft.state='prepared';draft.snapshot=structuredClone(portal);draft.snapshot_hash=await validation.hash(portal);draft.snapshot_at=new Date().toISOString();draft.reconciliation={matched:true};
}
const allocation={paymentChoices:{...payment.emptyCredit(),i_pdi:40},minimumCash:0,paymentRulesReviewed:true};

await reset();
assert.equal((await act('draft',{form:'gstr-3b',year:2026,month:8,payload:draft.payload})).status,200);
assert.equal(calls.length,0,'Private draft must not be sent to GST');
assert.equal((await act('save')).status,200);assert.equal(draft.state,'save_pending');
assert.equal((await act('poll')).status,200);assert.equal(draft.state,'saved');
assert.equal((await act('reconcile')).status,200);assert.equal(draft.reconciliation.matched,true);
assert.equal((await act('ledger')).status,200);
const preview=await act('preview_offset',allocation);
assert.equal(preview.status,200);assert.equal(preview.body.paymentReview.ready,true);
assert.equal(preview.body.paymentReview.allocation.pdcash[0].ipd,140);
assert.equal((await act('offset',{...allocation,allocationHash:preview.body.allocationHash})).status,200);assert.equal(draft.state,'offset_pending');
assert.equal((await act('poll')).status,200);assert.equal(draft.state,'prepared');
assert.equal((await act('reconcile')).status,200);
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,200);assert.equal(draft.state,'otp_sent');
assert.equal((await act('file',{otp:'syntheticOTP'})).status,200);assert.equal(draft.state,'filed');
assert.equal(draft.acknowledgement,'SYNTHETIC-ARN-NOT-A-REAL-RETURN');
assert.deepEqual(calls.at(-1).payload,portal,'File uses exact fresh post-offset GST response');
assert.equal(calls.filter(c=>c.method==='POST').length,4,'Exactly one save, offset, OTP and file');
assert.ok(operations.every(o=>o.outcome==='succeeded'));

for(const action of ['save','proceed','offset','evc','file']){
  await reset();writes=false;
  assert.equal((await act(action)).status,409);assert.equal(calls.length,0);
}
await reset();owner='other';assert.equal((await act('save')).status,403);assert.equal(calls.length,0);
await reset();locked=false;assert.equal((await act('save')).status,409);assert.equal(calls.length,0);
await reset();assert.notEqual((await act('save',{consent:false})).status,200);assert.equal(calls.length,0);
await reset();assert.notEqual((await act('save',{approvedHash:'stale'})).status,200);assert.equal(calls.length,0);
await reset();history=null;assert.notEqual((await act('save')).status,200);assert.equal(calls.length,0);
await reset();history.records.push({form:'GSTR3B',status:'Filed',period,arn:'EXISTING'});
assert.notEqual((await act('save')).status,200);assert.equal(calls.length,0);assert.equal(draft.acknowledgement,'EXISTING');
await reset();await prepared();history.records=[];
assert.match((await act('evc',{pan:'ABCDE1234F'})).body.error,/GSTR-1/);assert.equal(calls.length,0);
for(const timestamp of ['invalid',new Date(Date.now()-900001).toISOString(),new Date(Date.now()+60000).toISOString()]){
  await reset();await prepared();draft.snapshot_at=timestamp;
  assert.match((await act('evc',{pan:'ABCDE1234F'})).body.error,/fresh GST snapshot/);assert.equal(calls.length,0);
}
await reset();await prepared();portal.sup_details.osup_det.iamt=181;
assert.match((await act('evc',{pan:'ABCDE1234F'})).body.error,/changed since review/);assert.equal(draft.snapshot_hash,null);
assert.equal(calls.filter(c=>c.method==='POST').length,0);
await reset();delete portal.tx_pmt;await prepared();
assert.match((await act('evc',{pan:'ABCDE1234F'})).body.error,/payment details/);assert.equal(calls.filter(c=>c.method==='POST').length,0);
await reset();await prepared();
assert.notEqual((await act('evc',{pan:'ABCDE1234F',itcReviewed:false})).status,200);assert.equal(calls.length,0);

await reset();draft.state='saved';ledger.cash_bal.igst.tx=139;
const insufficient=await act('preview_offset',allocation);assert.equal(insufficient.body.paymentReview.totalShortfall,1);
assert.match((await act('offset',{...allocation,allocationHash:insufficient.body.allocationHash})).body.error,/insufficient/);
assert.equal(calls.filter(c=>c.method==='POST').length,0);
await reset();draft.state='saved';const before=await act('preview_offset',allocation);ledger.cash_bal.igst.tx=141;
assert.match((await act('offset',{...allocation,allocationHash:before.body.allocationHash})).body.error,/changed/);
assert.equal(calls.filter(c=>c.method==='POST').length,0);
await reset();draft.state='saved';
assert.match((await act('offset',{...allocation,allocationHash:'no-preview'})).body.error,/changed|fresh payment preview/);
assert.equal(calls.filter(c=>c.method==='POST').length,0);

for(const action of ['save','offset','file']){
  await reset();let extras={};
  if(action==='offset'){draft.state='saved';const p=await act('preview_offset',allocation);extras={...allocation,allocationHash:p.body.allocationHash};}
  if(action==='file'){await prepared();draft.state='otp_sent';draft.signatory_pan='ABCDE1234F';draft.otp_sent_at=new Date().toISOString();extras={otp:'syntheticOTP'};}
  failure={action,kind:'timeout'};
  assert.notEqual((await act(action,extras)).status,200);assert.equal(draft.state,'unknown');
  const count=calls.filter(c=>c.method==='POST').length;
  assert.notEqual((await act(action,extras)).status,200);
  assert.equal(calls.filter(c=>c.method==='POST').length,count,'Unknown result cannot automatically repeat a write');
}
await reset();failure={action:'save',kind:'rejected'};
assert.match((await act('save')).body.error,/TEST_REJECTED/);assert.equal(draft.state,'blocked');
await reset();draft.state='save_pending';draft.reference_id='ref';status='E';
assert.equal((await act('poll')).status,200);assert.equal(draft.state,'blocked');
for(const kind of ['no-ack','rejected']){
  await reset();await prepared();draft.state='otp_sent';draft.signatory_pan='ABCDE1234F';draft.otp_sent_at=new Date().toISOString();failure={action:'file',kind,code:'RET13506'};
  assert.notEqual((await act('file',{otp:'syntheticOTP'})).status,200);
  assert.equal(draft.acknowledgement,undefined);assert.equal(draft.state,kind==='no-ack'?'unknown':'prepared');
}
await reset();await prepared();draft.state='otp_sent';draft.signatory_pan='ABCDE1234F';draft.otp_sent_at='invalid';
assert.notEqual((await act('file',{otp:'syntheticOTP'})).status,200);assert.equal(calls.filter(c=>c.method==='POST').length,0);

await reset();history.records.push({form:'GSTR3B',period,status:'Not filed'});
assert.equal(returnHistoryReason(history,'gstr-3b',period,'draft'),undefined);
assert.equal(returnHistoryReason(history,'gstr-3b',period,'evc'),undefined);
assert.match(returnHistoryReason({...history,records:[]},'gstr-3b',period,'evc'),/GSTR-1/);
assert.match(returnHistoryReason(history,'gstr-3b','072026','save'),/status/);
assert.equal(returnPhase({state:'saved'}),'compare');assert.equal(returnPhase({state:'offset_pending'}),'compare');
assert.equal(returnPhase({state:'draft'}),'prepare');assert.equal(returnPhase({state:'filed'}),'authorize');
console.log('Regular GSTR-3B handler verified with synthetic data: full draft/save/poll/reconcile/payment/offset/OTP/ARN journey, release lock, ownership, concurrent lock, missing/stale consent, filing history, prior GSTR-1, stale/changed snapshots, cash shortage, changed allocation, rejection, expired OTP, missing acknowledgement and non-retrying timeout recovery. This is not live-provider acceptance.');

// A definitive nil rejection must have a route to the saved portal return after
// payment. Import is GET-only and creates a new private revision, never a reset.
await reset();
const nilPayload={gstin,ret_period:period,registerbox_nil:true,declarations:{noSales:true,noAdjustments:true,completeBooks:true,noPurchases:true,noItc:true,noLiability:true,noAutoPopulation:true,gstr1FiledNil:true}};
draft={...draft,payload:nilPayload,payload_hash:await validation.hash(nilPayload),state:'blocked',last_error:'GST rejected (RT-3BAS1079): Please do offset',otp_sent_at:new Date().toISOString(),signatory_pan:'ABCDE1234F'};
portal.tx_pmt.tx_py=portal.tx_pmt.net_tax_pay.map(row=>({...row,...Object.fromEntries(payment.HEADS.map(h=>[h,{tx:0,intr:0,fee:0}]))}));
portal.tx_pmt.pdcash=[{trans_typ:30002,liab_ldg_id:1,ipd:140}];
// Matches the provider's documented post-offset shape: optional inward_sup
// can be absent. It must remain absent all the way through the filing body.
delete portal.inward_sup;
portal.eco_dtls={eco_sup:{txval:0,iamt:0,camt:0,samt:0,csamt:0},eco_reg_sup:{txval:0}};
const resumed=await act('resume_portal');
assert.equal(resumed.status,200);assert.equal(resumed.body.paymentState,'settled');assert.equal(draft.state,'prepared');assert.equal(draft.revision,2);
assert.equal(draft.payload.registerbox_nil,undefined);assert.equal(draft.payload.tx_pmt,undefined);assert.equal(draft.snapshot.tx_pmt.pdcash[0].ipd,140);
assert.equal(draft.payload.inward_sup,undefined);
assert.equal(draft.last_error,null);assert.equal(draft.otp_sent_at,null);assert.equal(draft.signatory_pan,null);
assert.equal(draft.source_evidence.previousDraft.payload.registerbox_nil,true);assert.ok(calls.every(c=>c.method==='GET'));
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,200);
assert.equal((await act('file',{otp:'aB9xQ2'})).status,200);
assert.deepEqual(calls.at(-1).payload,portal);assert.equal(calls.at(-1).payload.isNil,undefined);

await reset();draft.state='blocked';draft.last_error='RT-3BAS1079';
portal.tx_pmt.tx_py=structuredClone(portal.tx_pmt.net_tax_pay);
assert.equal((await act('resume_portal')).body.paymentState,'payable');assert.equal(draft.state,'saved');
assert.equal((await act('ledger')).status,200);
const recoveredAllocation=await act('preview_offset',allocation);
assert.deepEqual(recoveredAllocation.body.paymentReview.allocation.nettaxpay[0].igst,{tx:180,intr:0,fee:0});
assert.equal((await act('offset',{...allocation,allocationHash:recoveredAllocation.body.allocationHash})).status,200);

await reset();draft.state='unknown';
assert.notEqual((await act('resume_portal')).status,200);assert.equal(calls.length,0);
await reset();history.records.push({form:'GSTR3B',period,status:'Filed',arn:'EXISTING-ARN'});
assert.notEqual((await act('resume_portal')).status,200);assert.equal(draft.state,'filed');assert.equal(calls.length,0);
await reset();draft.state='blocked';delete portal.sup_details;
assert.notEqual((await act('resume_portal')).status,200);assert.equal(draft.state,'blocked');
await reset();assert.notEqual((await act('resume_portal',{consent:false})).status,200);assert.equal(calls.length,0);
await reset();draft.state='saved';portal.tx_pmt.pdcash=[{liab_ldg_id:1,trans_typ:30002,ipd:140}];
assert.match((await act('ledger')).body.error,/existing payment/);assert.ok(calls.every(c=>c.method==='GET'));
console.log('Portal recovery verified: paid nil rejection resumes as full saved return; unpaid resumes offset; original declaration preserved, old OTP cleared, already-filed/unknown/incomplete/stale-consent cases blocked; no automatic payment or filing.');
