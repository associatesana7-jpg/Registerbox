-- RegisterBox AI MVP schema
-- User-owned data is protected with RLS. Staff authorization uses immutable app_metadata.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') in ('operations', 'expert', 'admin'), false)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'operations', 'expert', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  legal_name text,
  trade_name text,
  entity_type text,
  constitution text,
  pan text,
  gstin text,
  cin text,
  udyam_number text,
  business_category text,
  business_subcategory text,
  description text,
  website text,
  email text,
  phone text,
  annual_turnover numeric(15,2),
  employee_count integer check (employee_count is null or employee_count >= 0),
  business_start_date date,
  questionnaire jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'suspended', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index business_profiles_user_id_idx on public.business_profiles(user_id) where deleted_at is null;
create unique index business_profiles_pan_unique on public.business_profiles(pan) where pan is not null and deleted_at is null;
create unique index business_profiles_gstin_unique on public.business_profiles(gstin) where gstin is not null and deleted_at is null;

create table public.business_field_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  field_name text not null,
  field_value jsonb,
  source text not null check (source in ('USER_INPUT','DOCUMENT_EXTRACTION','GOVERNMENT_API','STAFF','AI_INFERENCE','IMPORT')),
  confidence numeric(4,3) check (confidence between 0 and 1),
  verification_status text not null default 'unverified',
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index business_field_evidence_business_idx on public.business_field_evidence(business_id, field_name);

create table public.business_addresses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  type text not null check (type in ('registered','principal','branch','warehouse','factory','office')),
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  district text,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country text not null default 'India',
  latitude numeric(10,7),
  longitude numeric(10,7),
  ownership_type text check (ownership_type in ('owned','rented','leased','other')),
  rent_agreement_document_id uuid,
  electricity_bill_document_id uuid,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_people (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  type text not null check (type in ('proprietor','partner','director','authorised_signatory','manager')),
  name text not null,
  mobile text,
  email text,
  pan text,
  din text,
  designation text,
  ownership_percentage numeric(5,2) check (ownership_percentage between 0 and 100),
  address jsonb not null default '{}'::jsonb,
  identity_documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  address_id uuid references public.business_addresses(id),
  industry text,
  employee_count integer check (employee_count is null or employee_count >= 0),
  turnover numeric(15,2),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  description text not null,
  government_authority text,
  jurisdiction text not null default 'India',
  pricing_type text not null default 'fixed',
  service_fee numeric(12,2) not null default 0,
  government_fee_logic jsonb not null default '{}'::jsonb,
  processing_method text not null check (processing_method in ('API','ASSISTED_AUTOMATION','HUMAN_ASSISTED','MANUAL')),
  api_available boolean not null default false,
  portal_assisted boolean not null default false,
  manual_review_required boolean not null default true,
  documents_schema jsonb not null default '[]'::jsonb,
  form_schema jsonb not null default '[]'::jsonb,
  workflow_definition jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_id uuid not null references public.services(id),
  jurisdiction_country text not null default 'India',
  state text,
  city text,
  entity_type text,
  industry text,
  subindustry text,
  business_activity text,
  turnover_min numeric(15,2),
  turnover_max numeric(15,2),
  employee_min integer,
  employee_max integer,
  conditions_json jsonb not null default '{}'::jsonb,
  result_status text not null check (result_status in ('REQUIRED','LIKELY_REQUIRED','CHECK_REQUIRED','RECOMMENDED','OPTIONAL','NOT_APPLICABLE','UNKNOWN')),
  reason_template text not null,
  priority integer not null default 100,
  version integer not null default 1,
  effective_from date not null default current_date,
  effective_to date,
  source_url text,
  source_document text,
  verified_by uuid references auth.users(id),
  last_verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index compliance_rules_match_idx on public.compliance_rules(active, industry, state, city, priority);

create table public.compliance_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.compliance_rules(id),
  version integer not null,
  conditions jsonb not null,
  result jsonb not null,
  effective_from date not null,
  effective_to date,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(rule_id, version)
);

