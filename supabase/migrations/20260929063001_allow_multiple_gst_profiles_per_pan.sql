-- GST registrations are separate profiles and can share the same PAN.
-- The existing GSTIN uniqueness rule continues to prevent duplicate registrations.
drop index if exists public.business_profiles_pan_unique;
create index if not exists business_profiles_pan_lookup_idx
  on public.business_profiles (user_id, pan)
  where pan is not null and deleted_at is null;
