-- Dynamic RegisterBox onboarding engine. This evolves the existing MVP schema;
-- business_profiles remains the legal-entity record and business_addresses remains
-- the establishment/location record so production data is not duplicated.

alter table public.profiles add column if not exists onboarding_status text not null default 'not_started';

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','PROPRIETOR','PARTNER','DIRECTOR','AUTHORIZED_SIGNATORY','MANAGER','ACCOUNTANT')),
  ownership_percentage numeric(5,2) check (ownership_percentage is null or ownership_percentage between 0 and 100),
  status text not null default 'active' check (status in ('active','invited','suspended','revoked')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

insert into public.business_members (business_id, user_id, role, status)
select id, user_id, 'OWNER', 'active' from public.business_profiles
on conflict (business_id, user_id) do nothing;

create or replace function private.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.business_profiles b
      where b.id = target_business_id
        and b.deleted_at is null
        and b.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = target_business_id
        and bm.user_id = (select auth.uid())
        and bm.status = 'active'
    )
    or private.is_staff()
  )
$$;
revoke all on function private.can_access_business(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_access_business(uuid) to authenticated;

create table if not exists public.business_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  existing_business_id uuid references public.business_profiles(id) on delete set null,
  existing_establishment_id uuid references public.business_addresses(id) on delete set null,
  intent_type text not null check (intent_type in ('START_NEW_BUSINESS','REGISTER_COMPANY','REGISTER_LLP','START_FOOD_BUSINESS','ADD_BUSINESS_ACTIVITY','OPEN_NEW_BRANCH','START_MANUFACTURING','START_ECOMMERCE','START_RETAIL','CHECK_COMPLIANCE','GET_REGISTRATION','OTHER')),
  raw_user_input text not null,
  industry text,
  subindustry text,
  activities jsonb not null default '[]'::jsonb,
  location_state text,
  location_city text,
  entity_preference text,
  missing_critical_facts jsonb not null default '[]'::jsonb,
  status text not null default 'DISCOVERY' check (status in ('DISCOVERY','COLLECTING_DATA','READY_FOR_ANALYSIS','ANALYZED','PLAN_CREATED','CONVERTED','CANCELLED')),
  ai_confidence numeric(4,3) check (ai_confidence is null or ai_confidence between 0 and 1),
  classification_source text not null default 'AI' check (classification_source in ('AI','MANUAL','RULE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_intents_user_status_idx on public.business_intents(user_id, status, updated_at desc);

create table if not exists public.workflow_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_pack_requirements (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.workflow_packs(id) on delete cascade,
  field_key text not null,
  requirement_type text not null check (requirement_type in ('REQUIRED','CONDITIONAL','OPTIONAL')),
  condition_json jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  question_text text not null,
  help_text text,
  preferred_source text not null default 'USER' check (preferred_source in ('KNOWN','CONNECTOR','DOCUMENT','USER')),
  expected_answer_type text not null default 'text' check (expected_answer_type in ('text','boolean','number','choice','document','registration')),
  options_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (pack_id, field_key)
);

create table if not exists public.intent_workflow_packs (
  intent_id uuid not null references public.business_intents(id) on delete cascade,
  pack_id uuid not null references public.workflow_packs(id),
  source text not null default 'AI' check (source in ('AI','RULE','STAFF','USER')),
  created_at timestamptz not null default now(),
  primary key (intent_id, pack_id)
);

create table if not exists public.field_facts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  establishment_id uuid references public.business_addresses(id) on delete cascade,
  identity_verification_id uuid references public.kyc_verifications(id) on delete set null,
  intent_id uuid references public.business_intents(id) on delete cascade,
  field_key text not null,
  value_json jsonb not null,
  source_type text not null check (source_type in ('USER','REGISTERBOX','GOVERNMENT_API','PUBLIC_REGISTRY','DOCUMENT','AI_INFERENCE','STAFF')),
  source_reference text,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED','VERIFIED','CUSTOMER_CONFIRMED','CONFLICTED','EXPIRED')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (business_id is not null or intent_id is not null or identity_verification_id is not null)
);
create index if not exists field_facts_resolution_idx on public.field_facts(field_key, business_id, intent_id, verification_status, confidence desc, updated_at desc);

create table if not exists public.data_conflicts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade,
  intent_id uuid references public.business_intents(id) on delete cascade,
  field_key text not null,
  values_json jsonb not null,
  status text not null default 'OPEN' check (status in ('OPEN','RESOLVED','DISMISSED')),
  resolution jsonb,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.registration_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  authority text not null,
  level text not null check (level in ('PERSON','ENTITY','ESTABLISHMENT','BRANCH','ACTIVITY')),
  country text not null default 'India',
  state text,
  city text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.business_registrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  establishment_id uuid references public.business_addresses(id) on delete set null,
  registration_catalog_id uuid not null references public.registration_catalog(id),
  registration_number text,
  status text not null default 'NOT_CONNECTED' check (status in ('VERIFIED_ACTIVE','VERIFIED_INACTIVE','USER_DECLARED','NOT_CONNECTED','UNKNOWN','VERIFICATION_FAILED')),
  issue_date date,
  expiry_date date,
  source text not null default 'USER',
  verification_source text,
  verified_at timestamptz,
  certificate_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (business_id, establishment_id, registration_catalog_id)
);

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id uuid not null references public.business_intents(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ABANDONED')),
  current_stage text not null default 'intent',
  current_question_key text,
  completion_percentage integer not null default 0 check (completion_percentage between 0 and 100),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (intent_id)
);

create table if not exists public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  question_key text not null,
  answer_json jsonb not null,
  source text not null default 'USER' check (source in ('USER','KNOWN','CONNECTOR','DOCUMENT','AI_INFERENCE')),
  created_at timestamptz not null default now(),
  unique (session_id, question_key)
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id uuid references public.business_intents(id) on delete set null,
  operation text not null,
  model text not null,
  status text not null check (status in ('SUCCEEDED','FALLBACK','FAILED','RATE_LIMITED')),
  latency_ms integer,
  input_hash text,
  output_json jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.business_profiles(id) on delete cascade,
  intent_id uuid references public.business_intents(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['business_intents','workflow_packs','field_facts','business_registrations']
  loop
    if not exists (select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
    end if;
  end loop;
end $$;

alter table public.business_members enable row level security;
alter table public.business_intents enable row level security;
alter table public.workflow_packs enable row level security;
alter table public.workflow_pack_requirements enable row level security;
alter table public.intent_workflow_packs enable row level security;
alter table public.field_facts enable row level security;
alter table public.data_conflicts enable row level security;
alter table public.registration_catalog enable row level security;
alter table public.business_registrations enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.ai_runs enable row level security;
alter table public.domain_events enable row level security;

create policy business_members_read on public.business_members for select to authenticated using (private.can_access_business(business_id));
create policy business_members_owner_insert on public.business_members for insert to authenticated with check (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or private.is_staff())));
create policy business_members_owner_update on public.business_members for update to authenticated using (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or private.is_staff()))) with check (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or private.is_staff())));
create policy business_members_owner_delete on public.business_members for delete to authenticated using (exists (select 1 from public.business_profiles b where b.id=business_id and (b.user_id=(select auth.uid()) or private.is_staff())));

