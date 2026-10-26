-- Minimal, consented callback requests from the public website.
-- Anonymous browsers never receive direct table access; a narrowly validated
-- Edge Function writes records and the authenticated Control Center reads them.
create table public.website_callback_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  service_key text not null check (service_key ~ '^[a-z][a-z0-9_]{1,39}$'),
  service_label text not null check (char_length(service_label) between 2 and 80),
  source_path text not null check (left(source_path, 1) = '/' and char_length(source_path) <= 240),
  locale text not null default 'en' check (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  consent_version text not null check (char_length(consent_version) between 3 and 40),
  consented_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  last_contacted_at timestamptz,
  last_actor_id uuid references public.staff_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index website_callback_leads_queue_idx
  on public.website_callback_leads(status, created_at desc);
create index website_callback_leads_phone_time_idx
  on public.website_callback_leads(phone, created_at desc);

alter table public.website_callback_leads enable row level security;
revoke all on public.website_callback_leads from public, anon, authenticated;
grant all on public.website_callback_leads to service_role;

create trigger website_callback_leads_set_updated_at
  before update on public.website_callback_leads
  for each row execute function private.set_updated_at();

comment on table public.website_callback_leads is
  'Consent-backed callback requests submitted through the public RegisterBox website.';
