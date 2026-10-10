-- GSTINs are unique within an account, not across RegisterBox accounts.
drop index if exists public.business_profiles_gstin_unique;
create unique index business_profiles_user_gstin_unique
  on public.business_profiles(user_id, gstin)
  where gstin is not null and deleted_at is null;

create or replace function private.enforce_gst_profile_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.gstin is null or new.deleted_at is not null then return new; end if;
  if TG_OP = 'UPDATE' then
    if old.user_id = new.user_id and old.gstin is not null and old.deleted_at is null then
      return new;
    end if;
  end if;
  -- Serialize adds/restores for this account so concurrent requests cannot exceed 15.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.business_profiles
      where user_id = new.user_id and gstin is not null and deleted_at is null
        and id <> new.id) >= 15 then
    raise exception using errcode = 'P0001', message = 'GST_PROFILE_LIMIT: You can connect up to 15 GST profiles.';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_gst_profile_limit() from public, anon, authenticated;
create trigger business_profiles_gst_limit
before insert or update of user_id, gstin, deleted_at on public.business_profiles
for each row execute function private.enforce_gst_profile_limit();
