import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const BUSINESS = '33333333-3333-4333-8333-333333333333';
const APPLICATION = '44444444-4444-4444-8444-444444444444';
const CHECKOUT = '55555555-5555-4555-8555-555555555555';
const scope = { userId: USER, businessId: BUSINESS, applicationId: APPLICATION, packageId: 'gst-registration' };
const flush = async () => { for (let index = 0; index < 8; index++) await new Promise(resolve => setImmediate(resolve)); };

function load(filename, modules, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Date, Error, AbortController, setTimeout, clearTimeout, ...globals,
    require(name) {
      if (!(name in modules)) throw new Error(`Unexpected dependency ${name} in ${filename}`);
      return modules[name];
    },
  }, { filename });
  return exports;
}

function fixture({ storage = new Map(), invoke, storageUnavailable = false } = {}) {
  const calls = [];
  let activeUser = USER;
  const window = {
    crypto: webcrypto,
    sessionStorage: {
      getItem(key) { if (storageUnavailable) throw new Error('Storage disabled'); return storage.get(key) || null; },
      setItem(key, value) { if (storageUnavailable) throw new Error('Storage disabled'); storage.set(key, value); },
    },
  };
  const supabase = {
    auth: { async getSession() { return { data: { session: activeUser ? { user: { id: activeUser }, access_token: `fixture-token-${activeUser}` } : null } }; } },
    functions: { async invoke(name, options) { calls.push({ name, ...options }); return invoke ? invoke(name, options) : { data: { success: true }, error: null }; } },
  };
  const api = load('src/lib/payment-journey.web.ts', {
    react: { useEffect() {}, useMemo: callback => callback() }, '@/lib/supabase': { supabase },
  }, { window });
  return { ...api, calls, storage, setUser: id => { activeUser = id; } };
}

test('an authenticated payment-page view is observable before any order exists', async () => {
  const f = fixture();
  const journey = f.createPaymentJourney(scope);
  assert.equal(journey.record('payment_page_viewed'), undefined, 'Tracking never requires awaiting a network request');
  await flush();
  assert.equal(f.calls.length, 1);
  const request = f.calls[0];
  assert.equal(request.name, 'payment-journey');
  assert.equal(request.body.event, 'payment_page_viewed');
  assert.equal(request.body.application_id, APPLICATION);
  assert.equal(request.body.business_id, BUSINESS);
  assert.equal(request.body.package_id, 'gst-registration');
  assert.equal('checkout_id' in request.body, false);
  assert.equal(request.headers.Authorization, `Bearer fixture-token-${USER}`);
});

test('journeys survive a reload in the same tab, and each account/business/application/package stays separate', () => {
  const f = fixture();
  const original = f.createPaymentJourney(scope).id();
  const direct = f.createPaymentJourney({ userId: USER, packageId: 'income-tax-filing' }).id();
  assert.equal(f.createPaymentJourney(scope).id(), original);
  const reloaded = fixture({ storage: f.storage });
  assert.equal(reloaded.createPaymentJourney(scope).id(), original);
  assert.equal(reloaded.createPaymentJourney({ userId: USER, packageId: 'income-tax-filing' }).id(), direct);
  const alternate = [
    { ...scope, userId: OTHER_USER }, { ...scope, businessId: CHECKOUT },
    { ...scope, applicationId: CHECKOUT }, { ...scope, packageId: 'fssai-licence' },
  ].map(value => f.createPaymentJourney(value).id());
  assert.equal(new Set([original, direct, ...alternate]).size, 6);
});

test('rerendered views are deduplicated while deliberate checkout retries retain unique event IDs', async () => {
  const f = fixture();
  f.createPaymentJourney(scope).record('payment_page_viewed');
  f.createPaymentJourney(scope).record('payment_page_viewed');
  const journey = f.createPaymentJourney(scope);
  journey.record('checkout_cta_clicked');
  journey.record('checkout_cta_clicked');
  await flush();
  assert.deepEqual(f.calls.map(value => value.body.event), ['payment_page_viewed', 'checkout_cta_clicked', 'checkout_cta_clicked']);
  assert.equal(new Set(f.calls.map(value => value.body.event_id)).size, 3);
  assert.equal(new Set(f.calls.map(value => value.body.journey_id)).size, 1);
});

