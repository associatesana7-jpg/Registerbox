-- Payment observations are server authority; browser journey events are explicitly untrusted.
alter table public.service_checkout_orders add column provider_mode text not null default 'unknown' check(provider_mode in ('live','test','unknown')),
 add column reconciled_at timestamptz, add column dispute_status text,
 add column settlement_status text not null default 'unknown' check(settlement_status in ('unknown','settled'));

create table public.payment_journeys (
 id uuid primary key, user_id uuid not null references auth.users(id), business_id uuid references public.business_profiles(id),
 application_id uuid references public.applications(id), checkout_id uuid references public.service_checkout_orders(id),
 package_id text not null, package_title text not null, amount integer not null check(amount>=0), currency text not null check(currency='INR'),
 last_event text not null, created_at timestamptz not null default now(), last_activity_at timestamptz not null default now()
);
alter table public.service_checkout_orders add column journey_id uuid references public.payment_journeys(id);
create index payment_journeys_owner_time on public.payment_journeys(user_id,last_activity_at desc);
create index payment_journeys_checkout on public.payment_journeys(checkout_id);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), dedupe_key text not null unique,
 checkout_id uuid references public.service_checkout_orders(id), journey_id uuid references public.payment_journeys(id),
 user_id uuid references auth.users(id), event_type text not null,
 source text not null check(source in ('browser','provider','server','staff')),
 trust text not null check(trust in ('client_reported','provider_verified','server_observed','staff')),
 detail jsonb not null default '{}'::jsonb check(jsonb_typeof(detail)='object' and octet_length(detail::text)<8192),
 actor_id uuid references auth.users(id), created_at timestamptz not null default now()
);
create index payment_events_checkout_time on public.payment_events(checkout_id,created_at);
create index payment_events_journey_time on public.payment_events(journey_id,created_at);
create table public.payment_attempts (
 id text primary key check(id ~ '^pay_[A-Za-z0-9]+$'), checkout_id uuid not null references public.service_checkout_orders(id),
 status text not null check(status in ('created','authorized','captured','refunded','failed')),
 amount integer not null check(amount>=100), currency text not null check(currency='INR'), method text,
 error_code text, error_description text, provider_created_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payment_attempts_checkout on public.payment_attempts(checkout_id);
create table public.payment_refunds (
 id text primary key check(id ~ '^rfnd_[A-Za-z0-9]+$'), checkout_id uuid not null references public.service_checkout_orders(id),
 payment_id text not null references public.payment_attempts(id), amount integer not null check(amount>0),
 currency text not null check(currency='INR'), status text not null check(status in ('pending','processed','failed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payment_refunds_checkout on public.payment_refunds(checkout_id);
create table public.payment_webhook_deliveries (
 id text primary key, body_hash text not null check(body_hash ~ '^[a-f0-9]{64}$'), event_type text not null,
 mode text not null check(mode in ('live','test')), status text not null default 'processing' check(status in ('processing','processed','ignored','unmatched','failed')),
 attempts integer not null default 1, checkout_id uuid references public.service_checkout_orders(id),
 error_code text, received_at timestamptz not null default now(), last_attempt_at timestamptz not null default now(), processed_at timestamptz
);
create index payment_webhook_status_time on public.payment_webhook_deliveries(status,last_attempt_at desc);
create table public.payment_cases (
 id uuid primary key, status text not null default 'open' check(status in ('open','contacted','resolved')),
 updated_by uuid references public.staff_profiles(user_id), updated_at timestamptz not null default now()
);
create table public.payment_staff_notes (
 id uuid primary key default gen_random_uuid(), case_id uuid not null, author_id uuid not null references public.staff_profiles(user_id),
 body text not null check(length(body) between 1 and 2000), created_at timestamptz not null default now()
);
create index payment_notes_case on public.payment_staff_notes(case_id,created_at);
create table public.payment_operator_alerts (
 id uuid primary key default gen_random_uuid(), checkout_id uuid references public.service_checkout_orders(id),
 dedupe_key text not null unique, severity text not null check(severity in ('info','warning','critical')),
 title text not null, detail text not null, created_at timestamptz not null default now()
);

-- No customer writes, including UPDATE/DELETE/TRUNCATE. Staff use authenticated Edge RBAC.
do $$ declare t text; begin
 foreach t in array array['payment_journeys','payment_events','payment_attempts','payment_refunds','payment_webhook_deliveries','payment_cases','payment_staff_notes','payment_operator_alerts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end $$;
revoke update on public.payment_events,public.payment_staff_notes,public.payment_operator_alerts from service_role;

create or replace function public.record_payment_journey(p_user uuid,p_journey uuid,p_event uuid,p_kind text,p_package text,p_title text,p_amount integer,p_business uuid default null,p_application uuid default null,p_checkout uuid default null,p_code text default null)
returns uuid language plpgsql security invoker set search_path = public,pg_temp as $$
declare j public.payment_journeys; o public.service_checkout_orders; begin
 if p_kind not in ('payment_page_viewed','checkout_cta_clicked','order_creation_requested','checkout_opened','checkout_dismissed','payment_failed_client','verification_started','verification_succeeded_client','verification_error_client','checkout_error_client') then raise exception 'Invalid journey event'; end if;
 if p_code is not null and p_code !~ '^[A-Z0-9_]{1,64}$' then raise exception 'Invalid event code'; end if;
 -- Serialize a newly introduced journey UUID too (a SELECT on a missing row cannot lock it).
 perform pg_advisory_xact_lock(hashtextextended(p_journey::text,0));
 if exists(select 1 from public.payment_events where dedupe_key='browser:'||p_event::text and (user_id<>p_user or journey_id<>p_journey)) then raise exception 'Event identity mismatch'; end if;
 if exists(select 1 from public.payment_events where dedupe_key='browser:'||p_event::text and user_id=p_user and journey_id=p_journey) then return p_journey; end if;
 if (select count(*) from public.payment_events where user_id=p_user and source='browser' and created_at>now()-interval '1 minute')>=60 then raise exception 'Journey event rate limit'; end if;
 if p_business is not null and not exists(select 1 from public.business_profiles where id=p_business and user_id=p_user and deleted_at is null) then raise exception 'Owner mismatch'; end if;
 if p_application is not null and not exists(select 1 from public.applications a join public.business_profiles b on b.id=a.business_id where a.id=p_application and a.business_id=p_business and b.user_id=p_user and a.deleted_at is null and b.deleted_at is null) then raise exception 'Application mismatch'; end if;
 if p_checkout is not null then
 select * into o from public.service_checkout_orders where id=p_checkout and user_id=p_user and package_id=p_package and application_id is not distinct from p_application and business_id is not distinct from p_business;
 if not found then raise exception 'Checkout mismatch'; end if;
 end if;
 select * into j from public.payment_journeys where id=p_journey for update;
 if found and (j.user_id<>p_user or j.package_id<>p_package or j.application_id is distinct from p_application or j.business_id is distinct from p_business or (j.checkout_id is not null and p_checkout is not null and j.checkout_id<>p_checkout)) then raise exception 'Journey mismatch'; end if;
 insert into public.payment_journeys(id,user_id,business_id,application_id,checkout_id,package_id,package_title,amount,currency,last_event)
 values(p_journey,p_user,p_business,p_application,p_checkout,p_package,p_title,p_amount,'INR',p_kind)
 on conflict(id) do update set checkout_id=coalesce(payment_journeys.checkout_id,excluded.checkout_id),last_event=excluded.last_event,last_activity_at=now()
 where payment_journeys.user_id=excluded.user_id and payment_journeys.package_id=excluded.package_id and payment_journeys.business_id is not distinct from excluded.business_id and payment_journeys.application_id is not distinct from excluded.application_id;
 if not found then raise exception 'Journey identity mismatch'; end if;
 insert into public.payment_events(dedupe_key,checkout_id,journey_id,user_id,event_type,source,trust,detail)
 values('browser:'||p_event,p_checkout,p_journey,p_user,p_kind,'browser','client_reported',jsonb_strip_nulls(jsonb_build_object('code',p_code))) on conflict(dedupe_key) do nothing;
 return p_journey;
end $$;

-- One transaction binds the observation, preserves terminal capture, and records its timeline.
create or replace function public.apply_payment_observation(p_checkout uuid,p_payment jsonb,p_source text,p_observation text,p_mode text,p_refund jsonb default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare o public.service_checkout_orders; a public.payment_attempts; r public.payment_refunds; pid text; ps text; next_status text; total_refunds bigint; begin
 if p_source not in ('webhook','verification','reconciliation') or p_mode not in ('live','test') then raise exception 'Invalid observation authority'; end if;
 select * into strict o from public.service_checkout_orders where id=p_checkout for update;
 if o.provider_mode<>'unknown' and o.provider_mode<>p_mode then raise exception 'Provider mode mismatch'; end if;
 pid:=p_payment->>'id'; ps:=p_payment->>'status';
 if pid !~ '^pay_[A-Za-z0-9]+$' or ps not in ('created','authorized','captured','refunded','failed') or p_payment->>'order_id' is distinct from o.razorpay_order_id or (p_payment->>'amount')::bigint<>o.amount or p_payment->>'currency' is distinct from o.currency then raise exception 'Payment binding mismatch'; end if;
 select * into a from public.payment_attempts where id=pid;
 if found and a.checkout_id<>o.id then raise exception 'Payment already bound'; end if;
 insert into public.payment_attempts(id,checkout_id,status,amount,currency,method,error_code,error_description,provider_created_at)
 values(pid,o.id,ps,o.amount,o.currency,left(p_payment->>'method',32),left(p_payment->>'error_code',64),left(p_payment->>'error_description',240),case when p_payment->>'created_at' ~ '^[0-9]{1,12}$' then to_timestamp((p_payment->>'created_at')::bigint) else null end)
 on conflict(id) do update set status=case when payment_attempts.status in ('captured','refunded') and excluded.status not in ('captured','refunded') then payment_attempts.status when payment_attempts.status='refunded' then 'refunded' when payment_attempts.status='authorized' and excluded.status='created' then 'authorized' else excluded.status end,method=coalesce(excluded.method,payment_attempts.method),error_code=coalesce(excluded.error_code,payment_attempts.error_code),error_description=coalesce(excluded.error_description,payment_attempts.error_description),updated_at=now();
 -- A refunded payment also proves prior capture, but never alters the original fee.
 next_status:=case when ps in ('captured','refunded') then 'paid' when ps='authorized' then 'authorized' else o.status end;
 if o.status='paid' then next_status:='paid'; end if;
 if next_status in ('paid','authorized') and o.razorpay_payment_id is not null and o.razorpay_payment_id<>pid then
 insert into public.payment_operator_alerts(checkout_id,dedupe_key,severity,title,detail) values(o.id,'additional-payment:'||pid,'critical','Additional payment on one checkout','Review provider receipts before taking action. No refund is initiated automatically.') on conflict(dedupe_key) do nothing;
 else
 update public.service_checkout_orders set status=next_status,provider_mode=p_mode,razorpay_payment_id=case when next_status in ('paid','authorized') then pid else razorpay_payment_id end,paid_at=case when next_status='paid' then coalesce(paid_at,now()) else null end,reconciled_at=case when p_source='reconciliation' then now() else reconciled_at end where id=o.id;
 end if;
 if p_refund is not null then
 if p_refund->>'id' !~ '^rfnd_[A-Za-z0-9]+$' or p_refund->>'payment_id' is distinct from pid or (p_refund->>'amount')::bigint<=0 or (p_refund->>'amount')::bigint>o.amount or p_refund->>'currency' is distinct from o.currency or p_refund->>'status' not in ('pending','processed','failed') then raise exception 'Refund binding mismatch'; end if;
 select * into r from public.payment_refunds where id=p_refund->>'id';
 if found and (r.checkout_id<>o.id or r.payment_id<>pid or r.amount<>(p_refund->>'amount')::bigint) then raise exception 'Refund already bound'; end if;
 insert into public.payment_refunds(id,checkout_id,payment_id,amount,currency,status) values(p_refund->>'id',o.id,pid,(p_refund->>'amount')::integer,o.currency,p_refund->>'status')
 on conflict(id) do update set status=case when payment_refunds.status='processed' then 'processed' else excluded.status end,updated_at=now();
 select coalesce(sum(amount),0) into total_refunds from public.payment_refunds where checkout_id=o.id and status='processed';
 if total_refunds>o.amount then raise exception 'Refund total exceeds checkout'; end if;
 end if;
 insert into public.payment_events(dedupe_key,checkout_id,journey_id,user_id,event_type,source,trust,detail)
 values('provider:'||p_observation,o.id,o.journey_id,o.user_id,case when p_refund is not null then 'refund.'||(p_refund->>'status') else 'payment.'||ps end,'provider','provider_verified',jsonb_build_object('paymentId',pid,'mode',p_mode,'via',p_source)) on conflict(dedupe_key) do nothing;
 return jsonb_build_object('success',true,'checkout_id',o.id);
end $$;

create or replace function private.payment_order_observed() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin
 insert into public.payment_events(dedupe_key,checkout_id,journey_id,user_id,event_type,source,trust,detail)
 values('order:'||new.id||':'||new.status||':'||coalesce(new.razorpay_payment_id,''),new.id,new.journey_id,new.user_id,'order.'||new.status,'server','server_observed',jsonb_build_object('amountPaise',new.amount,'mode',new.provider_mode)) on conflict(dedupe_key) do nothing;
 if new.status='paid' and (tg_op='INSERT' or old.status<>'paid') then
 insert into public.payment_operator_alerts(checkout_id,dedupe_key,severity,title,detail) values(new.id,'paid:'||new.id,'info','Payment received','Captured '||new.currency||' '||(new.amount/100.0)::text||' for '||new.package_title||' ('||new.provider_mode||').') on conflict(dedupe_key) do nothing;
 insert into public.user_notifications(user_id,business_id,category,severity,title,body,action_path,dedupe_key)
 values(new.user_id,new.business_id,'payment','info','Payment received','Your payment for '||new.package_title||' has been confirmed. Government approval is a separate process.',case when new.application_id is null then '/dashboard' else '/onboarding/payment?application='||new.application_id end,'checkout-paid:'||new.id) on conflict(dedupe_key) do nothing;
 end if;
 return new; end $$;
create trigger payment_order_observed after insert or update of status,razorpay_payment_id on public.service_checkout_orders for each row execute function private.payment_order_observed();

create view public.payment_operations_rows with(security_invoker=true) as
select o.id,o.id as checkout_id,j.id as journey_id,o.user_id,o.business_id,o.application_id,o.package_id,o.package_title,o.amount,o.currency,o.status,o.provider_mode,
 o.razorpay_order_id,o.razorpay_payment_id,o.created_at,o.paid_at,coalesce(j.last_activity_at,o.created_at) as last_activity_at,
 coalesce(j.last_event,'order_created') as journey_status,o.provider_create_token,o.reconciled_at,o.dispute_status,o.settlement_status,
 coalesce((select sum(r.amount) from public.payment_refunds r where r.checkout_id=o.id and r.status='processed'),0)::bigint as refunded_paise,
 (select count(*) from public.payment_attempts a where a.checkout_id=o.id and a.status='failed') as failed_attempts,
 p.full_name as customer_name,p.email as customer_email,p.phone as customer_phone,coalesce(b.trade_name,b.legal_name) as business_name,a.application_number as application_reference,
 coalesce(c.status,'open') as follow_up_status,
 lower(concat_ws(' ',o.id::text,o.razorpay_order_id,o.razorpay_payment_id,o.package_title,p.full_name,p.email,p.phone,b.trade_name,b.legal_name,a.application_number)) as search_text
from public.service_checkout_orders o
left join lateral(select * from public.payment_journeys j where j.checkout_id=o.id or j.id=o.journey_id order by last_activity_at desc limit 1) j on true
left join public.profiles p on p.id=o.user_id left join public.business_profiles b on b.id=o.business_id left join public.applications a on a.id=o.application_id left join public.payment_cases c on c.id=o.id
union all
select j.id,null::uuid,j.id,j.user_id,j.business_id,j.application_id,j.package_id,j.package_title,j.amount,j.currency,'viewed','unknown',null,null,j.created_at,null::timestamptz,j.last_activity_at,j.last_event,null::uuid,null::timestamptz,null,'unknown',0::bigint,0::bigint,
 p.full_name,p.email,p.phone,coalesce(b.trade_name,b.legal_name),a.application_number,coalesce(c.status,'open'),lower(concat_ws(' ',j.id::text,j.package_title,p.full_name,p.email,p.phone,b.trade_name,b.legal_name,a.application_number))
from public.payment_journeys j left join public.profiles p on p.id=j.user_id left join public.business_profiles b on b.id=j.business_id left join public.applications a on a.id=j.application_id left join public.payment_cases c on c.id=j.id
where j.checkout_id is null and not exists(select 1 from public.service_checkout_orders o where o.journey_id=j.id);
revoke all on public.payment_operations_rows from public,anon,authenticated;
grant select on public.payment_operations_rows to service_role;

insert into public.permissions(key,description,risk) values('payment.manage','Add internal payment notes and manage follow-up cases.','sensitive'),('payment.reconcile','Read Razorpay to reconcile payment evidence; cannot capture or refund.','sensitive'),('payment.export','Export up to 500 payment records with an audit reason.','high') on conflict(key) do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r cross join public.permissions p where r.key in ('SUPER_ADMIN','COMPANY_ADMIN','FINANCE_USER') and p.key in ('payment.read','payment.manage','payment.reconcile','payment.export') on conflict do nothing;
revoke all on function public.record_payment_journey(uuid,uuid,uuid,text,text,text,integer,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_payment_journey(uuid,uuid,uuid,text,text,text,integer,uuid,uuid,uuid,text) to service_role;
revoke all on function public.apply_payment_observation(uuid,jsonb,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_payment_observation(uuid,jsonb,text,text,text,jsonb) to service_role;
comment on table public.payment_webhook_deliveries is 'Authenticated raw-body hash and delivery outcome only; card details, signatures and secrets are never persisted. Failed delivery retries remain reprocessable.';
comment on view public.payment_operations_rows is 'Server-only operations directory including customer journeys before an order exists. Unknown legacy mode is not silently assumed live. Inactivity does not prove abandonment.';

-- Provider retries are deduplicated and applied together with their delivery outcome.
create or replace function public.consume_payment_webhook(p_id text,p_hash text,p_kind text,p_mode text,p_checkout uuid default null,p_payment jsonb default null,p_refund jsonb default null,p_error text default null,p_dispute text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare d public.payment_webhook_deliveries; begin
 insert into public.payment_webhook_deliveries(id,body_hash,event_type,mode) values(p_id,p_hash,p_kind,p_mode)
 on conflict(id) do update set attempts=payment_webhook_deliveries.attempts+1,last_attempt_at=now();
 select * into strict d from public.payment_webhook_deliveries where id=p_id for update;
 if d.body_hash<>p_hash or d.mode<>p_mode then raise exception 'Webhook event conflict'; end if;
 if d.status in ('processed','ignored') then return jsonb_build_object('success',true,'duplicate',true); end if;
 if p_error is not null then update public.payment_webhook_deliveries set status=case when p_error='UNMATCHED_ORDER' then 'unmatched' else 'failed' end,error_code=p_error where id=p_id; return jsonb_build_object('success',false); end if;
 if p_checkout is null then update public.payment_webhook_deliveries set status='ignored',processed_at=now() where id=p_id; return jsonb_build_object('success',true,'ignored',true); end if;
 begin
 perform public.apply_payment_observation(p_checkout,p_payment,'webhook',p_id,p_mode,p_refund);
 if p_dispute is not null then
 update public.service_checkout_orders set dispute_status=left(p_dispute,64) where id=p_checkout;
 insert into public.payment_events(dedupe_key,checkout_id,event_type,source,trust,detail) values('dispute:'||p_id,p_checkout,'dispute.'||left(p_dispute,64),'provider','provider_verified','{}'::jsonb) on conflict(dedupe_key) do nothing;
 insert into public.payment_operator_alerts(checkout_id,dedupe_key,severity,title,detail) values(p_checkout,'dispute:'||p_id,'critical','Provider dispute / chargeback update','Review the Razorpay dashboard and respond within the provider deadline.') on conflict(dedupe_key) do nothing;
 end if;
 update public.payment_webhook_deliveries set checkout_id=p_checkout,status='processed',processed_at=now(),error_code=null where id=p_id;
 exception when others then
 update public.payment_webhook_deliveries set status='failed',error_code='OBSERVATION_REJECTED' where id=p_id;
 return jsonb_build_object('success',false);
 end;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.consume_payment_webhook(text,text,text,text,uuid,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.consume_payment_webhook(text,text,text,text,uuid,jsonb,jsonb,text,text) to service_role;

create or replace function public.list_payment_operations(p_page integer default 0,p_size integer default 25,p_query text default '',p_status text default 'all',p_mode text default 'all',p_from timestamptz default null,p_to timestamptz default null,p_export boolean default false)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
with filtered as (
 select *, (status<>'paid' and last_activity_at<now()-interval '30 minutes') as inactive,
 (status<>'paid' and last_activity_at<now()-interval '30 minutes') or (provider_create_token is not null and razorpay_order_id is null) or status='authorized' or (failed_attempts>0 and status<>'paid') or (status<>'viewed' and provider_mode='unknown') or (dispute_status is not null and dispute_status not in ('closed','won')) as attention
 from public.payment_operations_rows
 where (p_query='' or strpos(search_text,lower(p_query))>0) and (p_mode='all' or provider_mode=p_mode)
 and (p_from is null or created_at>=p_from) and (p_to is null or created_at<p_to)
), selected as (
 select * from filtered where p_status='all' or status=p_status
 or (p_status='pending' and status in ('created','pending_payment','authorized','viewed'))
 or (p_status='failed' and failed_attempts>0) or (p_status='inactive' and inactive) or (p_status='attention' and attention)
 or (p_status='refunded' and refunded_paise>0)
), paged as (select * from selected order by created_at desc,id desc limit case when p_export then 501 else greatest(1,least(p_size,100))+1 end offset case when p_export then 0 else greatest(0,p_page)*greatest(1,least(p_size,100)) end)
select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'total',(select count(*) from selected),
 'summary',(select jsonb_build_object('receivedPaise',coalesce(sum(amount)filter(where status='paid' and provider_mode='live'),0),'refundedPaise',coalesce(sum(refunded_paise)filter(where provider_mode='live'),0),'paidCount',count(*)filter(where status='paid'),'pendingCount',count(*)filter(where status in ('created','pending_payment','authorized','viewed')),'inactiveCount',count(*)filter(where inactive),'failedCount',count(*)filter(where failed_attempts>0 or status='failed'),'attentionCount',count(*)filter(where attention),'totalCount',count(*)) from selected));
$$;
revoke all on function public.list_payment_operations(integer,integer,text,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.list_payment_operations(integer,integer,text,text,text,timestamptz,timestamptz,boolean) to service_role;
