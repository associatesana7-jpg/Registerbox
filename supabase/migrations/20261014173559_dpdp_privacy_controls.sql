-- Applied remotely as migration 20261014173559; source timestamp reconciled.
create table public.privacy_purpose_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('ai_assistance','ai_bill_extraction')),
  allowed boolean not null default false,
  notice_version text not null,
  notice_snapshot text not null check (length(notice_snapshot) between 20 and 5000),
  language text not null check (language in ('en','hi')),
  adult_declaration boolean not null default false,
  changed_at timestamptz not null default now(),
  primary key (user_id,purpose),
  check (not allowed or adult_declaration)
);
create table public.privacy_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null,
  allowed boolean not null,
  notice_version text not null,
  notice_snapshot text not null,
  language text not null,
  created_at timestamptz not null default now()
);
create index privacy_consent_events_owner_time on public.privacy_consent_events(user_id,created_at desc);
create table public.privacy_processor_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null,
  consent_event_id uuid not null references public.privacy_consent_events(id),
  status text not null default 'pending' check (status in ('pending','processing','completed','retained')),
  created_at timestamptz not null default now(),
  target_at timestamptz not null default now()+interval '30 days',
  response text,
  evidence text,
  legal_basis text,
  last_actor_id uuid references auth.users(id) on delete set null,
  retained_until date,
  resolved_at timestamptz,
  check(status not in ('completed','retained') or (response is not null and evidence is not null and length(trim(response))>0 and length(trim(evidence))>0 and resolved_at is not null)),
  check(status<>'retained' or (retained_until is not null and legal_basis is not null and length(trim(legal_basis))>0))
);
create index privacy_processor_tasks_queue on public.privacy_processor_tasks(status,target_at);
create table public.privacy_rights_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('access','correction','grievance','nomination','withdrawal','guardian_review')),
  details text not null default '' check (length(details)<=1500),
  status text not null default 'pending' check (status in ('pending','processing','needs_information','resolved','declined')),
  created_at timestamptz not null default now(),
  target_at timestamptz not null default now()+interval '30 days',
  resolved_at timestamptz,
  response text check (length(response)<=4000),
  resolution_evidence text check (length(resolution_evidence)<=1000),
  last_actor_id uuid references auth.users(id) on delete set null,
  check (status not in ('resolved','declined') or (resolved_at is not null and response is not null and resolution_evidence is not null and length(trim(response))>0 and length(trim(resolution_evidence))>0))
);
create unique index privacy_rights_one_open on public.privacy_rights_requests(user_id,kind) where status in ('pending','processing','needs_information');
create table public.privacy_case_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.privacy_rights_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  response text,
  evidence text,
  created_at timestamptz not null default now()
);
create table public.privacy_processor_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.privacy_processor_tasks(id),
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  response text,
  evidence text,
  legal_basis text,
  retained_until date,
  created_at timestamptz not null default now()
);
alter table public.privacy_purpose_preferences enable row level security;
alter table public.privacy_consent_events enable row level security;
alter table public.privacy_rights_requests enable row level security;
alter table public.privacy_case_events enable row level security;
alter table public.privacy_processor_tasks enable row level security;
alter table public.privacy_processor_task_events enable row level security;
revoke all on public.privacy_processor_task_events from public,anon,authenticated;
grant all on public.privacy_processor_task_events to service_role;
revoke all on public.privacy_processor_tasks from public,anon,authenticated;
grant select(user_id,id,purpose,status,created_at,target_at,response,retained_until) on public.privacy_processor_tasks to authenticated;
grant all on public.privacy_processor_tasks to service_role;
create policy privacy_processor_tasks_own on public.privacy_processor_tasks for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.privacy_purpose_preferences,public.privacy_consent_events,public.privacy_rights_requests,public.privacy_case_events from public,anon,authenticated;
grant select on public.privacy_purpose_preferences,public.privacy_consent_events,public.privacy_rights_requests to authenticated;
grant all on public.privacy_purpose_preferences,public.privacy_consent_events,public.privacy_rights_requests,public.privacy_case_events to service_role;
create policy privacy_preferences_own on public.privacy_purpose_preferences for select to authenticated using (user_id=(select auth.uid()));
create policy privacy_consent_history_own on public.privacy_consent_events for select to authenticated using (user_id=(select auth.uid()));
create policy privacy_rights_own on public.privacy_rights_requests for select to authenticated using (user_id=(select auth.uid()));
create schema if not exists private;
create function private.audit_privacy_preference() returns trigger language plpgsql security definer set search_path='' as $$
declare event_id uuid;
begin
  new.changed_at=clock_timestamp();
  insert into public.privacy_consent_events(user_id,purpose,allowed,notice_version,notice_snapshot,language)
  values(new.user_id,new.purpose,new.allowed,new.notice_version,new.notice_snapshot,new.language) returning id into event_id;
  if tg_op='UPDATE' and old.allowed and not new.allowed then
    insert into public.privacy_processor_tasks(user_id,purpose,consent_event_id) values(new.user_id,new.purpose,event_id);
    insert into public.user_notifications(user_id,category,severity,title,body,action_path,dedupe_key)
    select distinct s.user_id,'system','warning','AI permission withdrawn',
      'Review processor cessation/erasure and legal retention for consent event '||event_id::text,
      '/privacy-operations','privacy-withdrawal:'||event_id::text||':'||s.user_id::text
    from public.staff_profiles s join public.staff_roles sr on sr.staff_user_id=s.user_id join public.roles r on r.id=sr.role_id
    where s.status='active' and r.key in ('SUPER_ADMIN','SECURITY_ADMIN');
  end if;
  return new;
end $$;
revoke all on function private.audit_privacy_preference() from public,anon,authenticated;
create trigger privacy_preference_audit before insert or update on public.privacy_purpose_preferences for each row execute function private.audit_privacy_preference();
create function private.audit_privacy_case() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.privacy_case_events(request_id,actor_id,status,response,evidence)
  values(new.id,coalesce(new.last_actor_id,new.user_id),new.status,new.response,new.resolution_evidence);
  if tg_op='INSERT' then
    insert into public.user_notifications(user_id,category,severity,title,body,action_path,dedupe_key)
    select distinct s.user_id,'system','warning','Privacy rights request',
      'Review privacy request '||new.id::text||' by '||new.target_at::date::text,
      '/privacy-operations','privacy-rights:'||new.id::text||':'||s.user_id::text
    from public.staff_profiles s join public.staff_roles sr on sr.staff_user_id=s.user_id join public.roles r on r.id=sr.role_id
    where s.status='active' and r.key in ('SUPER_ADMIN','SECURITY_ADMIN');
  end if;
  return new;
end $$;
revoke all on function private.audit_privacy_case() from public,anon,authenticated;
create trigger privacy_case_notify after insert or update on public.privacy_rights_requests for each row execute function private.audit_privacy_case();
create function private.audit_privacy_processor_task() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.privacy_processor_task_events(task_id,actor_id,status,response,evidence,legal_basis,retained_until)
  values(new.id,new.last_actor_id,new.status,new.response,new.evidence,new.legal_basis,new.retained_until);
  return new;
end $$;
revoke all on function private.audit_privacy_processor_task() from public,anon,authenticated;
create trigger privacy_processor_task_audit after insert or update on public.privacy_processor_tasks for each row execute function private.audit_privacy_processor_task();
-- No automatic erasure of business records or consent evidence: the retention
-- matrix, legal holds and processor/back-up erasure require operator approval.
