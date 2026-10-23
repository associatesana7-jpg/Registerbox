-- Run after the checkout migration using a privileged SQL connection.
-- Fixtures, payment state and trigger effects are rolled back at the end.
begin;

insert into auth.users (id, email) values
  ('cad04908-bf91-4c13-93de-3f78bdc07c01', 'checkout-fixture-a@example.invalid'),
  ('cad04908-bf91-4c13-93de-3f78bdc07c02', 'checkout-fixture-b@example.invalid');

set local role service_role;
insert into public.service_checkout_orders
  (id, user_id, request_id, package_id, package_title, amount)
values
  ('cad04908-bf91-4c13-93de-3f78bdc07d01', 'cad04908-bf91-4c13-93de-3f78bdc07c01',
   'cad04908-bf91-4c13-93de-3f78bdc07e01', 'gst-registration', 'GST registration', 199900),
  ('cad04908-bf91-4c13-93de-3f78bdc07d02', 'cad04908-bf91-4c13-93de-3f78bdc07c02',
   'cad04908-bf91-4c13-93de-3f78bdc07e01', 'gst-registration', 'GST registration', 199900);

do $$ begin
  begin
    insert into public.service_checkout_orders
      (user_id, request_id, package_id, package_title, amount)
    values ('cad04908-bf91-4c13-93de-3f78bdc07c01', 'cad04908-bf91-4c13-93de-3f78bdc07e01',
      'gst-registration', 'GST registration', 199900);
    raise exception 'Duplicate checkout request accepted';
  exception when unique_violation then null; end;
  begin
    update public.service_checkout_orders set amount = 99
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01';
    raise exception 'Amount below minimum accepted';
  exception when check_violation then null; end;
  begin
    update public.service_checkout_orders set currency = 'USD'
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01';
    raise exception 'Unsupported currency accepted';
  exception when check_violation then null; end;
  begin
    update public.service_checkout_orders set status = 'paid', paid_at = now()
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01';
    raise exception 'Paid status without provider IDs accepted';
  exception when check_violation then null; end;
end; $$;

-- A server write with captured-payment details must remain possible.
update public.service_checkout_orders
set status = 'paid', razorpay_order_id = 'order_CheckoutFixtureA',
    razorpay_payment_id = 'pay_CheckoutFixtureA', paid_at = now()
where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01';

do $$ begin
  if not exists (
    select 1 from public.service_checkout_orders
    where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01' and status = 'paid'
  ) then raise exception 'Server payment confirmation failed'; end if;
  begin
    update public.service_checkout_orders set razorpay_order_id = 'order_CheckoutFixtureA'
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d02';
    raise exception 'Provider order reused across checkouts';
  exception when unique_violation then null; end;
  begin
    update public.service_checkout_orders set razorpay_payment_id = 'pay_CheckoutFixtureA'
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d02';
    raise exception 'Provider payment reused across checkouts';
  exception when unique_violation then null; end;
end; $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cad04908-bf91-4c13-93de-3f78bdc07c01","role":"authenticated"}', true);

do $$ begin
  if (select count(*) from public.service_checkout_orders) <> 1 then
    raise exception 'Owner receipt read or cross-customer isolation failed';
  end if;
  if not exists (select 1 from public.service_checkout_orders
    where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01' and status = 'paid') then
    raise exception 'Customer cannot read confirmed receipt';
  end if;
  begin
    insert into public.service_checkout_orders
      (user_id, request_id, package_id, package_title, amount)
    values ('cad04908-bf91-4c13-93de-3f78bdc07c01', gen_random_uuid(),
      'gst-registration', 'GST registration', 199900);
    raise exception 'Customer could create authoritative order';
  exception when insufficient_privilege then null; end;
  begin
    update public.service_checkout_orders set amount = 100, status = 'created', paid_at = null;
    raise exception 'Customer could alter payment state or amount';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.service_checkout_orders;
    raise exception 'Customer could delete payment receipts';
  exception when insufficient_privilege then null; end;
  begin
    truncate public.service_checkout_orders;
    raise exception 'Customer could truncate payment receipts';
  exception when insufficient_privilege then null; end;
end; $$;

select set_config('request.jwt.claims',
  '{"sub":"cad04908-bf91-4c13-93de-3f78bdc07c02","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.service_checkout_orders) <> 1
    or exists (select 1 from public.service_checkout_orders
      where id = 'cad04908-bf91-4c13-93de-3f78bdc07d01') then
    raise exception 'Second customer can read another customer receipt';
  end if;
end; $$;

set local role anon;
do $$ begin
  begin
    perform * from public.service_checkout_orders;
    raise exception 'Anonymous receipt read accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.service_checkout_orders
      (user_id, request_id, package_id, package_title, amount)
    values ('cad04908-bf91-4c13-93de-3f78bdc07c01', gen_random_uuid(),
      'gst-registration', 'GST registration', 199900);
    raise exception 'Anonymous order creation accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.service_checkout_orders set amount = 100;
    raise exception 'Anonymous receipt update accepted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.service_checkout_orders;
    raise exception 'Anonymous receipt deletion accepted';
  exception when insufficient_privilege then null; end;
  begin
    truncate public.service_checkout_orders;
    raise exception 'Anonymous receipt truncate accepted';
  exception when insufficient_privilege then null; end;
end; $$;

reset role;
select 'PASS: server checkout writes; owner-only receipt reads; customer and anonymous writes blocked; payment and idempotency constraints enforced' as verification;
rollback;
