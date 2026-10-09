create table public.gst_purchase_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  gstin text not null,
  year integer not null check(year between 2017 and 2100),
  month integer not null check(month between 1 and 12),
  books jsonb not null default '[]',
  revision integer not null default 1,
  snapshot jsonb,
  report jsonb,
  fetched_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,business_id,year,month)
);
create index gst_purchase_reconciliations_business_idx on public.gst_purchase_reconciliations(business_id);
alter table public.gst_purchase_reconciliations enable row level security;
revoke all on public.gst_purchase_reconciliations from public,anon,authenticated;
grant all on public.gst_purchase_reconciliations to service_role;
comment on table public.gst_purchase_reconciliations is 'Server-only purchase books and complete GSTN 2B snapshots. Edge function validates authenticated business ownership.';
alter table public.gst_consent_events drop constraint gst_consent_events_action_check;
alter table public.gst_consent_events add constraint gst_consent_events_action_check check(action in ('request_otp','verify_otp','read_return','disconnect','save_books','read_2b'));
