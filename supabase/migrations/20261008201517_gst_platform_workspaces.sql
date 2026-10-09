create table public.gst_platform_workspaces (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  gstin text not null check (gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  period text not null check (period ~ '^(0[1-9]|1[0-2])20[0-9]{2}$'),
  role text not null check (role in ('seller','operator')),
  revision integer not null check (revision > 0),
  rows jsonb not null check (jsonb_typeof(rows)='array' and jsonb_array_length(rows)<=5000),
  batches jsonb not null check (jsonb_typeof(batches)='array' and jsonb_array_length(batches)<=50),
  updated_at timestamptz not null default now(),
  primary key(user_id,business_id,gstin,period,role)
);
create index gst_platform_workspaces_business_idx on public.gst_platform_workspaces(business_id);
alter table public.gst_platform_workspaces enable row level security;
revoke all on public.gst_platform_workspaces from public, anon, authenticated;
grant select,insert,update on public.gst_platform_workspaces to service_role;
comment on table public.gst_platform_workspaces is 'Private source CSV evidence and normalized preparation records. Owner-checked edge function only. Not filed GST data.';
