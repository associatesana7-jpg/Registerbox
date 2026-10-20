-- Synthetic fixtures only. All records, events and notifications are rolled back.
begin;
insert into auth.users(id,email) values
 ('69781d38-1f46-4fbc-a79d-3f29db19c001','udyam-intake-a@example.invalid'),
 ('69781d38-1f46-4fbc-a79d-3f29db19c002','udyam-intake-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"69781d38-1f46-4fbc-a79d-3f29db19c001","role":"authenticated"}',true);
insert into public.business_profiles(id,user_id,created_by,legal_name,status,questionnaire)
values ('69781d38-1f46-4fbc-a79d-3f29db19b001','69781d38-1f46-4fbc-a79d-3f29db19c001','69781d38-1f46-4fbc-a79d-3f29db19c001','Udyam synthetic verification only','draft','{"application_drafts":{"udyam":{"status":"draft","answers":{}}}}');
do $$ begin
 begin
  perform public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
  raise exception 'Incomplete intake accepted';
 exception when raise_exception then
  if sqlerrm<>'Complete the Udyam preparation checklist before sending' then raise; end if;
 end;
end $$;
update public.business_profiles set questionnaire=jsonb_set(questionnaire,'{application_drafts,udyam,answers}',
 '{"activity_sector":"Professional services","activity":"Synthetic verification","structure":"Sole proprietor","commencement":"2026-02-31","existing_udyam":"No","investment":" 0 ","turnover":"0","employees":"0.00","pan_ready":"Yes","gst_status":"Not registered — need applicability review","aadhaar_ready":"Yes","contact_name":"Test fixture","contact_email":" test@example.invalid ","contact_mobile":" 9000000000 ","address_line_1":"Synthetic test address","city":"Bengaluru","district":"Bengaluru Urban","state":"Karnataka","pincode":"560075","address_confirmed":"Yes"}'::jsonb)
where id='69781d38-1f46-4fbc-a79d-3f29db19b001';
do $$ begin
 begin
  perform public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
  raise exception 'Impossible date accepted';
 exception when raise_exception then
  if sqlerrm<>'Enter a real business commencement date' then raise; end if;
 end;
end $$;
update public.business_profiles set questionnaire=jsonb_set(questionnaire,'{application_drafts,udyam,answers,commencement}','"2026-10-01"'::jsonb)
where id='69781d38-1f46-4fbc-a79d-3f29db19b001';
do $$ declare first_result jsonb; second_result jsonb; begin
 first_result:=public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
 if first_result->>'reference' not like 'RB-%' or first_result->>'alreadySubmitted'<>'false' then raise exception 'Submission result invalid'; end if;
 if not exists(select 1 from public.applications a join public.services s on s.id=a.service_id where a.id=(first_result->>'applicationId')::uuid and s.slug='udyam' and a.status='READY_FOR_REVIEW') then raise exception 'Wrong service or review status'; end if;
 second_result:=public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
 if second_result->>'applicationId' is distinct from first_result->>'applicationId' or second_result->>'alreadySubmitted'<>'true' then raise exception 'Repeated submission duplicated'; end if;
 if (select questionnaire#>>'{application_drafts,udyam,answers,investment}' from public.business_profiles where id='69781d38-1f46-4fbc-a79d-3f29db19b001')<>'0' then raise exception 'Accepted values not normalized'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"69781d38-1f46-4fbc-a79d-3f29db19c002","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.business_profiles where id='69781d38-1f46-4fbc-a79d-3f29db19b001') then raise exception 'Cross-account draft visible'; end if;
 if exists(select 1 from public.applications where business_id='69781d38-1f46-4fbc-a79d-3f29db19b001') then raise exception 'Cross-account application visible'; end if;
 begin
  perform public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
  raise exception 'Cross-account submission accepted';
 exception when raise_exception then
  if sqlerrm<>'Business unavailable' then raise; end if;
 end;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.submit_application_draft('69781d38-1f46-4fbc-a79d-3f29db19b001','udyam');
  raise exception 'Anonymous submission accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: complete Udyam intake, correct service, normalization, repeat safety, invalid-date rejection, owner isolation and anonymous denial' as verification;
rollback;
