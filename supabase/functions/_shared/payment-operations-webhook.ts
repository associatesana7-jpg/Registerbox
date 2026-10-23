import { PaymentOperationsError, paymentJson, paymentMode, paymentObject, paymentProvider, paymentRest, paymentUuid, providerOrderId, safeProviderPayment, safeProviderRefund, validWebhookSignature, type PaymentDependencies } from './payment-operations.ts';

export function createPaymentWebhookHandler(dependencies: PaymentDependencies) {
  return async (request: Request) => {
    if (request.method !== 'POST') return paymentJson({error:'Method not allowed.'},405);
    const {env}=dependencies; const db=paymentRest(dependencies); let record: Record<string,unknown>|null=null;
    try {
      // Read exactly once. JSON parsing happens only after raw-body HMAC authentication.
      const raw=await request.text(); if(raw.length>262144) return paymentJson({error:'Payload too large.'},413);
      const signature=request.headers.get('x-razorpay-signature')??'';
      const candidates=[{secret:env.RAZORPAY_WEBHOOK_SECRET_LIVE,mode:'live'},{secret:env.RAZORPAY_WEBHOOK_SECRET_TEST,mode:'test'},{secret:env.RAZORPAY_WEBHOOK_SECRET,mode:paymentMode(env)},{secret:env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS,mode:paymentMode(env)}].filter(x=>x.secret&&x.mode!=='unknown');
      if(!candidates.length) return paymentJson({error:'Webhook authentication is not configured.'},503);
      let mode: string|null=null;
      for(const candidate of candidates) if(await validWebhookSignature(raw,signature,candidate.secret!)) {mode=candidate.mode;break;}
      if(!mode) return paymentJson({error:'Invalid webhook signature.'},400);
      const payload=paymentObject(JSON.parse(raw)); const kind=String(payload.event??'');
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
      const headerId=request.headers.get('x-razorpay-event-id');
      if(headerId&&!/^[A-Za-z0-9_-]{1,120}$/.test(headerId)) return paymentJson({error:'Invalid webhook event ID.'},400);
      record={p_id:`${mode}:${headerId??digest}`,p_hash:digest,p_kind:kind.slice(0,80),p_mode:mode};
      const supported=['payment.authorized','payment.captured','payment.failed','order.paid','refund.created','refund.processed','refund.failed','payment.dispute.created','payment.dispute.won','payment.dispute.lost','payment.dispute.closed'];
      if(!supported.includes(kind)) {await db('rpc/consume_payment_webhook','POST',record);return paymentJson({received:true,ignored:true});}
      const entities=paymentObject(payload.payload); let payment=paymentObject(paymentObject(entities.payment).entity);
      const refund=paymentObject(paymentObject(entities.refund).entity); const dispute=paymentObject(paymentObject(entities.dispute).entity);
      const provider=paymentProvider(dependencies);
      if(!payment.id&&(refund.payment_id||dispute.payment_id)) {
        if(mode!==paymentMode(env)) throw new PaymentOperationsError('Provider credentials do not match the webhook mode.',503);
        const pid=String(refund.payment_id??dispute.payment_id);
        if(!/^pay_[A-Za-z0-9]+$/.test(pid)) throw new PaymentOperationsError('Invalid provider payment.',400);
        payment=await provider(`payments/${pid}`);
      }
      if(!providerOrderId.test(String(payment.order_id))) {await db('rpc/consume_payment_webhook','POST',record);return paymentJson({received:true,ignored:true});}
      let orders=await db(`service_checkout_orders?razorpay_order_id=eq.${payment.order_id}&select=*`) as Record<string,unknown>[];
      if(!orders[0]&&mode===paymentMode(env)) {
        // Recover a provider success whose original create response timed out.
        const providerOrder=await provider(`orders/${payment.order_id}`);
        if(paymentUuid.test(String(providerOrder.receipt))) {
          const local=await db(`service_checkout_orders?id=eq.${providerOrder.receipt}&select=*`) as Record<string,unknown>[];
          const order=local[0];
          if(order&&order.amount===providerOrder.amount&&order.currency===providerOrder.currency&&(!order.razorpay_order_id||order.razorpay_order_id===providerOrder.id)&&(order.provider_mode==='unknown'||order.provider_mode===mode)) {
            orders=await db(`service_checkout_orders?id=eq.${order.id}&razorpay_order_id=is.null`,'PATCH',{razorpay_order_id:providerOrder.id,status:'pending_payment',provider_mode:mode}) as Record<string,unknown>[];
          }
        }
      }
      if(!orders[0]) {await db('rpc/consume_payment_webhook','POST',{...record,p_error:'UNMATCHED_ORDER'});return paymentJson({error:'Webhook is retained for reconciliation.'},503);}
      const result=paymentObject(await db('rpc/consume_payment_webhook','POST',{...record,p_checkout:orders[0].id,p_payment:safeProviderPayment(payment),p_refund:Object.keys(refund).length?safeProviderRefund(refund):null,p_dispute:Object.keys(dispute).length?String(dispute.status??kind.split('.').at(-1)):null}));
      return result.success?paymentJson({received:true,duplicate:result.duplicate===true}):paymentJson({error:'Webhook observation requires review.'},503);
    } catch {
      if(record) {try{await db('rpc/consume_payment_webhook','POST',{...record,p_error:'DELIVERY_PROCESSING_FAILED'});}catch{/* Provider retries remain safe if persistence is unavailable. */}}
      return paymentJson({error:'Webhook could not be processed. Retry delivery.'},503);
    }
  };
}
