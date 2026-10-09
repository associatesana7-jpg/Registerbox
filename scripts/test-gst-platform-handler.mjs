import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import * as workspaceModule from '../supabase/functions/_shared/gst-platform-workspace.ts';
import {PLATFORM_TEMPLATE} from '../supabase/functions/_shared/gst-platform-import.ts';
let handler,stored=null,owner='owner';
const gstin='29ABCDE1234F1Z5';
function query(table){let filters={},values,insert=false;
 const q={select(){return q;},is(){return q;},eq(k,v){filters[k]=v;return q;},match(v){Object.assign(filters,v);return q;},update(v){values=v;return q;},insert(v){values=v;insert=true;return q;},single:async()=>result(),maybeSingle:async()=>result()};
 function result(){
  if(table==='business_profiles')return {data:{id:'business',user_id:owner}};
  if(table==='gst_connections')return {data:{gstin}};
  assert.equal(table,'gst_platform_workspaces');
  const scope=insert?values:filters;
  assert.equal(scope.user_id,'owner');assert.equal(scope.business_id,'business');assert.equal(scope.gstin,gstin);assert.equal(scope.period,'092026');assert.equal(scope.role,'seller');
  if(values){if(insert&&stored)return {error:{code:'23505'}};if(!insert&&filters.revision!==stored?.revision)return {data:null};stored={...(stored??{}),...values};}
  return {data:stored};
 }return q;
}
const modules={
 'npm:@supabase/supabase-js@2.117.1':{createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:query})},
 '../_shared/http.ts':{corsHeaders:{},json:(v,status=200)=>Response.json(v,{status})},
 '../gst-returns/validation.ts':{hash:async value=>createHash('sha256').update(value).digest('hex')},
 '../_shared/gst-platform-workspace.ts':workspaceModule,
};
new Function('require','exports','Deno',ts.transpileModule(fs.readFileSync('supabase/functions/gst-platform-workspace/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>modules[name]??assert.fail(name),{},{serve:fn=>handler=fn,env:{toObject:()=>({})}});
const csv=PLATFORM_TEMPLATE+'Platform,INV-1,2026-09-10,'+gstin+',,29FGHIJ5678K1Z1,29,section9_5,invoice,,,100,0,2.5,2.5,0\n';
async function act(extra){const r=await handler(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer fake'},body:JSON.stringify({businessId:'business',gstin,period:'092026',role:'seller',action:'import',csv,name:'report.csv',revision:0,consent:true,...extra})}));return {status:r.status,body:await r.json()};}
assert.equal((await act({action:'load'})).body.workspace.revision,0);
assert.equal((await act({consent:false})).status,400);assert.equal(stored,null);
assert.equal((await act({gstin:'different'})).status,409);
owner='other';assert.equal((await act({})).status,403);owner='owner';
const first=await act({});assert.equal(first.status,200);assert.equal(first.body.workspace.rows.length,1);assert.equal(first.body.workspace.batches[0].csv,undefined);assert.equal(stored.batches[0].csv,csv);
assert.equal((await act({})).status,409,'Stale revisions cannot overwrite');
assert.equal((await act({revision:1})).body.duplicateFile,true,'Retry after reload is idempotent');
const requests=await Promise.all([act({revision:1,csv:csv.replace('INV-1','INV-2')}),act({revision:1,csv:csv.replace('INV-1','INV-3')})]);
assert.deepEqual(requests.map(r=>r.status).sort(),[200,409]);assert.equal(stored.rows.length,2);
assert.equal((await act({action:'load'})).body.workspace.rows.length,2,'Saved records survive a new request');
console.log('Real import handler passed: owner/GSTIN isolation, explicit consent, source retention, reload, replay and concurrent-write protection.');
