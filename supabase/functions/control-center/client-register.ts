import type { createClient } from 'npm:@supabase/supabase-js@2.117.1';

type Admin = ReturnType<typeof createClient>;
type Access = { userId:string; permissions:Set<string> };
type Reply = (body:unknown,status?:number)=>Response;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const services=['FSSAI','LABOUR','MSME','IEC','TRADEMARK','ITR','GST','OTHER'];
const kinds=['expiry','filing','review','none'];
const docKinds=['AADHAAR','PAN','PHOTO','ELECTRICITY_BILL','RENTAL_AGREEMENT','CERTIFICATE','OTHER'];
function text(v:unknown,max=200){return typeof v==='string'?v.trim().slice(0,max):'';}
function date(v:unknown){const s=text(v,10);if(!s)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new Error('Use valid dates in YYYY-MM-DD format.');return s;}
function serviceValues(row:Record<string,unknown>){
  const service=text(row.service),registered_on=date(row.registered_on),due_on=date(row.due_on),date_kind=text(row.date_kind)||'expiry';
  if(!services.includes(service)||!kinds.includes(date_kind))throw new Error('Choose a service and date type.');
  if(due_on&&registered_on&&due_on<registered_on)throw new Error('Due date cannot precede registration.');
  if(date_kind==='none'&&due_on)throw new Error('Remove the due date when no expiry applies.');
  return {service,registration_number:text(row.registration_number,120),period:text(row.period,80),registered_on,due_on,date_kind,notes:text(row.notes,2000)};
}
function clientValues(row:Record<string,unknown>){
  const company_name=text(row.company_name),owner_name=text(row.owner_name),phone=text(row.phone,30).replace(/[^0-9]/g,''),email=text(row.email).toLowerCase();
  if(!company_name)throw new Error('Company name is required.');
  if(phone&&!/^\d{7,15}$/.test(phone))throw new Error('Enter a valid phone number.');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');
  return {company_name,owner_name,phone,email,notes:text(row.notes,2000)};
}
async function audit(admin:Admin,access:Access,action:string,id:string,details:unknown={}){
  const {error}=await admin.from('audit_events').insert({actor_id:access.userId,actor_type:'staff',action,entity_type:'admin_client',entity_id:id,new_value:details,source:'control-center-edge'});if(error)throw error;
}
async function client(admin:Admin,id:unknown){if(!uuid(id))throw new Error('Choose a client.');const r=await admin.from('admin_client_directory').select('*').eq('id',id).single();if(r.error||!r.data)throw new Error('Client unavailable.');return r.data;}
const isoDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function plusDays(day:string,n:number){return new Date(Date.parse(day)+n*86400000).toISOString().slice(0,10);}

