import { getServicePackage } from './service-catalog.ts';
import { applicationCategory, applicationCheckoutPackageIds } from './application-checkout.ts';

type Env = Record<string, string | undefined>;
type Dependencies = { env: Env; fetch?: typeof fetch; now?: () => number; uuid?: () => string };
type CheckoutOrder = { id: string; user_id: string; business_id?: string | null; application_id?: string | null; provider_create_token?: string | null; package_id: string; package_title: string; amount: number; currency: string; status: string; razorpay_order_id: string | null; razorpay_payment_id: string | null; created_at: string };
type CheckoutApplication = { id: string; business_id: string; status: string; services: { slug: string | null } | null };
class CheckoutError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export async function validPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`${orderId}|${paymentId}`));
}

export function createCheckoutHandler(action: 'create' | 'verify', dependencies: Dependencies) {
  const { env } = dependencies;
  const http = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const uuid = dependencies.uuid ?? (() => crypto.randomUUID());
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
    try {
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) throw new CheckoutError('Sign in to continue to secure checkout.', 401);
      const url = env.SUPABASE_URL;
      const anonKey = env.SUPABASE_ANON_KEY;
      const adminKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !anonKey || !adminKey) throw new CheckoutError('Checkout is not configured. Please contact RegisterBox.', 503);
      const authResponse = await http(`${url}/auth/v1/user`, { headers: { Authorization: authorization, apikey: anonKey }, signal: AbortSignal.timeout(10000) });
      const user = await authResponse.json();
      if (!authResponse.ok || !user.id) throw new CheckoutError('Please sign in again before paying.', 401);
      let body: Record<string, unknown>;
      try {
        const raw = await request.text();
        if (raw.length > 8192) throw new Error('oversize');
        const parsed = JSON.parse(raw);
        if (!isObject(parsed)) throw new Error('invalid');
        body = parsed;
      } catch { throw new CheckoutError('Send a valid checkout request.', 400); }
      const keyId = env.RAZORPAY_KEY_ID;
      const secret = env.RAZORPAY_KEY_SECRET;
      if (!keyId || !secret) throw new CheckoutError('Online payments are not configured. Please contact RegisterBox.', 503);
      const db = async (path: string, method = 'GET', data?: unknown): Promise<unknown> => {
        const result = await http(`${url}/rest/v1/${path}`, {
          method, headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000),
        });
        if (!result.ok) {
          if (result.status === 409) throw new CheckoutError('This checkout is being prepared. Please retry in a moment.', 409);
          throw new CheckoutError('Could not save payment details. Please retry or contact RegisterBox.');
        }
        return result.status === 204 ? null : result.json();
      };
      const provider = async (path: string, data?: unknown): Promise<Record<string, unknown>> => {
        const result = await http(`https://api.razorpay.com/v1/${path}`, {
          method: data ? 'POST' : 'GET', headers: { Authorization: `Basic ${btoa(`${keyId}:${secret}`)}`, 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(20000),
        });
        if (result.status === 401) throw new CheckoutError('Payment provider authentication failed. Please contact RegisterBox.', 401);
        if (!result.ok) throw new CheckoutError('Razorpay could not process this request. Please try again.');
        return result.json();
      };
      const resultForOrder = (order: CheckoutOrder) => ({ order_id: order.razorpay_order_id, amount: order.amount, currency: order.currency, key_id: keyId, checkout_token: order.id, receipt: order.id, application_id: order.application_id ?? null, is_test_mode: keyId.startsWith('rzp_test_') });
      if (action === 'create') {
        const selected = typeof body.package_id === 'string' ? getServicePackage(body.package_id) : undefined;
        if (!selected || selected.amountPaise < 100 || !Number.isSafeInteger(selected.amountPaise)) throw new CheckoutError('Choose a valid paid package. The minimum payment is 100 paise.', 400);
        if (body.amount !== undefined && (!Number.isSafeInteger(body.amount) || body.amount !== selected.amountPaise)) throw new CheckoutError('The amount must match the selected package and be at least 100 paise.', 400);
        if (body.currency !== undefined && body.currency !== 'INR') throw new CheckoutError('Checkout supports INR only.', 400);
        const requestId = body.idempotency_key ?? uuid();
        if (typeof requestId !== 'string' || !uuidPattern.test(requestId)) throw new CheckoutError('Invalid checkout request identifier.', 400);
        let applicationId: string | null = null;
        let businessId: string | null = null;
        if (body.business_id !== undefined && body.business_id !== null) {
          if (typeof body.business_id !== 'string' || !uuidPattern.test(body.business_id)) throw new CheckoutError('Invalid business profile.', 400);
          businessId = body.business_id;
        }
        if (body.application_id !== undefined && body.application_id !== null) {
          if (typeof body.application_id !== 'string' || !uuidPattern.test(body.application_id)) throw new CheckoutError('Invalid application reference.', 400);
          applicationId = body.application_id;
          const applications = await db(`applications?id=eq.${applicationId}&deleted_at=is.null&select=id,business_id,status,services(slug)`) as CheckoutApplication[];
          const application = applications[0];
          if (!application) throw new CheckoutError('Choose a submitted application belonging to your account.', 403);
          if (businessId && businessId !== application.business_id) throw new CheckoutError('The application does not belong to the selected business.', 403);
          businessId = application.business_id;
          const businesses = await db(`business_profiles?id=eq.${businessId}&user_id=eq.${user.id}&deleted_at=is.null&select=id`) as unknown[];
          if (!businesses.length) throw new CheckoutError('Choose a submitted application belonging to your account.', 403);
          if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(application.status.toUpperCase())) throw new CheckoutError('This application is closed and cannot accept another payment.', 409);
          if (application.status.toUpperCase() === 'DRAFT') throw new CheckoutError('Submit your registration details before paying for this application.', 409);
          if (!applicationCheckoutPackageIds(applicationCategory(application)).includes(selected.id)) throw new CheckoutError('This package does not match the submitted registration. Choose the package shown for your application.', 400);
        } else if (businessId) {
          const businesses = await db(`business_profiles?id=eq.${businessId}&user_id=eq.${user.id}&deleted_at=is.null&select=id`) as unknown[];
          if (!businesses.length) throw new CheckoutError('Choose a business profile belonging to your account.', 403);
        }
        const activeApplicationOrder = async () => {
          const orders = await db(`service_checkout_orders?user_id=eq.${user.id}&application_id=eq.${applicationId}&status=in.(created,pending_payment,authorized,paid)&select=*&limit=1`) as CheckoutOrder[];
          return orders[0];
        };
        const checkOrder = (order: CheckoutOrder | undefined) => {
          if (order && ((order.application_id ?? null) !== applicationId || order.package_id !== selected.id)) throw new CheckoutError('Start a new checkout when changing packages or applications.', 409);
          if (order?.status === 'paid' || order?.status === 'authorized') throw new CheckoutError('Payment already received for this checkout. Check its payment status before paying again.', 409);
          if (applicationId && order?.status === 'failed') throw new CheckoutError('Start a new checkout for this application after checking the previous payment attempt.', 409);
        };
        const existing = await db(`service_checkout_orders?user_id=eq.${user.id}&request_id=eq.${requestId}&select=*`) as CheckoutOrder[];
        let order = existing[0] ?? (applicationId ? await activeApplicationOrder() : undefined);
        checkOrder(order);
        if (order?.razorpay_order_id) return response(resultForOrder(order));
        if (!order) {
          const recent = await db(`service_checkout_orders?user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(new Date(now() - 60000).toISOString())}&select=id&limit=10`) as unknown[];
          if (recent.length >= 10) throw new CheckoutError('Please wait one minute before starting another checkout.', 429);
          let trademark: Record<string, unknown> = {};
          if (selected.serviceCategory === 'trademark') {
            const tm = body.trademark;
            if (!isObject(tm) || !['individual_msme', 'other'].includes(String(tm.applicant_type)) || typeof tm.pan_or_gstin !== 'string' || !/^(?:[A-Z]{5}[0-9]{4}[A-Z]|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])$/.test(tm.pan_or_gstin) || typeof tm.brand_name !== 'string' || !tm.brand_name.trim() || tm.brand_name.trim().length > 50 || !Number.isInteger(tm.trademark_class) || Number(tm.trademark_class) < 1 || Number(tm.trademark_class) > 45) throw new CheckoutError('Complete the applicant type, valid PAN or GSTIN, brand name and trademark class (1–45).', 400);
            trademark = { applicant_type: tm.applicant_type, pan_or_gstin: tm.pan_or_gstin, brand_name: tm.brand_name.trim(), trademark_class: tm.trademark_class };
          }
          try {
            const rows = await db('service_checkout_orders', 'POST', { user_id: user.id, business_id: businessId, application_id: applicationId, request_id: requestId, package_id: selected.id, package_title: selected.title, amount: selected.amountPaise, currency: selected.currency, status: 'created', trademark_json: trademark }) as CheckoutOrder[];
            order = rows[0];
          } catch (error) {
            // The partial unique index chooses one winner even when different
            // browser request IDs race to pay for the same application.
            if (!applicationId || !(error instanceof CheckoutError) || error.status !== 409) throw error;
            order = await activeApplicationOrder();
            if (!order) throw error;
            checkOrder(order);
            if (order.razorpay_order_id) return response(resultForOrder(order));
          }
          if (!order?.id) throw new CheckoutError('Could not prepare the checkout. Please retry.');
        }
        if (applicationId) {
          // Claim provider creation before calling Razorpay. A timeout can leave
          // an unknown provider outcome, so the claim is never time-reclaimed.
          const claim = uuid();
          const claimed = await db(`service_checkout_orders?id=eq.${order.id}&user_id=eq.${user.id}&status=eq.created&razorpay_order_id=is.null&provider_create_token=is.null`, 'PATCH', { provider_create_token: claim }) as CheckoutOrder[];
          if (!claimed[0]) {
            const latest = await activeApplicationOrder();
            checkOrder(latest);
            if (latest?.razorpay_order_id) return response(resultForOrder(latest));
            throw new CheckoutError('Your payment order is already being prepared. Please wait and retry. If this continues, contact RegisterBox before starting another payment.', 409);
          }
          order = claimed[0];
        }
        let created: Record<string, unknown>;
        try {
          created = await provider('orders', { amount: order.amount, currency: order.currency, receipt: order.id, notes: { checkout_id: order.id, package_id: selected.id }, partial_payment: false });
        } catch (error) {
          // An authentication rejection cannot have created a provider order.
          // Other failures may have an uncertain outcome and retain the claim.
          if (applicationId && error instanceof CheckoutError && error.status === 401) {
            await db(`service_checkout_orders?id=eq.${order.id}&user_id=eq.${user.id}&status=eq.created&provider_create_token=eq.${order.provider_create_token}`, 'PATCH', { provider_create_token: null });
          }
          throw error;
        }
        if (typeof created.id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(created.id) || created.amount !== order.amount || created.currency !== order.currency) throw new CheckoutError('Payment provider returned an unexpected order. Please contact RegisterBox.');
        const claimFilter = applicationId ? `&provider_create_token=eq.${order.provider_create_token}` : '';
        const saved = await db(`service_checkout_orders?id=eq.${order.id}&user_id=eq.${user.id}&status=eq.created${claimFilter}`, 'PATCH', { razorpay_order_id: created.id, status: 'pending_payment', updated_at: new Date(now()).toISOString() }) as CheckoutOrder[];
        if (!saved[0]) throw new CheckoutError('Checkout changed while being prepared. Please retry.', 409);
        return response(resultForOrder(saved[0]));
      }
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, checkout_token: token } = body;
      if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId) || typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature) || typeof token !== 'string' || !uuidPattern.test(token)) throw new CheckoutError('Payment ID, order ID, signature and checkout reference are required.', 400);
      const rows = await db(`service_checkout_orders?id=eq.${token}&user_id=eq.${user.id}&select=*`) as CheckoutOrder[];
      const order = rows[0];
      if (!order || order.razorpay_order_id !== orderId) throw new CheckoutError('Payment order was not found for your account.', 400);
      // Always use our stored provider order ID, never a client-selected order.
      if (!await validPaymentSignature(order.razorpay_order_id, paymentId, signature, secret)) throw new CheckoutError('Payment signature did not match. Payment has not been confirmed.', 400);
      if (order.razorpay_payment_id && order.razorpay_payment_id !== paymentId) throw new CheckoutError('A different payment is already recorded for this order.', 409);
      const payment = await provider(`payments/${paymentId}`);
      if (payment.id !== paymentId || payment.order_id !== order.razorpay_order_id || payment.amount !== order.amount || payment.currency !== order.currency) throw new CheckoutError('Payment details do not match your checkout. Please contact RegisterBox.', 400);
      if (payment.status !== 'captured' && payment.status !== 'authorized') throw new CheckoutError('Payment is not complete. Please check the payment status before trying again.', 400);
      const paid = payment.status === 'captured';
      // Captured payment is required for fulfilment; authorization alone is pending.
      const states = paid ? '(pending_payment,authorized,paid)' : '(pending_payment,authorized)';
      const saved = await db(`service_checkout_orders?id=eq.${order.id}&user_id=eq.${user.id}&status=in.${states}&or=(razorpay_payment_id.is.null,razorpay_payment_id.eq.${paymentId})`, 'PATCH', { razorpay_payment_id: paymentId, status: paid ? 'paid' : 'authorized', paid_at: paid ? new Date(now()).toISOString() : null, updated_at: new Date(now()).toISOString() }) as CheckoutOrder[];
      let status = paid ? 'paid' : 'authorized';
      if (!saved[0]) {
        const latest = await db(`service_checkout_orders?id=eq.${order.id}&user_id=eq.${user.id}&select=*`) as CheckoutOrder[];
        if (latest[0]?.status !== 'paid' || latest[0]?.razorpay_payment_id !== paymentId) throw new CheckoutError('Could not record the payment. Retry verification; do not pay again.');
        status = 'paid';
      }
      return response({ success: true, status, order_id: order.razorpay_order_id, payment_id: paymentId, checkout_token: order.id, application_id: order.application_id ?? null, package_id: order.package_id, amount: order.amount, currency: order.currency });
    } catch (error) {
      if (error instanceof CheckoutError) return response({ error: error.message }, error.status);
      return response({ error: 'Checkout could not be completed. Please retry. If your account was debited, retry verification before paying again.' }, 500);
    }
  };
}
