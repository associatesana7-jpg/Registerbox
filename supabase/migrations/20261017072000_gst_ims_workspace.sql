create table public.gst_ims_workspaces (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 business_id uuid not null references public.business_profiles(id) on delete cascade,
 gstin text not null,
 year integer not null check(year between 2017 and 2100),
 month integer not null check(month between 1 and 12),
 invoices jsonb not null default '[]',
 snapshot_hash text,
 fetched_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(user_id,business_id,year,month)
);
create table public.gst_ims_operations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.gst_ims_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check(action in ('save','compute')),
 outcome text not null default 'started' check(outcome in ('started','pending','succeeded','failed','unknown')),
 reference_id text,
 approval jsonb not null,
 result jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index gst_ims_operations_workspace_idx on public.gst_ims_operations(workspace_id,created_at desc);
create index gst_ims_operations_user_idx on public.gst_ims_operations(user_id,created_at desc);
alter table public.gst_ims_workspaces enable row level security;
alter table public.gst_ims_operations enable row level security;
revoke all on public.gst_ims_workspaces,public.gst_ims_operations from public,anon,authenticated;
grant all on public.gst_ims_workspaces,public.gst_ims_operations to service_role;
comment on table public.gst_ims_operations is 'Private IMS action approvals and async outcomes. Unknown writes must never be blindly repeated.';
