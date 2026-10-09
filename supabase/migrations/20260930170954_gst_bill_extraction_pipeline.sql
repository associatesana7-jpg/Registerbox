create table public.gst_bill_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'extracted' check (status in ('extracting','extracted','reviewed','added_to_books','failed')),
  model text not null,
  schema_version text not null default 'gst-bill-v1',
  extracted_json jsonb not null default '{}'::jsonb,
  reviewed_json jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  warnings jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz,
  added_year integer check (added_year between 2017 and 2100),
  added_month integer check (added_month between 1 and 12),
  added_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, document_id)
);
create index gst_bill_extractions_business_time_idx on public.gst_bill_extractions(business_id, created_at desc);
alter table public.gst_bill_extractions enable row level security;
revoke all on public.gst_bill_extractions from public, anon, authenticated;
grant all on public.gst_bill_extractions to service_role;
comment on table public.gst_bill_extractions is 'Server-only AI bill extraction audit trail. Source document and user-reviewed values remain separate; AI output never files a GST return.';