test('only coarse allowlisted fields are transmitted; provider payloads, signatures and form values are excluded', async () => {
  const f = fixture();
  f.createPaymentJourney({ ...scope, pan: 'SENSITIVE-PAN', email: 'private@example.test' }).record('payment_failed_client', {
    checkoutId: CHECKOUT, safeCode: 'PAYMENT_ATTEMPT_FAILED', razorpay_signature: 'PRIVATE-SIGNATURE',
    description: 'UPI private@example.test', card: 'SENSITIVE-CARD', brand_name: 'PRIVATE-BRAND',
  });
  await flush();
  assert.deepEqual(Object.keys(f.calls[0].body).sort(), [
    'application_id', 'business_id', 'checkout_id', 'event', 'event_id', 'journey_id', 'package_id', 'safe_code',
  ]);
  const all = JSON.stringify({ calls: f.calls.map(value => value.body), storage: [...f.storage] });
  for (const sensitive of ['SENSITIVE-PAN', 'private@example.test', 'PRIVATE-SIGNATURE', 'SENSITIVE-CARD', 'PRIVATE-BRAND']) {
    assert.equal(all.includes(sensitive), false);
  }
});

test('untyped callers cannot transmit arbitrary event names or sensitive error descriptions as codes', async () => {
  const f = fixture();
  f.createPaymentJourney(scope).record('UPI_PRIVATE@example.test');
  f.createPaymentJourney(scope).record('checkout_error_client', { safeCode: 'PRIVATE@example.test', checkoutId: 'PRIVATE-CARD' });
  await flush();
  assert.equal(f.calls.length, 1);
  assert.equal('safe_code' in f.calls[0].body, false);
  assert.equal('checkout_id' in f.calls[0].body, false);
  assert.equal(JSON.stringify(f.calls[0].body).includes('PRIVATE'), false);
});

test('account changes and sign-out drop queued activity instead of attaching it to the next user', async () => {
  for (const nextUser of [OTHER_USER, null]) {
    const f = fixture();
    f.createPaymentJourney(scope).record('checkout_opened', { checkoutId: CHECKOUT });
    f.setUser(nextUser);
    await flush();
    assert.equal(f.calls.length, 0);
  }
});

test('private-browser storage and telemetry network failures never prevent payment or pending-payment recovery', async () => {
  let attempts = 0;
  const f = fixture({ storageUnavailable: true, invoke() { if (attempts++ === 0) throw new Error('Network offline'); return { data: null, error: new Error('Tracking unavailable') }; } });
  const journey = f.createPaymentJourney(scope);
  assert.ok(journey.id());
  assert.doesNotThrow(() => journey.record('checkout_opened', { checkoutId: CHECKOUT }));
  assert.doesNotThrow(() => journey.record('verification_started', { checkoutId: CHECKOUT }));
  assert.doesNotThrow(() => journey.record('verification_error_client', { checkoutId: CHECKOUT, safeCode: 'VERIFICATION_UNAVAILABLE' }));
  await flush();
  assert.equal(f.calls.length, 3, 'A rejected activity request must not stall later verification observations');
  assert.ok(f.calls.every(value => value.name === 'payment-journey'));
});

test('invalid contexts do not emit activity and the per-tab context store remains bounded', async () => {
  const f = fixture();
  for (const invalid of [
    { ...scope, userId: '' }, { ...scope, applicationId: 'other-application' },
    { ...scope, packageId: 'PAN/PRIVATE' }, { ...scope, businessId: 'not-a-business' },
  ]) {
    assert.equal(f.createPaymentJourney(invalid).id(), undefined);
    f.createPaymentJourney(invalid).record('payment_page_viewed');
  }
  for (let index = 0; index < 80; index++) f.createPaymentJourney({ ...scope, packageId: `fixture-${index}` }).id();
  await flush();
  assert.equal(f.calls.length, 0);
  assert.ok(JSON.parse([...f.storage.values()][0]).length <= 24);
});

const jsx = (type, props) => ({ type, props });
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];

test('the submitted-application fee card records a page view before its review-and-pay link is followed', () => {
  const activity = [];
  const application = { id: APPLICATION, business_id: BUSINESS, status: 'READY_FOR_REVIEW', businessName: 'Fixture', orders: [], services: { name: 'GST registration' } };
  const item = { id: 'gst-registration', title: 'GST registration', billingLabel: 'One-time', amountPaise: 199900, feeNote: 'No GST added' };
  let hook = 0;
  const { ApplicationPaymentCard } = load('src/components/application-payment-card.web.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useEffect() {}, useState(initial) { return [hook++ === 0 ? application : initial, () => {}]; } },
    'expo-router': { Link: 'Link' }, '@/hooks/use-app': { useApp: () => ({ session: { user: { id: USER } } }) },
    '@/lib/application-checkout.web': {
      applicationCategory: () => 'gst_registration', applicationCheckoutPackageIds: () => [item.id],
      applicationCheckoutPath: (id, packageId) => `/checkout?application=${id}&package=${packageId}`,
      isApplicationId: () => true, loadApplicationCheckout: () => assert.fail('No network in this render'),
    },
    '@/lib/service-catalog': { getServicePackage: () => item }, '@/lib/razorpay-checkout.web': { readPendingCheckout: () => null },
    '@/lib/payment-journey.web': { usePaymentJourney(value, enabled) { assert.equal(enabled, true); activity.push({ scope: value, event: 'payment_page_viewed' }); return { record: event => activity.push({ event }) }; } },
    './website/content': { contact: { whatsapp: 'https://example.test' } }, './website/application-payment.css': {},
  });
  const wrapper = ApplicationPaymentCard({ applicationId: APPLICATION });
  const tree = wrapper.type(wrapper.props);
  assert.equal(activity[0].scope.applicationId, APPLICATION);
  assert.equal(activity[0].scope.businessId, BUSINESS);
  assert.equal(activity[0].scope.userId, USER);
  const link = nodes(tree).find(value => value.type === 'Link' && value.props.className === 'rb-ap-button');
  assert.ok(link);
  assert.equal(activity.length, 1, 'Viewing the fee alone is recorded before payment intent or an order');
  link.props.onPress();
  assert.equal(activity[1].event, 'checkout_cta_clicked');
});


