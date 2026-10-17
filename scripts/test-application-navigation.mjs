import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}
const content = load('src/components/website/content.ts', {});
const root = load('src/app/_layout.web.tsx', {
  'expo-router': { Stack: 'Stack' },
  '@/providers/app-provider': { AppProvider: 'AppProvider' },
  '@/components/website/shell.web': { WebShell: 'WebShell' },
  '@/components/website/website.css': {},
  '@/components/website/service-experience.css': {},
}).default();
assert.equal(root.type, 'AppProvider');
assert.equal(root.props.children.type, 'Stack', 'Auth/loading shell must be inside the navigator');
const shell = root.props.children.props.layout({ children: 'screen-content' });
assert.equal(shell.type, 'WebShell');
assert.equal(shell.props.children, 'screen-content');

let requested, account = { session: null, loadingSession: false };

const modules = {
  'expo-router': { Redirect: 'Redirect',
    useLocalSearchParams: () => ({ next: requested }) },
  react: { useRef: value => ({ current: value }), useState: value => [value, () => {}] },
  'react-native': { Text: 'Text' },
  '@/components/registerbox-ui': Object.fromEntries(['Button', 'Card', 'ErrorBanner', 'Field', 'PageHeader', 'Screen'].map(key => [key, key])),
  '@/hooks/use-app': { useApp: () => account },
  '@/hooks/use-auth-captcha': { useAuthCaptcha: () => ({ verify: async () => 'fixture-token', challenge: null }) },
  '@/components/website/content': content,
};
const password = load('src/app/auth/password.tsx', modules).default;
for (const service of content.services) {
  requested = content.servicePath(service.category);
  assert.equal(content.safeNext(requested), requested);
  for (const session of [null, { user: { id: 'fixture' } }]) {
    account = { session, loadingSession: false };
    const tree = password();
    assert.equal(tree.type, 'Redirect');
    assert.equal(tree.props.href.pathname, '/auth');
    assert.equal(tree.props.href.params.next, requested);
  }
}
for (const unsafe of ['https://example.com', '//example.com', '/auth', '/control-center', '/onboarding/application?category=unknown']) {
  assert.equal(content.safeNext(unsafe), '/dashboard');
}
for (const next of ['/gst-returns?form=gstr-3b&year=2026&month=09&mode=nil','/gst-purchases?year=2026&month=10','/onboarding/welcome','/onboarding/intent','/onboarding/report']) assert.equal(content.safeNext(next),next);
assert.equal(content.safeNext('/(tabs)/documents'),'/documents');
for(const unsafe of ['/gst-returns?mode=javascript:alert(1)','/gst-returns?next=https://example.com','/gst-purchases?month=99','/\\example.com','/privacy-operations','/onboarding/application?category=company&next=https://example.com']) assert.equal(content.safeNext(unsafe),'/dashboard');
console.log('Passed: navigator remains mounted; all 11 service destinations survive legacy-link/email OTP transitions; unsafe redirects rejected.');
