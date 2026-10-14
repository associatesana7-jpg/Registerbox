-- Privileged SQL connection. Fixtures, notifications and audit events roll back.
begin;
insert into auth.users(id,email) values
 ('28a77c91-01a8-431e-a344-f658971da101','dpdp-fixture-a@example.invalid'),
 ('28a77c91-01a8-431e-a344-f658971da102','dpdp-fixture-b@example.invalid');
insert into public.privacy_purpose_preferences(user_id,purpose,allowed,notice_version,notice_snapshot,language)
 values('28a77c91-01a8-431e-a344-f658971da101','ai_assistance',false,'fixture','Synthetic purpose notice - not customer data','en');
insert into public.privacy_rights_requests(user_id,kind)
 values('28a77c91-01a8-431e-a344-f658971da101','access');
update public.privacy_purpose_preferences set allowed=true,adult_declaration=true where user_id='28a77c91-01a8-431e-a344-f658971da101';
update public.privacy_purpose_preferences set allowed=false where user_id='28a77c91-01a8-431e-a344-f658971da101';
do $$ begin
 if not exists(select 1 from public.privacy_consent_events where user_id='28a77c91-01a8-431e-a344-f658971da101') then raise exception 'Consent audit missing'; end if;
 if not exists(select 1 from public.privacy_case_events e join public.privacy_rights_requests r on r.id=e.request_id where r.user_id='28a77c91-01a8-431e-a344-f658971da101') then raise exception 'Case audit missing'; end if;
 if not exists(select 1 from public.privacy_processor_tasks where user_id='28a77c91-01a8-431e-a344-f658971da101') then raise exception 'Withdrawal processor task missing'; end if;
 if not exists(select 1 from public.privacy_processor_task_events e join public.privacy_processor_tasks t on t.id=e.task_id where t.user_id='28a77c91-01a8-431e-a344-f658971da101') then raise exception 'Processor task audit missing'; end if;
 begin update public.privacy_rights_requests set status='resolved',resolved_at=now() where user_id='28a77c91-01a8-431e-a344-f658971da101'; raise exception 'Null resolution evidence accepted'; exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"28a77c91-01a8-431e-a344-f658971da101","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.privacy_purpose_preferences)<>1 then raise exception 'Own preference not visible'; end if;
 if (select count(*) from public.privacy_rights_requests)<>1 then raise exception 'Own case not visible'; end if;
 if (select count(*) from public.privacy_consent_events)<>3 then raise exception 'Own audit not visible'; end if;
 if (select count(id) from public.privacy_processor_tasks)<>1 then raise exception 'Own processor task not visible'; end if;
 begin update public.privacy_purpose_preferences set allowed=true; raise exception 'Direct grant accepted'; exception when insufficient_privilege then null; end;
 begin update public.privacy_rights_requests set status='resolved'; raise exception 'Status tamper accepted'; exception when insufficient_privilege then null; end;
 begin delete from public.privacy_consent_events; raise exception 'Audit deletion accepted'; exception when insufficient_privilege then null; end;
 begin perform * from public.privacy_case_events; raise exception 'Internal case evidence exposed'; exception when insufficient_privilege then null; end;
 begin perform evidence from public.privacy_processor_tasks; raise exception 'Internal processor evidence exposed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"28a77c91-01a8-431e-a344-f658971da102","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.privacy_purpose_preferences)<>0 or (select count(*) from public.privacy_rights_requests)<>0 or (select count(*) from public.privacy_consent_events)<>0 or (select count(id) from public.privacy_processor_tasks)<>0 then raise exception 'Cross-user data exposed'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.privacy_purpose_preferences; raise exception 'Anonymous data exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: owner reads, consent/case audit, direct-write prevention, internal evidence isolation, cross-user and anonymous isolation' as verification;
rollback;
