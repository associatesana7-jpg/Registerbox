import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const APPLICATION_ID = 'da80b7a2-141d-4c77-bdc7-f00bdd2e20d0';
const BUSINESS_ID = '91a9bbe0-4477-4b24-8770-c4d60b558336';
const jsx = (type, props) => ({ type, props });
const flush = () => new Promise(resolve => setImmediate(resolve));

function load(filename, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, Error, Date, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency in ${filename}: ${name}`);
  } }, { filename });
  return exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)] : [];
}

const categories = load('src/data/application-categories.ts').applicationCategories;
const paths = load('src/lib/application-checkout-paths.ts');

function applicationHarness({ os = 'web', category = 'gst_registration' } = {}) {
  const hooks = [], routes = [], operations = [], pending = [];
  let hookIndex = 0, questionnaire = {};
  const account = {
    session: { user: { id: 'fixture-customer' } }, loadingSession: false, business: {},
    selectBusiness: async id => { account.business = { id, legalName: 'Fixture business' }; },
  };
  const supabase = {
    from(table) {
      assert.equal(table, 'business_profiles', 'This fixture should only save the application draft');
      let mode = 'read', values;
      const query = {
        insert(value) { mode = 'insert'; values = value; return query; },
        update(value) { mode = 'update'; values = value; return query; },
        select() { return query; }, eq() { return query; },
        async single() {
          if (mode === 'insert') {
            operations.push('create-business');
            assert.equal(values.legal_name, 'Fixture business');
            return { data: { id: BUSINESS_ID }, error: null };
          }
          return { data: { questionnaire, updated_at: '2026-10-23T08:00:00Z' }, error: null };
        },
        async maybeSingle() {
          assert.equal(mode, 'update');
          questionnaire = values.questionnaire;
          operations.push('write-draft');
          return { data: { id: BUSINESS_ID }, error: null };
        },
      };
      return query;
    },
    rpc(name, args) {
      operations.push('submit-rpc');
      assert.equal(name, 'submit_application_draft');
      assert.equal(args.p_business, BUSINESS_ID);
      assert.equal(args.p_category, category);
      let resolve;
      const result = new Promise(done => { resolve = done; });
      pending.push({ resolve, args });
      return result;
    },
  };
  const noQuestions = () => [];
  const modules = {
    'expo-router': {
      Redirect: 'Redirect', useLocalSearchParams: () => ({ category }),
      router: { replace: destination => routes.push(destination), push: destination => routes.push(destination), back() {} },
    },
    react: {
      useEffect() {},
      useState(initial) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
        return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
      },
      useRef(initial) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = { current: initial };
        return hooks[index];
      },
    },
    'react-native': { Platform: { OS: os }, Text: 'Text', View: 'View' },
    '@/data/application-categories': {
      applicationCategories: categories, questionsFor: noQuestions, documentsFor: noQuestions,
      applicationFlowFor: () => ({ questions: [], documents: [], documentStep: 1, reviewStep: 2, hasDocumentStep: true }),
      validateQuestion: () => '',
    },
    '@/components/registerbox-ui': Object.fromEntries(['Button', 'Card', 'ErrorBanner', 'Field', 'PageHeader', 'Screen'].map(name => [name, name])),
    '@/components/gst-ui': { GstSelect: 'GstSelect' },
    '@/components/application-controls': { ApplicationField: 'Field', ApplicationSelect: 'GstSelect', ApplicationCard: 'Card', ApplicationReviewItem: 'ApplicationReviewItem' },
    '@/components/application-layout': { ApplicationLayout: 'ApplicationLayout' },
    '@/components/application-address': { ApplicationAddress: 'ApplicationAddress' },
    '@/data/india-address': { validateAddress: () => '' },
    '@/components/application-form-ui': Object.fromEntries(['ApplicationChoices', 'ApplicationFooter', 'ApplicationProgress'].map(name => [name, name])),
    '@/lib/application-form-presentation': { applicationInputProps: () => ({}) },
    '@/lib/application-resume': { applicationResumeStep: () => 0 },
    '@/lib/application-checkout': paths,
    '@/hooks/use-app': { useApp: () => account },
    '@/lib/supabase': { supabase },
    '@/lib/registerbox-api': { chooseAndUploadDocument: () => assert.fail('This test must not upload documents') },
    '@/constants/design': { palette: {} },
  };
  const screen = load('src/app/onboarding/application.tsx', modules).default();
  assert.equal(typeof screen.type, 'function', `Supported ${category} service must render its application`);
  function render() { hookIndex = 0; return nodes(screen.type(screen.props)); }
  const footer = () => render().find(node => node.type === 'ApplicationFooter');
  async function review() {
    const field = render().find(node => node.type === 'Field' && node.props.label === 'Business name');
    assert.ok(field);
    field.props.onChangeText('Fixture business');
    for (let attempts = 0; !footer().props.review && attempts < 5; attempts++) {
      assert.equal(footer().props.disabled, false);
      footer().props.onContinue();
      await flush();
    }
    assert.equal(footer().props.review, true, 'Use the rendered flow to reach the submission review');
    assert.equal(pending.length, 0, 'Saving and reviewing a draft must not submit it');
  }
  return { render, footer, review, routes, operations, pending };
}

test('every supported web registration enters payment only after the submission RPC succeeds', async () => {
  for (const category of Object.keys(categories).filter(category => category !== 'gst')) {
    const fixture = applicationHarness({ category });
    await fixture.review();
    fixture.footer().props.onContinue();
    await flush();
    assert.equal(fixture.pending.length, 1, `${category}: one authoritative submission`);
    assert.equal(fixture.routes.length, 0, `${category}: no payment route while submission is pending`);
    assert.equal(fixture.operations.at(-1), 'submit-rpc');
    assert.ok(fixture.operations.includes('write-draft'), `${category}: save the draft before submitting`);
    fixture.pending[0].resolve({ data: { applicationId: APPLICATION_ID, reference: 'RB-FIXTURE' }, error: null });
    await flush();
    assert.deepEqual(fixture.routes, [`/onboarding/payment?application=${APPLICATION_ID}`]);
    assert.equal(fixture.footer().props.saved, true, `${category}: preserve submitted confirmation`);
  }
});

test('rapid repeated submission creates one RPC and one payment handoff', async () => {
  const fixture = applicationHarness();
  await fixture.review();
  const press = fixture.footer().props.onContinue;
  press(); press(); press();
  await flush();
  assert.equal(fixture.pending.length, 1);
  assert.equal(fixture.footer().props.busy, true);
  fixture.footer().props.onContinue();
  await flush();
  assert.equal(fixture.pending.length, 1, 'A rerender during submission must retain the submit lock');
  fixture.pending[0].resolve({ data: { applicationId: APPLICATION_ID }, error: null });
  await flush();
  assert.equal(fixture.routes.length, 1);
  press();
  await flush();
  assert.equal(fixture.pending.length, 1, 'An old button callback must not resubmit a completed application');
});

test('a rejected submission shows the failure, stays on review, and allows a safe retry', async () => {
  const fixture = applicationHarness();
  await fixture.review();
  fixture.footer().props.onContinue();
  await flush();
  fixture.pending[0].resolve({ data: null, error: new Error('Fixture submission rejected') });
  await flush();
  assert.equal(fixture.routes.length, 0);
  assert.equal(fixture.footer().props.saved, false);
  assert.equal(fixture.footer().props.busy, false);
  assert.ok(fixture.render().some(node => node.type === 'ErrorBanner' && node.props.message === 'Fixture submission rejected'));
  fixture.footer().props.onContinue();
  await flush();
  assert.equal(fixture.pending.length, 2, 'A failed RPC must release the lock for a deliberate retry');
  fixture.pending[1].resolve({ data: { applicationId: APPLICATION_ID }, error: null });
  await flush();
  assert.deepEqual(fixture.routes, [`/onboarding/payment?application=${APPLICATION_ID}`]);
});

test('native submission keeps the existing confirmation and My applications destination', async () => {
  for (const os of ['ios', 'android']) {
    const fixture = applicationHarness({ os });
    await fixture.review();
    fixture.footer().props.onContinue();
    await flush();
    fixture.pending[0].resolve({ data: { applicationId: APPLICATION_ID, reference: 'RB-NATIVE' }, error: null });
    await flush();
    assert.equal(fixture.routes.length, 0, `${os}: do not open web checkout automatically`);
    assert.equal(fixture.footer().props.saved, true);
    assert.equal(fixture.footer().props.title, 'View my applications');
    fixture.footer().props.onContinue();
    assert.deepEqual(fixture.routes, ['/(tabs)/compliance']);
  }
});

test('auth next accepts exact application payment context and rejects ambiguous or external extras', () => {
  const { safeNext } = load('src/components/website/content.ts');
  for (const destination of [
    paths.applicationPaymentPath(APPLICATION_ID),
    paths.applicationCheckoutPath(APPLICATION_ID, 'gst-registration'),
    '/checkout?package=fssai-licence',
  ]) assert.equal(safeNext(destination), destination);
  for (const destination of [
    `https://example.com/onboarding/payment?application=${APPLICATION_ID}`,
    `//example.com/checkout?package=gst-registration&application=${APPLICATION_ID}`,
    `/onboarding/payment?application=${APPLICATION_ID}&next=https://example.com`,
    `/checkout?package=gst-registration&application=${APPLICATION_ID}&redirect=https://example.com`,
    '/onboarding/payment', '/onboarding/payment?application=not-a-uuid',
    '/onboarding/payment?application=------------------------------------',
    '/checkout?package=gst-registration&application=------------------------------------',
    `/onboarding/payment?application=${APPLICATION_ID}&application=${BUSINESS_ID}`,
    `/checkout?package=gst-registration&package=fssai-licence&application=${APPLICATION_ID}`,
    `/checkout?package=gst-registration&application=${APPLICATION_ID}&application=${BUSINESS_ID}`,
  ]) assert.equal(safeNext(destination), '/dashboard', `Reject unsafe payment context: ${destination}`);
});
