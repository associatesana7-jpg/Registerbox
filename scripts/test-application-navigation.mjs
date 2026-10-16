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
  vm.runInNewContext(code, { exports, require(name) {
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
const replacements = [];
const modules = {
  'expo-router': { Redirect: 'Redirect', router: { replace: href => replacements.push(href) },
    useLocalSearchParams: () => ({ next: requested }) },
  react: { useRef: value => ({ current: value }), useState: value => [value, () => {}] },
  'react-native': { Text: 'Text' },
  '@/components/registerbox-ui': Object.fromEntries(['Button', 'Card', 'ErrorBanner', 'Field', 'PageHeader', 'Screen'].map(key => [key, key])),
  '@/hooks/use-app': { useApp: () => account },
  '@/lib/password-sign-in': {},
  '@/components/website/content': content,
};
const password = load('src/app/auth/password.tsx', modules).default;
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
for (const service of content.services) {
  requested = content.servicePath(service.category);
  assert.equal(content.safeNext(requested), requested);
  account = { session: { user: { id: 'fixture' } }, loadingSession: false };
  assert.equal(password().props.href, requested, `${service.category} must survive signed-in password redirect`);
  account = { session: null, loadingSession: false };
  const tree = password();
  const emailButton = nodes(tree).find(node => node.type === 'Button' && node.props.title === 'Use email code instead');
  emailButton.props.onPress();
  assert.equal(replacements.at(-1).pathname, '/auth');
  assert.equal(replacements.at(-1).params.next, requested);
}
for (const unsafe of ['https://example.com', '//example.com', '/auth', '/control-center', '/onboarding/application?category=unknown']) {
  assert.equal(content.safeNext(unsafe), '/dashboard');
}
console.log('Passed: navigator remains mounted; all 11 service destinations survive password/email transitions; unsafe redirects rejected.');
