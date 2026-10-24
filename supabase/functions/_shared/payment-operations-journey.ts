import { getServicePackage } from './service-catalog.ts';
import { applicationCategory, applicationCheckoutPackageIds } from './application-checkout.ts';
import { PaymentOperationsError, journeyKinds, paymentBody, paymentCors, paymentJson, paymentRest, paymentUser, paymentUuid, type PaymentDependencies } from './payment-operations.ts';
export function createJourneyHandler(dependencies: PaymentDependencies) {
  return async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: paymentCors });
    if (request.method !== 'POST') return paymentJson({ error: 'Method not allowed.' }, 405);
    try {
      const userId = await paymentUser(request, dependencies); const body = await paymentBody(request);
      if (!paymentUuid.test(String(body.journey_id)) || !paymentUuid.test(String(body.event_id)) || !journeyKinds.has(String(body.event))) throw new PaymentOperationsError('Invalid checkout event.', 400);
      const selected = getServicePackage(String(body.package_id));
      if (!selected) throw new PaymentOperationsError('Choose a valid service package.', 400);
      const ids: Record<string, string | null> = {};
      for (const key of ['application_id','business_id','checkout_id']) { if (body[key] != null && !paymentUuid.test(String(body[key]))) throw new PaymentOperationsError('Invalid checkout reference.', 400); ids[key] = body[key] == null ? null : String(body[key]); }
      if (body.safe_code != null && !/^[A-Z0-9_]{1,64}$/.test(String(body.safe_code))) throw new PaymentOperationsError('Invalid event code.', 400);
      const db = paymentRest(dependencies);
      let application: { id: string; business_id: string; status: string; services: {slug: string | null} | null } | undefined;
      if (ids.application_id) {
        const apps = await db(`applications?id=eq.${ids.application_id}&deleted_at=is.null&select=id,business_id,status,services(slug)`) as { id: string; business_id: string; status: string; services: {slug: string | null} | null }[];
        const app = apps[0]; if (!app || applicationCategory(app) !== selected.serviceCategory) throw new PaymentOperationsError('Application package mismatch.', 403);
        if (ids.business_id && ids.business_id !== app.business_id) throw new PaymentOperationsError('Business mismatch.', 403);
        ids.business_id = app.business_id; application = app;
      }
      if (ids.business_id) {
        const business = await db(`business_profiles?id=eq.${ids.business_id}&user_id=eq.${userId}&deleted_at=is.null&select=id,questionnaire`) as { id: string; questionnaire?: unknown }[];
        if (!business.length) throw new PaymentOperationsError('Business not found for this account.', 403);
        if (application && !applicationCheckoutPackageIds(applicationCategory(application), { ...application, questionnaire: business[0].questionnaire }).includes(selected.id)) throw new PaymentOperationsError('Application package needs a scope review.', 403);
      }
      // RPC repeats all ownership checks atomically; no client money/status fields are accepted.
      await db('rpc/record_payment_journey','POST',{p_user:userId,p_journey:body.journey_id,p_event:body.event_id,p_kind:body.event,p_package:selected.id,p_title:selected.title,p_amount:selected.amountPaise,p_business:ids.business_id,p_application:ids.application_id,p_checkout:ids.checkout_id,p_code:body.safe_code ?? null});
      return paymentJson({success:true,journey_id:body.journey_id});
    } catch (error) { return paymentJson({error:error instanceof PaymentOperationsError ? error.message : 'Checkout activity could not be recorded.'},error instanceof PaymentOperationsError ? error.status : 500); }
  };
}