create table public.compliance_results (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id),
  rule_id uuid references public.compliance_rules(id),
  status text not null check (status in ('REQUIRED','LIKELY_REQUIRED','CHECK_REQUIRED','RECOMMENDED','OPTIONAL','NOT_APPLICABLE','UNKNOWN')),
  reason text not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  missing_information jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  scanned_at timestamptz not null default now(),
  unique(business_id, service_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  person_id uuid references public.business_people(id),
  type text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_hash text,
  uploaded_by uuid not null references auth.users(id),
  source text not null default 'USER_INPUT',
  uploaded_at timestamptz not null default now(),
  expiry_date date,
  verified boolean not null default false,
  verification_status text not null default 'pending',
  ocr_status text not null default 'pending',
  metadata_json jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  deleted_at timestamptz
);
create index documents_business_idx on public.documents(business_id) where deleted_at is null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  status text not null default 'draft' check (status in ('draft','pending_payment','paid','cancelled','refunded')),
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid not null references public.services(id),
  service_fee numeric(12,2) not null,
  government_fee numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(order_id, service_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  order_id uuid not null references public.orders(id),
  provider text not null,
  provider_payment_id text,
  amount numeric(12,2) not null,
  tax numeric(12,2) not null default 0,
  currency text not null default 'INR',
  status text not null check (status in ('CREATED','PENDING','PAID','FAILED','REFUNDED','PARTIAL_REFUND')),
  payment_method text,
  paid_at timestamptz,
  refund_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  version integer not null,
  steps_json jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(service_id, version)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  service_id uuid not null references public.services(id),
  order_id uuid references public.orders(id),
  application_number text,
  government_reference text,
  status text not null default 'DRAFT' check (status in ('DRAFT','NEEDS_CUSTOMER_INFO','READY_FOR_REVIEW','READY_TO_FILE','WAITING_FOR_OTP','SUBMITTING','SUBMITTED','UNDER_REVIEW','GOVERNMENT_QUERY','RESPONSE_REQUIRED','RESPONSE_SUBMITTED','APPROVED','REJECTED','CANCELLED')),
  progress_percentage integer not null default 0 check (progress_percentage between 0 and 100),
  assigned_staff_id uuid references auth.users(id),
  priority text not null default 'normal',
  submission_mode text not null default 'HUMAN_ASSISTED',
  portal_name text,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  certificate_document_id uuid references public.documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index applications_business_status_idx on public.applications(business_id, status) where deleted_at is null;

create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  step_code text not null,
  name text not null,
  type text not null,
  status text not null default 'pending',
  assigned_to uuid references auth.users(id),
  requires_customer boolean not null default false,
  requires_staff boolean not null default false,
  requires_automation boolean not null default false,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.customer_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  application_id uuid references public.applications(id),
  type text not null check (type in ('UPLOAD_DOCUMENT','ENTER_OTP','CONFIRM_INFORMATION','SIGN_DOCUMENT','PAY_FEE','APPROVE_APPLICATION','ANSWER_QUESTION','OPEN_OFFICIAL_PORTAL')),
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','in_progress','completed','expired','cancelled')),
  priority text not null default 'normal',
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_actions_business_open_idx on public.customer_actions(business_id, status);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  event_type text not null,
  description text not null,
  actor_type text not null check (actor_type in ('customer','staff','system','ai','government_connector')),
  actor_id uuid,
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.government_queries (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id),
  query_text text not null,
  received_at timestamptz not null default now(),
  deadline timestamptz,
  status text not null default 'open',
  classification text,
  required_documents jsonb not null default '[]'::jsonb,
  ai_analysis jsonb not null default '{}'::jsonb,
  draft_response text,
  staff_review_required boolean not null default true,
  response_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  branch_id uuid references public.branches(id),
  service_id uuid not null references public.services(id),
  licence_number text not null,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  status text not null default 'active',
  certificate_document_id uuid references public.documents(id),
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  plan text not null check (plan in ('FREE','AUTOPILOT','BUSINESS')),
  billing_period text,
  status text not null default 'active',
  start_date date not null default current_date,
  renewal_date date,
  provider_subscription_id text,
  settings jsonb not null default '{"monitor_compliance":true,"monitor_licenses":true,"monitor_documents":true,"detect_new_requirements":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  business_id uuid references public.business_profiles(id),
  consent_type text not null,
  scope text not null,
  purpose text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip inet,
  device text
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null check (actor_type in ('customer','staff','system','ai','government_connector')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip inet,
  device text,
  source text,
  created_at timestamptz not null default now()
);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id),
  user_id uuid not null references auth.users(id),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  confidence numeric(4,3),
  tool_calls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Updated-at triggers.
