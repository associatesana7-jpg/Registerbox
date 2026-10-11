-- RegisterBox Control Center: secure Phase 1 foundation.
-- Staff tables are server-only. The admin client talks to an authenticated
-- Edge Function and never receives service-role credentials or unrestricted
-- Data API access.

create extension if not exists pg_cron;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[A-Z][A-Z0-9_]+$'),
  name text not null,
  description text not null default '',
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  description text not null,
  risk text not null default 'standard' check (risk in ('standard','sensitive','high')),
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  email text not null unique check (email = lower(email)),
  display_name text,
  status text not null default 'active' check (status in ('invited','active','suspended','offboarded')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  staff_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.staff_profiles(user_id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (staff_user_id, role_id)
);

create table public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null,
  invited_by uuid references public.staff_profiles(user_id) on delete set null,
  accepted_by uuid references public.staff_profiles(user_id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index staff_invites_one_pending_email_idx on public.staff_invites(email) where status = 'pending';

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  channel text not null check (channel in ('in_app','email','whatsapp','sms','push')),
  subject text,
  body text not null,
  version integer not null default 1 check (version > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, channel, version)
);

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','whatsapp','sms','push')),
  expiry_alerts_enabled boolean not null default false,
  days_before integer[] not null default array[30,7,0],
  updated_at timestamptz not null default now(),
  primary key (user_id, business_id, channel),
  check (days_before <@ array[90,60,30,14,7,3,1,0])
);

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.business_profiles(id) on delete cascade,
  category text not null check (category in ('licence_expiry','registration_expiry','application','payment','system')),
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  body text not null,
  action_path text,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.business_profiles(id) on delete cascade,
  template_key text not null,
  channel text not null check (channel in ('in_app','email','whatsapp','sms','push')),
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
  provider_message_id text,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications add column if not exists sla_due_at timestamptz;

create index applications_sla_queue_idx on public.applications(sla_due_at, status) where deleted_at is null and sla_due_at is not null;
create index applications_priority_updated_idx on public.applications(priority, updated_at desc) where deleted_at is null;
create index government_queries_status_deadline_idx on public.government_queries(status, deadline);
create index licenses_expiry_active_idx on public.licenses(expiry_date, business_id) where expiry_date is not null and status = 'active';
create index business_registrations_expiry_idx on public.business_registrations(expiry_date, business_id)
  where expiry_date is not null and status in ('VERIFIED_ACTIVE','USER_DECLARED');
create index user_notifications_user_time_idx on public.user_notifications(user_id, created_at desc);
create index notification_runs_queue_idx on public.notification_runs(status, scheduled_for) where status in ('queued','failed');
create index staff_roles_role_idx on public.staff_roles(role_id);

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_notifications enable row level security;
alter table public.notification_runs enable row level security;

revoke all on public.roles, public.permissions, public.role_permissions, public.staff_profiles,
  public.staff_roles, public.staff_invites, public.notification_templates, public.notification_runs
  from public, anon, authenticated;
grant all on public.roles, public.permissions, public.role_permissions, public.staff_profiles,
  public.staff_roles, public.staff_invites, public.notification_templates, public.notification_runs
  to service_role;

revoke all on public.notification_preferences, public.user_notifications from public, anon, authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.user_notifications to authenticated;
grant all on public.notification_preferences, public.user_notifications to service_role;

create policy notification_preferences_owner_all on public.notification_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id and exists (
    select 1 from public.business_profiles b where b.id = business_id and b.user_id = (select auth.uid())
  ))
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.business_profiles b where b.id = business_id and b.user_id = (select auth.uid())
  ));

create policy user_notifications_owner_read on public.user_notifications
  for select to authenticated using ((select auth.uid()) = user_id);

create trigger roles_set_updated_at before update on public.roles
  for each row execute function private.set_updated_at();
create trigger staff_profiles_set_updated_at before update on public.staff_profiles
  for each row execute function private.set_updated_at();
create trigger notification_templates_set_updated_at before update on public.notification_templates
  for each row execute function private.set_updated_at();
create trigger notification_runs_set_updated_at before update on public.notification_runs
  for each row execute function private.set_updated_at();

