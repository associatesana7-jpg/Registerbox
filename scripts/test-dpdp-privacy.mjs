// Real privacy handler, deterministic database/auth substitutes. No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as domain from '../supabase/functions/_shared/privacy-domain.ts';
import { hasPrivacyConsent } from '../supabase/functions/_shared/privacy-consent.ts';

let handler,actor='owner',authenticated=true,staffStatus='active',roles=['SECURITY_ADMIN'],revision=0;
const db={privacy_purpose_preferences:[],privacy_consent_events:[],privacy_rights_requests:[],privacy_deletion_requests:[],privacy_processor_tasks:[]};
function query(table){
  const filters=[];let write,insert=false;
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,values){filters.push(r=>values.includes(r[k]));return q;},gte(){return q;},order(){return q;},limit(){return q;},insert(v){write=v;insert=true;return q;},update(v){write=v;return q;},single:async()=>result(true),maybeSingle:async()=>result(true),then(resolve,reject){return Promise.resolve(result(false)).then(resolve,reject);}};
  function result(single){
    if(table==='staff_profiles')return {data:{status:staffStatus}};
    if(table==='staff_roles')return {data:roles.map(key=>({roles:{key}}))};
    const rows=db[table];if(!rows)throw Error('Unexpected table '+table);
    let found=rows.filter(r=>filters.every(f=>f(r)));
    if(write){
      if(insert){
        if(table==='privacy_purpose_preferences'&&rows.some(r=>r.user_id===write.user_id&&r.purpose===write.purpose))return {error:{code:'23505'}};
        if(table==='privacy_rights_requests'&&rows.some(r=>r.user_id===write.user_id&&r.kind===write.kind&&!['resolved','declined'].includes(r.status)))return {error:{code:'23505'}};
        const row={id:'fixture-'+(++revision),status:'pending',created_at:new Date().toISOString(),target_at:new Date(Date.now()+30*86400000).toISOString(),...write};rows.push(row);found=[row];
      }else found.forEach(r=>Object.assign(r,write));
      if(table==='privacy_purpose_preferences')found.forEach(r=>{r.changed_at='revision-'+(++revision);db.privacy_consent_events.push({...r,id:'event-'+revision});});
    }
    return {data:single?structuredClone(found[0]??null):structuredClone(found)};
  }
  return q;
}
const client={auth:{getUser:async()=>authenticated?{data:{user:{id:actor}}}:{data:{user:null},error:Error('expired')}},from:query};
const modules={
  'npm:@supabase/supabase-js@2.117.1':{createClient:()=>client},
  '../_shared/http.ts':{corsHeaders:{},json:(v,status=200)=>Response.json(v,{status})},
  '../_shared/privacy-domain.ts':domain,
};
const code=ts.transpileModule(fs.readFileSync('supabase/functions/privacy-center/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports','Deno',code)(name=>modules[name]??assert.fail(name),{},{serve:fn=>{handler=fn;},env:{toObject:()=>({SUPABASE_URL:'fixture',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})}});
async function act(action,input={}){const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer not-a-token'},body:JSON.stringify({action,...input})}));return {status:response.status,body:await response.json()};}
const preference={purpose:'ai_assistance',allowed:true,language:'en',noticeVersion:domain.PRIVACY_NOTICE_VERSION,confirmed:true,isAdult:true};
assert.equal((await act('state')).body.preferences.length,0);
assert.equal(await hasPrivacyConsent(client,'owner','ai_assistance'),false,'No implied optional consent');
assert.equal((await act('preference',{...preference,confirmed:false})).status,400);
assert.equal((await act('preference',{...preference,noticeVersion:'obsolete'})).status,400);
assert.equal((await act('preference',{...preference,isAdult:false})).status,403,'A checkbox cannot grant unverified child access');
const granted=await act('preference',{...preference,userId:'another-user'});
assert.equal(granted.status,200);assert.equal(db.privacy_purpose_preferences[0].user_id,'owner');
assert.equal(await hasPrivacyConsent(client,'owner','ai_assistance'),true);
assert.equal(await hasPrivacyConsent(client,'another-user','ai_assistance'),false);
const previous=granted.body.preference.changed_at;
assert.equal((await act('preference',{...preference,allowed:false,isAdult:false})).status,200);
assert.equal(await hasPrivacyConsent(client,'owner','ai_assistance'),false,'Withdrawal immediately stops future consent checks');
assert.equal((await act('preference',{...preference,expectedChangedAt:previous})).status,409,'An old screen cannot silently undo withdrawal');
assert.equal(db.privacy_consent_events.length,2);
const latest=(await act('state')).body.preferences[0].changed_at;
assert.equal((await act('preference',{...preference,expectedChangedAt:latest,language:'hi'})).status,200);
assert.equal(db.privacy_purpose_preferences[0].notice_snapshot,domain.privacyPurposeNotices.ai_assistance.hi);
db.privacy_purpose_preferences[0].notice_version='old';assert.equal(await hasPrivacyConsent(client,'owner','ai_assistance'),false);
assert.equal(await hasPrivacyConsent({from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({error:Error('unavailable')})})},'owner','ai_assistance'),false);
actor='another-user';assert.equal((await act('state')).body.preferences.length,0);assert.equal((await act('state')).body.events.length,0);actor='owner';
assert.equal((await act('request',{kind:'access',confirmed:false,details:''})).status,400);
const request=await act('request',{kind:'access',confirmed:true,details:'',user_id:'another-user'});
assert.equal(request.status,200);assert.equal(db.privacy_rights_requests[0].user_id,'owner');assert.equal(db.privacy_rights_requests[0].status,'pending');
assert.equal((await act('request',{kind:'access',confirmed:true,details:''})).status,409);
assert.equal((await act('request',{kind:'correction',confirmed:true,details:'PAN ABCDE1234F'})).status,400);
assert.equal((await act('request',{kind:'correction',confirmed:true,details:' '})).status,400);
roles=['CASE_WORKER'];assert.equal((await act('operator_list')).status,403);
roles=['SECURITY_ADMIN'];staffStatus='disabled';assert.equal((await act('operator_list')).status,403);staffStatus='active';
assert.equal((await act('operator_list')).status,200);
const requestId=request.body.request.id;
assert.equal((await act('operator_response',{requestId,status:'resolved',response:'Done',evidence:''})).status,400);
assert.equal((await act('operator_response',{requestId,status:'resolved',response:'Summary supplied to the verified requester.',evidence:'fixture-summary-reference'})).status,200);
assert.match(db.privacy_rights_requests[0].response,/registerbox@yahoo.com/);
assert.equal((await act('operator_response',{requestId,status:'declined',response:'Overwrite',evidence:'reference'})).status,409);
db.privacy_processor_tasks.push({id:'task-fixture',user_id:'owner',purpose:'ai_assistance',status:'pending'});
assert.equal((await act('operator_processor_response',{taskId:'task-fixture',status:'completed',response:'Confirmed',evidence:''})).status,400);
assert.equal((await act('operator_processor_response',{taskId:'task-fixture',status:'retained',response:'Legal hold',evidence:'reference',legalBasis:'Applicable obligation',retainedUntil:'2027-02-31'})).status,400);
assert.equal((await act('operator_processor_response',{taskId:'task-fixture',status:'completed',response:'Processor confirmation received',evidence:'fixture-provider-receipt'})).status,200);
assert.equal((await act('operator_processor_response',{taskId:'task-fixture',status:'completed',response:'Repeat',evidence:'reference'})).status,409);
authenticated=false;assert.equal((await act('state')).status,401);
assert.equal(domain.privacyConsentDecision({allowed:true,notice_version:domain.PRIVACY_NOTICE_VERSION}),true);
assert.throws(()=>domain.validatePrivacyDetails('123456789012',false));
console.log('Privacy handler verified: explicit versioned EN/HI purpose consent, withdrawal, stale-grant prevention, user isolation, no inferred child authority, request receipts and duplicate limits, minimal identifiers, active operator roles, evidence-required responses, immutable resolved cases and fail-closed provider permission checks. No real customer changes.');
