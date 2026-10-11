insert into public.services (name,slug,category,description,government_authority,service_fee,processing_method,portal_assisted,documents_schema,workflow_definition)
values
  ('Private Limited Company Registration','private-limited-registration','Business formation','Private limited company incorporation preparation and assisted filing.','MCA',3999,'HUMAN_ASSISTED',true,'[]'::jsonb,'["DOCUMENT_CHECK","PROFESSIONAL_REVIEW","PORTAL_SUBMISSION","GOVERNMENT_PROCESSING","APPROVAL"]'::jsonb),
  ('LLP Registration','llp-registration','Business formation','Limited liability partnership incorporation preparation and assisted filing.','MCA',3499,'HUMAN_ASSISTED',true,'[]'::jsonb,'["DOCUMENT_CHECK","PROFESSIONAL_REVIEW","PORTAL_SUBMISSION","GOVERNMENT_PROCESSING","APPROVAL"]'::jsonb),
  ('Business Setup Review','business-setup','Business formation','Business setup review and registration planning.','Applicable authority',999,'HUMAN_ASSISTED',false,'[]'::jsonb,'["DOCUMENT_CHECK","PROFESSIONAL_REVIEW","CUSTOMER_GUIDANCE"]'::jsonb),
  ('Existing Business Compliance Review','compliance-review','Compliance','Review an existing business and its registrations.','Applicable authority',999,'HUMAN_ASSISTED',false,'[]'::jsonb,'["DOCUMENT_CHECK","COMPLIANCE_REVIEW","CUSTOMER_GUIDANCE"]'::jsonb)
on conflict (slug) do nothing;

create or replace function public.submit_application_draft(p_business uuid,p_category text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.business_profiles%rowtype; draft jsonb; service_slug text; service_id uuid; application_id uuid; reference text;
begin
  if p_category not in ('new','company','llp','food','retail','manufacturing','online','branch','existing','gst_registration') then raise exception 'Unsupported application category'; end if;
  select * into b from public.business_profiles where id=p_business and user_id=(select auth.uid()) and deleted_at is null for update;
  if not found then raise exception 'Business unavailable'; end if;
  draft:=coalesce(b.questionnaire#>array['application_drafts',p_category],'{}'::jsonb);
  if not (draft ? 'answers') then raise exception 'Complete the application answers first'; end if;
  if nullif(draft->>'application_id','') is not null then
    select id,application_number into application_id,reference from public.applications where id=(draft->>'application_id')::uuid and business_id=b.id and deleted_at is null;
    if found then return jsonb_build_object('applicationId',application_id,'reference',reference,'alreadySubmitted',true); end if;
  end if;
  service_slug:=case p_category when 'gst_registration' then 'gst-registration' when 'company' then 'private-limited-registration' when 'llp' then 'llp-registration' when 'food' then 'fssai' when 'retail' then 'shops-establishment' when 'branch' then 'trade-licence' when 'existing' then 'compliance-review' else 'business-setup' end;
  select id into service_id from public.services where slug=service_slug and active=true;
  if service_id is null then raise exception 'Service is unavailable'; end if;
  reference:='RB-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.applications(business_id,service_id,application_number,status,progress_percentage,submission_mode,notes)
  values(b.id,service_id,reference,'READY_FOR_REVIEW',50,'HUMAN_ASSISTED','Customer submitted intake to RegisterBox for professional review and assisted filing.') returning id into application_id;
  update public.business_profiles set questionnaire=jsonb_set(questionnaire,array['application_drafts',p_category],draft||jsonb_build_object('status','submitted_to_registerbox','application_id',application_id,'submitted_to_registerbox_at',now())) where id=b.id;
  return jsonb_build_object('applicationId',application_id,'reference',reference,'alreadySubmitted',false);
end; $$;
revoke all on function public.submit_application_draft(uuid,text) from public,anon;
grant execute on function public.submit_application_draft(uuid,text) to authenticated;