do $$
declare t text;
begin
  foreach t in array array['profiles','business_profiles','business_addresses','business_people','branches','services','orders','payments','applications','customer_actions','government_queries','licenses','subscriptions','ai_conversations']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- RLS helpers and policies.
alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_field_evidence enable row level security;
alter table public.business_addresses enable row level security;
alter table public.business_people enable row level security;
alter table public.branches enable row level security;
alter table public.services enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.compliance_rule_versions enable row level security;
alter table public.compliance_results enable row level security;
alter table public.documents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.applications enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.customer_actions enable row level security;
alter table public.application_events enable row level security;
alter table public.government_queries enable row level security;
alter table public.licenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_events enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_staff()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and role = 'customer');

create policy businesses_owner_all on public.business_profiles for all to authenticated using ((select auth.uid()) = user_id or (select private.is_staff())) with check ((select auth.uid()) = user_id or (select private.is_staff()));

-- Child records inherit authorization through their business.
do $$
declare t text;
begin
  foreach t in array array['business_field_evidence','business_addresses','business_people','branches','compliance_results','documents','orders','applications','customer_actions','licenses','subscriptions','ai_conversations']
  loop
    execute format('create policy %I on public.%I for all to authenticated using (exists (select 1 from public.business_profiles b where b.id = business_id and (b.user_id = (select auth.uid()) or (select private.is_staff())))) with check (exists (select 1 from public.business_profiles b where b.id = business_id and (b.user_id = (select auth.uid()) or (select private.is_staff()))))', t || '_owner_all', t);
  end loop;
end $$;

create policy services_authenticated_read on public.services for select to authenticated using (active or (select private.is_staff()));
create policy rules_authenticated_read on public.compliance_rules for select to authenticated using (active or (select private.is_staff()));
create policy rule_versions_staff_read on public.compliance_rule_versions for select to authenticated using ((select private.is_staff()));
create policy workflow_definitions_authenticated_read on public.workflow_definitions for select to authenticated using (active or (select private.is_staff()));
create policy catalog_staff_write_services on public.services for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy catalog_staff_write_rules on public.compliance_rules for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy catalog_staff_write_rule_versions on public.compliance_rule_versions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy catalog_staff_write_workflows on public.workflow_definitions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

