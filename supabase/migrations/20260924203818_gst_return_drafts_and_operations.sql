create table public.gst_return_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  gstin text not null,
  form text not null check (form in ('gstr-1','gstr-3b')),
  year integer not null check (year >= 2017),
  month integer not null check (month between 1 and 12),
  revision integer not null default 1,
  payload jsonb not null,
  payload_hash text not null,
  state text not null default 'draft' check (state in ('draft','save_pending','saved','proceed_pending','offset_pending','prepared','otp_sent','filed','unknown','blocked')),
  reference_id text,
  snapshot jsonb,
  snapshot_hash text,
  snapshot_at timestamptz,
  reconciliation jsonb,
  signatory_pan text,
  otp_sent_at timestamptz,
  acknowledgement text,
  last_error text,
  updated_at timestamptz not null default now(),
  unique (business_id,gstin,form,year,month)
);
create index gst_return_drafts_user_idx on public.gst_return_drafts(user_id);
alter table public.gst_return_drafts enable row level security;
revoke all on public.gst_return_drafts from public, anon, authenticated;
grant all on public.gst_return_drafts to service_role;

create table public.gst_return_operations (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.gst_return_drafts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null,
  action text not null,
  consent_version text not null,
  approved_hash text not null,
  declaration text not null,
  outcome text not null default 'started' check (outcome in ('started','succeeded','failed','unknown')),
  reference_id text,
  created_at timestamptz not null default now()
);
create index gst_return_operations_draft_time_idx on public.gst_return_operations(draft_id,created_at desc);
create index gst_return_operations_user_time_idx on public.gst_return_operations(user_id,created_at desc);
alter table public.gst_return_operations enable row level security;
revoke all on public.gst_return_operations from public, anon, authenticated;
grant all on public.gst_return_operations to service_role;
