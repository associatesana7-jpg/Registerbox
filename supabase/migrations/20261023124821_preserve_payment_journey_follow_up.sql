-- Preserve recovery work recorded before this journey created its order.
create or replace view public.payment_operations_rows with(security_invoker=true) as
select o.id,o.id as checkout_id,j.id as journey_id,o.user_id,o.business_id,o.application_id,o.package_id,o.package_title,o.amount,o.currency,o.status,o.provider_mode,
 o.razorpay_order_id,o.razorpay_payment_id,o.created_at,o.paid_at,coalesce(j.last_activity_at,o.created_at) as last_activity_at,
 coalesce(j.last_event,'order_created') as journey_status,o.provider_create_token,o.reconciled_at,o.dispute_status,o.settlement_status,
 coalesce((select sum(r.amount) from public.payment_refunds r where r.checkout_id=o.id and r.status='processed'),0)::bigint as refunded_paise,
 (select count(*) from public.payment_attempts a where a.checkout_id=o.id and a.status='failed') as failed_attempts,
 p.full_name as customer_name,p.email as customer_email,p.phone as customer_phone,coalesce(b.trade_name,b.legal_name) as business_name,a.application_number as application_reference,
 coalesce(c.status,cj.status,'open') as follow_up_status,
 lower(concat_ws(' ',o.id::text,o.razorpay_order_id,o.razorpay_payment_id,o.package_title,p.full_name,p.email,p.phone,b.trade_name,b.legal_name,a.application_number)) as search_text
from public.service_checkout_orders o
left join lateral(select * from public.payment_journeys j where j.checkout_id=o.id or j.id=o.journey_id order by last_activity_at desc limit 1) j on true
left join public.profiles p on p.id=o.user_id left join public.business_profiles b on b.id=o.business_id left join public.applications a on a.id=o.application_id left join public.payment_cases c on c.id=o.id left join public.payment_cases cj on cj.id=j.id
union all
select j.id,null::uuid,j.id,j.user_id,j.business_id,j.application_id,j.package_id,j.package_title,j.amount,j.currency,'viewed','unknown',null,null,j.created_at,null::timestamptz,j.last_activity_at,j.last_event,null::uuid,null::timestamptz,null,'unknown',0::bigint,0::bigint,
 p.full_name,p.email,p.phone,coalesce(b.trade_name,b.legal_name),a.application_number,coalesce(c.status,'open'),lower(concat_ws(' ',j.id::text,j.package_title,p.full_name,p.email,p.phone,b.trade_name,b.legal_name,a.application_number))
from public.payment_journeys j left join public.profiles p on p.id=j.user_id left join public.business_profiles b on b.id=j.business_id left join public.applications a on a.id=j.application_id left join public.payment_cases c on c.id=j.id
where j.checkout_id is null and not exists(select 1 from public.service_checkout_orders o where o.journey_id=j.id);
