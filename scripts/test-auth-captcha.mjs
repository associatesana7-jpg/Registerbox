import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, modules = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, URL, ...globals, require(name) {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return exports;
}
const helpers = load('src/lib/auth-captcha.ts');
assert.equal(helpers.AUTH_CAPTCHA_ORIGIN, 'https://www.registerbox.in', 'Native challenge must use the canonical origin, not a redirect');
for (const token of ['', undefined, null, {}, 'x'.repeat(2049), ' has-space']) {
  assert.throws(() => helpers.requireAuthCaptchaToken(token));
}
assert.equal(helpers.requireAuthCaptchaToken('fixture-token'), 'fixture-token');
assert.equal(helpers.readCaptchaMessage({ type: 'registerbox-captcha', request: 'other', status: 'verified', token: 'fixture' }, 'current'), null);
assert.equal(helpers.readCaptchaMessage({ type: 'registerbox-captcha', request: 'current', status: 'verified', token: {} }, 'current'), null);
assert.equal(helpers.readCaptchaMessage({ type: 'registerbox-captcha', request: 'current', status: 'verified', token: 'fixture' }, 'current').token, 'fixture');

// Exercise real API wrappers in the deliberate pre-rollout mode. No request or
// account creation occurs; no every-sign-in CAPTCHA is allowed.
const calls = [];
const supabase = { auth: {
  signInWithOtp: async input => { calls.push(input); return {}; },
} };
const shared = { '@/lib/supabase': { supabase }, '@/lib/auth-captcha': helpers,
  '@/lib/auth-gateway': { adaptiveAuthRequest: async () => null, rememberAuthenticatedDevice: async () => {} } };
const customer = load('src/lib/registerbox-api.ts', { ...shared, 'expo-document-picker': {}, 'expo-file-system': {}, '@/lib/privacy-center': {} });
const admin = load('src/lib/control-center-api.ts', { ...shared, '@/lib/registerbox-api': customer });
await customer.sendEmailOtp(' Sample@Example.invalid ', () => { throw new Error('Unexpected challenge'); });
assert.equal(calls.at(-1).email, 'sample@example.invalid');
assert.equal(calls.at(-1).options.shouldCreateUser, true);
assert.equal(calls.at(-1).options.captchaToken, undefined);
await admin.sendControlCenterOtp('staff@example.invalid');
assert.equal(calls.at(-1).options.shouldCreateUser, false);
const count = calls.length;
await assert.rejects(customer.sendEmailOtp('not-email'));
await assert.rejects(admin.sendControlCenterOtp('not-email'));
assert.equal(calls.length, count, 'Malformed credentials must not reach Auth');

// Actual controller: cancellation, concurrent attempt, timeout and unmount settle.
let state, cleanup, timer;
const refs = [];
let cursor = 0;
const controller = load('src/hooks/use-captcha-request.ts', { react: {
  useState: () => [state, value => { state = value; }],
  useRef: value => refs[cursor++] ??= { current: value },
  useCallback: callback => callback,
  useEffect: callback => { cleanup = callback(); },
} }, { setTimeout: callback => { timer = callback; return 1; }, clearTimeout: () => {} });
function render() { cursor = 0; return controller.useCaptchaRequest(); }
let hook = render();
let first = hook.verify('customer_email');
assert.equal(state.action, 'customer_email');
await assert.rejects(hook.verify('admin_email'), /already in progress/);
hook.finish({ token: 'one-time-fixture' });
assert.equal(await first, 'one-time-fixture');
assert.equal(state, null);
hook = render();
first = hook.verify('admin_email');
hook.finish({});
await assert.rejects(first, /cancelled/);
first = hook.verify('customer_email');
timer();
await assert.rejects(first, /timed out/);
first = hook.verify('admin_email');
cleanup();
await assert.rejects(first, /closed/);

// Execute the actual hosted HTML with a fake Turnstile engine and parent.
const page = fs.readFileSync('public/auth-challenge.html', 'utf8');
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
let options, scriptElement;
const nodes = { status: {}, retry: {} };
const messages = [];
const window = {};
const parent = { postMessage: (...args) => messages.push(args) };
const turnstile = { render: (_target, value) => { options = value; return 1; }, reset: () => {} };
vm.runInNewContext(script, { URLSearchParams, location: { search: '?action=customer_email&request=123-1', origin: 'https://registerbox.in' }, window, parent, turnstile,
  document: { getElementById: id => nodes[id] ?? {}, createElement: () => ({}), head: { appendChild: element => { scriptElement = element; } } },
});
assert.ok(scriptElement.src.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js?'));
window.startRegisterBoxChallenge();
assert.equal(options.action, 'customer_email');
options.callback('one-time-token');
options.callback('duplicate-token');
assert.equal(messages.length, 1, 'Only one token may leave a challenge instance');
assert.equal(messages[0][1], 'https://registerbox.in', 'Never post tokens to wildcard origins');
assert.equal(messages[0][0].request, '123-1');
assert.equal(messages[0][0].token, 'one-time-token');

for (const [file, action] of [
  ['src/app/auth/index.tsx', 'customer_email'], ['src/app/auth/otp.tsx', 'customer_email'],
  ['src/components/website/auth.web.tsx', 'customer_email'],
  ['src/components/control-center.tsx', 'admin_email'],
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes('captcha.verify') || source.includes('email,verifyCaptcha'), `${file} must pass a lazy challenge callback`);
  assert.ok(!source.includes(`await captcha.verify('${action}')`), `${file} must not challenge before a server risk decision`);
  assert.ok(source.includes('challenge'), `${file} must render the challenge`);
}
for (const file of ['src/app/auth/index.tsx', 'src/components/website/auth.web.tsx']) {
  assert.ok(!fs.readFileSync(file, 'utf8').includes('/auth/password'), 'Sign-in must only offer email OTP');
}
assert.ok(!fs.existsSync('src/lib/password-sign-in.ts'), 'No password sign-in handler may remain');
assert.ok(!fs.readFileSync('src/app/auth/password.tsx', 'utf8').includes('useAuthCaptcha'), 'Legacy route only redirects to OTP');
console.log('Passed: OTP-only entry points, token guards, normal pre-rollout auth, lazy challenge callbacks, cancellation/timeout/unmount, single-use page bridge and caller coverage. Live enforcement remains a separate rollout gate.');