create policy order_items_owner_all on public.order_items for all to authenticated using (exists (select 1 from public.orders o join public.business_profiles b on b.id=o.business_id where o.id=order_id and (b.user_id=(select auth.uid()) or (select private.is_staff())))) with check (exists (select 1 from public.orders o join public.business_profiles b on b.id=o.business_id where o.id=order_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));
create policy payments_owner_all on public.payments for all to authenticated using (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or (select private.is_staff())))) with check (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));
create policy workflow_tasks_owner_read on public.workflow_tasks for select to authenticated using (exists (select 1 from public.applications a join public.business_profiles b on b.id=a.business_id where a.id=application_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));
create policy workflow_tasks_staff_write on public.workflow_tasks for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy application_events_owner_read on public.application_events for select to authenticated using (exists (select 1 from public.applications a join public.business_profiles b on b.id=a.business_id where a.id=application_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));
create policy application_events_staff_write on public.application_events for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy government_queries_owner_read on public.government_queries for select to authenticated using (exists (select 1 from public.applications a join public.business_profiles b on b.id=a.business_id where a.id=application_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));
create policy government_queries_staff_write on public.government_queries for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy consent_self_all on public.consent_records for all to authenticated using ((select auth.uid())=user_id or (select private.is_staff())) with check ((select auth.uid())=user_id or (select private.is_staff()));
create policy audit_self_read on public.audit_events for select to authenticated using (actor_id=(select auth.uid()) or (select private.is_staff()));
create policy audit_self_insert on public.audit_events for insert to authenticated with check (actor_id=(select auth.uid()) or (select private.is_staff()));
create policy ai_messages_owner_all on public.ai_messages for all to authenticated using (exists (select 1 from public.ai_conversations c join public.business_profiles b on b.id=c.business_id where c.id=conversation_id and (b.user_id=(select auth.uid()) or (select private.is_staff())))) with check (exists (select 1 from public.ai_conversations c join public.business_profiles b on b.id=c.business_id where c.id=conversation_id and (b.user_id=(select auth.uid()) or (select private.is_staff()))));

grant usage on schema public to anon, authenticated;
grant select on public.services, public.compliance_rules, public.workflow_definitions to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.business_profiles, public.business_field_evidence, public.business_addresses, public.business_people, public.branches, public.compliance_results, public.documents, public.orders, public.order_items, public.payments, public.applications, public.workflow_tasks, public.customer_actions, public.application_events, public.government_queries, public.licenses, public.subscriptions, public.consent_records, public.ai_conversations, public.ai_messages to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select, insert, update, delete on public.compliance_rule_versions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-documents', 'business-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/heic'])
on conflict (id) do nothing;

