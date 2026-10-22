import {linkEcommerceAmendments,type FiledGstArchive} from '../_shared/gst-amendment-links.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { corsHeaders, json } from '../_shared/http.ts';
import { decryptToken, periodIsClosed, validPeriod } from '../gst-workspace/domain.ts';
import { VERSION, DECLARATIONS, object, hash, unwrap, assertIdentity, validateDraft, reconcile } from './validation.ts';
import { isNil, reviewNil, nilFilingPayload } from './nil.ts';
import { paymentContext, preparePayment } from '../_shared/gst-payment.ts';
import {fetchFilingHistory,filingBlock} from '../_shared/gst-filing-history.ts';
import { validFilingOtp } from '../_shared/gst-filing-otp.ts';
import { unpack2b } from '../_shared/gst-purchases.ts';
import { portal3bPaymentState, portal3bPreparation, portal3bHasZeroEcommerce, portal3bHasPayments, portal3bOffsetComplete } from '../_shared/gst-portal-resume.ts';

class SafeError extends Error {}
class Rejected extends SafeError {
  constructor(message: string, readonly providerCode?: string) { super(message); }
}
const writeActions = ['save','proceed','offset','evc','file'];
const knownActions = ['signatories','save_signatory','remove_signatory','list','history','draft','save','proceed','poll','reconcile','recover_nil','recover_ims','resume_portal','ledger','preview_offset','offset','evc','file'];
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok',{headers:corsHeaders});
  if (request.method !== 'POST') return json({error:'Method not allowed.'},405);
  const env = Deno.env.toObject();
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({error:'Please sign in.'},401);
  const client = createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError} = await client.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) return json({error:'Please sign in again.'},401);
  const admin = createClient(env.SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!);
  const writesEnabled = env.GST_RETURN_WRITES_ENABLED === 'true';
  let lockId: string | undefined, connectionId: string | undefined, operationId: string | undefined, uncertain = false;
  let draftId: string | undefined;
  let providerRequestId:string|undefined;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1048576) return json({error:'Import a JSON file smaller than 1 MB.'},413);
    const body = object(JSON.parse(raw));
    const action = String(body.action);
    if (!knownActions.includes(action)) return json({error:'Unsupported return action.'},400);
    const {data:business,error:businessError} = await client.from('business_profiles').select('id,user_id').eq('id',body.businessId).is('deleted_at',null).maybeSingle();
    if (businessError || business?.user_id !== auth.user.id) return json({error:'Only the business owner can manage GST returns.'},403);
    const {data:connection,error:connectionError} = await admin.from('gst_connections').select('*').eq('user_id',auth.user.id).eq('business_id',business.id).single();
    if (connectionError || !connection?.gstin) throw new SafeError('Connect GST before preparing a return.');
    connectionId = connection.id;
    if (['signatories','save_signatory','remove_signatory'].includes(action)) {
      if (body.gstin !== connection.gstin) throw new SafeError('GST account changed. Reload before managing saved signatories.');
      const scope = {user_id:auth.user.id,business_id:business.id,gstin:connection.gstin};
      if (action !== 'signatories') {
        if (body.consent !== true || body.consentAction !== action || body.consentVersion !== VERSION) throw new SafeError('Confirm this saved-signatory change.');
        if (action === 'save_signatory') {
          const name = typeof body.name === 'string' ? body.name.trim() : '';
          const pan = typeof body.pan === 'string' ? body.pan.trim().toUpperCase() : '';
          if (!name || name.length > 100 || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) throw new SafeError('Enter a name and valid personal PAN for the authorized signatory.');
          const {error} = await admin.from('gst_saved_signatories').upsert({...scope,name,pan},{onConflict:'user_id,business_id,gstin,pan'});
          if (error) throw new SafeError('Could not save signatory details. Try again.');
        } else {
          if (typeof body.signatoryId !== 'string') throw new SafeError('Select a saved signatory to remove.');
          const {error} = await admin.from('gst_saved_signatories').delete().match(scope).eq('id',body.signatoryId);
          if (error) throw new SafeError('Could not remove saved signatory. Try again.');
        }
      }
      const {data,error} = await admin.from('gst_saved_signatories').select('id,name,pan').match(scope).order('name');
      if (error) throw new SafeError('Could not load saved signatories. Try again.');
      return json({signatories:data,writesEnabled});
    }
    if(action==='history'){
      if(!validPeriod(body.year,body.month))throw new SafeError('Choose a valid period to check filing history.');
      try{return json({history:await fetchFilingHistory(env,connection,auth.user.id+':'+business.id,Number(body.year),Number(body.month)),writesEnabled});}
      catch{throw new SafeError('Could not verify GST portal filing history. Reconnect if expired, then retry. Filing status is unknown.');}
    }
    if (action === 'list') {
      const {data:rows,error} = await admin.from('gst_return_drafts').select('*').eq('user_id',auth.user.id).eq('business_id',business.id).eq('gstin',connection.gstin).order('updated_at',{ascending:false}).limit(36);
      if (error) throw new SafeError('Could not load saved return drafts.');
      return json({drafts:rows,gstin:connection.gstin,writesEnabled,consentVersion:VERSION});
    }
    if (body.consent !== true || body.consentVersion !== VERSION || body.consentAction !== action) return json({error:'Review and approve this specific action first.'},400);
    if (writeActions.includes(action) && !writesEnabled) return json({error:'Live GST writes are release-locked pending end-to-end acceptance. Drafts and read-only reconciliation are available; no return was submitted.'},409);
    lockId = crypto.randomUUID();
    const {data:locked,error:lockError} = await admin.from('gst_connections').update({lock_id:lockId,locked_until:new Date(Date.now()+180000).toISOString()}).eq('id',connection.id).or('locked_until.is.null,locked_until.lt.'+new Date().toISOString()).select('*').maybeSingle();
    if (lockError || !locked) return json({error:'Another GST operation is running. Wait before trying again.'},409);
    if (locked.gstin !== connection.gstin) throw new SafeError('The GST connection changed. Reload this workspace.');
    const {count,error:rateError} = await admin.from('gst_return_operations').select('id',{count:'exact',head:true}).eq('user_id',auth.user.id).gte('created_at',new Date(Date.now()-3600000).toISOString());
    if (rateError || (count ?? 0) >= 100) throw new SafeError('GST request limit reached. Try later.');
    const {data:found,error:findError} = action === 'draft'
      ? await admin.from('gst_return_drafts').select('*').eq('business_id',business.id).eq('gstin',locked.gstin).eq('form',body.form).eq('year',body.year).eq('month',body.month).maybeSingle()
      : await admin.from('gst_return_drafts').select('*').eq('id',body.draftId).eq('user_id',auth.user.id).eq('business_id',business.id).eq('gstin',locked.gstin).single();
    if (findError) throw new SafeError('Return draft could not be loaded.');
    let draft = found;
    const amendmentEvidence=async(payload:Record<string,unknown>)=>{
      if(payload.ecoma===undefined)return null;
      const {data:archives,error}=await admin.from('gst_return_drafts').select('id,gstin,form,year,month,state,acknowledgement,payload,payload_hash,snapshot,snapshot_hash,reconciliation').eq('user_id',auth.user.id).eq('business_id',business.id).eq('gstin',locked.gstin).eq('form','gstr-1').eq('state','filed').limit(601);
      if(error||!archives||archives.length>600)throw new SafeError('Could not load complete filed amendment history. No original was assumed.');
      for(const archive of archives){if((archive.payload?.ecom||archive.payload?.ecoma)&&(await hash(archive.payload)!==archive.payload_hash||!archive.snapshot||await hash(archive.snapshot)!==archive.snapshot_hash))throw new SafeError('Filed ecommerce evidence failed its integrity check. Verify the original archive.');}
      return linkEcommerceAmendments(payload,archives as FiledGstArchive[]);
    };
    if (action === 'draft') {
      if (!validPeriod(body.year,body.month)) throw new SafeError('Choose a valid tax period.');
      try{const history=await fetchFilingHistory(env,locked,auth.user.id+':'+business.id,Number(body.year),Number(body.month));const blocked=filingBlock(history,String(body.form));if(blocked)throw new SafeError(blocked.message);}catch(e){if(e instanceof SafeError)throw e;throw new SafeError('Cannot verify whether this return was already filed. Check portal history before saving a new filing draft.');}
      if (draft && !['draft','blocked'].includes(draft.state)) throw new SafeError('This version already has a GST operation. Resolve it before editing.');
      if (draft && body.revision !== draft.revision) throw new SafeError('This draft changed on another device. Reload it.');
      const period = String(body.month).padStart(2,'0')+body.year;
      let payload;
      try { payload = validateDraft(body.payload,String(body.form),locked.gstin,period); } catch (cause) { throw new SafeError(cause instanceof Error ? cause.message : 'Invalid draft.'); }
      const sourceEvidence=await amendmentEvidence(payload);
      const values = {source_evidence:sourceEvidence,user_id:auth.user.id,business_id:business.id,gstin:locked.gstin,form:body.form,year:body.year,month:body.month,payload,payload_hash:await hash(payload),revision:(draft?.revision ?? 0)+1,state:'draft',reference_id:null,snapshot:null,snapshot_hash:null,snapshot_at:null,reconciliation:null,signatory_pan:null,otp_sent_at:null,acknowledgement:null,last_error:null,updated_at:new Date().toISOString()};
      const result = draft ? await admin.from('gst_return_drafts').update(values).eq('id',draft.id).eq('revision',draft.revision).select('*').single() : await admin.from('gst_return_drafts').insert(values).select('*').single();
      if (result.error) throw new SafeError('Could not save this draft. Reload before retrying.');
      draft = result.data;
    }
    if (!draft) throw new SafeError('Choose a saved draft.');
    draftId = draft.id;
    if (!periodIsClosed(draft.year,draft.month) && (isNil(draft.payload)
      ? ['reconcile','proceed','resume_portal','evc','file'].includes(action)
      : ['evc','file'].includes(action))) {
      throw new SafeError('This tax period is still open. Keep the draft, then reconcile and file after the month ends in India.');
    }
    const expectedHash = ['evc','file'].includes(action) && !isNil(draft.payload) ? draft.snapshot_hash : draft.payload_hash;
    if (action !== 'draft' && (body.revision !== draft.revision || body.approvedHash !== expectedHash)) throw new SafeError('Your approval does not match the current return version. Review it again.');
    const declaration = isNil(draft.payload) && ['evc','file'].includes(action)
      ? (action === 'evc' ? 'I confirm this exact nil declaration against my complete books and authorize sending the signatory filing OTP.' : 'I confirm this exact GSTIN, period and nil declaration are true and complete, and authorize filing using this OTP.')
      : DECLARATIONS[action];
    const {data:operation,error:operationError} = await admin.from('gst_return_operations').insert({draft_id:draft.id,user_id:auth.user.id,revision:draft.revision,action,consent_version:VERSION,approved_hash:expectedHash ?? draft.payload_hash,declaration}).select('id').single();
    if (operationError) throw new SafeError('Could not record your approval. No GST request was sent.');
    operationId = operation.id;
    const update = async (values: Record<string,unknown>) => {
      const {data,error} = await admin.from('gst_return_drafts').update({...values,updated_at:new Date().toISOString()}).eq('id',draft.id).eq('revision',draft.revision).select('*').single();
      if (error) throw new SafeError('Could not persist GST state. Do not repeat the operation; reload and check status.');
      draft = data;
    };
    const done = async (extra: Record<string,unknown> = {}) => {
      const {error} = await admin.from('gst_return_operations').update({outcome:'succeeded',reference_id:draft.reference_id}).eq('id',operationId!);
      if (error) throw new SafeError('Could not finish the audit record. Reload and check status.');
      return json({draft,writesEnabled,...extra});
    };
    if (action === 'draft') return await done();
    const zeroPortalEcommerce=draft.source_evidence?.version==='gst-portal-resume-v1'&&draft.form==='gstr-3b'&&portal3bHasZeroEcommerce(draft.payload);
    if (writeActions.includes(action) && (draft.payload.supeco !== undefined || draft.payload.supecoa !== undefined || draft.payload.ecom !== undefined || draft.payload.ecoma !== undefined || (draft.payload.eco_dtls !== undefined&&!zeroPortalEcommerce)) && env.GST_ECOMMERCE_WRITES_ENABLED !== 'true') throw new SafeError('Platform figures are saved in your draft. Ecommerce portal submission is awaiting provider acceptance testing.');
    if(writeActions.includes(action)&&draft.payload.ecoma!==undefined){
      const linked=await amendmentEvidence(draft.payload);
      if(!linked?.matched)throw new SafeError('Resolve every amendment original before sending this return to GST.');
      if(!draft.source_evidence?.matched||await hash(linked.links)!==await hash(draft.source_evidence.links))throw new SafeError('Amendment evidence changed. Save and review this draft again.');
      if(!linked.portalHistoryVerified)throw new SafeError('Original amounts are linked to app archives. Complete GST amendment history verification is still required before portal submission.');
    }
    if(writeActions.includes(action)||['recover_nil','recover_ims','resume_portal'].includes(action)){
      let history;try{history=await fetchFilingHistory(env,locked,auth.user.id+':'+business.id,draft.year,draft.month);}catch{throw new SafeError('Cannot verify portal filing status. No GST write was sent. Reconnect and check history.');}
      const blocked=filingBlock(history,draft.form);
      if(blocked){
        if(blocked.record.status.toLowerCase()==='filed')await update({state:'filed',acknowledgement:blocked.record.arn,otp_sent_at:null,last_error:'Confirmed already filed on GST portal; no duplicate request sent.'});
        throw new SafeError(blocked.message);
      }
      if(draft.form==='gstr-3b'&&(isNil(draft.payload)||['evc','file'].includes(action))&&!history.records.some(row=>row.form==='GSTR1'&&row.status.trim().toLowerCase()==='filed'))throw new SafeError('GST has not confirmed GSTR-1 filed for this period. Complete it before authorizing GSTR-3B.');
    }
    if (locked.status !== 'linked' || !locked.token_ciphertext || Date.parse(locked.expires_at) <= Date.now()) throw new SafeError('GST session expired. Reconnect with login OTP. Your draft is saved.');
    const legacy = Object.keys(env).find((name)=>/^key_live_[a-z0-9]+$/i.test(name));
    const key = env.SANDBOX_API_KEY ?? legacy;
    const secret = env.SANDBOX_API_SECRET ?? (legacy ? env[legacy] : undefined);
    if (!key?.startsWith('key_live_') || !secret) throw new SafeError('Sandbox live credentials are missing.');
    const token = await decryptToken(locked.token_ciphertext,env.GST_TOKEN_ENCRYPTION_KEY || secret,auth.user.id+':'+business.id).catch(()=>{throw new SafeError('Reconnect GST after credential rotation.');});
    const provider = async (path: string,payload?: unknown) => {
      const response = await fetch('https://api.sandbox.co.in'+path,{method:payload === undefined ? 'GET':'POST',headers:{authorization:token,'x-api-key':key,'x-api-version':'1.0.0','Content-Type':'application/json','x-source':'primary'},body:payload === undefined ? undefined : JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
      const value = await response.json();
      if(typeof value.transaction_id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value.transaction_id))providerRequestId=value.transaction_id;
      if (response.status >= 500) throw new SafeError('GST provider is unavailable. Check status before retrying.');
      if (!response.ok || value.code >= 400 || String(value.data?.status_cd) === '0' || value.data?.error) {
        const details = [value.data?.error?.message,value.data?.error_message,value.data?.message,value.message,typeof value.data?.error === 'string' ? value.data.error : null];
        const reason = details.find((item) => typeof item === 'string' && item.trim()) as string | undefined;
        const safeReason = reason?.replace(/[\r\n\t]/g,' ').replace(/\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{6}\b/g,'[redacted]').slice(0,240);
        const errorCode = value.data?.error?.error_cd ?? (Number(value.code) >= 400 ? value.code : undefined);
        const code = errorCode && /^[A-Za-z0-9_-]{1,40}$/.test(String(errorCode)) ? ` (${errorCode})` : '';
        throw new Rejected('GST rejected the request'+code+(safeReason ? ': '+safeReason : '. Check this period and your GST portal account before retrying.'),String(errorCode ?? ''));
      }
      if (!value.data) throw new SafeError('GST returned an unexpected response.');
      return value.data;
    };
    const base = '/gst/compliance/tax-payer/gstrs/'+draft.form+'/'+draft.year+'/'+String(draft.month).padStart(2,'0');
    const period = String(draft.month).padStart(2,'0')+draft.year;
    const snapshot = async () => {
      const value = unwrap(await provider(base+(draft.form === 'gstr-1' ? '?summary_type=long':'')));
      assertIdentity(value,draft.gstin,period);
      if(draft.form==='gstr-1'&&!isNil(draft.payload)){
        const sections:Record<string,unknown>={};
        await Promise.all(['b2cs','cdnr','exp','nil','doc_issue','supeco','ecom','ecoma'].filter(key=>draft.payload[key]!==undefined).map(async key=>{
          const document=unwrap(await provider('/gst/compliance/tax-payer/gstrs/gstr-1/'+(key==='doc_issue'?'doc-issue':key)+'/'+draft.year+'/'+String(draft.month).padStart(2,'0')));
          if(document.gstin!==undefined&&document.gstin!==draft.gstin)throw new SafeError('GST section belongs to a different account.');
          if(document.fp!==undefined&&document.fp!==period)throw new SafeError('GST section belongs to a different period.');
          if(document[key]===undefined)throw new SafeError('GST did not return the complete '+key.toUpperCase()+' section.');
          sections[key]=document[key];
        }));
        value.registerbox_sections=sections;
      }
      return value;
    };
    const confirmedOffset=()=>draft.source_evidence?.paymentConfirmation?.payloadHash===draft.payload_hash;
    const offsetComplete=(value:Record<string,unknown>)=>portal3bOffsetComplete(value,confirmedOffset());
    const recordOffsetConfirmation=async()=>{
      await update({source_evidence:{...draft.source_evidence,pendingOperation:null,paymentConfirmation:{payloadHash:draft.payload_hash,acceptedAt:new Date().toISOString()}}});
    };
    const mutate = async (path: string,payload: unknown) => {
      await update({state:'unknown',reference_id:null,source_evidence:{...draft.source_evidence,pendingOperation:{action,payloadHash:draft.payload_hash,startedAt:new Date().toISOString()}},last_error:'Operation started. If interrupted, check GST status; do not repeat it.'});
      uncertain = true;
      const result = await provider(path,payload);
      return result;
    };
    const reference = (response: unknown) => {
      const data = unwrap(response);
      if (typeof data.reference_id !== 'string' || !data.reference_id) throw new SafeError('No GST tracking reference returned. Do not repeat this operation.');
      return data.reference_id;
    };
    if(action==='recover_ims'){
      if(draft.form!=='gstr-3b'||draft.state!=='blocked'||!String(draft.last_error).includes('(IMS002_CD)'))throw new SafeError('This return does not have a confirmed GSTR-2B generation rejection. Refresh its status.');
      try{unpack2b(await provider('/gst/compliance/tax-payer/gstrs/gstr-2b/'+draft.year+'/'+String(draft.month).padStart(2,'0')),draft.gstin,period);}catch{throw new SafeError('GSTR-2B is not available for this period yet. Complete IMS computation, then refresh.');}
      if(!isNil(draft.payload)){
        const latest=await snapshot(),comparison=reconcile(draft.payload,latest,draft.form),checkedAt=new Date().toISOString(),snapshotHash=await hash(latest);
        const paymentState=portal3bPaymentState(latest),paymentComplete=offsetComplete(latest);
        // A recomputed 2B can change the portal's ITC. Preserve the approved
        // private return, expose differences, and never save/offset implicitly.
        await update({state:comparison.matched&&paymentComplete?'prepared':'saved',snapshot:latest,snapshot_hash:snapshotHash,snapshot_at:checkedAt,reconciliation:comparison,
          source_evidence:{...draft.source_evidence,imsRecovery:{checkedAt,previousError:draft.last_error,snapshotHash,matched:comparison.matched}},
          last_error:null,otp_sent_at:null,signatory_pan:null,reference_id:null});
        return await done({imsRecovered:true,paymentState,creditPostingRequired:paymentState==='settled'&&!paymentComplete,reviewRequired:!comparison.matched});
      }
      await update({state:'prepared',last_error:null,otp_sent_at:null,signatory_pan:null});
      return await done();
    }
    if(action==='resume_portal'){
      if(draft.form!=='gstr-3b'||!periodIsClosed(draft.year,draft.month))throw new SafeError('Choose a closed GSTR-3B period.');
      if(!['draft','saved','prepared','otp_sent','blocked'].includes(draft.state))throw new SafeError('The previous GST operation is still processing or its outcome is unknown. Check that operation before importing portal data.');
      const latest=await snapshot();
      let payload;try{payload=portal3bPreparation(latest);}catch(e){throw new SafeError((e as Error).message);}
      const paymentState=portal3bPaymentState(latest),checkedAt=new Date().toISOString();
      const previousDraft=draft.source_evidence?.version==='gst-portal-resume-v1'?draft.source_evidence.previousDraft:{revision:draft.revision,payload:draft.payload,payloadHash:draft.payload_hash,lastError:draft.last_error??null,sourceEvidence:draft.source_evidence??null};
      const payloadHash=await hash(payload);
      const sameApprovedReturn=payloadHash===draft.payload_hash;
      const paymentComplete=portal3bOffsetComplete(latest,confirmedOffset()&&sameApprovedReturn);
      const sourceEvidence={version:'gst-portal-resume-v1',scope:'gst_portal',checkedAt,paymentState,previousDraft,
        ...(paymentComplete&&confirmedOffset()&&sameApprovedReturn?{paymentConfirmation:draft.source_evidence.paymentConfirmation}:{})};
      await update({payload,payload_hash:await hash(payload),revision:draft.revision+1,source_evidence:sourceEvidence,
        state:paymentComplete?'prepared':'saved',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:checkedAt,
        reconciliation:{matched:true,differences:[],scope:'Figures imported from the saved GST portal return. Review them against your books before approving filing.'},
        otp_sent_at:null,signatory_pan:null,reference_id:null,last_error:null});
      return await done({paymentState,creditPostingRequired:paymentState==='settled'&&!paymentComplete});
    }
    if (action === 'save') {
      if (isNil(draft.payload)) throw new SafeError('Nil returns do not use the invoice-save step. Review nil eligibility first.');
      if (draft.state !== 'draft') throw new SafeError('Only an unsent draft can be saved to GST.');
      const data = await mutate(base,draft.payload);
      await update({state:'save_pending',reference_id:reference(data),last_error:null}); uncertain=false; return await done();
    }
    if (action === 'poll') {
      if(draft.state==='unknown'&&draft.form==='gstr-3b'&&draft.source_evidence?.pendingOperation?.action==='offset'&&draft.source_evidence.pendingOperation.payloadHash===draft.payload_hash){
        const latest=await snapshot(),comparison=reconcile(draft.payload,latest,draft.form);
        // Recover only from fresh authoritative posting evidence. A timeout
        // does not make it safe to spend the same ledger balance a second time.
        if(portal3bOffsetComplete(latest)){
          await recordOffsetConfirmation();
          await update({state:'prepared',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:new Date().toISOString(),reconciliation:comparison,last_error:null,otp_sent_at:null,signatory_pan:null});
        }
        return await done({paymentState:portal3bPaymentState(latest),paymentOutcomePending:draft.state==='unknown'});
      }
      if(draft.state==='offset_pending'&&!draft.reference_id&&confirmedOffset()){
        const latest=await snapshot(),comparison=reconcile(draft.payload,latest,draft.form);
        if(offsetComplete(latest))await update({state:'prepared',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:new Date().toISOString(),reconciliation:comparison,last_error:null});
        return await done({paymentState:portal3bPaymentState(latest)});
      }
      if (!['save_pending','proceed_pending','offset_pending','unknown'].includes(draft.state) || !draft.reference_id) throw new SafeError('No trackable GST operation. If its outcome is unknown, inspect the GST portal before any further action.');
      // Older clients poll accepted nil initialization. Resume to EVC without
      // querying the save-status endpoint, which may return RET13510 here.
      // This is permission to request OTP, never confirmation of filing.
      if (isNil(draft.payload) && draft.form === 'gstr-1' && draft.state === 'proceed_pending') {
        validateDraft(draft.payload,draft.form,draft.gstin,period);
        await update({state:'prepared',last_error:null});
        return await done();
      }
      const result = unwrap(await provider('/gst/compliance/tax-payer/gstrs/'+draft.year+'/'+String(draft.month).padStart(2,'0')+'/status?reference_id='+encodeURIComponent(draft.reference_id)));
      if (draft.state === 'unknown') return await done({providerStatus:result});
      if(result.status_cd==='P'&&draft.state==='offset_pending'){
        await recordOffsetConfirmation();
        const latest=await snapshot(),comparison=reconcile(draft.payload,latest,draft.form);
        if(offsetComplete(latest))await update({state:'prepared',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:new Date().toISOString(),reconciliation:comparison,last_error:null});
      }
      else if (result.status_cd === 'P') await update({state:draft.state === 'save_pending' ? 'saved':'prepared',last_error:null});
      else if (['PE','ER','E'].includes(String(result.status_cd))) await update({state:'blocked',last_error:'GST reported processing errors. Review the source response and prepare a corrected draft.'});
      return await done({providerStatus:result});
    }
    const recoverReadyNil = async () => {
      validateDraft(draft.payload,draft.form,draft.gstin,period);
      // RET00003 confirms preparation, not nil eligibility. The taxpayer's
      // approved declaration supplies nil intent; GST validates the nil filing.
      // Do not invent a reconciliation or require a summary for this nil recipe.
      await update({state:'prepared',snapshot:null,snapshot_hash:null,snapshot_at:null,reconciliation:null,last_error:null});
      uncertain=false;
      return await done();
    };
    if (action === 'recover_nil') {
      if (!isNil(draft.payload)||draft.form!=='gstr-1'||draft.state!=='blocked'||!String(draft.last_error).includes('(RET00003)')) throw new SafeError('This return does not have a confirmed already-ready response to recover. Refresh its status.');
      return await recoverReadyNil();
    }
    if (action === 'proceed') {
      const nil = isNil(draft.payload);
      if (draft.form !== 'gstr-1' || draft.state !== (nil?'draft':'saved')) throw new SafeError('Complete GSTR-1 preparation before proceeding.');
      // Sandbox's nil recipe initializes the return with new-proceed. A summary
      // read before initialization can be rejected even for an eligible period.
      if (nil) validateDraft(draft.payload,draft.form,draft.gstin,period);
      let result;
      try {
        result = await mutate(base+'/new-proceed?is_nil='+(nil?'Y':'N'),{gstin:draft.gstin,ret_period:period});
      } catch (cause) {
        if (!nil || !(cause instanceof Rejected) || cause.providerCode !== 'RET00003') throw cause;
        await update({state:'blocked',last_error:cause.message});
        uncertain=false;
        return await recoverReadyNil();
      }
      await update({state:nil?'prepared':'proceed_pending',reference_id:reference(result),snapshot:null,snapshot_hash:null,snapshot_at:null,reconciliation:null,last_error:null}); uncertain=false; return await done();
    }
    if (action === 'reconcile') {
      if (!['draft','saved','prepared','otp_sent'].includes(draft.state)) throw new SafeError('Wait for processing before reconciling.');
      const value = await snapshot();
      const nil = isNil(draft.payload);
      const comparison = nil ? reviewNil(value,draft.form) : reconcile(draft.payload,value,draft.form);
      const state=!nil&&draft.form==='gstr-3b'&&['prepared','otp_sent'].includes(draft.state)&&!offsetComplete(value)?'saved':(nil && draft.form==='gstr-3b' && comparison.matched)||draft.state === 'otp_sent' ? 'prepared':draft.state;
      await update({snapshot:value,snapshot_hash:await hash(value),snapshot_at:new Date().toISOString(),reconciliation:comparison,otp_sent_at:null,signatory_pan:null,state});
      return await done();
    }
    if (['ledger','preview_offset','offset'].includes(action)) {
      if (draft.form !== 'gstr-3b' || isNil(draft.payload)) throw new SafeError('Payment allocation is only for regular GSTR-3B.');
      if (!['draft','saved'].includes(draft.state)) throw new SafeError('Payment review is unavailable while processing or after offset.');
      const latest = await snapshot();
      const comparison = reconcile(draft.payload,latest,draft.form);
      if(offsetComplete(latest)){
        await update({state:'prepared',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:new Date().toISOString(),reconciliation:comparison,otp_sent_at:null,signatory_pan:null,last_error:null});
        return await done({paymentState:'settled'});
      }
      if(portal3bPaymentState(latest)==='unconfirmed'&&portal3bHasPayments(latest))throw new SafeError('GST returned an existing payment but no complete current payable table. Refresh the saved return after portal processing; do not offset the same liability again.');
      const ledger = unwrap(await provider('/gst/compliance/tax-payer/ledgers/bal/'+draft.year+'/'+String(draft.month).padStart(2,'0')));
      let context;
      try { context = paymentContext(latest,ledger); } catch (e) { throw new SafeError((e as Error).message); }
      if (action === 'ledger') return await done({paymentContext:context,creditPostingRequired:portal3bPaymentState(latest)==='settled'});
      if (!comparison.matched) throw new SafeError('GST return differs from your draft. Reconcile the changed data before allocating payment.');
      if (body.paymentRulesReviewed !== true) throw new SafeError('Review ITC eligibility, cash-only liabilities and minimum cash restrictions first.');
      let review;
      try { review = preparePayment(context,object(body.paymentChoices),body.minimumCash as number); } catch (e) { throw new SafeError((e as Error).message); }
      const allocationHash = await hash({allocation:review.allocation,context,snapshot:latest,minimumCash:review.minimumCash});
      if (action === 'preview_offset') {
        const {error} = await admin.from('gst_return_operations').update({approved_hash:allocationHash,declaration:DECLARATIONS.preview_offset+'; allocation '+JSON.stringify(review.allocation)+'; minimum cash '+review.minimumCash}).eq('id',operationId!);
        if (error) throw new SafeError('Could not record the payment preview.');
        return await done({paymentContext:context,paymentReview:review,allocationHash});
      }
      if (draft.state !== 'saved') throw new SafeError('Wait for GST save processing before offset.');
      if (!review.ready) throw new SafeError('Cash ledger is insufficient. Fund the required heads on the GST portal, then fetch and review again.');
      if (body.allocationHash !== allocationHash) throw new SafeError('Payment, ledger or return details changed. Review a fresh allocation.');
      const {data:approval,error:approvalError} = await admin.from('gst_return_operations').select('id').eq('draft_id',draft.id).eq('revision',draft.revision).eq('action','preview_offset').eq('approved_hash',allocationHash).eq('outcome','succeeded').gte('created_at',new Date(Date.now()-900000).toISOString()).limit(1);
      if (approvalError || !approval?.length) throw new SafeError('Prepare a fresh payment preview before authorizing offset.');
      const {error} = await admin.from('gst_return_operations').update({approved_hash:allocationHash,declaration:DECLARATIONS.offset+'; allocation '+JSON.stringify(review.allocation)+'; minimum cash '+review.minimumCash}).eq('id',operationId!);
      if (error) throw new SafeError('Could not record offset approval.');
      const result = unwrap(await mutate(base+'/offset-liability',review.allocation));
      // GST may confirm synchronous payment; a reference is not always returned.
      if (typeof result.reference_id === 'string' && result.reference_id) {
        await update({state:'offset_pending',reference_id:result.reference_id,snapshot:null,snapshot_hash:null,reconciliation:null,last_error:null});
      } else if (result.Message === 'Payment of tax successfully done') {
        // Acknowledgement means the offset was accepted, not that the current
        // payable snapshot has caught up. Preserve acceptance before this read.
        await recordOffsetConfirmation();
        await update({state:'offset_pending',reference_id:null,snapshot:null,snapshot_hash:null,reconciliation:null,last_error:null});
        uncertain=false;
        const latest=await snapshot(),comparison=reconcile(draft.payload,latest,draft.form);
        if(offsetComplete(latest))await update({state:'prepared',snapshot:latest,snapshot_hash:await hash(latest),snapshot_at:new Date().toISOString(),reconciliation:comparison,last_error:null});
      } else throw new SafeError('Offset outcome is unrecognized. Check GST before repeating anything.');
      uncertain=false; return await done();
    }
    const nilReturn = isNil(draft.payload);
    let latest: Record<string,unknown> = {};
    if (nilReturn) {
      validateDraft(draft.payload,draft.form,draft.gstin,period);
      const allowed = draft.form === 'gstr-3b' ? ['draft','prepared','otp_sent'] : ['prepared','otp_sent'];
      if (action === 'evc' && draft.form === 'gstr-1' && draft.state === 'proceed_pending' && draft.reference_id) allowed.push('proceed_pending');
      if (!allowed.includes(draft.state)) throw new SafeError('Wait for nil return preparation to complete before requesting OTP.');
    } else {
      const snapshotAge=Date.now()-Date.parse(draft.snapshot_at);
      if (!draft.snapshot || !draft.snapshot_hash || !draft.reconciliation?.matched || !Number.isFinite(snapshotAge) || snapshotAge<0 || snapshotAge > 900000) throw new SafeError('Fetch and reconcile a fresh GST snapshot before filing.');
      if (body.booksReviewed !== true || body.itcReviewed !== true || body.priorReturnsReviewed !== true) throw new SafeError('Confirm books, ITC eligibility and prior-return checks before requesting filing.');
      if (!['prepared','otp_sent'].includes(draft.state)) throw new SafeError('Complete GST preparation/offset first.');
      latest = await snapshot();
      if (await hash(latest) !== draft.snapshot_hash) { await update({state:'prepared',snapshot:null,snapshot_hash:null,reconciliation:null,otp_sent_at:null}); throw new SafeError('GST data changed since review. Reconcile and approve again.'); }
      if (draft.form==='gstr-3b'&&!latest.tx_pmt) throw new SafeError('GST payment details are missing. Offset and refresh before requesting filing authorization.');
      if(draft.form==='gstr-3b'&&!offsetComplete(latest))throw new SafeError('GST has not confirmed payment / credit posting for this return. Refresh payment details and complete the offset step before requesting a filing OTP.');
    }
    if (action === 'evc') {
      if (typeof body.pan !== 'string' || !/^[A-Z]{5}\d{4}[A-Z]$/.test(body.pan)) throw new SafeError('Enter the authorized signatory PAN.');
      if (draft.otp_sent_at && Date.now()-Date.parse(draft.otp_sent_at)<60000) throw new SafeError('Wait one minute before requesting another filing OTP.');
      const response = await provider('/gst/compliance/tax-payer/evc/otp?gstr='+draft.form,{pan:body.pan});
      if (String(response.status_cd) !== '1') throw new SafeError('GST did not confirm sending a filing OTP.');
      await update({state:'otp_sent',signatory_pan:body.pan,otp_sent_at:new Date().toISOString()}); return await done();
    }
    if (action === 'file') {
      const otpAge=Date.now()-Date.parse(draft.otp_sent_at);
      if (draft.state !== 'otp_sent' || !draft.signatory_pan || !draft.otp_sent_at || !Number.isFinite(otpAge) || otpAge<0 || otpAge>600000 || !validFilingOtp(body.otp)) throw new SafeError('Request and enter the fresh GST filing code exactly as received (letters and numbers).');
      const nil = isNil(draft.payload);
      const payload = nil ? nilFilingPayload(draft.form,draft.gstin,period) : draft.form === 'gstr-1' ? {gstin:draft.gstin,ret_period:period,newSumFlag:latest.newSumFlag,sec_sum:latest.sec_sum,chksum:latest.chksum} : latest;
      if (!nil && draft.form === 'gstr-1' && (!Array.isArray(latest.sec_sum) || typeof latest.chksum !== 'string')) throw new SafeError('GST filing summary/checksum is missing.');
      if (!nil && draft.form === 'gstr-3b' && !latest.tx_pmt) throw new SafeError('GST payment details are missing. Offset and refresh first.');
      let filedResponse;
      try {
        filedResponse = await mutate(base+'/file?pan='+encodeURIComponent(draft.signatory_pan)+'&otp='+encodeURIComponent(body.otp),payload);
      } catch (cause) {
        if (!(cause instanceof Rejected) || cause.providerCode !== 'RET13506') throw cause;
        // GST explicitly rejected the EVC. No acknowledgement exists and this
        // attempt was not filed, so safely return to fresh-OTP authorization.
        await update({state:'prepared',otp_sent_at:null,last_error:null});
        uncertain=false;
        throw new SafeError('That GST filing code was expired or incorrect. Request a fresh code and try again.');
      }
      const response = unwrap(filedResponse);
      if (typeof response.ack_num !== 'string' || !response.ack_num) throw new SafeError('Filing response has no acknowledgement. Check GST before doing anything else.');
      await update({state:'filed',acknowledgement:response.ack_num,last_error:null,otp_sent_at:null}); uncertain=false; return await done();
    }
    throw new SafeError('Unsupported state transition.');
  } catch (cause) {
    const message = cause instanceof SafeError ? cause.message : 'The operation could not be completed. Reload and inspect status; no automatic retry was made.';
    if (uncertain && draftId) await admin.from('gst_return_drafts').update({state:cause instanceof Rejected ? 'blocked':'unknown',last_error:message}).eq('id',draftId);
    if (operationId) await admin.from('gst_return_operations').update({outcome:uncertain && !(cause instanceof Rejected) ? 'unknown':'failed'}).eq('id',operationId);
    return json({error:message,...(cause instanceof Rejected&&cause.providerCode?{providerCode:cause.providerCode}:{}),...(providerRequestId?{providerRequestId}:{}),...(operationId?{operationId}:{})},502);
  } finally {
    if (connectionId && lockId) await admin.from('gst_connections').update({lock_id:null,locked_until:null}).eq('id',connectionId).eq('lock_id',lockId);
  }
});