insert into public.roles (key, name, description) values
  ('SUPER_ADMIN','Super Admin','Full Control Center access; audit logging always applies.'),
  ('COMPANY_ADMIN','Company Admin','Company operations management without infrastructure secret access.'),
  ('OPERATIONS_MANAGER','Operations Manager','Cases, staff assignments, workflows, and SLA queues.'),
  ('OPERATIONS_AGENT','Operations Agent','Assigned customer applications and operational tasks.'),
  ('COMPLIANCE_EXPERT','Compliance Expert','Compliance review, difficult cases, and government queries.'),
  ('COMPLIANCE_RULE_EDITOR','Compliance Rule Editor','Draft compliance rules without publish access.'),
  ('COMPLIANCE_APPROVER','Compliance Approver','Approve and publish maker-checker changes.'),
  ('DOCUMENT_REVIEWER','Document Reviewer','Masked document review and verification.'),
  ('SUPPORT_AGENT','Support Agent','Support context without unrestricted sensitive identity access.'),
  ('FINANCE_USER','Finance User','Orders, invoices, payments, and permitted refunds.'),
  ('ANALYST','Analyst','Aggregated read-only analytics with restricted PII.'),
  ('SECURITY_ADMIN','Security Admin','Security events, access logs, incidents, and permissions.'),
  ('AUDITOR','Auditor','Read-only permitted audit information.'),
  ('INTEGRATION_ADMIN','Developer / Integration Admin','Connector, webhook, job, and AI failure diagnostics.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (key, description, risk) values
  ('dashboard.read','View the operations command center.','standard'),
  ('customer.read','View permitted customer context.','standard'),
  ('customer.update','Update permitted customer information.','sensitive'),
  ('identity.read_masked','View masked identity values.','standard'),
  ('identity.read_full','Reveal full sensitive identity values with a reason.','high'),
  ('business.read','View business records.','standard'),
  ('business.update','Update business records.','sensitive'),
  ('document.read','View document metadata and permitted previews.','sensitive'),
  ('document.download','Download sensitive documents with a reason.','high'),
  ('document.verify','Verify a document.','sensitive'),
  ('application.read','View applications and workflows.','standard'),
  ('application.update','Update application operations.','sensitive'),
  ('application.submit','Submit an approved application.','high'),
  ('rule.create','Create a compliance rule draft.','sensitive'),
  ('rule.edit','Edit a compliance rule draft.','sensitive'),
  ('rule.approve','Approve another maker’s rule.','high'),
  ('rule.publish','Publish an approved compliance rule.','high'),
  ('workflow.edit','Edit workflow drafts.','sensitive'),
  ('workflow.publish','Publish approved workflows.','high'),
  ('payment.read','View payment records.','sensitive'),
  ('payment.refund','Issue permitted refunds through an approval workflow.','high'),
  ('ai.prompt_edit','Edit Groq prompt drafts.','sensitive'),
  ('ai.model_change','Change the production Groq model after approval.','high'),
  ('staff.manage','Invite, suspend, and assign staff roles.','high'),
  ('security.audit_read','Read security and audit events.','sensitive'),
  ('security.incident_manage','Manage security incidents.','high'),
  ('notification.manage','Manage templates, queues, and delivery retries.','sensitive'),
  ('data.export','Export approved customer data with purpose and scope.','high')
on conflict (key) do update set description = excluded.description, risk = excluded.risk;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.key = 'SUPER_ADMIN'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key in (
  'dashboard.read','customer.read','identity.read_masked','business.read','business.update',
  'document.read','document.verify','application.read','application.update','notification.manage'
) where r.key = 'OPERATIONS_MANAGER'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key in (
  'dashboard.read','customer.read','identity.read_masked','business.read','document.read',
  'application.read','application.update'
) where r.key = 'OPERATIONS_AGENT'
on conflict do nothing;

insert into public.staff_profiles (user_id, email, display_name, status)
select id, lower(email), coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)), 'active'
from auth.users where lower(email) = 'fekupsony@gmail.com'
on conflict (user_id) do update set email = excluded.email, status = 'active';

insert into public.staff_roles (staff_user_id, role_id)
select sp.user_id, r.id from public.staff_profiles sp cross join public.roles r
where sp.email = 'fekupsony@gmail.com' and r.key = 'SUPER_ADMIN'
on conflict do nothing;

insert into public.notification_templates (template_key, channel, subject, body, version) values
  ('compliance_expiry_30','in_app','Licence renewal due soon','{{service_name}} for {{business_name}} expires in {{days_remaining}} days.',1),
  ('compliance_expiry_7','in_app','Licence renewal needs attention','{{service_name}} for {{business_name}} expires in {{days_remaining}} days.',1),
  ('compliance_expired','in_app','Licence has expired','{{service_name}} for {{business_name}} expired on {{expiry_date}}. Review renewal requirements.',1)
