import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import {corsHeaders,json} from '../_shared/http.ts';
import {decryptToken,validPeriod,periodIsClosed} from '../gst-workspace/domain.ts';
import {fetchFilingHistory,filingBlock} from '../_shared/gst-filing-history.ts';
import {imsSections,imsRows,imsSavePayload,imsProcessed,imsComputationProcessed,type ImsInvoice} from '../_shared/gst-ims.ts';
import {unpack2b,PurchaseError} from '../_shared/gst-purchases.ts';
class SafeError extends Error{}
class Rejected extends SafeError{
  constructor(message:string,readonly code='UNKNOWN'){super(message);}
}
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  const env=Deno.env.toObject(),authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json({error:'Sign in again.'},401);
  const client=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!auth.user)return json({error:'Sign in again.'},401);
  const admin=createClient(env.SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!);
  let connectionId:string|undefined,lockId:string|undefined,operationId:string|undefined,writeStarted=false;
  try{
    const raw=await request.text();if(raw.length>100000)throw new SafeError('Request too large. Save fewer invoices.');
    const body=JSON.parse(raw),{action,year,month}=body;
    if(!['load','refresh','save','compute','poll','verify'].includes(action)||!validPeriod(year,month))throw new SafeError('Choose a valid IMS period and action.');
    const {data:business,error:businessError}=await client.from('business_profiles').select('id,user_id').eq('id',body.businessId).is('deleted_at',null).maybeSingle();
    if(businessError||business?.user_id!==auth.user.id)return json({error:'Only this business owner can access IMS.'},403);
    const {data:connection}=await admin.from('gst_connections').select('*').eq('user_id',auth.user.id).eq('business_id',business.id).single();
    if(!connection||connection.status!=='linked'||!connection.token_ciphertext||Date.parse(connection.expires_at)<=Date.now())throw new SafeError('Reconnect your GST account. Your return remains saved.');
    connectionId=connection.id;lockId=crypto.randomUUID();
    const {data:locked,error:lockError}=await admin.from('gst_connections').update({lock_id:lockId,locked_until:new Date(Date.now()+120000).toISOString()}).eq('id',connection.id).or('locked_until.is.null,locked_until.lt.'+new Date().toISOString()).select('*').maybeSingle();
    if(lockError||!locked)throw new SafeError('Another GST request is running. Wait, then refresh.');
    const scope={user_id:auth.user.id,business_id:business.id,year,month};
    const {error:createError}=await admin.from('gst_ims_workspaces').upsert({...scope,gstin:locked.gstin},{onConflict:'user_id,business_id,year,month',ignoreDuplicates:true});
    if(createError)throw new SafeError('Could not open IMS workspace.');
    const {data:workspace}=await admin.from('gst_ims_workspaces').select('*').match(scope).single();
    if(!workspace||workspace.gstin!==locked.gstin)throw new SafeError('GST account changed. Reopen IMS.');
    const latest=async()=>{const {data,error}=await admin.from('gst_ims_operations').select('*').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw new SafeError('Could not read the previous IMS operation.');return data;};
    let operation=await latest();
    if(action==='load')return json({workspace,operation});
    if(body.consent!==true||body.consentVersion!=='gst-ims-v1')throw new SafeError('Review and approve this IMS action.');
    const legacy=Object.keys(env).find(key=>/^key_live_[a-z0-9]+$/i.test(key)),key=env.SANDBOX_API_KEY??legacy,secret=env.SANDBOX_API_SECRET??(legacy?env[legacy]:undefined);
    if(!key||!secret)throw new SafeError('GST provider credentials are unavailable.');
    const token=await decryptToken(locked.token_ciphertext,env.GST_TOKEN_ENCRYPTION_KEY||secret,auth.user.id+':'+business.id);
    const provider=async(path:string,payload?:unknown)=>{
      const response=await fetch('https://api.sandbox.co.in'+path,{method:payload===undefined?'GET':'POST',headers:{authorization:token,'x-api-key':key,'x-api-version':'1.0.0','Content-Type':'application/json','x-source':'primary'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok||!result.data||Number(result.code)>=400)throw new SafeError('GST provider is unavailable or your session expired. Reconnect, then check the previous operation.');
      if(String(result.data.status_cd)==='0'||result.data.error){const error=result.data.error,code=String(error?.error_cd||'UNKNOWN').replace(/[^A-Za-z0-9_-]/g,'');throw new Rejected(`GST rejected IMS (${code}): ${String(error?.message||'Review the GST portal response.').slice(0,240)}`,code);}
      if(String(result.data.status_cd)!=='1'&&!(path.includes('/gstr-2b/')&&String(result.data.status_cd)==='3'))throw new SafeError('Unrecognized GST response. No operation was automatically repeated.');
      return result.data;
    };
    const document=async()=>unpack2b(await provider(`/gst/compliance/tax-payer/gstrs/gstr-2b/${year}/${String(month).padStart(2,'0')}`),locked.gstin,String(month).padStart(2,'0')+year);
    const saveWorkspace=async(values:Record<string,unknown>)=>{const {data,error}=await admin.from('gst_ims_workspaces').update({...values,updated_at:new Date().toISOString()}).eq('id',workspace.id).select('*').single();if(error)throw new SafeError('Could not save IMS status. Refresh before continuing.');return data;};
    if(action==='verify'){
      if(operation&&['started','pending','unknown'].includes(operation.outcome))throw new SafeError('Check the tracked IMS operation first. A previously generated document does not confirm the new operation completed.');
      await document();return json({workspace,operation,ready:true});
    }
    if(action==='refresh'){
      const count=(await provider('/gst/compliance/tax-payer/invoices/count?type_of_goods=others')).data?.all_oth;
      if(!count||typeof count!=='object')throw new SafeError('GST returned incomplete IMS counts.');
      const sections=Object.keys(imsSections).filter(section=>{const value=count[section];if(!value||Object.values(value).some(n=>typeof n!=='number'))throw new SafeError('GST returned incomplete invoice counts.');return Object.values(value).some(n=>Number(n)>0);});
      const groups=await Promise.all(sections.map(async section=>imsRows((await provider('/gst/compliance/tax-payer/invoices?section='+imsSections[section as keyof typeof imsSections])).data,section)));
      const rows=groups.flat();if(rows.length>5000)throw new SafeError('Large IMS account: use GST portal for this review. No partial list was saved.');
      return json({workspace:await saveWorkspace({invoices:rows,snapshot_hash:await digest(rows),fetched_at:new Date().toISOString()}),operation});
    }
    if(action==='poll'){
      if(!operation?.reference_id)throw new SafeError('No tracking reference is available. Check GST before repeating the previous operation.');
      const path=operation.action==='save'?'/gst/compliance/tax-payer/invoices/status':'/gst/compliance/tax-payer/gstrs/gstr-2b/regenerate';
      const result=(await provider(path+'?reference_id='+encodeURIComponent(operation.reference_id))).data;
      if(!result||typeof result!=='object')throw new SafeError('GST returned no processing status.');
      let outcome=operation.action==='compute'?imsComputationProcessed(result):imsProcessed(result,Number(operation.approval.count));let ready=false,message:string|undefined;
      if(operation.action==='compute'&&outcome==='succeeded'){
        try{await document();ready=true;}
        catch(cause){
          // A completed generation can precede document propagation. Other failures
          // (session expiry, malformed/wrong-period data) need an actionable error,
          // not a timer that silently polls forever.
          if(cause instanceof Rejected&&cause.code==='IMS002_CD'){
            outcome='pending';message='GST completed computation, but GSTR-2B is not available yet. We will check again; do not compute it twice.';
          }else throw cause;
        }
      }
      const {data:updated,error}=await admin.from('gst_ims_operations').update({outcome,result,updated_at:new Date().toISOString()}).eq('id',operation.id).select('*').single();
      if(error)throw new SafeError('Could not save the processing outcome. Check status again.');
      return json({workspace,operation:updated,ready,message});
    }
    if(!periodIsClosed(year,month))throw new SafeError('This return period has not ended in India.');
    if(env.GST_RETURN_WRITES_ENABLED!=='true')throw new SafeError('Live GST writes are currently unavailable. Complete IMS on the official portal, then check GSTR-2B here.');
    const history=await fetchFilingHistory(env,locked,auth.user.id+':'+business.id,year,month),block=filingBlock(history,'gstr-3b');
    if(block)throw new SafeError(block.message);
    if(operation&&['started','pending','unknown'].includes(operation.outcome))throw new SafeError('Check the previous IMS operation before sending another request. Do not repeat an uncertain write.');
    const {count,error:limitError}=await admin.from('gst_ims_operations').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',new Date(Date.now()-3600000).toISOString());
    if(limitError||(count??0)>=40)throw new SafeError('IMS action limit reached. Try later.');
    let payload:unknown={},approval:Record<string,unknown>={period:history.period,consentVersion:'gst-ims-v1'};
    if(action==='save'){
      if(body.snapshotHash!==workspace.snapshot_hash||!workspace.fetched_at||Date.now()-Date.parse(workspace.fetched_at)>900000)throw new SafeError('Refresh IMS invoices and review the latest list before saving.');
      if(!body.choices||typeof body.choices!=='object'||Array.isArray(body.choices))throw new SafeError('Choose invoice decisions.');
      payload=imsSavePayload(locked.gstin,workspace.invoices,body.choices);
      const selected=(workspace.invoices as ImsInvoice[]).filter(row=>body.choices[row.id]);
      await Promise.all([...new Set(selected.map(row=>row.section))].map(async section=>{const fresh=imsRows((await provider('/gst/compliance/tax-payer/invoices?section='+imsSections[section as keyof typeof imsSections])).data,section);for(const row of selected.filter(row=>row.section===section)){const next=fresh.find(item=>item.id===row.id);if(!next||await digest(next)!==await digest(row))throw new SafeError('A supplier changed an invoice or an action changed. Refresh IMS and review again.');}}));
      approval={...approval,count:selected.length,choices:body.choices,snapshotHash:body.snapshotHash};
    }
    const {data:created,error}=await admin.from('gst_ims_operations').insert({workspace_id:workspace.id,user_id:auth.user.id,action,approval}).select('*').single();
    if(error)throw new SafeError('Could not record your approval. No GST write was sent.');
    operationId=created.id;writeStarted=true;
    const result=(await provider(action==='save'?'/gst/compliance/tax-payer/invoices/status/save':`/gst/compliance/tax-payer/gstrs/gstr-2b/${year}/${String(month).padStart(2,'0')}/regenerate`,payload)).data;
    if(typeof result?.reference_id!=='string'||!result.reference_id)throw new SafeError('No tracking reference was returned. Check GST before repeating the operation.');
    const {data:updated,error:updateError}=await admin.from('gst_ims_operations').update({outcome:'pending',reference_id:result.reference_id,updated_at:new Date().toISOString()}).eq('id',operationId).select('*').single();
    if(updateError)throw new SafeError('GST received the request but its reference could not be saved. Check GST before retrying.');
    writeStarted=false;operation=updated;
    return json({workspace,operation});
  }catch(cause){
    if(writeStarted&&operationId)await admin.from('gst_ims_operations').update({outcome:cause instanceof Rejected?'failed':'unknown',result:{err_msg:cause instanceof SafeError?cause.message:'The GST request outcome is not confirmed.',...(cause instanceof Rejected?{err_cd:cause.code}:{})},updated_at:new Date().toISOString()}).eq('id',operationId);
    return json({error:cause instanceof SafeError||cause instanceof PurchaseError?cause.message:'IMS could not be completed. Refresh its status; no write was automatically repeated.',...(cause instanceof Rejected?{code:cause.code}:{})},502);
  }finally{if(connectionId&&lockId)await admin.from('gst_connections').update({lock_id:null,locked_until:null}).eq('id',connectionId).eq('lock_id',lockId);}
});
