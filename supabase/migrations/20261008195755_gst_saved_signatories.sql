create table public.gst_saved_signatories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  gstin text not null check (gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  name text not null check (length(trim(name)) between 1 and 100),
  pan text not null check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  unique(user_id,business_id,gstin,pan)
);
alter table public.gst_saved_signatories enable row level security;
revoke all on public.gst_saved_signatories from public, anon, authenticated;
grant all on public.gst_saved_signatories to service_role;
comment on table public.gst_saved_signatories is 'User-entered signatories, not a GST registration or verified GST signatory list. Access through owner-checked gst-returns function only.';
