import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createCheckoutHandler, validPaymentSignature } from '../supabase/functions/_shared/razorpay.ts';
import { applicationCategory, applicationCheckoutPackageIds } from '../supabase/functions/_shared/application-checkout.ts';

const user = '11111111-1111-4111-8111-111111111111';
const token = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const applicationId = '44444444-4444-4444-8444-444444444444';
const businessId = '55555555-5555-4555-8555-555555555555';
const otherRequestId = '66666666-6666-4666-8666-666666666666';
const secret = 'unit-test-secret-not-a-real-key';
const env = { SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'server-only', RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: secret };
const signature = (order = 'order_fixture', payment = 'pay_fixture') => createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex');
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function fixture(options = {}) {
  let order = options.order ? { ...options.order } : null;
  const calls = [];
  const http = async (url, init = {}) => {
    calls.push({ url, ...init });
    if (url.endsWith('/auth/v1/user')) return options.unauthorized ? new Response('{}', { status: 401 }) : json({ id: user });
    if (url.includes('/rest/v1/service_checkout_orders')) {
      if (init.method === 'POST') {
        if (options.createConflict) { order = { ...options.createConflict }; return new Response('{}', { status: 409 }); }
        order = { id: token, razorpay_order_id: null, razorpay_payment_id: null, provider_create_token: null, ...JSON.parse(init.body) }; return json([order]);
      }
      if (init.method === 'PATCH') {
        if (url.includes('provider_create_token=is.null')) {
          if (order?.provider_create_token || options.claimConflict) return json([]);
        }
        if (options.concurrentPaid) { order = { ...order, status: 'paid', razorpay_payment_id: options.concurrentPaymentId ?? 'pay_fixture', paid_at: new Date().toISOString() }; return json([]); }
        order = { ...order, ...JSON.parse(init.body) }; return json([order]);
      }
      if (url.includes('created_at=gte.')) return json(options.rateLimited ? new Array(10).fill({ id: token }) : []);
      const query = new URL(url).searchParams;
      if (query.has('request_id') && order?.request_id && query.get('request_id') !== `eq.${order.request_id}`) return json([]);
      if (query.has('application_id') && query.get('application_id') !== `eq.${order?.application_id}`) return json([]);
      if (query.has('status') && order && !['created', 'pending_payment', 'authorized', 'paid'].includes(order.status)) return json([]);
      return json(order ? [order] : []);
    }
    if (url.includes('/rest/v1/applications')) return json(options.application ? [options.application] : []);
    if (url.includes('/rest/v1/business_profiles')) return json(options.ownsBusiness ? [{ id: businessId }] : []);
    if (url.endsWith('/v1/orders')) {
      if (options.providerStatus) return new Response('{}', { status: options.providerStatus });
      return json({ id: 'order_fixture', amount: JSON.parse(init.body).amount, currency: 'INR' });
    }
    if (url.includes('/v1/payments/')) return json({ id: 'pay_fixture', order_id: 'order_fixture', amount: options.paymentAmount ?? 199900, currency: 'INR', status: options.paymentStatus ?? 'captured' });
    throw new Error(`Unexpected request ${url}`);
  };
  const handler = action => createCheckoutHandler(action, { env, fetch: http, uuid: () => requestId });
  const request = (body, authenticated = true) => new Request('https://example.invalid', { method: 'POST', headers: authenticated ? { Authorization: 'Bearer user-jwt' } : {}, body: JSON.stringify(body) });
  return { handler, request, calls, getOrder: () => order };
}
const pendingOrder = { id: token, user_id: user, package_id: 'gst-registration', package_title: 'GST Registration', amount: 199900, currency: 'INR', status: 'pending_payment', razorpay_order_id: 'order_fixture', razorpay_payment_id: null };
const verifyBody = { checkout_token: token, razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture', razorpay_signature: signature() };
const application = { id: applicationId, business_id: businessId, status: 'READY_FOR_REVIEW', services: { slug: 'gst-registration' } };
const applicationBody = { package_id: 'gst-registration', application_id: applicationId, business_id: businessId, idempotency_key: requestId };
const linkedOrder = { ...pendingOrder, business_id: businessId, application_id: applicationId, request_id: otherRequestId };

test('application packages use authoritative service slugs and never invent quoted prices', () => {
  for (const [slug, category, id] of [['gst-registration', 'gst_registration', 'gst-registration'], ['fssai', 'food', 'fssai-licence'], ['shops-establishment', 'retail', 'shop-establishment'], ['udyam', 'udyam', 'udyam-registration']]) {
    assert.equal(applicationCategory({ services: { slug }, form_data: { category: 'wrong' } }), category);
    assert.deepEqual(applicationCheckoutPackageIds(category), [id]);
  }
  for (const slug of ['private-limited-registration', 'llp-registration', 'business-setup', 'compliance-review']) {
    assert.equal(applicationCategory({ services: { slug }, form_data: { category: 'gst_registration' } }), null);
  }
  assert.deepEqual(applicationCheckoutPackageIds('company'), []);
  assert.equal(applicationCategory({ form_data: { category: 'food' } }), 'food');
});
test('linked checkout validates application ownership, business association and submitted state before provider creation', async () => {
  for (const [options, body, status] of [
    [{}, { ...applicationBody, application_id: 'invalid' }, 400],
    [{ ownsBusiness: true }, applicationBody, 403],
    [{ application }, applicationBody, 403],
    [{ application, ownsBusiness: true }, { ...applicationBody, business_id: user }, 403],
    ...['DRAFT', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => [{ application: { ...application, status }, ownsBusiness: true }, applicationBody, 409]),
  ]) {
    const f = fixture(options); const result = await f.handler('create')(f.request(body));
    assert.equal(result.status, status); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
    assert.equal(f.calls.some(x => x.method === 'POST' && x.url.includes('/rest/')), false);
  }
});
test('application checkout cannot select another service or pay a service awaiting a quote', async () => {
  for (const [slug, package_id] of [['gst-registration', 'udyam-registration'], ['fssai', 'gst-registration'], ['shops-establishment', 'gst-registration'], ['business-setup', 'gst-registration']]) {
    const f = fixture({ application: { ...application, services: { slug } }, ownsBusiness: true });
    const result = await f.handler('create')(f.request({ ...applicationBody, package_id }));
    assert.equal(result.status, 400); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
  }
});
test('each published registration persists its application and owner business with its exact price', async () => {
  for (const [slug, package_id, amount] of [['gst-registration', 'gst-registration', 199900], ['fssai', 'fssai-licence', 299900], ['shops-establishment', 'shop-establishment', 449900], ['udyam', 'udyam-registration', 49900]]) {
    const f = fixture({ application: { ...application, services: { slug } }, ownsBusiness: true });
    const result = await f.handler('create')(f.request({ ...applicationBody, package_id, business_id: undefined }));
    assert.equal(result.status, 200); assert.equal((await result.json()).application_id, applicationId);
    assert.equal(f.getOrder().application_id, applicationId); assert.equal(f.getOrder().business_id, businessId); assert.equal(f.getOrder().amount, amount);
    const claim = f.calls.find(x => x.method === 'PATCH' && x.url.includes('provider_create_token=is.null'));
    assert.ok(claim); assert.equal(f.calls.indexOf(claim) < f.calls.findIndex(x => x.url.endsWith('/v1/orders')), true);
  }
});
test('different browser request IDs reuse the same outstanding application order', async () => {
  const f = fixture({ application, ownsBusiness: true, order: linkedOrder });
  const result = await f.handler('create')(f.request(applicationBody));
  assert.equal(result.status, 200); assert.equal((await result.json()).order_id, 'order_fixture');
  assert.equal(f.calls.some(x => x.method === 'POST'), false);
});
test('paid and authorized applications reject new requests without taking another payment', async () => {
  for (const status of ['paid', 'authorized']) {
    const f = fixture({ application, ownsBusiness: true, order: { ...linkedOrder, status } });
    const result = await f.handler('create')(f.request(applicationBody));
    assert.equal(result.status, 409); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
  }
});
test('an idempotency key cannot be reassigned to another application or to a direct purchase', async () => {
  for (const body of [{ ...applicationBody, application_id: undefined }, { ...applicationBody, application_id: businessId }]) {
    const f = fixture({ application: { ...application, id: businessId }, ownsBusiness: true, order: { ...linkedOrder, request_id: requestId } });
    const result = await f.handler('create')(f.request(body));
    assert.equal(result.status, 409); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
  }
});
test('unique application insert conflict safely reuses the winning outstanding order', async () => {
  const f = fixture({ application, ownsBusiness: true, createConflict: linkedOrder });
  const result = await f.handler('create')(f.request(applicationBody));
  assert.equal(result.status, 200); assert.equal((await result.json()).application_id, applicationId);
  assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
});
test('only one simultaneous request may create the provider order for an application', async () => {
  for (const options of [{ claimConflict: true }, { order: { ...linkedOrder, status: 'created', razorpay_order_id: null, provider_create_token: otherRequestId } }]) {
    const f = fixture({ application, ownsBusiness: true, ...options });
    const result = await f.handler('create')(f.request(applicationBody));
    assert.equal(result.status, 409); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
  }
});
test('a rejected provider key can retry, while uncertain provider creation cannot create a duplicate', async () => {
  for (const providerStatus of [401, 500]) {
    const f = fixture({ application, ownsBusiness: true, providerStatus });
    const result = await f.handler('create')(f.request(applicationBody));
    assert.equal(result.status, providerStatus);
    assert.equal(f.getOrder().status, 'created');
    assert.equal(f.getOrder().provider_create_token === null, providerStatus === 401);
    if (providerStatus === 500) {
      const retried = await f.handler('create')(f.request({ ...applicationBody, idempotency_key: otherRequestId }));
      assert.equal(retried.status, 409);
      assert.equal(f.calls.filter(x => x.url.endsWith('/v1/orders')).length, 1);
    }
  }
});
test('application association remains on the verified receipt', async () => {
  const f = fixture({ order: linkedOrder });
  const result = await f.handler('verify')(f.request(verifyBody));
  assert.equal(result.status, 200); assert.equal((await result.json()).application_id, applicationId);
});

test('HMAC validates exact order/payment binding and rejects tampering', async () => {
  assert.equal(await validPaymentSignature('order_fixture', 'pay_fixture', signature(), secret), true);
  assert.equal(await validPaymentSignature('order_other', 'pay_fixture', signature(), secret), false);
  assert.equal(await validPaymentSignature('order_fixture', 'pay_fixture', '00'.repeat(32), secret), false);
});
test('unauthenticated create cannot reach provider or database', async () => {
  const f = fixture(); const result = await f.handler('create')(f.request({ package_id: 'gst-registration' }, false));
  assert.equal(result.status, 401); assert.equal(f.calls.length, 0);
});
test('invalid, zero, fractional and underpriced amounts cannot create orders', async () => {
  for (const body of [{ package_id: 'unknown' }, ...[0, 99, 100.5, 1999, '199900'].map(amount => ({ package_id: 'gst-registration', amount }))]) {
    const f = fixture(); const result = await f.handler('create')(f.request(body));
    assert.equal(result.status, 400); assert.equal(f.calls.filter(x => x.url.includes('api.razorpay')).length, 0);
  }
});
test('create uses catalogue paise amount and exposes only public key', async () => {
  const f = fixture(); const result = await f.handler('create')(f.request({ package_id: 'gst-registration', idempotency_key: requestId }));
  assert.equal(result.status, 200); const body = await result.json();
  assert.equal(body.amount, 199900); assert.equal(body.checkout_token, token); assert.equal(body.key_id, env.RAZORPAY_KEY_ID);
  assert.equal(JSON.stringify(body).includes(secret), false);
  const sent = JSON.parse(f.calls.find(x => x.url.endsWith('/v1/orders')).body);
  assert.equal(sent.amount, 199900); assert.equal(sent.partial_payment, false);
});
test('same request reuses persisted provider order', async () => {
  const f = fixture({ order: pendingOrder }); const result = await f.handler('create')(f.request({ package_id: 'gst-registration', idempotency_key: requestId }));
  assert.equal(result.status, 200); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
});
test('provider errors map to 401/500 without leaking details or marking paid', async () => {
  for (const status of [401, 500]) {
    const f = fixture({ providerStatus: status }); const result = await f.handler('create')(f.request({ package_id: 'gst-registration' }));
    assert.equal(result.status, status); assert.equal(f.getOrder().status, 'created');
  }
});
test('TM missing details cannot create an order', async () => {
  const f = fixture(); const result = await f.handler('create')(f.request({ package_id: 'trademark-instant' }));
  assert.equal(result.status, 400); assert.equal(f.getOrder(), null);
});
test('verification rejects missing fields, unknown account order and mismatched signatures', async () => {
  for (const [body, existing] of [[{}, pendingOrder], [verifyBody, null], [{ ...verifyBody, razorpay_signature: '00'.repeat(32) }, pendingOrder], [{ ...verifyBody, razorpay_order_id: 'order_other' }, pendingOrder]]) {
    const f = fixture({ order: existing }); const result = await f.handler('verify')(f.request(body));
    assert.equal(result.status, 400); assert.equal(f.calls.some(x => x.method === 'PATCH'), false);
  }
});
test('valid signature with wrong amount cannot mark paid', async () => {
  const f = fixture({ order: pendingOrder, paymentAmount: 100 }); const result = await f.handler('verify')(f.request(verifyBody));
  assert.equal(result.status, 400); assert.equal(f.getOrder().status, 'pending_payment');
});
test('captured payments mark paid and repeated verification stays idempotent', async () => {
  const f = fixture({ order: pendingOrder });
  for (let i = 0; i < 2; i++) {
    const result = await f.handler('verify')(f.request(verifyBody));
    assert.equal(result.status, 200); assert.equal((await result.json()).status, 'paid');
  }
  assert.equal(f.getOrder().razorpay_payment_id, 'pay_fixture');
});
test('authorized-only and failed payments never mark paid', async () => {
  for (const status of ['authorized', 'failed', 'refunded']) {
    const f = fixture({ order: pendingOrder, paymentStatus: status }); const result = await f.handler('verify')(f.request(verifyBody));
    assert.equal(result.status, status === 'authorized' ? 200 : 400); assert.notEqual(f.getOrder().status, 'paid');
  }
});
test('stale authorization cannot downgrade a captured concurrent payment', async () => {
  const f = fixture({ order: pendingOrder, paymentStatus: 'authorized', concurrentPaid: true });
  const result = await f.handler('verify')(f.request(verifyBody));
  assert.equal(result.status, 200); assert.equal((await result.json()).status, 'paid');
  const update = f.calls.find(x => x.method === 'PATCH');
  assert.ok(update.url.includes('status=in.(pending_payment,authorized)'));
  assert.equal(f.getOrder().status, 'paid'); assert.ok(f.getOrder().paid_at);
});
test('concurrent competing payment cannot replace a recorded payment', async () => {
  const f = fixture({ order: pendingOrder, concurrentPaid: true, concurrentPaymentId: 'pay_other' });
  const result = await f.handler('verify')(f.request(verifyBody));
  assert.equal(result.status, 500); assert.equal(f.getOrder().razorpay_payment_id, 'pay_other');
  assert.ok(f.calls.find(x => x.method === 'PATCH').url.includes('or=(razorpay_payment_id.is.null,razorpay_payment_id.eq.pay_fixture)'));
});
test('rate limit blocks provider calls and preflight is available without auth', async () => {
  const f = fixture({ rateLimited: true }); const result = await f.handler('create')(f.request({ package_id: 'gst-registration' }));
  assert.equal(result.status, 429); assert.equal(f.calls.some(x => x.url.includes('api.razorpay')), false);
  assert.equal((await f.handler('create')(new Request('https://test.invalid', { method: 'OPTIONS' }))).status, 200);
});