create policy business_documents_select on storage.objects for select to authenticated using (bucket_id='business-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy business_documents_insert on storage.objects for insert to authenticated with check (bucket_id='business-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy business_documents_update on storage.objects for update to authenticated using (bucket_id='business-documents' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='business-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy business_documents_delete on storage.objects for delete to authenticated using (bucket_id='business-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

insert into public.services (name, slug, category, description, government_authority, service_fee, processing_method, portal_assisted, documents_schema, workflow_definition) values
('FSSAI Licence','fssai','Food & Safety','Food safety registration or licence based on business type and turnover.','FSSAI',1999,'HUMAN_ASSISTED',true,'["PAN","PHOTO","ADDRESS_PROOF","RENT_AGREEMENT","PREMISES_LAYOUT"]','["PROFILE_CHECK","DOCUMENT_CHECK","INFORMATION_VALIDATION","APPLICATION_GENERATION","CUSTOMER_REVIEW_IF_REQUIRED","OTP_REQUIRED","PORTAL_SUBMISSION","SUBMITTED","GOVERNMENT_PROCESSING","QUERY_HANDLING","APPROVAL","CERTIFICATE_STORAGE"]'),
('GST Registration','gst-registration','Tax','Goods and Services Tax registration assessment and filing.','GSTN',999,'HUMAN_ASSISTED',true,'["PAN","ADDRESS_PROOF","PHOTO","BANK_PROOF"]','["PROFILE_CHECK","DOCUMENT_CHECK","APPLICATION_GENERATION","CUSTOMER_APPROVAL","PORTAL_SUBMISSION","SUBMITTED","APPROVAL"]'),
('Trade Licence','trade-licence','Local Licence','Municipal permission to carry on a trade from a premises.','Local Municipal Authority',999,'MANUAL',false,'["PAN","ADDRESS_PROOF","RENT_AGREEMENT","OWNER_NOC"]','["PROFILE_CHECK","DOCUMENT_CHECK","MANUAL_REVIEW","SUBMISSION","GOVERNMENT_PROCESSING","APPROVAL"]'),
('Shops & Establishment','shops-establishment','Labour','State registration for commercial establishments.','State Labour Department',999,'HUMAN_ASSISTED',true,'["PAN","ADDRESS_PROOF","EMPLOYEE_DETAILS"]','["PROFILE_CHECK","DOCUMENT_CHECK","APPLICATION_GENERATION","SUBMISSION","APPROVAL"]'),
('Professional Tax','professional-tax','Tax','State professional tax enrolment or registration check.','State Tax Department',499,'HUMAN_ASSISTED',true,'["PAN","ADDRESS_PROOF","EMPLOYEE_DETAILS"]','["PROFILE_CHECK","ELIGIBILITY_CHECK","DOCUMENT_CHECK","SUBMISSION"]'),
('Trademark','trademark','Intellectual Property','Protect a business name or brand with trademark registration.','Controller General of Patents, Designs and Trade Marks',6999,'HUMAN_ASSISTED',true,'["LOGO","IDENTITY_PROOF","BUSINESS_PROOF"]','["SEARCH","CLASSIFICATION","CUSTOMER_APPROVAL","FILING","EXAMINATION"]'),
('Udyam Assistance','udyam','MSME','Assistance with MSME/Udyam registration.','Ministry of MSME',499,'ASSISTED_AUTOMATION',true,'["AADHAAR","PAN","GST_CERTIFICATE"]','["PROFILE_CHECK","DOCUMENT_CHECK","OTP_REQUIRED","PORTAL_SUBMISSION","CERTIFICATE_STORAGE"]');

insert into public.compliance_rules (name, service_id, state, city, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'Food business requires FSSAI', id, null, null, 'Restaurant', 'REQUIRED', 'Businesses preparing or selling food generally need an FSSAI registration or licence. Final category depends on turnover and activity.', 10, 'https://www.fssai.gov.in/', now() from public.services where slug='fssai';
insert into public.compliance_rules (name, service_id, state, city, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'Bengaluru municipal trade licence check', id, 'Karnataka', 'Bengaluru', 'Restaurant', 'REQUIRED', 'A restaurant operating from a Bengaluru premises generally requires the applicable municipal trade permission.', 20, 'https://bbmp.gov.in/', now() from public.services where slug='trade-licence';
insert into public.compliance_rules (name, service_id, state, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'Karnataka shops registration', id, 'Karnataka', 'Restaurant', 'REQUIRED', 'Commercial establishments in Karnataka should be assessed for Shops and Establishments registration.', 30, 'https://labour.karnataka.gov.in/', now() from public.services where slug='shops-establishment';
insert into public.compliance_rules (name, service_id, industry, turnover_min, result_status, reason_template, priority, source_url, last_verified_at)
select 'GST threshold check', id, 'Restaurant', 2000000, 'CHECK_REQUIRED', 'Turnover and the nature of supplies must be checked to confirm GST registration applicability.', 40, 'https://www.gst.gov.in/', now() from public.services where slug='gst-registration';
insert into public.compliance_rules (name, service_id, state, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'Karnataka professional tax check', id, 'Karnataka', 'Restaurant', 'CHECK_REQUIRED', 'Professional tax obligations depend on the business and employee setup in Karnataka.', 50, 'https://pt.kar.nic.in/', now() from public.services where slug='professional-tax';
insert into public.compliance_rules (name, service_id, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'Brand protection option', id, 'Restaurant', 'OPTIONAL', 'Trademark registration can protect your business name and brand.', 80, 'https://ipindia.gov.in/', now() from public.services where slug='trademark';
insert into public.compliance_rules (name, service_id, industry, result_status, reason_template, priority, source_url, last_verified_at)
select 'MSME registration recommendation', id, 'Restaurant', 'RECOMMENDED', 'Udyam registration may unlock MSME benefits and simplify business recognition.', 70, 'https://udyamregistration.gov.in/', now() from public.services where slug='udyam';

insert into public.workflow_definitions (service_id, version, steps_json)
select id, 1, workflow_definition from public.services;
