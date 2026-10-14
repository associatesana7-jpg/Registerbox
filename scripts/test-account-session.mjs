import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real provider with deterministic hook/storage/network substitutes.
// No credentials, real user records or GST portal writes are used.
const source = fs.readFileSync(new URL('../src/providers/app-provider.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle() { await new Promise(done => setTimeout(done, 10)); }
function harness() {
  const state = [], refs = [], effects = [];
  let hook = 0, ref = 0, effect = 0, authListener;
  const initial = deferred();
  let queryBarrier = null;
  const queries = [];
  const react = {
    createContext: () => ({}),
    useState(value) { const slot = hook++; if (!(slot in state)) state[slot] = typeof value === 'function' ? value() : value; return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }]; },
    useRef(value) { const slot = ref++; return refs[slot] ??= { current: value }; },
    useCallback: value => value,
    useMemo: factory => factory(),
    useEffect(callback) { const slot = effect++; if (!(slot in effects)) effects[slot] = callback(); },
  };
  const supabase = {
    auth: { getSession: () => initial.promise, onAuthStateChange(callback) { authListener = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
    from(table) {
      queries.push(table);
      const result = table === 'business_profiles' ? { data: [] } : { data: null };
      const barrier = queryBarrier;
      const chain = new Proxy({}, { get(_, key) { if (key === 'then') return (resolve, reject) => (barrier ? barrier.promise.then(() => result) : Promise.resolve(result)).then(resolve, reject); return () => chain; } });
      return chain;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, setTimeout,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (_type, props) => props, jsxs: (_type, props) => props };
      if (name.includes('async-storage')) return { __esModule: true, default: { getItem: async () => null, setItem: async () => {} } };
      if (name === '@/lib/supabase') return { supabase };
      if (name === '@/data/demo') return { demoCompliances: [] };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  function render() { hook = ref = effect = 0; return exports.AppProvider({ children: null }).value; }
  render();
  return { render, initial, event: (event, session) => authListener(event, session), blockQueries: barrier => { queryBarrier = barrier; }, queries };
}
const session = { user: { id: 'test-user', email: 'sample@example.invalid' }, access_token: 'not-a-token' };

// Preview -> genuine account: real sign-in clears demoMode even without a business.
{
  const app = harness();
  app.initial.resolve({ data: { session: null } }); await settle();
  app.render().setDemoMode(true);
  await app.render().refreshAccount(session);
  const account = app.render();
  assert.equal(account.demoMode, false);
  assert.equal(account.session, session);
  assert.equal(account.business.id, undefined);
  assert.equal(account.business.gstin, '');
  assert.equal(account.loadingSession, false);
}
// A stale initial read may not erase the newly verified OTP session.
{
  const app = harness();
  app.event('SIGNED_IN', session);
  app.initial.resolve({ data: { session: null } }); await settle();
  assert.equal(app.render().session, session);
  assert.equal(app.render().demoMode, false);
  assert.equal(app.render().loadingSession, false);
}
// An in-flight profile fetch may not restore account state after sign-out.
{
  const app = harness();
  app.initial.resolve({ data: { session: null } }); await settle();
  const barrier = deferred(); app.blockQueries(barrier);
  const loading = app.render().refreshAccount(session);
  app.event('SIGNED_OUT', null); await settle();
  barrier.resolve(); await loading; await settle();
  assert.equal(app.render().session, null);
  assert.equal(app.render().business.id, undefined);
  assert.equal(app.render().loadingSession, false);
}
// A newer sign-in supersedes a queued sign-out refresh.
{
  const app = harness();
  app.event('SIGNED_OUT', null); app.event('SIGNED_IN', session);
  app.initial.resolve({ data: { session: null } }); await settle();
  assert.equal(app.render().session, session);
  assert.equal(app.render().loadingSession, false);
}
// Exercise the actual GST route decision with a fresh signed-in account.
// Saving/selecting a business and refreshing tokens must leave active forms mounted.
{
  const app = harness();
  app.initial.resolve({ data: { session } }); await settle();
  const barrier = deferred(); app.blockQueries(barrier);
  const refresh = app.render().selectBusiness('application-business');
  await settle();
  assert.equal(app.render().loadingSession, false, 'Business refresh must not replace the active screen');
  barrier.resolve(); await refresh;
  const tokenBarrier = deferred(); app.blockQueries(tokenBarrier);
  app.event('TOKEN_REFRESHED', { ...session, access_token: 'refreshed-test-token' });
  await settle();
  assert.equal(app.render().loadingSession, false, 'Token refresh must not replace the active screen');
  tokenBarrier.resolve(); await settle();
}
// A different account still blocks rendering until its own profile is ready.
{
  const app = harness();
  app.initial.resolve({ data: { session } }); await settle();
  const barrier = deferred(); app.blockQueries(barrier);
  const otherSession = { user: { id: 'other-user', email: 'other@example.invalid' } };
  app.event('SIGNED_IN', otherSession); await settle();
  assert.equal(app.render().loadingSession, true);
  barrier.resolve(); await settle();
  assert.equal(app.render().session, otherSession);
  assert.equal(app.render().loadingSession, false);
}
{
  const gstSource = fs.readFileSync(new URL('../src/app/gst.tsx', import.meta.url), 'utf8');
  const gstCompiled = ts.transpileModule(gstSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let account = { session, loadingSession: false, demoMode: false, business: {} };
  const exports = {};
  vm.runInNewContext(gstCompiled, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === '@/hooks/use-app') return { useApp: () => account };
    if (name === 'expo-router') return { Redirect: 'Redirect', Stack: { Screen: 'Stack.Screen' }, router: {} };
    if (name === '@/constants/design') return { palette: {} };
    return new Proxy({}, { get: (_, key) => String(key) });
  } });
  const setup = exports.default();
  assert.equal(setup.type, 'Screen');
  assert.ok(JSON.stringify(setup).includes('Connect GST first'));
  assert.ok(JSON.stringify(setup).includes('BusinessProfilePicker'));
  account = { ...account, session: null };
  assert.equal(exports.default().type, 'Redirect');
  account = { ...account, loadingSession: true };
  assert.equal(exports.default().type, 'Screen');
}
console.log('Passed: preview exit, fresh-account GST setup, OTP restoration race, sign-out cancellation, queued-event ordering and signed-out guard.');
