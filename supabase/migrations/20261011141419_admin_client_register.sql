-- Staff-only CRM. Customer data remains in its original tables; views join it live.
create table public.admin_clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid unique references public.business_profiles(id),
  company_name text not null check (length(company_name) between 1 and 200),
  owner_name text not null default '', phone text not null default '', email text not null default '',
  notes text not null default '',
  import_key text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.admin_client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.admin_clients(id),
  service text not null check(service in ('FSSAI','LABOUR','MSME','IEC','TRADEMARK','ITR','GST','OTHER')),
  registration_number text not null default '', period text not null default '',
  registered_on date, due_on date,
  date_kind text not null default 'expiry' check(date_kind in ('expiry','filing','review','none')),
  status text not null default 'active' check(status in ('active','renewal_in_progress','renewed','closed')),
  notes text not null default '', import_key text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(due_on is null or registered_on is null or due_on >= registered_on),
  check(date_kind <> 'none' or due_on is null)
);
create index admin_client_services_client_idx on public.admin_client_services(client_id);
create index admin_client_services_due_idx on public.admin_client_services(due_on) where status in ('active','renewal_in_progress');
create table public.admin_client_documents (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.admin_clients(id),
  kind text not null, filename text not null, storage_path text unique not null,
  uploaded_by uuid not null references public.staff_profiles(user_id),
  created_at timestamptz not null default now()
);
create index admin_client_documents_client_idx on public.admin_client_documents(client_id);
create index admin_client_documents_actor_idx on public.admin_client_documents(uploaded_by);
create table public.admin_renewal_cases (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.admin_clients(id),
  record_id uuid not null, service text not null, status text not null default 'preparing' check(status in ('preparing','submitted','completed','cancelled')),
  notes text not null default '', created_by uuid not null references public.staff_profiles(user_id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index admin_renewal_cases_open_idx on public.admin_renewal_cases(record_id) where status in ('preparing','submitted');
create index admin_renewal_cases_client_idx on public.admin_renewal_cases(client_id);
create index admin_renewal_cases_actor_idx on public.admin_renewal_cases(created_by);
alter table public.admin_clients enable row level security;
alter table public.admin_client_services enable row level security;
alter table public.admin_client_documents enable row level security;
alter table public.admin_renewal_cases enable row level security;
revoke all on public.admin_clients,public.admin_client_services,public.admin_client_documents,public.admin_renewal_cases from anon,authenticated;
grant all on public.admin_clients,public.admin_client_services,public.admin_client_documents,public.admin_renewal_cases to service_role;

-- An internal trigger only provisions a staff index row; it grants no customer access.
create schema if not exists registerbox_internal;
revoke all on schema registerbox_internal from public,anon,authenticated;
create function registerbox_internal.index_admin_client() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.deleted_at is null then
    insert into public.admin_clients(business_id,company_name)
      values(new.id,coalesce(nullif(new.trade_name,''),nullif(new.legal_name,''),'Unnamed business'))
      on conflict(business_id) do nothing;
  end if;
  return new;
end; $$;
revoke all on function registerbox_internal.index_admin_client() from public,anon,authenticated;
create trigger index_admin_client after insert on public.business_profiles for each row execute function registerbox_internal.index_admin_client();
insert into public.admin_clients(business_id,company_name)
select id,coalesce(nullif(trade_name,''),nullif(legal_name,''),'Unnamed business') from public.business_profiles where deleted_at is null
on conflict(business_id) do nothing;

create view public.admin_client_directory with (security_invoker=true) as
select c.id,c.business_id,
  case when b.id is null then c.company_name else coalesce(nullif(b.trade_name,''),nullif(b.legal_name,''),c.company_name) end as company_name,
  coalesce(nullif(c.owner_name,''),p.full_name,'') as owner_name,
  coalesce(nullif(c.phone,''),nullif(b.phone,''),p.phone,'') as phone,
  coalesce(nullif(c.email,''),nullif(b.email,''),p.email,'') as email,
  c.notes,c.created_at,c.updated_at,case when b.id is null then 'staff' else 'app' end as source
from public.admin_clients c left join public.business_profiles b on b.id=c.business_id
left join public.profiles p on p.id=b.user_id
where c.business_id is null or b.deleted_at is null;

create view public.admin_service_register with (security_invoker=true) as
select s.id,s.client_id,s.service,s.registration_number,s.period,s.registered_on,s.due_on,s.date_kind,s.status,s.notes,'staff'::text as source
from public.admin_client_services s
union all
select l.id,c.id,coalesce(s.name,'Licence'),coalesce(l.licence_number,''),'',l.issue_date,l.expiry_date,
case when l.expiry_date is null then 'none' else 'expiry' end,l.status,'','app'
from public.licenses l join public.admin_clients c on c.business_id=l.business_id left join public.services s on s.id=l.service_id
union all
select r.id,c.id,coalesce(rc.name,'Registration'),coalesce(r.registration_number,''),'',r.issue_date,r.expiry_date,
case when r.expiry_date is null then 'none' else 'expiry' end,r.status,'','registration'
from public.business_registrations r join public.admin_clients c on c.business_id=r.business_id left join public.registration_catalog rc on rc.id=r.registration_catalog_id;
revoke all on public.admin_client_directory,public.admin_service_register from anon,authenticated;
grant select on public.admin_client_directory,public.admin_service_register to service_role;
create view public.admin_renewal_watch with (security_invoker=true) as
select s.*,c.company_name,c.owner_name,c.phone,c.email from public.admin_service_register s join public.admin_client_directory c on c.id=s.client_id;
revoke all on public.admin_renewal_watch from anon,authenticated;
grant select on public.admin_renewal_watch to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admin-client-documents','admin-client-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;

-- Atomic per-row imports: retries never overwrite an existing client or licence.
create function public.admin_import_client(p_actor uuid,p_row jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cid uuid; skey text; ckey text; matched integer; inserted_service uuid;
begin
  if not exists(select 1 from public.staff_profiles sp join public.staff_roles sr on sr.staff_user_id=sp.user_id
    join public.role_permissions rp on rp.role_id=sr.role_id join public.permissions p on p.id=rp.permission_id
    where sp.user_id=p_actor and sp.status='active' and p.key='application.update') then raise exception 'Staff write access required'; end if;
  if length(trim(coalesce(p_row->>'company_name',''))) not between 1 and 200 then raise exception 'Company name required'; end if;
  ckey:=md5(lower(trim(p_row->>'company_name'))||'|'||lower(trim(coalesce(p_row->>'owner_name','')))||'|'||coalesce(p_row->>'phone','')||'|'||lower(coalesce(p_row->>'email','')));
  perform pg_advisory_xact_lock(hashtextextended(ckey,0));
  select id into cid from public.admin_clients where import_key=ckey;
  if cid is null then
    select count(*),min(id::text)::uuid into matched,cid from public.admin_client_directory
      where lower(trim(company_name))=lower(trim(p_row->>'company_name')) and
      ((coalesce(p_row->>'phone','')<>'' and regexp_replace(phone,'[^0-9]','','g')=p_row->>'phone') or
       (coalesce(p_row->>'email','')<>'' and lower(email)=lower(p_row->>'email')));
    if matched>1 then raise exception 'Multiple clients match: open the correct client manually'; end if;
  end if;
  if cid is null then
    insert into public.admin_clients(company_name,owner_name,phone,email,import_key)
    values(trim(p_row->>'company_name'),coalesce(p_row->>'owner_name',''),coalesce(p_row->>'phone',''),lower(coalesce(p_row->>'email','')),ckey) returning id into cid;
  end if;
  if coalesce(p_row->>'service','')<>'' then
    skey:=md5(cid::text||'|'||(p_row->>'service')||'|'||coalesce(p_row->>'registration_number','')||'|'||coalesce(p_row->>'period','')||'|'||coalesce(p_row->>'registered_on','')||'|'||coalesce(p_row->>'due_on',''));
    insert into public.admin_client_services(client_id,service,registration_number,period,registered_on,due_on,date_kind,import_key)
      values(cid,p_row->>'service',coalesce(p_row->>'registration_number',''),coalesce(p_row->>'period',''),nullif(p_row->>'registered_on','')::date,nullif(p_row->>'due_on','')::date,coalesce(nullif(p_row->>'date_kind',''),'expiry'),skey)
      on conflict(import_key) do nothing returning id into inserted_service;
  end if;
  insert into public.audit_events(actor_id,actor_type,action,entity_type,entity_id,source)
    values(p_actor,'staff','CLIENT_IMPORT','admin_client',cid,'control-center-edge');
  return jsonb_build_object('clientId',cid,'serviceAdded',inserted_service is not null);
end; $$;
revoke all on function public.admin_import_client(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_import_client(uuid,jsonb) to service_role;
