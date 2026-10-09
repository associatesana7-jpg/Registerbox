import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as knowledge from '../supabase/functions/_shared/gst-assistant-knowledge.ts';
let handler,modelCalls=0,queries=[],owner='owner',captured,failModel=false;
function query(table){let filters={};queries.push({table,filters});const q={select(){return q;},eq(k,v){filters[k]=v;return q;},is(){return q;},order(){return q;},limit(){return q;},insert(){return q;},maybeSingle(){return Promise.resolve(result());},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};function result(){if(table==='business_profiles')return {data:{id:'business-a',user_id:owner}};if(table==='gst_connections')return {data:{gstin:'29ABCDE1234F1Z5',status:'linked',expires_at:'2099-01-01'}};if(table==='gst_return_drafts')return {data:[{form:'gstr-1',year:2026,month:8,state:'draft',acknowledgement:null}]};return {data:null};}return q;}
const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:query};
const modules={
 'npm:@supabase/supabase-js@2.117.1':{createClient:()=>client},
 '../_shared/http.ts':{corsHeaders:{},json:(v,status=200)=>Response.json(v,{status})},
 '../_shared/gst-assistant-knowledge.ts':knowledge,
 '../_shared/qwen.ts':{callQwenStructured:async args=>{modelCalls++;captured=args;if(failModel)throw Error('down');return {data:{answer:'Review your return.',confidence:0.8,missingFacts:['Period'],actions:['file_without_otp','https://evil.test','open_returns']},model:'test',latencyMs:1};}},
};
const source=ts.transpileModule(fs.readFileSync('supabase/functions/registerbox-ai/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports','Deno',source)(name=>modules[name]??assert.fail(name),{},{serve:fn=>{handler=fn;},env:{toObject:()=>({SUPABASE_URL:'local',SUPABASE_ANON_KEY:'test',SUPABASE_SERVICE_ROLE_KEY:'test'})}});
async function request(body){const response=await handler(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}
assert.equal((await request({question:'GST help',providerConsent:false,businessId:'business-a'})).status,400);assert.equal(modelCalls,0);
owner='someone-else';assert.equal((await request({question:'GST help',providerConsent:true,businessId:'business-a'})).status,403);assert.equal(modelCalls,0);owner='owner';
const result=await request({question:'GST help for 29ABCDE1234F1Z5 and PAN ABCDE1234F, Aadhaar 1234 5678 9012',providerConsent:true,businessId:'business-a'});
assert.equal(result.status,200);assert.deepEqual(result.body.actions,['open_gst','open_returns']);
assert.equal(result.body.knowledgeVersion,knowledge.GST_KNOWLEDGE_VERSION);
assert.equal(result.body.capabilities.gstr8ProviderConnected,false);
assert(!captured.user.includes('ABCDE1234F'));assert(!captured.user.includes('5678'));
assert(captured.system.includes('savedReturns'));assert(!captured.system.includes('29ABCDE1234F1Z5'));
for(const q of queries.filter(q=>['gst_connections','gst_return_drafts'].includes(q.table))){assert.equal(q.filters.user_id,'owner');assert.equal(q.filters.business_id,'business-a');}
assert.equal(knowledge.gstCapabilityKnowledge({GST_RETURN_WRITES_ENABLED:'true'}).liveReturnWrites,true);
assert.deepEqual(knowledge.safeGstActions(['upload_bill','file','upload_bill']),['upload_bill']);
assert.match(knowledge.redactAssistantText('OTP: 123456'),/REDACTED/);
failModel=true;const fallback=await request({question:'How do I file GSTR-8?',providerConsent:true,businessId:'business-a'});
assert.equal(fallback.body.source,'workflow_guide');assert.match(fallback.body.answer,/not connected/);assert.deepEqual(fallback.body.actions,['review_tcs']);
console.log('GST AI handler passed: selected-business isolation, provider consent, redaction, shared capability knowledge, allowlisted actions and deterministic provider-outage fallback.');

assert.deepEqual(knowledge.suggestedGstActions('File my nill return'),['file_nil']);
assert.equal(knowledge.isNilFilingRequest("Don't file my nil return"),false);
assert.equal(knowledge.isNilFilingRequest('What is a nil return?'),false);
assert.deepEqual(knowledge.suggestedGstActions('File my nil GSTR-8'),['review_tcs']);
assert.deepEqual(knowledge.safeGstActions(['file_nil','file_without_otp']),['file_nil']);

assert.equal(knowledge.isNilFilingRequest('File nil GSTR-8'),false);
assert.equal(knowledge.isNilFilingRequest('File nil GSTR-4'),false);
assert.equal(knowledge.isNilFilingRequest('File my nil GSTR-3B'),true);
