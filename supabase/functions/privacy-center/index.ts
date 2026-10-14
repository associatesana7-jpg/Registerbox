import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { corsHeaders, json } from '../_shared/http.ts';
import { PRIVACY_NOTICE_VERSION, PRIVACY_PURPOSES, PRIVACY_RIGHTS, privacyPurposeNotices, validatePrivacyDetails } from '../_shared/privacy-domain.ts';

const fields='id,kind,details,status,created_at,target_at,resolved_at,response';
Deno.serve(async request => {
  if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  const env=Deno.env.toObject(),authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return json({error:'Sign in to manage your privacy choices.'},401);
  const client=createClient(env.SUPABASE_URL!,env.SUPABASE_ANON_KEY!,{global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError||!auth.user)return json({error:'Sign in again to verify the account.'},401);
  const admin=createClient(env.SUPABASE_URL!,env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const raw=await request.text();if(raw.length>12000)return json({error:'Privacy request is too large.'},413);
    const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid privacy request.'},400);
    const userId=auth.user.id;
    if(body.action==='state'){
      const results=await Promise.all([
        client.from('privacy_purpose_preferences').select('purpose,allowed,notice_version,changed_at,language').eq('user_id',userId),
        client.from('privacy_consent_events').select('id,purpose,allowed,notice_version,language,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(30),
        client.from('privacy_rights_requests').select(fields).eq('user_id',userId).order('created_at',{ascending:false}).limit(30),
        client.from('privacy_processor_tasks').select('id,purpose,status,target_at,response,retained_until').eq('user_id',userId).order('created_at',{ascending:false}).limit(30),
      ]);
      if(results.some(r=>r.error))throw Error('Could not load privacy controls. No permission was assumed.');
      return json({noticeVersion:PRIVACY_NOTICE_VERSION,preferences:results[0].data,events:results[1].data,requests:results[2].data,processorTasks:results[3].data});
    }
    if(body.action==='preference'){
      if(!PRIVACY_PURPOSES.includes(body.purpose)||typeof body.allowed!=='boolean'||!['en','hi'].includes(body.language))return json({error:'Choose a valid privacy purpose and language.'},400);
      if(body.noticeVersion!==PRIVACY_NOTICE_VERSION||body.confirmed!==true)return json({error:'Read the current purpose notice and confirm this choice.'},400);
      if(body.allowed&&body.isAdult!==true)return json({error:'Under-18 or lawful-guardian access needs verified consent. It cannot be enabled by a self-service checkbox.'},403);
      const {data:existing,error:readError}=await client.from('privacy_purpose_preferences').select('changed_at').eq('user_id',userId).eq('purpose',body.purpose).maybeSingle();
      if(readError)throw Error('Could not check the current preference.');
      const values={user_id:userId,purpose:body.purpose,allowed:body.allowed,notice_version:PRIVACY_NOTICE_VERSION,notice_snapshot:privacyPurposeNotices[body.purpose as keyof typeof privacyPurposeNotices][body.language as 'en'|'hi'],language:body.language,adult_declaration:body.isAdult===true};
      // An explicit withdrawal is always honoured. Grants use a revision check
      // to prevent an old screen from silently undoing a newer withdrawal.
      if(body.allowed&&existing&&body.expectedChangedAt!==existing.changed_at)return json({error:'Privacy choice changed on another device. Reload before giving consent.'},409);
      const result=existing
        ? await admin.from('privacy_purpose_preferences').update(values).eq('user_id',userId).eq('purpose',body.purpose).eq('changed_at',existing.changed_at).select('purpose,allowed,notice_version,changed_at,language').maybeSingle()
        : await admin.from('privacy_purpose_preferences').insert(values).select('purpose,allowed,notice_version,changed_at,language').single();
      if(result.error?.code==='23505'||!result.data&&!result.error)return json({error:'Privacy choice changed. Reload and retry your choice.'},409);
      if(result.error)throw Error('Could not save your privacy choice. No permission was assumed.');
      return json({preference:result.data,noticeVersion:PRIVACY_NOTICE_VERSION});
    }
    if(body.action==='request'){
      if(!PRIVACY_RIGHTS.includes(body.kind)||body.confirmed!==true)return json({error:'Choose and confirm the privacy request.'},400);
      const details=validatePrivacyDetails(body.details,body.kind!=='access');
      const {data:recent,error:recentError}=await client.from('privacy_rights_requests').select('id').eq('user_id',userId).gte('created_at',new Date(Date.now()-86400000).toISOString());
      if(recentError)throw Error('Could not check request limits.');
      if((recent?.length??0)>=10)return json({error:'Request limit reached. Email registerbox@yahoo.com for urgent help.'},429);
      const {data,error}=await admin.from('privacy_rights_requests').insert({user_id:userId,kind:body.kind,details,last_actor_id:userId}).select(fields).single();
      if(error?.code==='23505')return json({error:'An open request of this type exists. Check its status.'},409);
      if(error)throw Error('Could not record the request. Email registerbox@yahoo.com.');
      return json({request:data,contact:'registerbox@yahoo.com'});
    }
    if(['operator_list','operator_response','operator_processor_response'].includes(body.action)){
      const {data:staff,error:staffError}=await admin.from('staff_profiles').select('status').eq('user_id',userId).maybeSingle();
      const {data:roles,error:rolesError}=await admin.from('staff_roles').select('roles(key)').eq('staff_user_id',userId);
      const allowed=!staffError&&!rolesError&&staff?.status==='active'&&(roles??[]).some((r:any)=>['SUPER_ADMIN','SECURITY_ADMIN'].includes(r.roles?.key));
      if(!allowed)return json({error:'Active privacy/security operator access is required.'},403);
      if(body.action==='operator_list'){
        const results=await Promise.all([
          admin.from('privacy_rights_requests').select(fields+',user_id,resolution_evidence').order('created_at',{ascending:false}).limit(100),
          admin.from('privacy_deletion_requests').select('id,user_id,scope,status,created_at,target_at,details,response').in('status',['pending','processing']).order('target_at').limit(100),
          admin.from('privacy_processor_tasks').select('id,user_id,purpose,status,target_at,response,evidence,retained_until').in('status',['pending','processing']).order('target_at').limit(100),
        ]);
        if(results.some(r=>r.error))throw Error('Could not load the privacy queue.');
        return json({requests:results[0].data,deletions:results[1].data,processorTasks:results[2].data,contact:'registerbox@yahoo.com'});
      }
      if(body.action==='operator_processor_response'){
        if(typeof body.taskId!=='string'||!['processing','completed','retained'].includes(body.status))return json({error:'Choose a valid processor task and status.'},400);
        const response=validatePrivacyDetails(body.response,true),evidence=validatePrivacyDetails(body.evidence,true);
        let retainedUntil=null,legalBasis=null;
        if(body.status==='retained'){
          legalBasis=validatePrivacyDetails(body.legalBasis,true);
          if(typeof body.retainedUntil!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.retainedUntil)||!Number.isFinite(Date.parse(body.retainedUntil))||new Date(body.retainedUntil).toISOString().slice(0,10)!==body.retainedUntil||Date.parse(body.retainedUntil)<Date.now())return json({error:'Give a valid future retention end date and the applicable legal basis.'},400);
          retainedUntil=body.retainedUntil;
        }
        const {data:current,error:currentError}=await admin.from('privacy_processor_tasks').select('id,status').eq('id',body.taskId).single();
        if(currentError||!current)return json({error:'Processor task not found.'},404);
        if(!['pending','processing'].includes(current.status))return json({error:'This task is resolved. Record a separate review rather than overwriting the evidence.'},409);
        const result=await admin.from('privacy_processor_tasks').update({status:body.status,response:response+'\nPrivacy contact: registerbox@yahoo.com',evidence,legal_basis:legalBasis,retained_until:retainedUntil,last_actor_id:userId,resolved_at:body.status==='processing'?null:new Date().toISOString()}).eq('id',current.id).eq('status',current.status).select('id,purpose,status,target_at,response,retained_until').maybeSingle();
        if(result.error)throw Error('Could not save processor follow-up evidence.');
        if(!result.data)return json({error:'Processor task changed. Reload before responding.'},409);
        return json({task:result.data});
      }
      if(typeof body.requestId!=='string'||!['processing','needs_information','resolved','declined'].includes(body.status))return json({error:'Choose a valid case and status.'},400);
      const response=validatePrivacyDetails(body.response,true),evidence=validatePrivacyDetails(body.evidence,true);
      const {data:current,error:currentError}=await admin.from('privacy_rights_requests').select('id,status').eq('id',body.requestId).single();
      if(currentError||!current)return json({error:'Privacy case was not found.'},404);
      if(['resolved','declined'].includes(current.status))return json({error:'This resolved case is immutable. Record a new request for further review.'},409);
      const result=await admin.from('privacy_rights_requests').update({status:body.status,response:response+'\nPrivacy contact: registerbox@yahoo.com',resolution_evidence:evidence,last_actor_id:userId,resolved_at:['resolved','declined'].includes(body.status)?new Date().toISOString():null}).eq('id',current.id).eq('status',current.status).select(fields).maybeSingle();
      if(result.error)throw Error('Could not save the case response.');
      if(!result.data)return json({error:'The case changed. Reload before responding.'},409);
      return json({request:result.data});
    }
    return json({error:'Unsupported privacy action.'},400);
  } catch(error){
    return json({error:error instanceof Error&&error.message.startsWith('Could not')?error.message:error instanceof Error&&/Describe|Do not include/.test(error.message)?error.message:'Privacy operation failed. No automatic retry or deletion was made.'},400);
  }
});
