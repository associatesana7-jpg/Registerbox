import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';
import { PaymentOperationsError, assertPaymentBinding, paymentAttention, paymentMode, paymentObject, paymentProvider, paymentUuid, safeProviderPayment, safeProviderRefund, type PaymentEnv } from '../_shared/payment-operations.ts';
type Access={userId:string;displayName:string;permissions:Set<string>};
type Reply=(body:unknown,status?:number)=>Response;
type Row=Record<string,unknown>;
const titles:Record<string,string>={payment_page_viewed:'Payment page viewed',checkout_cta_clicked:'Checkout button selected',order_creation_requested:'Order preparation requested',checkout_opened:'Razorpay window opened',checkout_dismissed:'Customer closed Razorpay',payment_failed_client:'Browser reported payment failure',verification_started:'Verification started',verification_succeeded_client:'Browser reported verification success',verification_error_client:'Browser reported verification problem',checkout_error_client:'Browser reported checkout preparation problem'};
export function paymentPermission(action:string) {return action==='payment_export'?'payment.export':['payment_reconcile','payment_reconcile_batch'].includes(action)?'payment.reconcile':['payment_note','payment_case_update'].includes(action)?'payment.manage':'payment.read';}
export function normalizePaymentFilters(body:Row) {
 const page=body.page??0,size=body.pageSize??25;
 if(!Number.isInteger(page)||Number(page)<0||Number(page)>10000||!Number.isInteger(size)||Number(size)<1||Number(size)>100)throw new PaymentOperationsError('Invalid payment page.',400);
 const query=body.query??''; if(typeof query!=='string'||query.trim().length>100)throw new PaymentOperationsError('Search must be at most 100 characters.',400);
 const status=body.status??'all',mode=body.mode??'all';
 if(!['all','viewed','created','pending_payment','pending','authorized','paid','failed','inactive','attention','refunded'].includes(String(status))||!['all','live','test','unknown'].includes(String(mode)))throw new PaymentOperationsError('Invalid payment filter.',400);
 const date=(value:unknown)=>{if(value==null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(`${value}T00:00:00Z`))||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value)throw new PaymentOperationsError('Invalid date.',400);return `${value}T00:00:00+05:30`;};
 const from=date(body.dateFrom),toDate=date(body.dateTo);const to=toDate?new Date(Date.parse(toDate)+86400000).toISOString():null;
 if(from&&to&&Date.parse(from)>=Date.parse(to))throw new PaymentOperationsError('Choose an ordered date range.',400);
 return {page:Number(page),pageSize:Number(size),p_query:query.trim(),p_status:String(status),p_mode:String(mode),p_from:from,p_to:to};
}
export function paymentRow(row:Row) {
 return {id:row.id,orderId:row.checkout_id??null,journeyId:row.journey_id??null,userId:row.user_id,customerName:row.customer_name??'Customer',customerEmail:row.customer_email??null,customerPhone:row.customer_phone??null,businessId:row.business_id??null,businessName:row.business_name??null,applicationId:row.application_id??null,applicationReference:row.application_reference??null,packageId:row.package_id,packageTitle:row.package_title,amountPaise:Number(row.amount),currency:row.currency,status:row.status,journeyStatus:row.status==='paid'?'payment_confirmed':row.journey_status,createdAt:row.created_at,paidAt:row.paid_at??null,lastActivityAt:row.last_activity_at,razorpayOrderId:row.razorpay_order_id??null,razorpayPaymentId:row.razorpay_payment_id??null,mode:row.provider_mode,attentionReasons:paymentAttention(row),followUpStatus:row.follow_up_status,refundedPaise:Number(row.refunded_paise??0),disputeStatus:row.dispute_status??null,settlementStatus:row.settlement_status??'unknown',reconciledAt:row.reconciled_at??null};
}
async function checked<T>(query:PromiseLike<{data:T;error:unknown}>) {const result=await query;if(result.error)throw result.error;return result.data;}
async function audit(admin:SupabaseClient,access:Access,action:string,id:string|null,detail:Row={}) {await checked(admin.from('audit_events').insert({actor_id:access.userId,actor_type:'staff',action,entity_type:'payment',entity_id:id,new_value:detail,source:'control-center-edge'}));}
async function findRow(admin:SupabaseClient,id:unknown) {
 if(!paymentUuid.test(String(id)))throw new PaymentOperationsError('Choose a valid payment record.',400);
 const row=await checked(admin.from('payment_operations_rows').select('*').eq('id',String(id)).maybeSingle());
 if(!row)throw new PaymentOperationsError('Payment record was not found.',404);return row as Row;
}
async function detail(admin:SupabaseClient,row:Row) {
 const id=String(row.id),checkout=row.checkout_id?String(row.checkout_id):null,journey=row.journey_id?String(row.journey_id):null;
 // IDs are validated UUIDs from the database, never arbitrary PostgREST syntax.
 const timelineQuery=admin.from('payment_events').select('id,event_type,detail,source,trust,actor_id,created_at').or([checkout?`checkout_id.eq.${checkout}`:'',journey?`journey_id.eq.${journey}`:''].filter(Boolean).join(',')).order('created_at',{ascending:false}).limit(300);
 const [timeline,attempts,notes,refunds,alerts]=await Promise.all([
 checked(timelineQuery),checkout?checked(admin.from('payment_attempts').select('*').eq('checkout_id',checkout).order('created_at',{ascending:false}).limit(100)):[],
 checked(admin.from('payment_staff_notes').select('id,body,author_id,created_at,staff_profiles(display_name)').in('case_id',[...new Set([id,...(journey?[journey]:[])])]).order('created_at',{ascending:false}).limit(100)),
 checkout?checked(admin.from('payment_refunds').select('*').eq('checkout_id',checkout).order('created_at',{ascending:false}).limit(100)):[],
 checkout?checked(admin.from('payment_operator_alerts').select('id,severity,title,detail,created_at').eq('checkout_id',checkout).order('created_at',{ascending:false}).limit(50)):[],
 ]);
 return {order:paymentRow(row),timeline:(timeline??[]).map((e:Row)=>({id:e.id,type:e.event_type,title:titles[String(e.event_type)]??String(e.event_type).replaceAll('.',' · '),detail:JSON.stringify(e.detail),source:e.source,trust:e.trust,createdAt:e.created_at,actor:e.actor_id??null})),attempts:(attempts??[]).map((a:Row)=>({id:a.id,paymentId:a.id,status:a.status,amountPaise:a.amount,currency:a.currency,method:a.method,errorCode:a.error_code,errorDescription:a.error_description,createdAt:a.provider_created_at??a.created_at})),notes:(notes??[]).map((n:Row)=>({id:n.id,body:n.body,createdAt:n.created_at,authorName:paymentObject(n.staff_profiles).display_name??'Staff'})),refunds:(refunds??[]).map((r:Row)=>({id:r.id,paymentId:r.payment_id,amountPaise:r.amount,currency:r.currency,status:r.status,createdAt:r.created_at})),alerts,historyNotice:'Journey tracking starts with this release. Earlier customer actions cannot be reconstructed. Captured payment does not confirm bank settlement.'};
}
async function health(admin:SupabaseClient,env:PaymentEnv) {
 const since=new Date(Date.now()-86400000).toISOString();
 const [last,failures,unmatched,reconcile]=await Promise.all([
 admin.from('payment_webhook_deliveries').select('received_at').order('received_at',{ascending:false}).limit(1),
 admin.from('payment_webhook_deliveries').select('id',{count:'exact',head:true}).in('status',['failed','processing']).gte('last_attempt_at',since),
 admin.from('payment_webhook_deliveries').select('id',{count:'exact',head:true}).eq('status','unmatched'),
 admin.from('service_checkout_orders').select('id',{count:'exact',head:true}).in('status',['created','pending_payment','authorized']).lt('updated_at',new Date(Date.now()-30*60000).toISOString()),
 ]);
 if([last,failures,unmatched,reconcile].some(r=>r.error))throw new Error('Payment health query failed');
 return {webhookConfigured:!!(env.RAZORPAY_WEBHOOK_SECRET||env.RAZORPAY_WEBHOOK_SECRET_LIVE||env.RAZORPAY_WEBHOOK_SECRET_TEST),lastWebhookAt:last.data?.[0]?.received_at??null,webhookFailures:failures.count??0,unmatchedEvents:unmatched.count??0,reconciliationRequired:reconcile.count??0};
}
async function reconcileOne(admin:SupabaseClient,row:Row,env:PaymentEnv) {
 if(!row.checkout_id)throw new PaymentOperationsError('No provider order exists for this visit. There is no payment to reconcile.',409);
 const mode=paymentMode(env);if(mode==='unknown'||(row.provider_mode!=='unknown'&&row.provider_mode!==mode))throw new PaymentOperationsError('Configured Razorpay credentials do not match this payment mode.',409);
 const provider=paymentProvider({env});let providerId=row.razorpay_order_id;
 if(!providerId) {
   const matches=paymentObject(await provider(`orders?receipt=${encodeURIComponent(String(row.id))}&count=100`));
   const orders=Array.isArray(matches.items)?matches.items.map(paymentObject).filter(o=>o.receipt===row.id&&o.amount===row.amount&&o.currency===row.currency):[];
   if(orders.length!==1)throw new PaymentOperationsError(orders.length?'Multiple provider orders match this receipt. Review Razorpay before proceeding.':'No provider order was found for this receipt. No new order was created.',409);
   providerId=orders[0].id;
   if(!/^order_[A-Za-z0-9]+$/.test(String(providerId)))throw new PaymentOperationsError('Provider returned an invalid order.',502);
   await checked(admin.from('service_checkout_orders').update({razorpay_order_id:providerId,status:'pending_payment',provider_mode:mode}).eq('id',String(row.id)).is('razorpay_order_id',null));
 }
 const providerOrder=await provider(`orders/${providerId}`);
 if(providerOrder.receipt!==row.id||providerOrder.amount!==row.amount||providerOrder.currency!==row.currency)throw new PaymentOperationsError('Provider order does not match this receipt.',409);
 const payments=await provider(`orders/${providerId}/payments`);
 if(!Array.isArray(payments.items)||payments.items.length>100)throw new PaymentOperationsError('Provider returned an unexpected attempt list.',502);
 for(const raw of payments.items) {
   const payment=paymentObject(raw);assertPaymentBinding({...row,razorpay_order_id:providerId},payment);
   await checked(admin.rpc('apply_payment_observation',{p_checkout:row.id,p_payment:safeProviderPayment(payment),p_source:'reconciliation',p_observation:`reconcile:${payment.id}:${payment.status}`,p_mode:mode}));
   if(['captured','refunded'].includes(String(payment.status))) {
     let skip=0;let more=true;
     while(more&&skip<500) {
       const result=await provider(`payments/${payment.id}/refunds?count=100&skip=${skip}`);
       const refunds=Array.isArray(result.items)?result.items:[];
       for(const refund of refunds) await checked(admin.rpc('apply_payment_observation',{p_checkout:row.id,p_payment:safeProviderPayment(payment),p_source:'reconciliation',p_observation:`reconcile:${paymentObject(refund).id}:${paymentObject(refund).status}`,p_mode:mode,p_refund:safeProviderRefund(paymentObject(refund))}));
       more=refunds.length===100;skip+=100;
     }
     if(more)throw new PaymentOperationsError('Refund history exceeded the safe reconciliation limit. Review Razorpay.',409);
   }
 }
 await checked(admin.from('service_checkout_orders').update({reconciled_at:new Date().toISOString(),provider_mode:mode}).eq('id',String(row.id)));
}
export async function paymentOperations(admin:SupabaseClient,access:Access,body:Row,reply:Reply,env:PaymentEnv) {
 try {
 const action=String(body.action??'');
 if(!['payment_list','payment_detail','payment_reconcile','payment_reconcile_batch','payment_note','payment_case_update','payment_export'].includes(action))return reply({error:'Unsupported payment action.'},400);
 if(!access.permissions.has('payment.read')||!access.permissions.has(paymentPermission(action)))return reply({error:'You do not have permission to access this payment operation.'},403);
 if(action==='payment_list'||action==='payment_export') {
 const filters=normalizePaymentFilters(body),{page,pageSize,...params}=filters;const exporting=action==='payment_export';
 if(exporting&&(typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.length>300))throw new PaymentOperationsError('Give an export reason of 8–300 characters.',400);
 const data=paymentObject(await checked(admin.rpc('list_payment_operations',{...params,p_page:page,p_size:pageSize,p_export:exporting})));
 const raw=Array.isArray(data.rows)?data.rows.map(paymentObject):[];const limit=exporting?500:pageSize;
 if(exporting)await audit(admin,access,'PAYMENT_EXPORT',null,{reason:String(body.reason).trim(),filters,rows:Math.min(raw.length,limit),limit});
 else await audit(admin,access,'PAYMENT_DIRECTORY_VIEWED',null,{filters});
 const base={rows:raw.slice(0,limit).map(paymentRow),total:Number(data.total??0),hasMore:raw.length>limit,generatedAt:new Date().toISOString()};
 return reply(exporting?{...base,limit}:{...base,page,summary:data.summary,health:await health(admin,env)});
 }
 if(action==='payment_reconcile_batch') {
 if(!Array.isArray(body.ids)||body.ids.length<1||body.ids.length>10||body.ids.some(id=>!paymentUuid.test(String(id)))||new Set(body.ids).size!==body.ids.length)throw new PaymentOperationsError('Choose 1–10 distinct payment records.',400);
 if(typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.length>300)throw new PaymentOperationsError('Give a reconciliation reason of 8–300 characters.',400);
 await audit(admin,access,'PAYMENT_BATCH_RECONCILIATION_REQUESTED',null,{ids:body.ids,reason:body.reason.trim()});
 const results=[];for(const id of body.ids){try{const row=await findRow(admin,id);await reconcileOne(admin,row,env);await audit(admin,access,'PAYMENT_RECONCILED',String(id),{batch:true});results.push({id,success:true});}catch(error){results.push({id,success:false,error:error instanceof PaymentOperationsError?error.message:'Provider reconciliation failed.'});}}
 return reply({results,generatedAt:new Date().toISOString()});
 }
 const row=await findRow(admin,body.id);const id=String(row.id);
 if(action==='payment_detail'){await audit(admin,access,'PAYMENT_DETAIL_VIEWED',id);return reply(await detail(admin,row));}
 if(action==='payment_reconcile') {
 if(typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.length>300)throw new PaymentOperationsError('Give a reconciliation reason of 8–300 characters.',400);
 // Audit the request before the provider is contacted, including failed attempts.
 await audit(admin,access,'PAYMENT_RECONCILIATION_REQUESTED',id,{reason:body.reason.trim()});
 await reconcileOne(admin,row,env);await audit(admin,access,'PAYMENT_RECONCILED',id);
 return reply({...await detail(admin,await findRow(admin,id)),message:'Provider evidence refreshed. No capture or refund was initiated.'});
 }
 if(action==='payment_note') {
 if(typeof body.body!=='string'||body.body.trim().length<1||body.body.trim().length>2000)throw new PaymentOperationsError('Write a note of 1–2,000 characters.',400);
 await checked(admin.from('payment_staff_notes').insert({case_id:id,author_id:access.userId,body:body.body.trim()}));
 await audit(admin,access,'PAYMENT_NOTE_ADDED',id,{characters:body.body.trim().length});
 }
 if(action==='payment_case_update') {
 if(!['open','contacted','resolved'].includes(String(body.status)))throw new PaymentOperationsError('Choose a valid follow-up status.',400);
 if(body.note!=null&&(typeof body.note!=='string'||body.note.length>2000))throw new PaymentOperationsError('Follow-up note is too long.',400);
 await checked(admin.from('payment_cases').upsert({id,status:body.status,updated_by:access.userId,updated_at:new Date().toISOString()}));
 if(typeof body.note==='string'&&body.note.trim())await checked(admin.from('payment_staff_notes').insert({case_id:id,author_id:access.userId,body:body.note.trim()}));
 await audit(admin,access,'PAYMENT_FOLLOW_UP_UPDATED',id,{status:body.status});
 }
 return reply(await detail(admin,await findRow(admin,id)));
 }catch(error){if(error instanceof PaymentOperationsError)return reply({error:error.message},error.status);throw error;}
}
