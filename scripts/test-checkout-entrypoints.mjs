import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];
function load(filename, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency in ${filename}: ${name}`);
  } }, { filename });
  return exports;
}
const catalogue = load('supabase/functions/_shared/service-catalog.ts');
const content = load('src/components/website/content.ts');

function render(packageId, signedIn = false, pending = null) {
  const account = { session: signedIn ? { user: { id: 'fixture-user', email: 'fixture@example.test' } } : null, business: {}, loadingSession: false };
  const screen = load('src/components/website/checkout.web.tsx', {
    'expo-router': { Link: 'Link', useLocalSearchParams: () => ({ package: packageId }) },
    react: { useEffect() {}, useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useRef: initial => ({ current: initial }), useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() },
    '@/hooks/use-app': { useApp: () => account }, '@/lib/service-catalog': catalogue,
    '@/lib/application-checkout.web': { isApplicationId: () => false },
    '@/components/application-payment-card.web': { ApplicationPaymentCard: 'ApplicationPaymentCard' },
    '@/lib/payment-journey.web': { usePaymentJourney: () => null },
    '@/lib/razorpay-checkout.web': { readPendingCheckout: () => pending },
    './brand.web': { WebBrand: 'WebBrand' }, './content': content, './seo.web': { Seo: 'Seo' }, './checkout.css': {},
  }).default();
  return nodes(screen.type(screen.props));
}

test('all registration checkout actions preserve the selected category through guest sign-in', () => {
  for (const [packageId, category] of [['gst-registration', 'gst_registration'], ['fssai-licence', 'food'], ['udyam-registration', 'udyam'], ['shop-establishment', 'retail']]) {
    const links = render(packageId).filter(node => node.type === 'Link' && node.props.className === 'rb-ck-primary');
    assert.equal(links.length, 3, `${category}: early summary, details and order summary actions`);
    for (const link of links) {
      assert.equal(link.props.href.pathname, '/auth');
      assert.equal(link.props.href.params.next, `/onboarding/application?category=${category}`);
    }
  }
});

test('signed-in registration customers proceed directly to the correct application', () => {
  for (const [packageId, category] of [['gst-registration', 'gst_registration'], ['fssai-licence', 'food'], ['udyam-registration', 'udyam'], ['shop-establishment', 'retail']]) {
    const links = render(packageId, true).filter(node => node.type === 'Link' && node.props.className === 'rb-ck-primary');
    assert.equal(links.length, 3);
    for (const link of links) assert.equal(link.props.href, `/onboarding/application?category=${category}`);
  }
});

test('non-registration guest checkout retains its existing selected-package return path', () => {
  const links = render('digital-signature-individual').filter(node => node.type === 'Link' && node.props.className === 'rb-ck-primary');
  assert.equal(links.length, 3);
  for (const link of links) {
    assert.equal(link.props.href.pathname, '/auth');
    assert.equal(link.props.href.params.next, '/checkout?package=digital-signature-individual');
  }
});

test('pending payments without an authoritative order amount never claim today’s catalogue fee as the recorded total', () => {
  const tree = render('digital-signature-individual', true, { package_id: 'digital-signature-individual', user_id: 'fixture-user', razorpay_payment_id: 'pay_previous', razorpay_order_id: 'order_previous' });
  const price = tree.find(node => node.props?.className === 'rb-ck-quick-price');
  assert(price);
  assert.equal(price.props.children[0].props.children, 'Verify total');
});
