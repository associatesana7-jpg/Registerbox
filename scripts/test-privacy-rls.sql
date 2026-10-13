-- Run with a privileged SQL connection; all fixtures and notifications roll back.
begin;
insert into auth.users(id,email) values
 ('fc957e50-d837-4d4b-821c-010acb8c5b2a','privacy-fixture-a@example.invalid'),
 ('fc957e50-d837-4d4b-821c-010acb8c5b2b','privacy-fixture-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fc957e50-d837-4d4b-821c-010acb8c5b2a","role":"authenticated"}',true);
insert into public.privacy_deletion_requests(user_id,scope,details)
 values ('fc957e50-d837-4d4b-821c-010acb8c5b2a','data','Delete fixture document');
do $$ begin
 if (select count(*) from public.privacy_deletion_requests) <> 1 then raise exception 'Own request not visible'; end if;
 begin
  insert into public.privacy_deletion_requests(user_id,scope) values ('fc957e50-d837-4d4b-821c-010acb8c5b2b','account');
  raise exception 'Forged owner accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.privacy_deletion_requests set status='completed';
  raise exception 'Status tamper accepted';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.privacy_deletion_requests;
  raise exception 'Customer deletion accepted';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claims','{"sub":"fc957e50-d837-4d4b-821c-010acb8c5b2b","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.privacy_deletion_requests) <> 0 then raise exception 'Cross-user read accepted'; end if;
end; $$;
set local role anon;
do $$ begin
 begin
  perform * from public.privacy_deletion_requests;
  raise exception 'Anonymous read accepted';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
select 'PASS: own insert/read; forged owner, status tamper, deletion, cross-user and anonymous access denied' as verification;
rollback;
