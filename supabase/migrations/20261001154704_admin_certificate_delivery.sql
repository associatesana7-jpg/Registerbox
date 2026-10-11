-- Server-only receipt and atomic completion command.
create table public.certificate_deliveries (
  request_id uuid primary key,
  business_id uuid not null references public.business_profiles(id),
  application_id uuid not null references public.applications(id),
  document_id uuid not null references public.documents(id),
  license_id uuid not null references public.licenses(id),
  actor_id uuid not null references public.staff_profiles(user_id),
  created_at timestamptz not null default now()
);
alter table public.certificate_deliveries enable row level security;
revoke all on public.certificate_deliveries from anon, authenticated;
grant all on public.certificate_deliveries to service_role;
create index certificate_deliveries_business_idx on public.certificate_deliveries(business_id);
create index certificate_deliveries_application_idx on public.certificate_deliveries(application_id);
create index certificate_deliveries_document_idx on public.certificate_deliveries(document_id);
create index certificate_deliveries_license_idx on public.certificate_deliveries(license_id);
create index certificate_deliveries_actor_idx on public.certificate_deliveries(actor_id);

create policy documents_preserve_issued_insert on public.documents as restrictive for insert to authenticated
  with check (source <> 'STAFF_ISSUED' and split_part(storage_path,'/',3) not like 'issued-%');
create policy documents_preserve_issued_update on public.documents as restrictive for update to authenticated
  using (source <> 'STAFF_ISSUED') with check (source <> 'STAFF_ISSUED' and split_part(storage_path,'/',3) not like 'issued-%');
create policy documents_preserve_issued_delete on public.documents as restrictive for delete to authenticated
  using (source <> 'STAFF_ISSUED');
create policy storage_preserve_issued_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'business-documents' or split_part(name,'/',3) not like 'issued-%');
create policy storage_preserve_issued_update on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'business-documents' or split_part(name,'/',3) not like 'issued-%')
  with check (bucket_id <> 'business-documents' or split_part(name,'/',3) not like 'issued-%');
create policy storage_preserve_issued_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'business-documents' or split_part(name,'/',3) not like 'issued-%');

create function public.complete_certificate_delivery(p_actor uuid, p_request uuid, p_business uuid, p_application uuid,
  p_category text, p_service uuid, p_path text, p_filename text, p_mime text,
  p_number text, p_authority text, p_issue date, p_expiry date)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  b public.business_profiles%rowtype;
  a public.applications%rowtype;
  receipt public.certificate_deliveries%rowtype;
  doc uuid; lic uuid; service_name text;
