-- Add the Udyam preparation request to the existing owner-scoped submission RPC.
-- The government registration itself remains on official government channels.
update public.services
set name='Udyam Registration Preparation',
    description='Prepare enterprise information for a RegisterBox review. Official Udyam registration is free and is completed through authorised government channels.',
    processing_method='HUMAN_ASSISTED',
    portal_assisted=false,
    documents_schema='[]'::jsonb,
    workflow_definition='["PROFILE_CHECK","INFORMATION_REVIEW","CUSTOMER_GUIDANCE"]'::jsonb
where slug='udyam';

create or replace function public.submit_application_draft(p_business uuid,p_category text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.business_profiles%rowtype; draft jsonb; answers jsonb;
  service_slug text; service_id uuid; application_id uuid; reference text; required_key text;
begin
  if p_category is null or p_category not in ('new','company','llp','food','retail','manufacturing','online','branch','existing','gst_registration','udyam') then
    raise exception 'Unsupported application category';
  end if;
  select * into b from public.business_profiles
    where id=p_business and user_id=(select auth.uid()) and deleted_at is null for update;
  if not found then raise exception 'Business unavailable'; end if;
  draft:=coalesce(b.questionnaire#>array['application_drafts',p_category],'{}'::jsonb);
  if not (draft ? 'answers') then raise exception 'Complete the application answers first'; end if;
  if nullif(draft->>'application_id','') is not null then
    select id,application_number into application_id,reference from public.applications
      where id=(draft->>'application_id')::uuid and business_id=b.id and deleted_at is null;
    if found then return jsonb_build_object('applicationId',application_id,'reference',reference,'alreadySubmitted',true); end if;
  end if;
  if p_category='udyam' then
    answers:=draft->'answers';
    if jsonb_typeof(answers) is distinct from 'object' then raise exception 'Complete the Udyam preparation answers first'; end if;
    select jsonb_object_agg(key,btrim(value)) into answers from jsonb_each_text(answers);
    draft:=jsonb_set(draft,'{answers}',coalesce(answers,'{}'::jsonb));
    foreach required_key in array array['activity_sector','activity','structure','commencement','existing_udyam','investment','turnover','employees','pan_ready','gst_status','aadhaar_ready','contact_name','contact_email','contact_mobile','address_line_1','city','district','state','pincode'] loop
      if nullif(btrim(answers->>required_key),'') is null then raise exception 'Complete the Udyam preparation checklist before sending'; end if;
    end loop;
    if answers->>'address_confirmed' is distinct from 'Yes'
      or (answers->>'pincode') !~ '^[1-9][0-9]{5}$'
      or (answers->>'contact_mobile') !~ '^[6-9][0-9]{9}$'
      or (answers->>'contact_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (answers->>'commencement') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or (answers->>'existing_udyam') not in ('Yes','No','Not sure')
      or (answers->>'investment') !~ '^[0-9]+(\.[0-9]{1,2})?$'
      or (answers->>'turnover') !~ '^[0-9]+(\.[0-9]{1,2})?$'
      or (answers->>'employees') !~ '^[0-9]+(\.0{1,2})?$' then
      raise exception 'Review the Udyam contact, address and financial details';
    end if;
    begin
      perform (answers->>'commencement')::date;
    exception when datetime_field_overflow or invalid_datetime_format then
      raise exception 'Enter a real business commencement date';
    end;
    if answers->>'existing_udyam'='Yes' and coalesce(answers->>'udyam_number','') !~ '^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$' then
      raise exception 'Review the existing Udyam registration number';
    end if;
  end if;
  service_slug:=case p_category when 'udyam' then 'udyam' when 'gst_registration' then 'gst-registration' when 'company' then 'private-limited-registration' when 'llp' then 'llp-registration' when 'food' then 'fssai' when 'retail' then 'shops-establishment' when 'branch' then 'trade-licence' when 'existing' then 'compliance-review' else 'business-setup' end;
  select id into service_id from public.services where slug=service_slug and active=true;
  if service_id is null then raise exception 'Service is unavailable'; end if;
  reference:='RB-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.applications(business_id,service_id,application_number,status,progress_percentage,submission_mode,notes)
  values(b.id,service_id,reference,'READY_FOR_REVIEW',50,'HUMAN_ASSISTED',
    case when p_category='udyam' then 'Customer submitted Udyam enterprise information to RegisterBox for preparation review. No government submission or identity verification has occurred.'
    else 'Customer submitted intake to RegisterBox for professional review and assisted filing.' end)
  returning id into application_id;
  update public.business_profiles set questionnaire=jsonb_set(questionnaire,array['application_drafts',p_category],
    draft||jsonb_build_object('status','submitted_to_registerbox','application_id',application_id,'submitted_to_registerbox_at',now())) where id=b.id;
  return jsonb_build_object('applicationId',application_id,'reference',reference,'alreadySubmitted',false);
end; $$;
revoke all on function public.submit_application_draft(uuid,text) from public,anon;
grant execute on function public.submit_application_draft(uuid,text) to authenticated;
