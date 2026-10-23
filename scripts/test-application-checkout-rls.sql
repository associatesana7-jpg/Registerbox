-- Run after link_application_checkout using a privileged SQL connection.
-- Everything, including fixture users and application events, is rolled back.
begin;

insert into auth.users(id,email) values
  ('cbb04908-bf91-4c13-93de-3f78bdc07c01','application-checkout@example.invalid');
insert into public.business_profiles(id,user_id,legal_name) values
  ('cbb04908-bf91-4c13-93de-3f78bdc07b01','cbb04908-bf91-4c13-93de-3f78bdc07c01','Checkout fixture');
insert into public.services(id,name,slug,category,description,processing_method) values
  ('cbb04908-bf91-4c13-93de-3f78bdc07f01','Checkout fixture','application-checkout-fixture','Fixture','Fixture','HUMAN_ASSISTED');
insert into public.applications(id,business_id,service_id,status) values
  ('cbb04908-bf91-4c13-93de-3f78bdc07a01','cbb04908-bf91-4c13-93de-3f78bdc07b01','cbb04908-bf91-4c13-93de-3f78bdc07f01','READY_FOR_REVIEW');

set local role service_role;
insert into public.service_checkout_orders
  (id,user_id,business_id,application_id,request_id,package_id,package_title,amount)
values
  ('cbb04908-bf91-4c13-93de-3f78bdc07d01','cbb04908-bf91-4c13-93de-3f78bdc07c01',
   'cbb04908-bf91-4c13-93de-3f78bdc07b01','cbb04908-bf91-4c13-93de-3f78bdc07a01',
   gen_random_uuid(),'gst-registration','GST Registration',199900);

do $$ declare payment_state text; claimed integer;
begin
  foreach payment_state in array array['created','pending_payment','authorized','paid'] loop
    update public.service_checkout_orders set status=payment_state,
      razorpay_order_id='order_ApplicationFixture',
      razorpay_payment_id=case when payment_state in ('authorized','paid') then 'pay_ApplicationFixture' else null end,
      paid_at=case when payment_state='paid' then now() else null end
    where id='cbb04908-bf91-4c13-93de-3f78bdc07d01';
    begin
      insert into public.service_checkout_orders
        (user_id,business_id,application_id,request_id,package_id,package_title,amount)
      values ('cbb04908-bf91-4c13-93de-3f78bdc07c01','cbb04908-bf91-4c13-93de-3f78bdc07b01',
        'cbb04908-bf91-4c13-93de-3f78bdc07a01',gen_random_uuid(),'gst-registration','GST Registration',199900);
      raise exception 'Duplicate application payment accepted for state %',payment_state;
    exception when unique_violation then null; end;
  end loop;

  update public.service_checkout_orders set status='created',paid_at=null,
    razorpay_order_id=null,razorpay_payment_id=null
  where id='cbb04908-bf91-4c13-93de-3f78bdc07d01';
  update public.service_checkout_orders set provider_create_token=gen_random_uuid()
  where id='cbb04908-bf91-4c13-93de-3f78bdc07d01' and provider_create_token is null;
  get diagnostics claimed = row_count;
  if claimed<>1 then raise exception 'First provider creation claim failed'; end if;
  update public.service_checkout_orders set provider_create_token=gen_random_uuid()
  where id='cbb04908-bf91-4c13-93de-3f78bdc07d01' and provider_create_token is null;
  get diagnostics claimed = row_count;
  if claimed<>0 then raise exception 'Provider creation claim was replaced'; end if;

  begin
    update public.service_checkout_orders set application_id=gen_random_uuid()
    where id='cbb04908-bf91-4c13-93de-3f78bdc07d01';
    raise exception 'Unknown application association accepted';
  exception when foreign_key_violation then null; end;
  begin
    update public.service_checkout_orders set business_id=null
    where id='cbb04908-bf91-4c13-93de-3f78bdc07d01';
    raise exception 'Application checkout without a business accepted';
  exception when check_violation then null; end;
end; $$;

-- Historical failed attempts do not block a fresh, server-approved attempt.
update public.service_checkout_orders set status='failed'
where id='cbb04908-bf91-4c13-93de-3f78bdc07d01';
insert into public.service_checkout_orders
  (user_id,business_id,application_id,request_id,package_id,package_title,amount)
values
  ('cbb04908-bf91-4c13-93de-3f78bdc07c01','cbb04908-bf91-4c13-93de-3f78bdc07b01',
   'cbb04908-bf91-4c13-93de-3f78bdc07a01',gen_random_uuid(),'gst-registration','GST Registration',199900);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"cbb04908-bf91-4c13-93de-3f78bdc07c01","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.service_checkout_orders where application_id='cbb04908-bf91-4c13-93de-3f78bdc07a01')<>2 then
    raise exception 'Owner cannot read application payment history';
  end if;
  begin
    update public.service_checkout_orders set application_id=null,provider_create_token=null;
    raise exception 'Customer could rewrite application association or provider claim';
  exception when insufficient_privilege then null; end;
end; $$;

reset role;
select 'PASS: one active payment per application; provider creation claim cannot be replaced; association FK enforced; customer mutations blocked' as verification;
rollback;
