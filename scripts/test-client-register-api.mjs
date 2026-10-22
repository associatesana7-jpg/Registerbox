import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clientRegister,uploadClientDocument} from '../supabase/functions/control-center/client-register.ts';
const reply=(body,status=200)=>({body,status});
test('unauthorised caller cannot read client register',async()=>{
  assert.equal((await clientRegister({}, {userId:'test',permissions:new Set()}, {action:'crm_list'}, reply)).status,403);
});
test('read-only staff cannot import or upload',async()=>{
  const access={userId:'test',permissions:new Set(['customer.read','business.read'])};
  assert.equal((await clientRegister({},access,{action:'crm_import',rows:[]},reply)).status,403);
  assert.equal((await uploadClientDocument({},access,new FormData(),reply)).status,403);
});
test('import validates each row before database access and reports partial success',async()=>{
  let calls=0;
  const admin={rpc:async()=>{calls++;return {data:{clientId:'test',serviceAdded:true}};}};
  const access={userId:'test',permissions:new Set(['customer.read','business.read','application.update'])};
  const result=await clientRegister(admin,access,{action:'crm_import',rows:[{company_name:'Good',service:'FSSAI',date_kind:'expiry',registered_on:'2025-01-01',due_on:'2027-01-01'},{company_name:'Bad',email:'bad-email'},{company_name:'Bad dates',service:'FSSAI',due_on:'2026-02-30'}]},reply);
  assert.equal(calls,1);assert.equal(result.body.results.filter(r=>r.ok).length,1);assert.equal(result.body.results.filter(r=>!r.ok).length,2);
});
test('batch size is bounded',async()=>{
  const access={userId:'test',permissions:new Set(['customer.read','business.read','application.update'])};
  assert.equal((await clientRegister({},access,{action:'crm_import',rows:Array(101).fill({})},reply)).status,400);
});
