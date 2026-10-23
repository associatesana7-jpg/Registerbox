import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { validWebhookSignature, monotonicPaymentStatus, assertPaymentBinding, safeProviderPayment, paymentAttention } from '../supabase/functions/_shared/payment-operations.ts';
import { createJourneyHandler } from '../supabase/functions/_shared/payment-operations-journey.ts';
import { createPaymentWebhookHandler } from '../supabase/functions/_shared/payment-operations-webhook.ts';
import { paymentOperations, normalizePaymentFilters, paymentPermission } from '../supabase/functions/control-center/payments.ts';

const user='03b5222f-9329-438b-a199-c806bcfe4b80', checkout='91a9bbe0-4477-4b24-8770-c4d60b558336';
const journey='eee5658a-5db7-4fab-86c4-c8ca5dc202a3', event='7b0ba803-f8b4-4ff9-a317-1dedad2a65f7';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server',RAZORPAY_KEY_ID:'rzp_live_fixture',RAZORPAY_KEY_SECRET:'provider-secret',RAZORPAY_WEBHOOK_SECRET_LIVE:'webhook-secret'};
const payment={id:'pay_Fixture',order_id:'order_Fixture',amount:199900,currency:'INR',status:'captured',method:'upi'};
const order={id:checkout,user_id:user,amount:199900,currency:'INR',provider_mode:'live',razorpay_order_id:'order_Fixture'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const req=(body,headers={})=>new Request('https://fixture/endpoint',{method:'POST',headers:{Authorization:'Bearer fixture','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const sign=raw=>createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET_LIVE).update(raw).digest('hex');

test('webhook HMAC authenticates exact raw bytes and rejects altered body/signature',async()=>{
 const raw='{"event":"payment.captured"}';
 assert.equal(await validWebhookSignature(raw,sign(raw),env.RAZORPAY_WEBHOOK_SECRET_LIVE),true);
 assert.equal(await validWebhookSignature(raw+' ',sign(raw),env.RAZORPAY_WEBHOOK_SECRET_LIVE),false);
 assert.equal(await validWebhookSignature(raw,'a'.repeat(64),'wrong'),false);
 assert.equal(await validWebhookSignature(raw,'invalid',env.RAZORPAY_WEBHOOK_SECRET_LIVE),false);
});
test('captured state is terminal and refund proves prior capture without changing the fee',()=>{
 for(const later of ['created','authorized','failed','captured','refunded'])assert.equal(monotonicPaymentStatus('paid',later),'paid');
 assert.equal(monotonicPaymentStatus('pending_payment','refunded'),'paid');
 assert.equal(monotonicPaymentStatus('pending_payment','authorized'),'authorized');
 assert.equal(monotonicPaymentStatus('pending_payment','failed'),'pending_payment');
 assertPaymentBinding(order,payment);
 for(const patch of [{amount:1},{currency:'USD'},{order_id:'order_Other'},{status:'paid'},{id:'bad'}])assert.throws(()=>assertPaymentBinding(order,{...payment,...patch}));
});
test('provider projection excludes contact details, card, UPI, notes and signatures',()=>{
 const safe=safeProviderPayment({...payment,email:'private@example.test',card:{number:'123'},vpa:'private@upi',notes:{secret:'x'},razorpay_signature:'secret'});
 assert.deepEqual(Object.keys(safe).filter(k=>['email','card','vpa','notes','razorpay_signature'].includes(k)),[]);
});
test('webhook rejects unsigned deliveries before accessing database/provider',async()=>{
 let calls=0;const handle=createPaymentWebhookHandler({env,fetch:async()=>{calls++;throw Error('unexpected');}});
 assert.equal((await handle(req({event:'payment.captured'}))).status,400);assert.equal(calls,0);
 assert.equal((await createPaymentWebhookHandler({env:{...env,RAZORPAY_WEBHOOK_SECRET_LIVE:undefined}})(req({}))).status,503);
});
test('signed capture delegates binding and delivery dedup to one atomic RPC',async()=>{
 const calls=[];
 const handle=createPaymentWebhookHandler({env,fetch:async(url,init)=>{
   calls.push({url:String(url),body:init?.body?JSON.parse(init.body):null});
   if(String(url).includes('service_checkout_orders?'))return json([order]);
   if(String(url).endsWith('rpc/consume_payment_webhook'))return json({success:true,duplicate:calls.length>3});
   throw Error('Unexpected request '+url);
 }});
 const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:payment}}});
 for(let i=0;i<2;i++)assert.equal((await handle(req(raw,{'x-razorpay-signature':sign(raw),'x-razorpay-event-id':'evt_fixture'}))).status,200);
 const rpc=calls.filter(c=>c.url.endsWith('rpc/consume_payment_webhook'));
 assert.equal(rpc.length,2);assert.equal(rpc[0].body.p_id,rpc[1].body.p_id);assert.equal(rpc[0].body.p_checkout,checkout);
 assert.equal(rpc[0].body.p_mode,'live');assert.equal(rpc[0].body.p_payment.amount,199900);
});
test('unmatched authentic webhook remains retryable and cannot fabricate paid receipt',async()=>{
 const rpc=[];
 const handle=createPaymentWebhookHandler({env,fetch:async(url,init)=>{
  if(String(url).includes('service_checkout_orders?'))return json([]);
  if(String(url).includes('api.razorpay.com'))return json({id:'order_Fixture',receipt:'not-a-checkout'});
  if(String(url).endsWith('rpc/consume_payment_webhook')){rpc.push(JSON.parse(init.body));return json({success:false});}
  throw Error('Unexpected '+url);
 }});
 const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:payment}}});
 assert.equal((await handle(req(raw,{'x-razorpay-signature':sign(raw)}))).status,503);
 assert.equal(rpc[0].p_error,'UNMATCHED_ORDER');assert.equal(rpc[0].p_checkout,undefined);
});
test('refund-only webhook fetches payment using GET and strips refund/provider sensitive data',async()=>{
 const methods=[],rpc=[];
 const handle=createPaymentWebhookHandler({env,fetch:async(url,init)=>{
  if(String(url).includes('api.razorpay.com')){methods.push(init.method);return json(payment);}
  if(String(url).includes('service_checkout_orders?'))return json([order]);
  if(String(url).endsWith('rpc/consume_payment_webhook')){rpc.push(JSON.parse(init.body));return json({success:true});}
  throw Error('Unexpected '+url);
 }});
 const raw=JSON.stringify({event:'refund.processed',payload:{refund:{entity:{id:'rfnd_Fixture',payment_id:payment.id,amount:10000,currency:'INR',status:'processed',notes:{secret:'never'}}}}});
 assert.equal((await handle(req(raw,{'x-razorpay-signature':sign(raw)}))).status,200);
 assert.deepEqual(methods,['GET']);assert.equal(rpc[0].p_refund.amount,10000);assert.equal(rpc[0].p_refund.notes,undefined);
});
test('journey authenticates owner and sends only server catalogue price to restricted RPC',async()=>{
 const calls=[];const handle=createJourneyHandler({env,fetch:async(url,init)=>{
  if(String(url).endsWith('/auth/v1/user'))return json({id:user});
  if(String(url).endsWith('rpc/record_payment_journey')){calls.push(JSON.parse(init.body));return json(journey);}
  throw Error('Unexpected '+url);
 }});
 const response=await handle(req({journey_id:journey,event_id:event,event:'payment_page_viewed',package_id:'gst-registration',amount:1,status:'paid',secret:'ignore'}));
 assert.equal(response.status,200);assert.equal(calls[0].p_amount,199900);assert.equal(calls[0].p_user,user);assert.equal(calls[0].status,undefined);assert.equal(calls[0].secret,undefined);
 assert.equal((await handle(req({journey_id:journey,event_id:event,event:'payment.captured',package_id:'gst-registration'}))).status,400);
 const noauth=new Request('https://fixture',{method:'POST',body:'{}'});assert.equal((await handle(noauth)).status,401);
});
test('journey rejects foreign business before recording an event',async()=>{
 let writes=0;const handle=createJourneyHandler({env,fetch:async(url)=>{
  if(String(url).endsWith('/auth/v1/user'))return json({id:user});
  if(String(url).includes('business_profiles?'))return json([]);writes++;throw Error('no write');
 }});
 assert.equal((await handle(req({journey_id:journey,event_id:event,event:'payment_page_viewed',package_id:'gst-registration',business_id:checkout}))).status,403);assert.equal(writes,0);
});
test('staff actions require payment.read plus action permission, including export/reconciliation',async()=>{
 for(const action of ['payment_list','payment_detail','payment_reconcile','payment_reconcile_batch','payment_note','payment_case_update','payment_export']){
  const expected=paymentPermission(action);assert.ok(expected.startsWith('payment.'));
  for(const permissions of [[],expected==='payment.read'?[]:['payment.read'],expected==='payment.read'?[]:[expected]]){
   const admin={from(){assert.fail('Unauthorised query');},rpc(){assert.fail('Unauthorised RPC');}};
   const response=await paymentOperations(admin,{userId:user,displayName:'QA',permissions:new Set(permissions)},{action},(d,s=200)=>json(d,s),env);
   assert.equal(response.status,403);
  }
 }
});
test('date and page filters are bounded, valid, in IST; refunded filter supported',()=>{
 const filters=normalizePaymentFilters({dateFrom:'2026-10-23',dateTo:'2026-10-23',status:'refunded'});
 assert.equal(Date.parse(filters.p_from),Date.parse('2026-10-22T18:30:00Z'));assert.equal(Date.parse(filters.p_to),Date.parse('2026-10-23T18:30:00Z'));
 for(const invalid of [{page:-1},{pageSize:501},{query:'x'.repeat(101)},{status:'mark_paid'},{dateFrom:'2026-02-30'},{dateFrom:'2026-10-24',dateTo:'2026-10-23'}])assert.throws(()=>normalizePaymentFilters(invalid));
});
test('paid receipt with earlier failed attempt is not incorrectly flagged abandoned',()=>{
 assert.deepEqual(paymentAttention({status:'paid',provider_mode:'live',last_activity_at:'2000-01-01',failed_attempts:1}),[]);
 assert.ok(paymentAttention({status:'viewed',provider_mode:'unknown',last_activity_at:'2000-01-01'}).some(x=>x.includes('30 minutes')));
});
