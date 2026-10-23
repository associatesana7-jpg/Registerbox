// No SDK or Deno globals: shared rules are directly testable in Node and Edge.
export type PaymentEnv = Record<string, string | undefined>;
export type PaymentDependencies = { env: PaymentEnv; fetch?: typeof fetch; now?: () => number };
export const paymentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const paymentId = /^pay_[A-Za-z0-9]+$/;
export const providerOrderId = /^order_[A-Za-z0-9]+$/;
export const journeyKinds = new Set(['payment_page_viewed','checkout_cta_clicked','order_creation_requested','checkout_opened','checkout_dismissed','payment_failed_client','verification_started','verification_succeeded_client','verification_error_client','checkout_error_client']);
export const paymentCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export class PaymentOperationsError extends Error { status: number; constructor(message: string, status = 500) { super(message); this.status = status; } }
export const paymentJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: paymentCors });
export const paymentObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function paymentMode(env: PaymentEnv) { return env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') ? 'live' : env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'test' : 'unknown'; }
export function safeProviderPayment(value: Record<string, unknown>) {
  return Object.fromEntries(['id','order_id','amount','currency','status','method','error_code','error_description','created_at'].map(key => [key, typeof value[key] === 'string' ? String(value[key]).slice(0, key === 'error_description' ? 240 : 80) : value[key]]));
}
export function safeProviderRefund(value: Record<string, unknown>) { return Object.fromEntries(['id','payment_id','amount','currency','status'].map(key => [key,value[key]])); }
export function assertPaymentBinding(order: Record<string, unknown>, payment: Record<string, unknown>) {
  if (!paymentId.test(String(payment.id)) || payment.order_id !== order.razorpay_order_id || payment.amount !== order.amount || payment.currency !== order.currency || !['created','authorized','captured','refunded','failed'].includes(String(payment.status))) throw new PaymentOperationsError('Provider payment does not match this checkout.', 409);
}
export function monotonicPaymentStatus(current: string, observed: string) {
  if (current === 'paid') return 'paid';
  if (['captured','refunded'].includes(observed)) return 'paid';
  if (observed === 'authorized') return 'authorized';
  return current;
}
export async function validWebhookSignature(raw: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, Uint8Array.from(signature.match(/.{2}/g)!, byte => parseInt(byte, 16)), new TextEncoder().encode(raw));
}
export async function paymentBody(request: Request, max = 8192) {
  const text = await request.text();
  if (text.length > max) throw new PaymentOperationsError('Request is too large.', 413);
  try { const parsed: unknown = JSON.parse(text); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown>; }
  catch { throw new PaymentOperationsError('Send a valid JSON object.', 400); }
}
export function paymentRest(dependencies: PaymentDependencies) {
  const { env } = dependencies; const http = dependencies.fetch ?? fetch;
  return async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new PaymentOperationsError('Payment operations are not configured.', 503);
    const response = await http(`${env.SUPABASE_URL}/rest/v1/${path}`, { method, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new PaymentOperationsError('Could not save payment operations.', response.status === 409 ? 409 : 500);
    return response.status === 204 ? null : response.json();
  };
}
export async function paymentUser(request: Request, dependencies: PaymentDependencies) {
  const authorization = request.headers.get('Authorization'); const { env } = dependencies;
  if (!authorization?.startsWith('Bearer ') || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new PaymentOperationsError('Sign in to continue.', 401);
  const result = await (dependencies.fetch ?? fetch)(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authorization, apikey: env.SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(10000) });
  const user = paymentObject(await result.json());
  if (!result.ok || !paymentUuid.test(String(user.id))) throw new PaymentOperationsError('Sign in to continue.', 401);
  return String(user.id);
}
export function paymentProvider(dependencies: PaymentDependencies) {
  const { env } = dependencies;
  return async (path: string): Promise<Record<string, unknown>> => {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new PaymentOperationsError('Razorpay is not configured.', 503);
    // This helper deliberately exposes GET only: no capture, refund or settlement mutation.
    const result = await (dependencies.fetch ?? fetch)(`https://api.razorpay.com/v1/${path}`, { method: 'GET', headers: { Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}` }, signal: AbortSignal.timeout(10000) });
    if (!result.ok) throw new PaymentOperationsError('Razorpay could not be read. No payment was changed.', result.status === 401 ? 401 : 502);
    return paymentObject(await result.json());
  };
}
export function paymentAttention(row: Record<string, unknown>, now = Date.now()) {
  const reasons: string[] = []; const inactive = now - Date.parse(String(row.last_activity_at)) >= 30 * 60000;
  if (row.status !== 'paid' && inactive) reasons.push('No observed activity for 30 minutes');
  if (row.status === 'viewed') reasons.push('Payment page viewed; no order created');
  if (row.provider_create_token && !row.razorpay_order_id) reasons.push('Provider order outcome needs reconciliation');
  if (row.status === 'authorized') reasons.push('Authorized; capture not confirmed');
  if (Number(row.failed_attempts) > 0 && row.status !== 'paid') reasons.push('Provider reported a failed attempt');
  if (row.dispute_status && !['closed','won'].includes(String(row.dispute_status))) reasons.push('Provider dispute requires review');
  if (row.status !== 'viewed' && row.provider_mode === 'unknown') reasons.push('Historical payment mode is unknown');
  return reasons;
}
export function csvCell(value: unknown) { const s = String(value ?? ''); return `"${(/^[\s]*[=+\-@]/.test(s) ? "'" : '') + s.replaceAll('"','""')}"`; }
