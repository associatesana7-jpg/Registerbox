-- Rollback-only integration checks. No provider calls, charges or notifications escape this transaction.
begin;
set local role service_role;
do $$
<<qa>>
declare
  owner_id uuid; business_id uuid; staff_id uuid; checkout_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid(); journey_id uuid := gen_random_uuid(); event_id uuid := gen_random_uuid();
  provider_order text := 'order_QA' || replace(gen_random_uuid()::text, '-', '');
  provider_payment text := 'pay_QA' || replace(gen_random_uuid()::text, '-', '');
  refund_id text := 'rfnd_QA' || replace(gen_random_uuid()::text, '-', '');
  receipt public.service_checkout_orders; payment jsonb; observed jsonb; t text; rejected boolean;
  delivery text := 'test:qa-' || gen_random_uuid()::text;
begin
  select user_id, sco.business_id into owner_id, business_id from public.service_checkout_orders sco limit 1;
  if owner_id is null then raise exception 'Fixture needs one existing account-owned checkout'; end if;
  foreach t in array array['payment_journeys','payment_events','payment_attempts','payment_refunds','payment_webhook_deliveries','payment_cases','payment_staff_notes','payment_operator_alerts'] loop
    if not (select relrowsecurity from pg_class where oid=('public.' || t)::regclass) then raise exception 'RLS missing: %',t; end if;
    if has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') or has_table_privilege('anon','public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') then raise exception 'Client grant exposed: %',t; end if;
  end loop;
  if has_table_privilege('service_role','public.payment_events','UPDATE,DELETE,TRUNCATE') then raise exception 'Payment events are not append only'; end if;
  if has_function_privilege('authenticated','public.apply_payment_observation(uuid,jsonb,text,text,text,jsonb)','EXECUTE') or has_function_privilege('anon','public.consume_payment_webhook(text,text,text,text,uuid,jsonb,jsonb,text,text)','EXECUTE') then raise exception 'Provider authority exposed'; end if;

  perform public.record_payment_journey(owner_id,journey_id,event_id,'payment_page_viewed','gst-registration','GST Registration',199900,business_id);
  perform public.record_payment_journey(owner_id,journey_id,event_id,'payment_page_viewed','gst-registration','GST Registration',199900,business_id);
  if (select count(*) from public.payment_events where dedupe_key='browser:'||event_id::text)<>1 then raise exception 'Journey replay was duplicated'; end if;
  if not exists(select 1 from public.payment_operations_rows r where r.id=qa.journey_id and r.checkout_id is null and r.status='viewed') then raise exception 'Pre-order journey missing from operations'; end if;
  rejected := false;
  begin
    perform public.record_payment_journey(other_id,journey_id,gen_random_uuid(),'checkout_opened','gst-registration','GST Registration',199900,null);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Another account could modify a journey'; end if;

  select user_id into staff_id from public.staff_profiles limit 1;
  if staff_id is null then raise exception 'Fixture needs one existing staff profile'; end if;
  insert into public.payment_cases(id,status,updated_by) values(journey_id,'contacted',staff_id);
  insert into public.payment_staff_notes(case_id,author_id,body) values(journey_id,staff_id,'QA note before an order exists');
  insert into public.service_checkout_orders(id,user_id,business_id,package_id,package_title,amount,currency,status,razorpay_order_id,request_id,provider_mode,journey_id)
  values(checkout_id,owner_id,business_id,'gst-registration','QA rollback fixture',199900,'INR','pending_payment',provider_order,gen_random_uuid(),'test',journey_id);
  if (select follow_up_status from public.payment_operations_rows r where r.id=qa.checkout_id)<>'contacted' then raise exception 'Pre-order follow-up was lost'; end if;
  if not exists(select 1 from public.payment_staff_notes n join public.payment_operations_rows r on n.case_id in (r.id,r.journey_id) where r.id=qa.checkout_id and n.body='QA note before an order exists') then raise exception 'Pre-order note was lost'; end if;
  payment := jsonb_build_object('id',provider_payment,'order_id',provider_order,'amount',199900,'currency','INR','status','captured','method','upi');
  perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-capture-'||checkout_id,'test');
  perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-capture-'||checkout_id,'test');
  select * into receipt from public.service_checkout_orders where id=checkout_id;
  if receipt.status<>'paid' or receipt.razorpay_payment_id<>provider_payment or receipt.paid_at is null then raise exception 'Captured payment not persisted'; end if;
  if (select count(*) from public.payment_operator_alerts where dedupe_key='paid:'||qa.checkout_id::text)<>1 then raise exception 'Paid alert missing or duplicated'; end if;
  if (select count(*) from public.user_notifications where dedupe_key='checkout-paid:'||checkout_id::text)<>1 then raise exception 'Customer receipt notice missing or duplicated'; end if;
  perform public.apply_payment_observation(checkout_id,jsonb_set(payment,'{status}','"authorized"'),'reconciliation','qa-late-auth-'||checkout_id,'test');
  if (select status from public.service_checkout_orders where id=checkout_id)<>'paid' then raise exception 'Late authorization downgraded paid receipt'; end if;

  rejected := false;
  begin
    perform public.apply_payment_observation(checkout_id,jsonb_set(payment,'{amount}','1'),'reconciliation','qa-wrong-amount-'||checkout_id,'test');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Payment amount mismatch accepted'; end if;
  rejected := false;
  begin
    perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-wrong-mode-'||checkout_id,'live');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Payment mode mismatch accepted'; end if;
  perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-refund-'||checkout_id,'test',jsonb_build_object('id',refund_id,'payment_id',provider_payment,'amount',50000,'currency','INR','status','processed'));
  perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-refund-repeat-'||checkout_id,'test',jsonb_build_object('id',refund_id,'payment_id',provider_payment,'amount',50000,'currency','INR','status','pending'));
  if (select status from public.payment_refunds where id=refund_id)<>'processed' then raise exception 'Refund status regressed'; end if;
  if (select refunded_paise from public.payment_operations_rows r where r.id=qa.checkout_id)<>50000 then raise exception 'Refund amount duplicated'; end if;
  if (select amount from public.service_checkout_orders where id=checkout_id)<>199900 then raise exception 'Refund changed original fee'; end if;
  rejected := false;
  begin
    perform public.apply_payment_observation(checkout_id,payment,'reconciliation','qa-over-refund-'||checkout_id,'test',jsonb_build_object('id','rfnd_QAExtra','payment_id',provider_payment,'amount',199900,'currency','INR','status','processed'));
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Refund total exceeded checkout'; end if;
  if exists(select 1 from public.payment_refunds where id='rfnd_QAExtra') then raise exception 'Rejected refund was not atomic'; end if;

  observed := public.consume_payment_webhook(delivery,repeat('a',64),'payment.captured','test',null,null,null,'UNMATCHED_ORDER');
  if (observed->>'success')::boolean then raise exception 'Unmatched delivery acknowledged'; end if;
  observed := public.consume_payment_webhook(delivery,repeat('a',64),'payment.captured','test',checkout_id,payment);
  if not (observed->>'success')::boolean then raise exception 'Retry did not process matched delivery'; end if;
  observed := public.consume_payment_webhook(delivery,repeat('a',64),'payment.captured','test',checkout_id,payment);
  if not (observed->>'duplicate')::boolean then raise exception 'Processed delivery not deduplicated'; end if;
  rejected := false;
  begin
    perform public.consume_payment_webhook(delivery,repeat('b',64),'payment.captured','test',checkout_id,payment);
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Conflicting delivery body accepted'; end if;
end $$;
select 'PASS as service_role: ownership, pre-order visibility, replay protection, receipts, alerts, no downgrade, amount/mode binding, atomic refund limits, webhook retry/dedup/hash conflict, restricted grants' as result;
rollback;
