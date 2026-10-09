-- Taxpayer credentials are never exposed through the client Data API.
create table public.gst_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  gstin text,
  username text,
  status text not null default 'disconnected' check (status in ('disconnected','otp_pending','linked')),
  token_ciphertext text,
  expires_at timestamptz,
  last_otp_at timestamptz,
  verify_attempts integer not null default 0,
  lock_id uuid,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,business_id)
);
create index gst_connections_business_idx on public.gst_connections(business_id);
alter table public.gst_connections enable row level security;
revoke all on public.gst_connections from public, anon, authenticated;
grant all on public.gst_connections to service_role;

create table public.gst_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  action text not null check (action in ('request_otp','verify_otp','read_return','disconnect')),
  consent_version text not null,
  scope jsonb not null,
  outcome text not null default 'started' check (outcome in ('started','succeeded','failed')),
  created_at timestamptz not null default now()
);
create index gst_consent_events_user_time_idx on public.gst_consent_events(user_id,created_at desc);
create index gst_consent_events_business_idx on public.gst_consent_events(business_id);
alter table public.gst_consent_events enable row level security;
revoke all on public.gst_consent_events from public, anon, authenticated;
grant all on public.gst_consent_events to service_role;
comment on table public.gst_connections is 'Server-only GST session. AES-GCM encrypted token; no OTP stored. API must enforce user ownership.';