on conflict (template_key, channel, version) do nothing;

create or replace function private.enqueue_expiry_notifications()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  reminder_window integer;
  template text;
  severity_value text;
  dedupe text;
  inserted_count integer := 0;
begin
  for item in
    select * from (
      select 'licence_expiry'::text as category, l.id as source_id, l.business_id,
        b.user_id, coalesce(b.trade_name,b.legal_name,'Business') as business_name,
        coalesce(s.name,'Licence') as service_name, l.expiry_date,
        (l.expiry_date - current_date)::integer as days_remaining
      from public.licenses l
      join public.business_profiles b on b.id = l.business_id and b.deleted_at is null
      left join public.services s on s.id = l.service_id
      where l.expiry_date is not null and l.status = 'active' and l.expiry_date <= current_date + 30
      union all
      select 'registration_expiry'::text, br.id, br.business_id, b.user_id,
        coalesce(b.trade_name,b.legal_name,'Business'), coalesce(rc.name,'Registration'), br.expiry_date,
        (br.expiry_date - current_date)::integer
      from public.business_registrations br
      join public.business_profiles b on b.id = br.business_id and b.deleted_at is null
      left join public.registration_catalog rc on rc.id = br.registration_catalog_id
      where br.expiry_date is not null and br.status in ('VERIFIED_ACTIVE','USER_DECLARED')
        and br.expiry_date <= current_date + 30
    ) expiring
  loop
    reminder_window := case when item.days_remaining <= 0 then 0 when item.days_remaining <= 7 then 7 else 30 end;
    template := case reminder_window when 0 then 'compliance_expired' when 7 then 'compliance_expiry_7' else 'compliance_expiry_30' end;
    severity_value := case reminder_window when 0 then 'critical' when 7 then 'warning' else 'info' end;
    dedupe := item.category || ':' || item.source_id || ':' || item.expiry_date || ':' || reminder_window;

    insert into public.user_notifications (
      user_id,business_id,category,severity,title,body,action_path,dedupe_key
    ) values (
      item.user_id,item.business_id,item.category,severity_value,
      case reminder_window when 0 then 'Compliance item expired' when 7 then 'Renewal needs attention' else 'Renewal due soon' end,
      item.service_name || ' for ' || item.business_name ||
        case when item.days_remaining <= 0 then ' expired on ' || to_char(item.expiry_date,'DD Mon YYYY')
             else ' expires in ' || item.days_remaining || ' days' end || '.',
      '/(tabs)/compliance', dedupe
    ) on conflict (dedupe_key) do nothing;

    if found then
      inserted_count := inserted_count + 1;
      insert into public.notification_runs (
        user_id,business_id,template_key,channel,status,payload,dedupe_key,sent_at
      ) values (
        item.user_id,item.business_id,template,'in_app','sent',
        jsonb_build_object('source_type',item.category,'source_id',item.source_id,'expiry_date',item.expiry_date,'days_remaining',item.days_remaining),
        dedupe || ':in_app',now()
      ) on conflict (dedupe_key) do nothing;
    end if;

    insert into public.notification_runs (
      user_id,business_id,template_key,channel,status,payload,dedupe_key
    )
    select item.user_id,item.business_id,template,np.channel,'queued',
      jsonb_build_object('source_type',item.category,'source_id',item.source_id,'expiry_date',item.expiry_date,'days_remaining',item.days_remaining),
      dedupe || ':' || np.channel
    from public.notification_preferences np
    where np.user_id = item.user_id and np.business_id = item.business_id
      and np.expiry_alerts_enabled and reminder_window = any(np.days_before)
      and np.channel in ('email','whatsapp','sms','push')
    on conflict (dedupe_key) do nothing;
  end loop;
  return inserted_count;
end;
$$;

revoke all on function private.enqueue_expiry_notifications() from public, anon, authenticated;
grant execute on function private.enqueue_expiry_notifications() to service_role;

select cron.schedule(
  'registerbox-daily-expiry-notifications',
  '15 3 * * *',
  'select private.enqueue_expiry_notifications();'
);

comment on table public.staff_profiles is 'Server-only staff identity allowlist for RegisterBox Control Center. Never authorize from client claims alone.';
comment on table public.notification_runs is 'PII-minimized notification outbox. Provider workers resolve destinations server-side and must never log OTPs, PAN, Aadhaar, passwords, or API keys.';