export async function clientRegister(admin:Admin,access:Access,body:Record<string,unknown>,reply:Reply){
  if(!access.permissions.has('customer.read')||!access.permissions.has('business.read'))return reply({error:'Client access is not permitted.'},403);
  const action=body.action;
  try{
    if(action==='crm_list'){
      const page=Number(body.page||0);if(!Number.isInteger(page)||page<0||page>10000)throw new Error('Invalid page.');
      const query=text(body.query,100).replace(/[^\p{L}\p{N}\s@.+-]/gu,'');
      const filter=text(body.filter)||'all',today=isoDay();
      let q=admin.from(filter==='all'?'admin_client_directory':'admin_renewal_watch').select('*',{count:'exact'});
      if(query)q=q.or(`company_name.ilike.%${query}%,owner_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
      if(filter!=='all'){
        q=q.not('status','in','(renewed,closed,cancelled,inactive)');
        if(filter==='overdue')q=q.lt('due_on',today);
        else if(filter==='undated')q=q.is('due_on',null);
        else if(['30','60','90'].includes(filter))q=q.gte('due_on',today).lte('due_on',plusDays(today,Number(filter)));
        else throw new Error('Invalid date filter.');
      }
      const result=await q.order(filter==='all'?'company_name':'due_on',{ascending:true,nullsFirst:false}).order('id').range(page*50,page*50+49);
      if(result.error)throw result.error;
      return reply({rows:result.data,total:result.count,page,today,canWrite:access.permissions.has('application.update')});
    }
    if(action==='crm_detail'){
      if(!access.permissions.has('document.read'))return reply({error:'Document access is not permitted.'},403);
      const c=await client(admin,body.clientId);
      const results=await Promise.all([
        admin.from('admin_service_register').select('*').eq('client_id',c.id).order('due_on',{nullsFirst:false}),
        admin.from('admin_client_documents').select('id,kind,filename,created_at').eq('client_id',c.id).order('created_at',{ascending:false}),
        c.business_id?admin.from('documents').select('id,type,original_filename,uploaded_at').eq('business_id',c.business_id).is('deleted_at',null):Promise.resolve({data:[],error:null}),
        admin.from('admin_renewal_cases').select('*').eq('client_id',c.id).order('created_at',{ascending:false}),
      ]);
      for(const r of results)if(r.error)throw r.error;
      await audit(admin,access,'CLIENT_WORKSPACE_VIEWED',c.id);
      return reply({client:c,services:results[0].data,documents:[...(results[1].data||[]).map(d=>({...d,source:'staff'})),...(results[2].data||[]).map(d=>({id:d.id,kind:d.type,filename:d.original_filename,created_at:d.uploaded_at,source:'app'}))],cases:results[3].data,canWrite:access.permissions.has('application.update'),canDownload:access.permissions.has('document.download')});
    }
    if(action==='crm_document_link'){
      if(!access.permissions.has('document.download'))return reply({error:'Document download is not permitted.'},403);
      const reason=text(body.reason,240);if(reason.length<12)throw new Error('Enter a reason for accessing this private file (12 characters minimum).');
      const c=await client(admin,body.clientId);if(!uuid(body.documentId))throw new Error('Choose a document.');
      const r=await admin.from('admin_client_documents').select('storage_path,filename').eq('id',body.documentId).eq('client_id',c.id).single();if(r.error||!r.data)throw new Error('Document unavailable.');
      await audit(admin,access,'CLIENT_DOCUMENT_DOWNLOADED',c.id,{documentId:body.documentId,reason});
      const link=await admin.storage.from('admin-client-documents').createSignedUrl(r.data.storage_path,60);if(link.error)throw link.error;
      return reply({url:link.data.signedUrl});
    }
    if(!access.permissions.has('application.update'))return reply({error:'Client editing is not permitted.'},403);
    if(action==='crm_import'){
      if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>100)throw new Error('Import 1–100 rows at a time.');
      const results=[];
      for(const [index,value] of body.rows.entries()){
        try{
          const row=value as Record<string,unknown>;const data={...clientValues(row),...(row.service?serviceValues(row):{})};
          const r=await admin.rpc('admin_import_client',{p_actor:access.userId,p_row:data});
          if(r.error)throw new Error('Could not import this row. Check duplicates and dates.');
          results.push({row:index+1,ok:true,...r.data});
        }catch(e){results.push({row:index+1,ok:false,error:e instanceof Error?e.message:'Invalid row'});}
      }
      return reply({results});
    }
    const c=await client(admin,body.clientId);
    if(action==='crm_save_client'){
      const values=clientValues(body);await audit(admin,access,'CLIENT_DETAILS_UPDATED',c.id);
      const r=await admin.from('admin_clients').update({...values,updated_at:new Date().toISOString()}).eq('id',c.id);if(r.error)throw r.error;return reply({ok:true});
    }
    if(action==='crm_update_dates'){
      if(!uuid(body.recordId)||!c.business_id||!['app','registration'].includes(text(body.source)))throw new Error('Choose a linked licence.');
      const values=serviceValues({...body,service:'OTHER'});
      if(!['expiry','none'].includes(values.date_kind))throw new Error('Linked licence dates represent expiry. Add a separate service record for filing or review reminders.');
      await audit(admin,access,'CLIENT_LICENCE_DATES_UPDATED',c.id,{recordId:body.recordId,registered_on:values.registered_on,due_on:values.due_on});
      const r=await admin.from(body.source==='app'?'licenses':'business_registrations').update({issue_date:values.registered_on,expiry_date:values.due_on,updated_at:new Date().toISOString()}).eq('id',body.recordId).eq('business_id',c.business_id).select('id').single();
      if(r.error)throw new Error('Licence dates could not be updated.');return reply({ok:true});
    }
    if(action==='crm_save_service'){
      const values=serviceValues(body);
      const status=text(body.status)||'active';if(!['active','renewal_in_progress','renewed','closed'].includes(status))throw new Error('Invalid status.');
      await audit(admin,access,'CLIENT_SERVICE_SAVED',c.id,{recordId:body.recordId||null});
      if(body.recordId){
        if(!uuid(body.recordId))throw new Error('Invalid record.');
        const r=await admin.from('admin_client_services').update({...values,status,updated_at:new Date().toISOString()}).eq('id',body.recordId).eq('client_id',c.id).select('id').single();if(r.error)throw new Error('Only staff-created records can be edited here.');
      }else{
        if(!uuid(body.requestId))throw new Error('Missing save request.');
        const r=await admin.from('admin_client_services').upsert({id:body.requestId,client_id:c.id,...values,status},{onConflict:'id',ignoreDuplicates:true});if(r.error)throw r.error;
      }
      return reply({ok:true});
    }
    if(action==='crm_start_renewal'){
      if(!uuid(body.recordId))throw new Error('Choose a service.');
      const r=await admin.from('admin_service_register').select('id,service').eq('id',body.recordId).eq('client_id',c.id).single();if(r.error)throw new Error('Service unavailable.');
      await audit(admin,access,'CLIENT_RENEWAL_STARTED',c.id,{recordId:body.recordId});
      const created=await admin.from('admin_renewal_cases').insert({client_id:c.id,record_id:r.data.id,service:r.data.service,created_by:access.userId}).select('id').single();
      if(created.error&&created.error.code!=='23505')throw created.error;return reply({ok:true,alreadyOpen:created.error?.code==='23505'});
    }
    if(action==='crm_update_case'){
      if(!uuid(body.caseId)||!['preparing','submitted','completed','cancelled'].includes(text(body.status)))throw new Error('Choose a valid case status.');
      await audit(admin,access,'CLIENT_RENEWAL_UPDATED',c.id,{caseId:body.caseId,status:body.status});
      const r=await admin.from('admin_renewal_cases').update({status:body.status,notes:text(body.notes,2000),updated_at:new Date().toISOString()}).eq('id',body.caseId).eq('client_id',c.id).select('id').single();if(r.error)throw r.error;return reply({ok:true});
    }
    return reply({error:'Unsupported register action.'},400);
  }catch(e){return reply({error:e instanceof Error?e.message:'The client register request failed.'},400);}
}

export async function uploadClientDocument(admin:Admin,access:Access,form:FormData,reply:Reply){
  if(!access.permissions.has('application.update')||!access.permissions.has('document.verify'))return reply({error:'Document upload is not permitted.'},403);
  try{
    const c=await client(admin,form.get('clientId')),file=form.get('file'),kind=text(form.get('kind'));
    if(!docKinds.includes(kind)||!(file instanceof File)||!file.size||file.size>10485760)throw new Error('Choose a PDF, JPG or PNG under 10 MB and a document category.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const mime=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70?'application/pdf':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':null;
    if(!mime)throw new Error('File contents must be PDF, JPG or PNG.');
    const id=crypto.randomUUID(),path=`${c.id}/${id}.${mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg'}`;
    await audit(admin,access,'CLIENT_DOCUMENT_UPLOADED',c.id,{documentId:id,kind});
    const upload=await admin.storage.from('admin-client-documents').upload(path,bytes,{contentType:mime,upsert:false});if(upload.error)throw upload.error;
    const saved=await admin.from('admin_client_documents').insert({id,client_id:c.id,kind,filename:file.name.slice(0,180),storage_path:path,uploaded_by:access.userId});
    if(saved.error){await admin.storage.from('admin-client-documents').remove([path]);throw saved.error;}
    return reply({ok:true});
  }catch(e){return reply({error:e instanceof Error?e.message:'Upload failed.'},400);}
}