test('food fee card offers Basic only for matched intake and keeps quote and existing-payment paths', () => {
  const helpers = load('supabase/functions/_shared/application-checkout.ts', {});
  const catalogue = load('supabase/functions/_shared/service-catalog.ts', {});
  const answers = { food_route: 'Registration', food_activity: 'Cloud kitchen', existing_fssai: 'No', multi_state: 'No', turnover: '900000', food_products: 'Meals' };
  const makeApplication = (patch = {}, options = {}) => ({
    id: APPLICATION, business_id: BUSINESS, status: 'READY_FOR_REVIEW', businessName: 'Fixture kitchen', orders: [], services: { name: 'FSSAI', slug: 'fssai' },
    questionnaire: { application_drafts: { food: { application_id: APPLICATION, status: 'submitted_to_registerbox', answers: { ...answers, ...patch } } } }, ...options,
  });
  function render(application, pending = null) {
    let hook = 0;
    const { ApplicationPaymentCard } = load('src/components/application-payment-card.web.tsx', {
      'react/jsx-runtime': { jsx, jsxs: jsx },
      react: { useEffect() {}, useState(initial) { return [hook++ === 0 ? application : initial, () => {}]; } },
      'expo-router': { Link: 'Link' }, '@/hooks/use-app': { useApp: () => ({ session: { user: { id: USER } } }) },
      '@/lib/application-checkout.web': { ...helpers, applicationCheckoutPath: (id, packageId) => `/checkout?application=${id}&package=${packageId}`, isApplicationId: () => true, loadApplicationCheckout: () => assert.fail('No network in render') },
      '@/lib/service-catalog': catalogue, '@/lib/razorpay-checkout.web': { readPendingCheckout: () => pending },
      '@/lib/payment-journey.web': { usePaymentJourney() { return null; } },
      './website/content': { contact: { whatsapp: 'https://example.test' } }, './website/application-payment.css': {},
    });
    const wrapper = ApplicationPaymentCard({ applicationId: APPLICATION });
    return nodes(wrapper.type(wrapper.props));
  }
  const basic = render(makeApplication());
  assert.ok(basic.some(node => node.type === 'Link' && node.props.className === 'rb-ap-button'));
  for (const value of [makeApplication({ food_route: 'State licence' }), makeApplication({ food_route: 'Central licence' }), makeApplication({ existing_fssai: 'Yes' }), makeApplication({}, { questionnaire: null })]) {
    const tree = render(value);
    assert.equal(tree.some(node => node.type === 'Link' && node.props.className === 'rb-ap-button'), false);
    assert.ok(tree.some(node => node.type === 'a' && node.props.children?.[0] === 'Request my service quote '));
  }
  const original = { id: CHECKOUT, package_id: 'fssai-licence', package_title: 'FSSAI Licence', amount: 299900, status: 'paid', razorpay_payment_id: 'pay_fixture' };
  const paid = render(makeApplication({ food_route: 'State licence' }, { orders: [original] }));
  assert.ok(JSON.stringify(paid).includes('2,999'), 'Receipt renders the stored old price');
  assert.equal(JSON.stringify(paid).includes('1,999'), false, 'Receipt does not substitute today’s package price');
  const pending = { checkout_token: CHECKOUT, package_id: 'fssai-licence', application_id: APPLICATION };
  const waiting = render(makeApplication({ food_route: 'State licence' }, { orders: [{ ...original, status: 'authorized' }] }), pending);
  const verifyLink = waiting.find(node => node.type === 'Link' && node.props.className === 'rb-ap-button');
  assert.ok(verifyLink); assert.ok(verifyLink.props.href.includes('package=fssai-licence'));
});
