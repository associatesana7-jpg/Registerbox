-- Persist an app profile as soon as Supabase Auth creates a user, and allow
-- INSERT ... RETURNING for business owners. The direct owner predicate is
-- required because a SELECT policy function cannot see a just-created row
-- during INSERT RETURNING.

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, onboarding_status)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    'not_started'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_registerbox on auth.users;
create trigger on_auth_user_created_registerbox
  after insert or update of email on auth.users
  for each row execute function private.handle_new_auth_user();

insert into public.profiles (id, email, full_name, onboarding_status)
select u.id, u.email,
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ''),
  'not_started'
from auth.users u
on conflict (id) do update set email = excluded.email;

drop policy if exists business_profiles_access_read on public.business_profiles;
create policy business_profiles_access_read on public.business_profiles
  for select to authenticated
  using (user_id=(select auth.uid()) or private.can_access_business(id));

create index if not exists compliance_results_service_id_idx on public.compliance_results(service_id);
create index if not exists order_items_service_id_idx on public.order_items(service_id);