create policy business_profiles_member_read on public.business_profiles for select to authenticated using (private.can_access_business(id));
create policy business_intents_self_all on public.business_intents for all to authenticated using (user_id=(select auth.uid()) and (existing_business_id is null or private.can_access_business(existing_business_id))) with check (user_id=(select auth.uid()) and (existing_business_id is null or private.can_access_business(existing_business_id)));
create policy workflow_packs_read on public.workflow_packs for select to authenticated using (active or private.is_staff());
create policy workflow_pack_requirements_read on public.workflow_pack_requirements for select to authenticated using (exists (select 1 from public.workflow_packs p where p.id=pack_id and (p.active or private.is_staff())));
create policy intent_workflow_packs_self_all on public.intent_workflow_packs for all to authenticated using (exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid()))) with check (exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid())));
create policy field_facts_owner_all on public.field_facts for all to authenticated using ((business_id is not null and private.can_access_business(business_id)) or (intent_id is not null and exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid())))) with check ((business_id is not null and private.can_access_business(business_id)) or (intent_id is not null and exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid()))));
create policy data_conflicts_owner_all on public.data_conflicts for all to authenticated using ((business_id is not null and private.can_access_business(business_id)) or (intent_id is not null and exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid())))) with check ((business_id is not null and private.can_access_business(business_id)) or (intent_id is not null and exists (select 1 from public.business_intents i where i.id=intent_id and i.user_id=(select auth.uid()))));
create policy registration_catalog_read on public.registration_catalog for select to authenticated using (active or private.is_staff());
create policy business_registrations_owner_all on public.business_registrations for all to authenticated using (private.can_access_business(business_id)) with check (private.can_access_business(business_id));
create policy onboarding_sessions_self_all on public.onboarding_sessions for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy onboarding_answers_self_all on public.onboarding_answers for all to authenticated using (exists (select 1 from public.onboarding_sessions s where s.id=session_id and s.user_id=(select auth.uid()))) with check (exists (select 1 from public.onboarding_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create policy ai_runs_self_read on public.ai_runs for select to authenticated using (user_id=(select auth.uid()) or private.is_staff());
create policy ai_runs_self_insert on public.ai_runs for insert to authenticated with check (user_id=(select auth.uid()));
create policy domain_events_self_read on public.domain_events for select to authenticated using (user_id=(select auth.uid()) or (business_id is not null and private.can_access_business(business_id)) or private.is_staff());
create policy domain_events_self_insert on public.domain_events for insert to authenticated with check (user_id=(select auth.uid()) and (business_id is null or private.can_access_business(business_id)));

grant select, insert, update, delete on public.business_members, public.business_intents, public.intent_workflow_packs, public.field_facts, public.data_conflicts, public.business_registrations, public.onboarding_sessions, public.onboarding_answers to authenticated;
grant select on public.workflow_packs, public.workflow_pack_requirements, public.registration_catalog to authenticated;
grant select, insert on public.ai_runs, public.domain_events to authenticated;

insert into public.workflow_packs (code,name,description) values
('NEW_PROPRIETORSHIP','New proprietorship','Set up a new proprietor-led business.'),
('PRIVATE_LIMITED_FORMATION','Private limited formation','Form a private limited company.'),
('LLP_FORMATION','LLP formation','Form a limited liability partnership.'),
('FOOD_BUSINESS','Food business','Core food safety and operating facts.'),
('RESTAURANT','Restaurant','Dine-in and restaurant premises requirements.'),
('CLOUD_KITCHEN','Cloud kitchen','Delivery-first kitchen requirements.'),
('FOOD_MANUFACTURING','Food manufacturing','Packaged food and production requirements.'),
('RETAIL_ESTABLISHMENT','Retail establishment','Shop and retail premises requirements.'),
('ECOMMERCE','E-commerce','Online selling requirements.'),
('PROFESSIONAL_SERVICES','Professional services','Consulting and service business requirements.'),
('MANUFACTURING','Manufacturing','Factory, production, and workforce requirements.'),
('BRANCH_EXPANSION','Branch expansion','Open a new establishment under an existing entity.'),
('IMPORT_EXPORT','Import/export','Cross-border trade setup requirements.')
on conflict (code) do update set name=excluded.name, description=excluded.description, active=true;

insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'food.business_model','REQUIRED',10,'How will customers receive your food?','Choose every model that applies.','USER','choice','["DINE_IN","TAKEAWAY","DELIVERY","PACKAGED_RETAIL"]'::jsonb from public.workflow_packs where code='FOOD_BUSINESS'
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'establishment.address','REQUIRED',20,'Where will this business operate?','We reuse a verified GST address when available.','KNOWN','text','[]'::jsonb from public.workflow_packs where code in ('FOOD_BUSINESS','RETAIL_ESTABLISHMENT','MANUFACTURING','BRANCH_EXPANSION')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'business.annual_turnover','REQUIRED',30,'What annual turnover do you expect?','An estimate is enough; this affects licence categories.','KNOWN','number','[]'::jsonb from public.workflow_packs where code in ('FOOD_BUSINESS','ECOMMERCE','MANUFACTURING','RETAIL_ESTABLISHMENT')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'business.employee_count','REQUIRED',40,'How many people will work here?','Include founders working at the premises.','KNOWN','number','[]'::jsonb from public.workflow_packs where code in ('FOOD_BUSINESS','MANUFACTURING','RETAIL_ESTABLISHMENT')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'entity.founder_count','REQUIRED',10,'How many founders will there be?','Please confirm even if RegisterBox inferred this from your message.','USER','number','[]'::jsonb from public.workflow_packs where code in ('LLP_FORMATION','PRIVATE_LIMITED_FORMATION')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'business.legal_name','REQUIRED',5,'What should we call this business?','A working name is fine if the legal name is not final.','USER','text','[]'::jsonb from public.workflow_packs where code in ('NEW_PROPRIETORSHIP','PRIVATE_LIMITED_FORMATION','LLP_FORMATION')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'business.primary_activity','REQUIRED',15,'What will the business sell or do?','Describe the main product or service in one sentence.','USER','text','[]'::jsonb from public.workflow_packs where code in ('NEW_PROPRIETORSHIP','PRIVATE_LIMITED_FORMATION','LLP_FORMATION','PROFESSIONAL_SERVICES')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'identity.pan_status','REQUIRED',50,'Do you already have the relevant PAN?','You can verify it now, upload the PAN card, or continue without it.','CONNECTOR','registration','["VERIFY_NUMBER","UPLOAD_DOCUMENT","DO_NOT_HAVE","NOT_SURE"]'::jsonb from public.workflow_packs where code in ('NEW_PROPRIETORSHIP','PRIVATE_LIMITED_FORMATION','LLP_FORMATION')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'registration.gst_status','REQUIRED',55,'Does this business already have GST registration?','If yes, we can fetch the registered entity and address from GSTN through Sandbox.','CONNECTOR','registration','["VERIFY_NUMBER","UPLOAD_DOCUMENT","DO_NOT_HAVE","NOT_SURE"]'::jsonb from public.workflow_packs where code in ('NEW_PROPRIETORSHIP','FOOD_BUSINESS','ECOMMERCE','RETAIL_ESTABLISHMENT','MANUFACTURING','BRANCH_EXPANSION')
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'registration.fssai_status','REQUIRED',56,'Do you already have an FSSAI registration or licence?','Sandbox does not provide an FSSAI lookup. Add the number and certificate so RegisterBox can include it in your plan.','DOCUMENT','registration','["ENTER_NUMBER","UPLOAD_DOCUMENT","DO_NOT_HAVE","NOT_SURE"]'::jsonb from public.workflow_packs where code='FOOD_BUSINESS'
on conflict (pack_id,field_key) do nothing;
insert into public.workflow_pack_requirements (pack_id,field_key,requirement_type,priority,question_text,help_text,preferred_source,expected_answer_type,options_json)
select id,'premises.ownership_proof','CONDITIONAL',60,'Upload proof for the business premises','Rent agreement, ownership document, or owner NOC.','DOCUMENT','document','[]'::jsonb from public.workflow_packs where code in ('FOOD_BUSINESS','RETAIL_ESTABLISHMENT','MANUFACTURING','BRANCH_EXPANSION')
on conflict (pack_id,field_key) do nothing;

insert into public.registration_catalog (code,name,category,authority,level) values
('PAN','Permanent Account Number','Identity','Income Tax Department','PERSON'),
('GST','GST Registration','Tax','GSTN','ENTITY'),
('CIN','Corporate Identification Number','Entity','Ministry of Corporate Affairs','ENTITY'),
('LLPIN','LLP Identification Number','Entity','Ministry of Corporate Affairs','ENTITY'),
('FSSAI','FSSAI Registration / Licence','Food safety','Food Safety and Standards Authority of India','ACTIVITY'),
('SHOPS_ESTABLISHMENT','Shops & Establishment Registration','Labour','State Labour Department','ESTABLISHMENT'),
('PROFESSIONAL_TAX','Professional Tax','Tax','State Tax Department','ENTITY'),
('TRADE_LICENSE','Trade Licence','Local licence','Municipal Authority','ESTABLISHMENT'),
('UDYAM','Udyam Registration','MSME','Ministry of MSME','ENTITY'),
('TRADEMARK','Trademark','Intellectual property','IP India','ENTITY'),
('IEC','Importer Exporter Code','Trade','Directorate General of Foreign Trade','ENTITY')
on conflict (code) do update set name=excluded.name, category=excluded.category, authority=excluded.authority, level=excluded.level, active=true;

create or replace function public.get_next_onboarding_requirement(target_session_id uuid)
returns table(field_key text, question_text text, help_text text, expected_answer_type text, options_json jsonb, preferred_source text, completion_percentage integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with owned_session as (
    select s.id, s.intent_id
    from public.onboarding_sessions s
    where s.id=target_session_id and s.user_id=(select auth.uid()) and s.status='ACTIVE'
  ), requirements as (
    select distinct on (r.field_key) r.field_key, r.question_text, r.help_text, r.expected_answer_type, r.options_json, r.preferred_source, r.priority
    from owned_session s
    join public.intent_workflow_packs iwp on iwp.intent_id=s.intent_id
    join public.workflow_pack_requirements r on r.pack_id=iwp.pack_id
    where r.requirement_type in ('REQUIRED','CONDITIONAL')
    order by r.field_key, r.priority
  ), resolved as (
    select distinct f.field_key from owned_session s join public.field_facts f on f.intent_id=s.intent_id where f.verification_status in ('VERIFIED','CUSTOMER_CONFIRMED')
    union
    select distinct a.question_key from owned_session s join public.onboarding_answers a on a.session_id=s.id
  ), totals as (
    select count(*)::int total, count(*) filter (where r.field_key in (select resolved.field_key from resolved))::int done from requirements r
  )
  select r.field_key, r.question_text, r.help_text, r.expected_answer_type, r.options_json, r.preferred_source,
    case when t.total=0 then 100 else floor((t.done::numeric/t.total::numeric)*100)::int end
  from requirements r cross join totals t
  where r.field_key not in (select resolved.field_key from resolved)
  order by r.priority
  limit 1
$$;
grant execute on function public.get_next_onboarding_requirement(uuid) to authenticated;
