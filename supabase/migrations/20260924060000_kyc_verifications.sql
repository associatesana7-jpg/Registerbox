create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.business_profiles(id) on delete set null,
  identifier_type text not null check (identifier_type in ('PAN', 'GSTIN')),
  identifier_hash text not null,
  identifier_last_four text not null,
  provider text not null default 'sandbox',
  provider_reference_id text,
  status text not null check (status in ('verified', 'invalid', 'failed')),
  normalized_data jsonb not null default '{}'::jsonb,
  consent_purpose text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index kyc_verifications_user_created_idx
  on public.kyc_verifications(user_id, created_at desc);
create index kyc_verifications_identifier_hash_idx
  on public.kyc_verifications(identifier_hash, identifier_type);

alter table public.kyc_verifications enable row level security;

create policy kyc_verifications_owner_select
  on public.kyc_verifications for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_staff()));

create policy kyc_verifications_owner_insert
  on public.kyc_verifications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy kyc_verifications_owner_update
  on public.kyc_verifications for update to authenticated
  using ((select auth.uid()) = user_id or (select private.is_staff()))
  with check ((select auth.uid()) = user_id or (select private.is_staff()));

grant select, insert, update on public.kyc_verifications to authenticated;

comment on table public.kyc_verifications is
  'Consent-backed PAN/GSTIN verification audit. Stores only a SHA-256 identifier fingerprint and last four characters; provider secrets never enter the client.';