begin
  if not exists (select 1 from public.staff_profiles sp where sp.user_id=p_actor and sp.status='active')
    or (select count(distinct p.key) from public.staff_roles sr join public.role_permissions rp on rp.role_id=sr.role_id
        join public.permissions p on p.id=rp.permission_id where sr.staff_user_id=p_actor and p.key in ('application.update','document.verify')) <> 2 then
    raise exception 'Active staff permission required';
  end if;
  select * into b from public.business_profiles where id=p_business and deleted_at is null for update;
  if not found then raise exception 'Business unavailable'; end if;
  select * into receipt from public.certificate_deliveries where request_id=p_request;
  if found then
    if receipt.business_id <> p_business or receipt.actor_id <> p_actor then raise exception 'Request conflict'; end if;
    return jsonb_build_object('applicationId',receipt.application_id,'documentId',receipt.document_id,'licenseId',receipt.license_id,'alreadyCompleted',true);
  end if;
  if length(trim(p_number)) not between 1 and 120 or length(trim(p_authority)) not between 1 and 180
    or p_number is null or p_authority is null or p_issue is null or p_issue > current_date
    or (p_expiry is not null and p_expiry < p_issue) then raise exception 'Invalid certificate details'; end if;
  if p_path <> (b.user_id::text || '/' || b.id::text || '/issued-' || p_request::text ||
    (case p_mime when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.invalid' end))
    or p_mime not in ('application/pdf','image/jpeg','image/png') then raise exception 'Invalid storage reference'; end if;
  if not exists (select 1 from storage.objects where bucket_id='business-documents' and name=p_path) then raise exception 'Certificate file missing'; end if;
  if p_application is not null then
    select * into a from public.applications where id=p_application and business_id=b.id and deleted_at is null for update;
    if not found or a.status in ('APPROVED','CANCELLED','REJECTED') then raise exception 'Case unavailable or already closed'; end if;
    p_service := a.service_id;
  else
    if p_category is null or not (coalesce(b.questionnaire->'application_drafts','{}'::jsonb) ? p_category)
      or b.questionnaire#>>array['application_drafts',p_category,'status'] = 'completed' then raise exception 'Draft unavailable or already completed'; end if;
    insert into public.applications(business_id,service_id,status,submission_mode)
      values(b.id,p_service,'DRAFT','HUMAN_ASSISTED') returning * into a;
  end if;
  select name into service_name from public.services where id=p_service;
  if not found then raise exception 'Choose a valid service'; end if;
  insert into public.documents(business_id,type,storage_path,original_filename,mime_type,uploaded_by,source,verified,verification_status,ocr_status,expiry_date,metadata_json)
    values(b.id,'ISSUED_LICENCE_CERTIFICATE',p_path,left(p_filename,180),p_mime,p_actor,'STAFF_ISSUED',true,'verified','not_required',p_expiry,
      jsonb_build_object('application_id',a.id,'delivery_request_id',p_request,'verification_method','staff_review')) returning id into doc;
  insert into public.licenses(business_id,service_id,licence_number,issue_date,expiry_date,issuing_authority,status,certificate_document_id,verification_status)
    values(b.id,p_service,trim(p_number),p_issue,p_expiry,trim(p_authority),'active',doc,'staff_reviewed') returning id into lic;
  update public.applications set status='APPROVED',progress_percentage=100,approved_at=now(),certificate_document_id=doc,government_reference=trim(p_number) where id=a.id;
  if p_category is not null and coalesce(b.questionnaire->'application_drafts','{}'::jsonb) ? p_category then
    update public.business_profiles set questionnaire=jsonb_set(questionnaire,array['application_drafts',p_category],
      (questionnaire#>array['application_drafts',p_category]) || jsonb_build_object('status','completed','application_id',a.id,'certificate_document_id',doc,'completed_at',now())) where id=b.id;
  end if;
  insert into public.application_events(application_id,event_type,description,actor_type,actor_id)
    values(a.id,'CERTIFICATE_DELIVERED','Government certificate received and delivered by staff.','staff',p_actor);
  insert into public.audit_events(actor_id,actor_type,action,entity_type,entity_id,new_value,source)
    values(p_actor,'staff','CERTIFICATE_DELIVERED','application',a.id,jsonb_build_object('document_id',doc,'license_id',lic,'request_id',p_request),'control-center-edge');
  insert into public.user_notifications(user_id,business_id,category,severity,title,body,action_path,dedupe_key)
    values(b.user_id,b.id,'application','info','Your certificate is ready',service_name || ' certificate is available in your Document Wallet.','/(tabs)/documents','certificate:'||p_request::text);
  insert into public.certificate_deliveries values(p_request,b.id,a.id,doc,lic,p_actor,now());
  return jsonb_build_object('applicationId',a.id,'documentId',doc,'licenseId',lic,'alreadyCompleted',false);
end;
$$;
revoke all on function public.complete_certificate_delivery(uuid,uuid,uuid,uuid,text,uuid,text,text,text,text,text,date,date) from public,anon,authenticated;
grant execute on function public.complete_certificate_delivery(uuid,uuid,uuid,uuid,text,uuid,text,text,text,text,text,date,date) to service_role;
