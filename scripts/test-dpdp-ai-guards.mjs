// Execute the real AI/bill handlers with synthetic identities; never calls a provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {hasPrivacyConsent} from '../supabase/functions/_shared/privacy-consent.ts';
import {PRIVACY_NOTICE_VERSION} from '../supabase/functions/_shared/privacy-domain.ts';
for(const slug of ['ai-intent-router','bill-extractor']){
  let handler,preference=null,dbError=false,providerCalls=0,downloads=0,authenticated=true;
  const seen=[];
  function query(table){
    const filters={};seen.push({table,filters});
    const q={select(){return q;},eq(k,v){filters[k]=v;return q;},is(){return q;},maybeSingle:async()=>table==='privacy_purpose_preferences'?{data:preference,error:dbError?Error('offline'):null}:{data:{id:'business',user_id:'owner',gstin:'sample'}}};
    assert.ok(['privacy_purpose_preferences','business_profiles'].includes(table),'No downstream read when permission is denied');
    return q;
  }
  const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'owner'}:null}})},from:query,storage:{from:()=>({download:async()=>{downloads++;throw Error('Unexpected download');}})}};
  const modules={
    'npm:@supabase/supabase-js@2':{createClient:()=>client},
    'npm:@supabase/supabase-js@2.117.1':{createClient:()=>client},
    '../_shared/http.ts':{corsHeaders:{},json:(v,status=200)=>Response.json(v,{status})},
    '../_shared/privacy-consent.ts':{hasPrivacyConsent},
    '../_shared/qwen.ts':{callQwenStructured:async()=>{providerCalls++;throw Error('Unexpected provider');},callQwenVisionStructured:async()=>{providerCalls++;throw Error('Unexpected provider');}},
    '../_shared/gst-purchases.ts':{PurchaseError:class extends Error{},validateBooks:()=>assert.fail('Unexpected validation')},
  };
  const code=ts.transpileModule(fs.readFileSync('supabase/functions/'+slug+'/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports','Deno',code)(name=>modules[name]??assert.fail(name),{},{serve:fn=>{handler=fn;},env:{get:()=> 'fixture',toObject:()=>({SUPABASE_URL:'fixture',SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture'})}});
  async function request(){return handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({message:'Plan a sample business',action:'extract',businessId:'business',documentId:'sample-document'})}));}
  for(const state of [null,{allowed:false,notice_version:PRIVACY_NOTICE_VERSION},{allowed:true,notice_version:'obsolete'}]){
    preference=state;assert.equal((await request()).status,403);
  }
  preference={allowed:true,notice_version:PRIVACY_NOTICE_VERSION};dbError=true;assert.equal((await request()).status,403);
  authenticated=false;assert.equal((await request()).status,401);
  assert.equal(providerCalls,0);assert.equal(downloads,0);
  assert.ok(seen.filter(x=>x.table==='privacy_purpose_preferences').every(x=>x.filters.user_id==='owner'&&x.filters.purpose===(slug==='bill-extractor'?'ai_bill_extraction':'ai_assistance')));
}
console.log('Real goal and bill handlers fail closed before document download or provider use for absent, withdrawn, stale and unavailable consent.');
