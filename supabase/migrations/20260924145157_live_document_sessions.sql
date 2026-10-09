create table public.document_fetch_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 business_id uuid not null references public.business_profiles(id),
 provider_session_id text not null unique,
 created_at timestamptz not null default now()
);
alter table public.document_fetch_sessions enable row level security;
create policy document_fetch_sessions_owner on public.document_fetch_sessions for select to authenticated using (user_id = (select auth.uid()));
grant select on public.document_fetch_sessions to authenticated;
create index document_fetch_sessions_user_idx on public.document_fetch_sessions(user_id);
create index document_fetch_sessions_business_idx on public.document_fetch_sessions(business_id);
update storage.buckets set allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/heic','image/heif','image/webp','application/xml','text/xml'] where id='business-documents';
