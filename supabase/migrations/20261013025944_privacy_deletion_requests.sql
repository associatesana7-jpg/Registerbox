create table public.privacy_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  scope text not null check (scope in ('account','data')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending','processing','completed','retained')),
  created_at timestamptz not null default now(),
  target_at timestamptz not null default now() + interval '30 days',
  resolved_at timestamptz,
  response text,
  retained_until date,
  check (status not in ('completed','retained') or (resolved_at is not null and response is not null)),
  check (status <> 'retained' or retained_until is not null),
  check (scope <> 'data' or char_length(trim(details)) > 0)
);
create unique index privacy_one_open_request on public.privacy_deletion_requests(user_id,scope)
  where status in ('pending','processing');
alter table public.privacy_deletion_requests enable row level security;
revoke all on public.privacy_deletion_requests from anon, authenticated;
grant select on public.privacy_deletion_requests to authenticated;
grant insert (user_id,scope,details) on public.privacy_deletion_requests to authenticated;
grant all on public.privacy_deletion_requests to service_role;
create policy privacy_read_own on public.privacy_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy privacy_request_own on public.privacy_deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
-- No customer UPDATE/DELETE grants: a request cannot change another account,
-- mark itself completed, or remove its audit record. Fulfillment is operator-only.
create schema if not exists private;
create function private.notify_privacy_deletion_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_notifications(user_id,category,severity,title,body,dedupe_key)
  select distinct s.user_id,'system','warning','Privacy deletion request',
    'Review privacy_deletion_requests reference ' || new.id::text || ' before ' || new.target_at::date::text,
    'privacy-request:' || new.id::text || ':' || s.user_id::text
  from public.staff_profiles s
  join public.staff_roles sr on sr.staff_user_id=s.user_id
  join public.roles r on r.id=sr.role_id
  where s.status='active' and r.key in ('SUPER_ADMIN','SECURITY_ADMIN');
  return new;
end $$;
revoke all on function private.notify_privacy_deletion_request() from public,anon,authenticated;
create trigger notify_privacy_request after insert on public.privacy_deletion_requests
  for each row execute function private.notify_privacy_deletion_request();
-- Only closed request receipts, never customer business records, are purged here.
select cron.schedule('privacy-request-receipt-retention','23 3 * * *',
  $$delete from public.privacy_deletion_requests where status in ('completed','retained')
    and resolved_at < now() - interval '12 months'
    and (retained_until is null or retained_until < current_date)$$);
