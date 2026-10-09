// Execute the real handler against synthetic database/provider doubles. No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as amendmentLinks from '../supabase/functions/_shared/gst-amendment-links.ts';
import * as validation from '../supabase/functions/gst-returns/validation.ts';
import * as nil from '../supabase/functions/gst-returns/nil.ts';
import { filingBlock } from '../supabase/functions/_shared/gst-filing-history.ts';
import { validFilingOtp } from '../supabase/functions/_shared/gst-filing-otp.ts';
import { periodIsClosed, validPeriod } from '../supabase/functions/gst-workspace/domain.ts';
let handler, draft, calls, records, rejectProceed = false, rejectFile = false, readySummary;
let signatories=[], businessOwner='owner';
const gstin = '29ABCDE1234F1Z5';
const connection = { id: 'connection', gstin, status: 'linked', token_ciphertext: 'synthetic', expires_at: '2099-01-01' };
function query(table) {
  let values, scope, remove=false, selectedId;
  const q = { select() { return q; }, eq(key,value) { if(key==='id')selectedId=value; return q; }, is() { return q; }, or() { return q; }, gte() { return q; }, limit() { return q; },
    match(v) { scope=v;return q; }, order() { return q; }, delete() { remove=true;return q; },
    upsert(v,options) { assert.equal(options.onConflict,'user_id,business_id,gstin,pan');values=v;return q; },
    update(v) { values = v; return q; }, insert(v) { values = v; return q; },
    async single() { return result(); }, async maybeSingle() { return result(); },
    then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); } };
  function result() {
    if (table === 'business_profiles') return { data: { id: 'business', user_id: businessOwner } };
    if (table === 'gst_saved_signatories') {
      const actual=values??scope;
      assert.equal(actual.user_id,'owner');assert.equal(actual.business_id,'business');assert.equal(actual.gstin,gstin);
      if(values) {signatories=signatories.filter(p=>p.pan!==values.pan);signatories.push({id:'saved-id',name:values.name,pan:values.pan});}
      if(remove)signatories=signatories.filter(p=>p.id!==selectedId);
      return {data:signatories};
    }
    if (table === 'gst_connections') return { data: connection };
    if (table === 'gst_return_operations') return { data: { id: 'operation' }, count: 0 };
    if (table === 'gst_return_drafts') { if (values) draft = { ...draft, ...values }; return { data: draft }; }
    throw Error(table);
  }
  return q;
}
const client = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: query };
const modules = {
  '../_shared/gst-amendment-links.ts': amendmentLinks,
  'npm:@supabase/supabase-js@2.117.1': { createClient: () => client },
  '../_shared/http.ts': { corsHeaders: {}, json: (value, status = 200) => new Response(JSON.stringify(value), { status }) },
  '../gst-workspace/domain.ts': { periodIsClosed, validPeriod, decryptToken: async () => 'synthetic-token' },
  './validation.ts': validation, './nil.ts': nil,
  '../_shared/gst-filing-otp.ts': { validFilingOtp },
  '../_shared/gst-payment.ts': {},
  '../_shared/gst-filing-history.ts': { filingBlock, fetchFilingHistory: async () => ({ records, period: '082026' }) },
};
const source = ts.transpileModule(fs.readFileSync('supabase/functions/gst-returns/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('require', 'exports', 'Deno', 'fetch', source)(name => modules[name] ?? assert.fail(name), {}, {
  serve: fn => { handler = fn; }, env: { toObject: () => ({ GST_RETURN_WRITES_ENABLED: 'true', SANDBOX_API_KEY: 'key_live_synthetic', SANDBOX_API_SECRET: 'synthetic' }) },
}, async (url, options) => {
  calls.push({ url, method: options.method, payload: options.body && JSON.parse(options.body) });
  if (url.includes('new-proceed')) return Response.json(rejectProceed ? { code: 200, data: { status_cd: '0', error: { error_cd: rejectProceed === 'ready' ? 'RET00003' : 'RET192409', message: rejectProceed === 'ready' ? 'Return Form already ready to be filed' : 'Prior return required' } } } : { data: { status_cd: '1', data: { reference_id: 'ref' } } });
  if (url.includes('?summary_type=long') && readySummary) return Response.json({data:{status_cd:'1',data:readySummary}});
  if (url.includes('/status?')) return Response.json({ data: { status_cd: '1', data: { status_cd: 'P' } } });
  if (url.includes('/evc/otp')) return Response.json({ data: { status_cd: '1' } });
  if (url.includes('/file?')) return Response.json(rejectFile ? {code:200,data:{status_cd:'0',error:{error_cd:'RET13506',message:'OTP is either expired or incorrect'}}} : { data: { status_cd: '1', data: { ack_num: 'TEST-ARN' } } });
  throw Error('Unexpected provider request (including forbidden nil summary fetch): ' + url);
});
async function reset(form = 'gstr-1') {
  const payload = { gstin, ret_period: '082026', registerbox_nil: true, declarations: { noSales: true, noAdjustments: true, completeBooks: true, noPurchases: true, noItc: true, noLiability: true, noAutoPopulation: true, gstr1FiledNil: true } };
  draft = { id: 'draft', form, gstin, year: 2026, month: 8, state: 'draft', revision: 1, payload, payload_hash: await validation.hash(payload), snapshot: null, snapshot_hash: null };
  calls = []; records = form === 'gstr-3b' ? [{ form: 'GSTR1', status: 'Filed', period: '082026' }] : []; rejectProceed = false; rejectFile = false; readySummary = null;
}
async function act(action, overrides = {}) {
  const response = await handler(new Request('https://local.test', { method: 'POST', headers: { Authorization: 'Bearer synthetic' }, body: JSON.stringify({ businessId: 'business', action, consent: true, consentAction: action, consentVersion: validation.VERSION, draftId: draft.id, revision: draft.revision, approvedHash: draft.payload_hash, ...overrides }) }));
  return { status: response.status, body: await response.json() };
}
await reset();
assert.equal((await act('evc', { pan: 'ABCDE1234F' })).status, 502);
assert.equal(calls.length, 0, 'GSTR-1 must prepare before OTP');
assert.equal((await act('proceed')).status, 200);
assert.equal(draft.state, 'prepared');
assert.equal((await act('evc', { pan: 'ABCDE1234F' })).status, 200);
assert.equal((await act('file', { otp: 'aB9xQ2' })).status, 200);
assert.equal(new URL(calls.at(-1).url).searchParams.get('otp'),'aB9xQ2');
assert.equal(draft.acknowledgement, 'TEST-ARN');
assert.deepEqual(calls.at(-1).payload, { gstin, ret_period: '082026', isnil: 'Y' });
assert.equal(draft.snapshot, null, 'Nil flow must not invent a GST snapshot');
assert.equal(calls.length, 3, 'Nil GSTR-1 initializes, sends OTP and files without status or summary reads');
await reset(); draft.state='proceed_pending'; draft.reference_id='accepted-ref';
assert.equal((await act('poll')).status,200);
assert.equal(draft.state,'prepared');
assert.equal(calls.length,0,'Existing clients recover accepted initialization without the failing status lookup');
await reset(); draft.state='proceed_pending'; draft.reference_id='accepted-ref';
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,200);
assert.equal(calls.length,1,'Existing accepted nil request goes directly to OTP');
await reset(); draft.state='proceed_pending'; draft.reference_id=null;
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,502);
assert.equal(calls.length,0,'Missing initialization acknowledgement cannot be bypassed');
await reset('gstr-3b');
assert.equal((await act('evc', { pan: 'ABCDE1234F' })).status, 200);
assert.equal((await act('file', { otp: '123456' })).status, 200);
assert.equal(calls.length, 2, 'Nil 3B uses OTP then file, no summary/save/offset');
assert.equal(calls.at(-1).payload.isNil, 'Y');
await reset(); records = [{ form: 'GSTR1', status: 'Filed', period: '082026', arn: 'EXISTING' }];
assert.equal((await act('proceed')).status, 502); assert.equal(calls.length, 0);
await reset();
assert.equal((await act('proceed', { approvedHash: 'wrong' })).status, 502); assert.equal(calls.length, 0);
draft.payload.declarations.noSales = false;
assert.equal((await act('proceed')).status, 502); assert.equal(calls.length, 0);
await reset('gstr-3b'); records = [];
assert.equal((await act('evc', { pan: 'ABCDE1234F' })).status, 502); assert.equal(calls.length, 0);
await reset(); rejectProceed = true;
assert.match((await act('proceed')).body.error, /RET192409/);
await reset(); draft.payload = { gstin, fp: '082026' }; draft.state = 'prepared';
assert.match((await act('evc', { approvedHash: null, pan: 'ABCDE1234F' })).body.error, /fresh GST snapshot/);
assert.equal(calls.length, 0, 'Regular returns retain snapshot gate');
console.log('Real handler tests passed: nil GSTR-1 and 3B, no summary fetch, exact payloads, duplicate prevention, declarations, approval hash, prerequisites, provider errors, regular snapshot gate.');
await reset(); rejectProceed = 'ready';
readySummary = {gstin,ret_period:'082026',sec_sum:[{sec_nm:'B2B',ttl_rec:0,ttl_val:0}]};
assert.equal((await act('proceed')).status,200);
assert.equal(draft.state,'prepared');
assert.equal(calls.filter(c=>c.method==='POST').length,1);
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,200);
await reset(); draft.state='blocked'; draft.last_error='GST rejected the request (RET00003): Return Form already ready to be filed';
readySummary={gstin,ret_period:'082026',sec_sum:[{sec_nm:'B2B',ttl_rec:0,ttl_val:0}]};
assert.equal((await act('recover_nil')).status,200);
assert.equal(draft.state,'prepared');
assert.equal(calls.length,0,'Recovery must not repeat preparation or fetch a summary');
await reset(); draft.state='blocked'; draft.last_error='GST rejected the request (RET00003): Return Form already ready to be filed';
readySummary={gstin,ret_period:'082026',sec_sum:[{sec_nm:'B2B',ttl_rec:1,ttl_val:118}]};
assert.equal((await act('recover_nil')).status,200); assert.equal(draft.state,'prepared');
assert.equal(calls.length,0,'No summary gate for a taxpayer-declared nil return');
draft.state='blocked'; draft.last_error='GST rejected the request (RET00003): Return Form already ready to be filed';
readySummary={gstin,ret_period:'082026',sec_sum:[]};
assert.equal((await act('recover_nil')).status,200);
assert.equal(draft.snapshot,null); assert.equal(draft.reconciliation,null);
draft.state='blocked'; draft.last_error='Other failure'; calls=[];
assert.equal((await act('recover_nil')).status,502); assert.equal(calls.length,0);
console.log('Already-ready recovery passed: fresh and saved RET00003, no repeated writes or summary gates, unrelated failures blocked.');
await reset(); draft.state='otp_sent'; draft.signatory_pan='ABCDE1234F'; draft.otp_sent_at=new Date().toISOString(); rejectFile=true;
const expired=await act('file',{otp:'aB9xQ2'});
assert.equal(expired.status,502); assert.match(expired.body.error,/fresh code/);
assert.equal(draft.state,'prepared'); assert.equal(draft.otp_sent_at,null); assert.equal(draft.acknowledgement,undefined);
assert.equal((await act('evc',{pan:'ABCDE1234F'})).status,200);
assert.equal(draft.state,'otp_sent');
console.log('Rejected OTP recovery passed: no ARN, prepared state restored, old OTP cleared and fresh OTP enabled.');
await reset();
assert.equal((await act('save_signatory',{gstin,name:' Partner Name ',pan:' abcde1234f '})).status,200);
assert.deepEqual(signatories,[{id:'saved-id',name:'Partner Name',pan:'ABCDE1234F'}]);
assert.equal((await act('signatories',{gstin})).body.signatories[0].pan,'ABCDE1234F');
assert.equal((await act('save_signatory',{gstin,name:'Updated name',pan:'ABCDE1234F'})).status,200);
assert.equal(signatories.length,1,'Repeated PAN updates name without duplicating');
assert.equal((await act('save_signatory',{gstin,name:'Bad',pan:'bad'})).status,502);
assert.equal((await act('save_signatory',{gstin,name:'Valid',pan:'ABCDE1234F',consent:false})).status,502);
assert.equal((await act('signatories',{gstin:'different-account'})).status,502);
businessOwner='someone-else';
assert.equal((await act('signatories',{gstin})).status,403);
businessOwner='owner';
assert.equal((await act('remove_signatory',{gstin,signatoryId:'saved-id'})).status,200);
assert.equal(signatories.length,0);
assert.equal(calls.length,0,'Saved details never contact GST or send OTP');
console.log('Saved signatories: normalized, deduplicated, scoped, consented, removable; owner and GSTIN isolation enforced.');

// Ecommerce release gate must stop every portal mutation before any provider call.
for(const section of ['ecom','ecoma','supeco','supecoa','eco_dtls']) {
  await reset(section==='eco_dtls'?'gstr-3b':'gstr-1');
  draft.payload={gstin,fp:'082026',[section]:{}};
  draft.payload_hash=await validation.hash(draft.payload);
  draft.snapshot_hash=draft.payload_hash;
  for(const action of ['save','proceed','offset','evc','file']) {
    const result=await act(action,{pan:'ABCDE1234F',otp:'123456'});
    assert.notEqual(result.status,200);
    assert.match(JSON.stringify(result.body),/acceptance testing/);
    assert.equal(calls.length,0,'Unreleased ecommerce must never reach the provider');
  }
}
console.log('Ecommerce release gates passed for all five sections and save/proceed/offset/OTP/file actions.');
